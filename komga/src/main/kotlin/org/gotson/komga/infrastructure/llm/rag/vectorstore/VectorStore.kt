package org.gotson.komga.infrastructure.llm.rag.vectorstore

import org.gotson.komga.infrastructure.llm.rag.model.DocumentChunk
import org.gotson.komga.infrastructure.llm.rag.model.RagDocument

/**
 * Interface for vector store implementations that handle storage and retrieval of document chunks.
 */
interface VectorStore {
  /**
   * Adds a single document with its chunks to the vector store.
   *
   * @param document The document to add
   * @param chunks The document chunks with embeddings
   * @return The number of chunks added
   */
  suspend fun addDocument(
    document: RagDocument,
    chunks: List<DocumentChunk>,
  ): Int

  /**
   * Adds multiple documents with their chunks to the vector store.
   *
   * @param documents List of pairs of documents and their chunks
   * @return The total number of chunks added
   */
  suspend fun addDocuments(documents: List<Pair<RagDocument, List<DocumentChunk>>>): Int

  /**
   * Removes a document and all its chunks from the vector store.
   *
   * @param documentId The ID of the document to remove
   * @return true if the document was found and removed, false otherwise
   */
  suspend fun removeDocument(documentId: String): Boolean

  /**
   * Performs a similarity search to find the most relevant document chunks.
   *
   * @param embedding The query embedding vector
   * @param limit Maximum number of results to return
   * @param minScore Minimum similarity score (0-1) for results
   * @param filter Optional filter criteria for document metadata
   * @return List of matching document chunks with their scores
   */
  suspend fun similaritySearch(
    embedding: List<Double>,
    limit: Int = 5,
    minScore: Double = 0.7,
    filter: Map<String, Any>? = null,
  ): List<Pair<DocumentChunk, Double>>

  /**
   * Gets statistics about the vector store.
   *
   * @return A map of statistics (e.g., document count, chunk count)
   */
  suspend fun getStats(): Map<String, Any>

  /**
   * Checks if a document exists in the vector store.
   *
   * @param documentId The ID of the document to check
   * @return true if the document exists, false otherwise
   */
  suspend fun documentExists(documentId: String): Boolean

  /**
   * Gets a document by ID.
   *
   * @param documentId The ID of the document to retrieve
   * @return The document if found, null otherwise
   */
  suspend fun getDocument(documentId: String): RagDocument?

  /**
   * Gets all documents in the vector store.
   *
   * @param limit Maximum number of documents to return
   * @param offset Offset for pagination
   * @return List of documents
   */
  suspend fun listDocuments(
    limit: Int = 100,
    offset: Int = 0,
  ): List<RagDocument>

  /**
   * Gets all chunks for a document.
   *
   * @param documentId The ID of the document
   * @return List of chunks for the document, ordered by chunk index
   */
  suspend fun getDocumentChunks(documentId: String): List<DocumentChunk>

  /**
   * Initializes the vector store (e.g., creates necessary collections or indices).
   */
  suspend fun initialize()

  /**
   * Cleans up resources used by the vector store.
   */
  suspend fun cleanup()
}
