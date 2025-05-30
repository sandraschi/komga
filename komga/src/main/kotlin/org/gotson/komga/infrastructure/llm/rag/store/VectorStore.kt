package org.gotson.komga.infrastructure.llm.rag.store

import org.gotson.komga.infrastructure.llm.rag.model.DocumentChunk
import org.gotson.komga.infrastructure.llm.rag.model.RagDocument
import org.gotson.komga.infrastructure.llm.rag.model.RagSearchResult

/**
 * Interface for vector stores that can store and retrieve document chunks with embeddings.
 */
interface VectorStore {
    
    /**
     * Adds documents to the vector store.
     *
     * @param documents List of documents to add
     */
    suspend fun addDocuments(documents: List<RagDocument>)
    
    /**
     * Removes documents from the vector store by their IDs.
     *
     * @param documentIds List of document IDs to remove
     */
    suspend fun removeDocuments(documentIds: List<String>)
    
    /**
     * Performs a similarity search on the vector store.
     *
     * @param query The query text
     * @param k Number of results to return
     * @param filter Optional filter to apply to the search
     * @return List of search results with similarity scores
     */
    suspend fun similaritySearch(
        query: String,
        k: Int,
        filter: Map<String, Any>? = null
    ): List<RagSearchResult>
    
    /**
     * Performs a similarity search using an embedding vector.
     *
     * @param queryEmbedding The query embedding vector
     * @param k Number of results to return
     * @param filter Optional filter to apply to the search
     * @return List of search results with similarity scores
     */
    suspend fun similaritySearchWithEmbedding(
        queryEmbedding: List<Double>,
        k: Int,
        filter: Map<String, Any>? = null
    ): List<RagSearchResult>
    
    /**
     * Gets a document by its ID.
     *
     * @param documentId The ID of the document to retrieve
     * @return The document, or null if not found
     */
    suspend fun getDocument(documentId: String): RagDocument?
    
    /**
     * Gets all chunks for a document.
     *
     * @param documentId The ID of the document
     * @return List of document chunks
     */
    suspend fun getDocumentChunks(documentId: String): List<DocumentChunk>
}
