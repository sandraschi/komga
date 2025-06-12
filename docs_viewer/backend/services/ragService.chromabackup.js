const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { ChromaClient } = require('chromadb');
const { Document } = require('@langchain/core/documents');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const config = require('../config');
const db = require('../db');
const fileService = require('./fileService');

class RAGService {
  constructor() {
    this.client = null;
    this.embeddingFunction = null;
    this.collections = {};
    
    // Initialize client but don't block the constructor
    this.initializeClient().catch(error => {
      logger.error('Failed to initialize RAG service', { error: error.message });
    });
  }

  /**
   * Initialize the ChromaDB client and collections
   * @private
   */
  async initializeClient() {
    try {
      // Make ChromaDB optional - only initialize if URL is provided
      if (!config.chromaDb || !config.chromaDb.url) {
        logger.warn('ChromaDB URL not configured. RAG features will be disabled.');
        this.client = null;
        this.embeddingFunction = null;
        return;
      }

      logger.info('Initializing ChromaDB client...', { url: config.chromaDb.url });
      
      // Initialize OpenAI embeddings first (if configured)
      if (config.openai && config.openai.apiKey) {
        try {
          this.embeddingFunction = new OpenAIEmbeddings({
            openAIApiKey: config.openai.apiKey,
          });
          logger.info('Initialized OpenAI embeddings');
        } catch (error) {
          logger.error('Failed to initialize OpenAI embeddings', { error: error.message });
          this.embeddingFunction = null;
        }
      } else {
        logger.warn('OpenAI API key not configured. Text embedding features will be disabled.');
        this.embeddingFunction = null;
      }

      try {
        // Initialize ChromaDB client
        this.client = new ChromaClient({
          path: config.chromaDb.url,
        });
        
        // Test the connection with a timeout
        const heartbeatPromise = this.client.heartbeat();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 3000)
        );
        
        await Promise.race([heartbeatPromise, timeoutPromise]);
        
        logger.info('Successfully connected to ChromaDB', {
          url: config.chromaDb.url,
        });
      } catch (error) {
        logger.error('Failed to connect to ChromaDB. RAG features will be disabled.', {
          error: error.message,
        });
        this.client = null;
      }
    } catch (error) {
      logger.error('Failed to initialize ChromaDB client. RAG features will be disabled.', {
        error: error.message,
        stack: error.stack
      });
      this.client = null;
      this.embeddingFunction = null;
      logger.error('Failed to initialize ChromaDB client', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Get or create a collection
   * @param {string} collectionName - Name of the collection
   * @returns {Promise<Object>} The collection
   * @private
   */
  async _getOrCreateCollection(collectionName) {
    try {
      // Check if collection is already loaded
      if (this.collections[collectionName]) {
        return this.collections[collectionName];
      }
      
      // Try to get existing collection
      let collection;
      try {
        collection = await this.client.getCollection({
          name: collectionName,
          embeddingFunction: this.embeddingFunction,
        });
        
        logger.debug(`Found existing collection: ${collectionName}`);
        
      } catch (error) {
        if (error.message.includes('not found')) {
          // Create new collection if it doesn't exist
          collection = await this.client.createCollection({
            name: collectionName,
            embeddingFunction: this.embeddingFunction,
          });
          
          logger.info(`Created new collection: ${collectionName}`);
          
          // Create collection metadata in our database
          await this._createCollectionMetadata(collectionName);
          
        } else {
          throw error;
        }
      }
      
      // Cache the collection
      this.collections[collectionName] = collection;
      
      return collection;
      
    } catch (error) {
      logger.error('Error getting or creating collection', {
        collectionName,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Create collection metadata in our database
   * @private
   */
  async _createCollectionMetadata(collectionName) {
    try {
      await db.run(
        `INSERT INTO rag_collections (
          id, name, created_at, updated_at, metadata
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          collectionName,
          new Date().toISOString(),
          new Date().toISOString(),
          JSON.stringify({}),
        ]
      );
      
      logger.debug(`Created metadata for collection: ${collectionName}`);
      
    } catch (error) {
      logger.error('Error creating collection metadata', {
        collectionName,
        error: error.message,
      });
      // Don't throw, as the collection was created successfully in Chroma
    }
  }

  /**
   * Ingest a document into the RAG system
   * @param {Object} options - Document options
   * @returns {Promise<Object>} The ingested document
   */
  async ingestDocument({
    fileId,
    collectionName = 'default',
    chunkSize = 1000,
    chunkOverlap = 200,
    metadata = {},
  } = {}) {
    const startTime = Date.now();
    
    try {
      // Get the file from the file service
      const file = await fileService.getFileById(fileId);
      
      if (!file) {
        throw new NotFoundError(`File not found: ${fileId}`);
      }
      
      // Read the file content
      const content = await this._readFileContent(file);
      
      // Split the content into chunks
      const chunks = await this._chunkContent(content, {
        chunkSize,
        chunkOverlap,
      });
      
      // Get or create the collection
      const collection = await this._getOrCreateCollection(collectionName);
      
      // Prepare documents for ingestion
      const documents = [];
      const metadatas = [];
      const ids = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkId = `${fileId}_${i}`;
        
        documents.push(chunk.pageContent);
        metadatas.push({
          ...metadata,
          fileId,
          fileName: file.originalName,
          chunkIndex: i,
          totalChunks: chunks.length,
        });
        ids.push(chunkId);
        
        // Save chunk metadata to our database
        await this._saveChunkMetadata({
          chunkId,
          documentId: fileId,
          collectionName,
          chunkIndex: i,
          content: chunk.pageContent,
          metadata: {
            ...metadata,
            fileId,
            fileName: file.originalName,
          },
        });
      }
      
      // Add documents to the collection
      await collection.add({
        ids,
        metadatas,
        documents,
      });
      
      // Save document metadata to our database
      await this._saveDocumentMetadata({
        documentId: fileId,
        fileId,
        collectionName,
        chunkSize,
        chunkOverlap,
        totalChunks: chunks.length,
        metadata,
      });
      
      const duration = Date.now() - startTime;
      
      logger.info('Ingested document into RAG system', {
        fileId,
        collectionName,
        chunks: chunks.length,
        duration: `${duration}ms`,
      });
      
      return {
        success: true,
        documentId: fileId,
        collectionName,
        chunks: chunks.length,
        duration: `${duration}ms`,
      };
      
    } catch (error) {
      logger.error('Error ingesting document', {
        fileId,
        collectionName,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Read file content based on file type
   * @private
   */
  async _readFileContent(file) {
    try {
      const { filePath, mimeType } = file;
      
      // For text files, read directly
      if (mimeType.startsWith('text/') || mimeType === 'application/json') {
        const fs = require('fs').promises;
        return await fs.readFile(filePath, 'utf-8');
      }
      
      // For PDFs, use PDF.js
      if (mimeType === 'application/pdf') {
        return await this._extractTextFromPdf(filePath);
      }
      
      // For Office documents, use mammoth or other libraries
      if (
        mimeType.includes('wordprocessingml.document') ||
        mimeType.includes('presentation') ||
        mimeType.includes('spreadsheet')
      ) {
        return await this._extractTextFromOfficeDoc(filePath, mimeType);
      }
      
      // For other types, try to extract text
      try {
        return await this._extractTextGeneric(filePath);
      } catch (innerError) {
        throw new ValidationError(`Unsupported file type: ${mimeType}`);
      }
      
    } catch (error) {
      logger.error('Error reading file content', {
        filePath: file.filePath,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Extract text from PDF file
   * @private
   */
  async _extractTextFromPdf(filePath) {
    try {
      const { pdf } = require('pdf-parse');
      const fs = require('fs').promises;
      
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdf(dataBuffer);
      
      return data.text;
      
    } catch (error) {
      logger.error('Error extracting text from PDF', {
        filePath,
        error: error.message,
      });
      throw new Error('Failed to extract text from PDF');
    }
  }

  /**
   * Extract text from Office documents
   * @private
   */
  async _extractTextFromOfficeDoc(filePath, mimeType) {
    try {
      // For Word documents (.docx)
      if (mimeType.includes('wordprocessingml.document')) {
        const mammoth = require('mammoth');
        const result = await mammoth.extractRawText({ path: filePath });
        return result.value;
      }
      
      // For PowerPoint (.pptx)
      if (mimeType.includes('presentation')) {
        const { extractText } = require('office-text-extractor');
        const text = await extractText({ input: filePath, type: 'file' });
        return text;
      }
      
      // For Excel (.xlsx)
      if (mimeType.includes('spreadsheet')) {
        const XLSX = require('xlsx');
        const workbook = XLSX.readFile(filePath);
        let text = '';
        
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          text += XLSX.utils.sheet_to_csv(worksheet) + '\n\n';
        });
        
        return text;
      }
      
      throw new Error(`Unsupported Office document type: ${mimeType}`);
      
    } catch (error) {
      logger.error('Error extracting text from Office document', {
        filePath,
        mimeType,
        error: error.message,
      });
      throw new Error('Failed to extract text from Office document');
    }
  }

  /**
   * Generic text extraction using textract
   * @private
   */
  async _extractTextGeneric(filePath) {
    return new Promise((resolve, reject) => {
      const textract = require('textract');
      
      textract.fromFileWithPath(filePath, (error, text) => {
        if (error) {
          logger.error('Error extracting text with textract', {
            filePath,
            error: error.message,
          });
          return reject(new Error('Failed to extract text from file'));
        }
        
        resolve(text);
      });
    });
  }

  /**
   * Split content into chunks
   * @private
   */
  async _chunkContent(content, { chunkSize, chunkOverlap }) {
    try {
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize,
        chunkOverlap,
        separators: ['\n\n', '\n', '.', ' ', ''],
      });
      
      const docs = await textSplitter.createDocuments([content]);
      return docs;
      
    } catch (error) {
      logger.error('Error chunking content', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Save document metadata to our database
   * @private
   */
  async _saveDocumentMetadata({
    documentId,
    fileId,
    collectionName,
    chunkSize,
    chunkOverlap,
    totalChunks,
    metadata = {},
  }) {
    try {
      await db.run(
        `INSERT INTO rag_documents (
          id, file_id, collection_name, document_id, title, summary, 
          metadata, chunk_size, chunk_overlap, total_chunks, ingested_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          fileId,
          collectionName,
          documentId,
          metadata.title || `Document ${Date.now()}`,
          metadata.summary || '',
          JSON.stringify(metadata),
          chunkSize,
          chunkOverlap,
          totalChunks,
          new Date().toISOString(),
        ]
      );
      
    } catch (error) {
      logger.error('Error saving document metadata', {
        documentId,
        error: error.message,
      });
      // Don't fail the whole operation if metadata save fails
    }
  }

  /**
   * Save chunk metadata to our database
   * @private
   */
  async _saveChunkMetadata({
    chunkId,
    documentId,
    collectionName,
    chunkIndex,
    content,
    metadata = {},
  }) {
    try {
      await db.run(
        `INSERT INTO rag_chunks (
          id, document_id, chunk_id, chunk_index, content, metadata
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          documentId,
          chunkId,
          chunkIndex,
          content,
          JSON.stringify(metadata),
        ]
      );
      
    } catch (error) {
      logger.error('Error saving chunk metadata', {
        chunkId,
        documentId,
        error: error.message,
      });
      // Don't fail the whole operation if metadata save fails
    }
  }

  /**
   * Search for relevant documents
   * @param {string} query - The search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Search results
   */
  async search(query, {
    collectionName = 'default',
    limit = 5,
    minScore = 0.5,
    filter,
  } = {}) {
    const startTime = Date.now();
    
    try {
      // Get the collection
      const collection = await this._getOrCreateCollection(collectionName);
      
      // Perform the search
      const results = await collection.query({
        queryTexts: [query],
        nResults: limit,
        where: filter,
      });
      
      // Process results
      const documents = [];
      
      if (results.ids && results.ids.length > 0) {
        for (let i = 0; i < results.ids[0].length; i++) {
          const distance = results.distances ? results.distances[0][i] : 0;
          const score = 1 - (distance || 0); // Convert distance to similarity score
          
          if (score >= minScore) {
            const chunkId = results.ids[0][i];
            const [documentId, chunkIndex] = chunkId.split('_');
            
            // Get chunk metadata from our database
            const chunk = await this._getChunkMetadata(chunkId);
            
            if (chunk) {
              documents.push({
                id: chunkId,
                documentId,
                chunkIndex: parseInt(chunkIndex, 10),
                content: chunk.content,
                metadata: {
                  ...chunk.metadata,
                  score,
                  distance,
                },
              });
            }
          }
        }
      }
      
      const duration = Date.now() - startTime;
      
      logger.debug('Performed RAG search', {
        query,
        collectionName,
        results: documents.length,
        duration: `${duration}ms`,
      });
      
      return documents;
      
    } catch (error) {
      logger.error('Error searching documents', {
        query,
        collectionName,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Get chunk metadata from our database
   * @private
   */
  async _getChunkMetadata(chunkId) {
    try {
      const result = await db.get(
        'SELECT * FROM rag_chunks WHERE chunk_id = ?',
        [chunkId]
      );
      
      if (!result) return null;
      
      return {
        id: result.id,
        documentId: result.document_id,
        chunkId: result.chunk_id,
        chunkIndex: result.chunk_index,
        content: result.content,
        metadata: JSON.parse(result.metadata || '{}'),
      };
    } catch (error) {
      logger.error('Error getting chunk metadata', {
        chunkId,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Get document statistics
   * @param {string} collectionName - The collection name
   * @returns {Promise<Object>} Document statistics
   */
  async getStats(collectionName = 'default') {
    try {
      // Get collection stats from Chroma
      const collection = await this._getOrCreateCollection(collectionName);
      const count = await collection.count();
      
      // Get document and chunk counts from our database
      const [docCount, chunkCount] = await Promise.all([
        db.get('SELECT COUNT(*) as count FROM rag_documents WHERE collection_name = ?', [collectionName]),
        db.get('SELECT COUNT(*) as count FROM rag_chunks WHERE document_id IN (SELECT document_id FROM rag_documents WHERE collection_name = ?)', [collectionName]),
      ]);
      
      return {
        collection: collectionName,
        totalDocuments: docCount ? docCount.count : 0,
        totalChunks: chunkCount ? chunkCount.count : 0,
        vectorCount: count,
      };
      
    } catch (error) {
      logger.error('Error getting RAG stats', {
        collectionName,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}

module.exports = new RAGService();
