const express = require('express');
const router = express.Router();
const { ValidationError, NotFoundError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs').promises;
const { ChromaClient } = require('chromadb');
const config = require('../config');

// Initialize ChromaDB client
const chromaClient = new ChromaClient({
  path: config.chroma.url
});

// Collection name for documents
const DOCUMENTS_COLLECTION = 'documents';

/**
 * POST /api/rag/ingest
 * Ingest a document into the vector database
 */
router.post('/ingest', asyncHandler(async (req, res) => {
  const { filePath, collectionName = DOCUMENTS_COLLECTION } = req.body;
  
  if (!filePath) {
    throw new ValidationError('filePath is required');
  }
  
  try {
    const absPath = path.isAbsolute(filePath) ? filePath : path.join(config.rootDir, filePath);
    
    // Security check: prevent directory traversal
    if (!absPath.startsWith(config.rootDir)) {
      throw new Error('Access denied');
    }
    
    // Check if file exists and is accessible
    let stats;
    try {
      stats = await fs.stat(absPath);
      if (stats.isDirectory()) {
        throw new Error('Path is a directory');
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new NotFoundError('File not found');
      }
      throw new Error(`Error accessing file: ${err.message}`);
    }
    
    // Read file content
    const content = await fs.readFile(absPath, 'utf-8');
    
    // Split document into chunks (simple implementation - in production, use a proper text splitter)
    const chunks = splitTextIntoChunks(content, 1000, 200);
    
    // Get or create collection
    let collection;
    try {
      collection = await chromaClient.getCollection({ name: collectionName });
    } catch (error) {
      if (error.message.includes('not found')) {
        collection = await chromaClient.createCollection({ name: collectionName });
      } else {
        throw error;
      }
    }
    
    // Generate embeddings and add to collection
    const ids = [];
    const documents = [];
    const metadatas = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const id = `${path.basename(filePath)}-chunk-${i}`;
      
      ids.push(id);
      documents.push(chunk);
      metadatas.push({
        source: filePath,
        chunk_index: i,
        total_chunks: chunks.length,
      });
    }
    
    // Add to collection
    await collection.add({
      ids,
      documents,
      metadatas,
    });
    
    logger.info(`Ingested document: ${filePath} (${chunks.length} chunks)`, {
      filePath,
      chunks: chunks.length,
      collection: collectionName,
    });
    
    res.json({
      success: true,
      message: 'Document ingested successfully',
      document: {
        path: filePath,
        chunks: chunks.length,
        collection: collectionName,
      },
    });
    
  } catch (error) {
    logger.error('Error ingesting document', {
      filePath,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}));

/**
 * POST /api/rag/query
 * Query the RAG system
 */
router.post('/query', asyncHandler(async (req, res) => {
  const { 
    query, 
    collectionName = DOCUMENTS_COLLECTION, 
    limit = 5,
    minScore = 0.7,
    includeContext = true,
  } = req.body;
  
  if (!query) {
    throw new ValidationError('Query is required');
  }
  
  try {
    // Get collection
    let collection;
    try {
      collection = await chromaClient.getCollection({ name: collectionName });
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new NotFoundError(`Collection '${collectionName}' not found`);
      }
      throw error;
    }
    
    // Query the collection
    const results = await collection.query({
      queryTexts: [query],
      nResults: limit,
    });
    
    // Process results
    const documents = [];
    
    if (results.ids && results.ids[0]) {
      for (let i = 0; i < results.ids[0].length; i++) {
        const id = results.ids[0][i];
        const distance = results.distances ? results.distances[0][i] : 1.0; // Default to 1.0 if no distance
        const score = 1.0 - distance; // Convert distance to similarity score
        
        if (score >= minScore) {
          documents.push({
            id,
            content: results.documents[0][i],
            metadata: results.metadatas[0][i],
            score,
          });
        }
      }
    }
    
    // Sort by score (descending)
    documents.sort((a, b) => b.score - a.score);
    
    // Format response
    const response = {
      query,
      collection: collectionName,
      results: documents.length,
      documents: includeContext ? documents : undefined,
    };
    
    logger.debug('RAG query executed', {
      query,
      collection: collectionName,
      results: documents.length,
      minScore,
    });
    
    res.json(response);
    
  } catch (error) {
    logger.error('Error querying RAG system', {
      query,
      collection: collectionName,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}));

/**
 * GET /api/rag/collections
 * List all collections
 */
router.get('/collections', asyncHandler(async (req, res) => {
  try {
    const collections = await chromaClient.listCollections();
    
    // Get collection details
    const collectionDetails = await Promise.all(
      collections.map(async (collection) => {
        try {
          const count = await collection.count();
          return {
            name: collection.name,
            documents: count,
            metadata: collection.metadata || {},
          };
        } catch (err) {
          logger.error(`Error getting details for collection ${collection.name}`, {
            error: err.message,
          });
          return {
            name: collection.name,
            error: 'Failed to get collection details',
          };
        }
      })
    );
    
    res.json({
      collections: collectionDetails,
    });
    
  } catch (error) {
    logger.error('Error listing collections', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}));

/**
 * DELETE /api/rag/collections/:name
 * Delete a collection
 */
router.delete('/collections/:name', asyncHandler(async (req, res) => {
  const { name } = req.params;
  
  try {
    await chromaClient.deleteCollection({ name });
    
    logger.info(`Deleted collection: ${name}`);
    
    res.json({
      success: true,
      message: `Collection '${name}' deleted successfully`,
    });
    
  } catch (error) {
    if (error.message.includes('not found')) {
      throw new NotFoundError(`Collection '${name}' not found`);
    }
    
    logger.error(`Error deleting collection '${name}'`, {
      error: error.message,
      stack: error.stack,
    });
    
    throw error;
  }
}));

/**
 * Helper function to split text into chunks
 */
function splitTextIntoChunks(text, chunkSize = 1000, chunkOverlap = 200) {
  if (!text || typeof text !== 'string') {
    return [];
  }
  
  // Simple whitespace-based tokenization (in production, use a proper tokenizer)
  const words = text.split(/\s+/);
  const chunks = [];
  let i = 0;
  
  while (i < words.length) {
    const end = Math.min(i + chunkSize, words.length);
    chunks.push(words.slice(i, end).join(' '));
    
    if (end >= words.length) break;
    
    // Move back by overlap, but not before the start
    i = Math.max(i + chunkSize - chunkOverlap, i + 1);
  }
  
  return chunks;
}

module.exports = router;
