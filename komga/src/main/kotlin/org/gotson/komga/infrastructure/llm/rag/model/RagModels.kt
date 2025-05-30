package org.gotson.komga.infrastructure.llm.rag.model

import java.util.UUID

/**
 * Represents a document chunk with its embedding and metadata.
 *
 * @property id Unique identifier for the chunk
 * @property content The text content of the chunk
 * @property embedding The vector embedding of the chunk
 * @property metadata Additional metadata about the chunk
 * @property documentId ID of the parent document
 * @property chunkIndex Position of this chunk in the original document
 */
data class DocumentChunk(
    val id: String = UUID.randomUUID().toString(),
    val content: String,
    val embedding: List<Double>,
    val metadata: Map<String, Any> = emptyMap(),
    val documentId: String,
    val chunkIndex: Int
)

/**
 * Represents a document that has been processed for RAG.
 *
 * @property id Unique identifier for the document
 * @property content The full text content of the document
 * @property metadata Additional metadata about the document
 * @property chunks The document split into chunks with embeddings
 */
data class RagDocument(
    val id: String = UUID.randomUUID().toString(),
    val content: String,
    val metadata: Map<String, Any> = emptyMap(),
    val chunks: List<DocumentChunk> = emptyList()
)

/**
 * Represents a search result from the RAG system.
 *
 * @property chunk The matching document chunk
 * @property score The similarity score (higher is more relevant)
 * @property document The parent document of the chunk
 */
data class RagSearchResult(
    val chunk: DocumentChunk,
    val score: Double,
    val document: RagDocument
)

/**
 * Configuration for the RAG system.
 *
 * @property chunkSize Maximum number of characters per chunk
 * @property chunkOverlap Number of characters to overlap between chunks
 * @property topK Number of results to return from similarity search
 * @property similarityThreshold Minimum similarity score (0-1) for results
 */
data class RagConfig(
    val chunkSize: Int = 1000,
    val chunkOverlap: Int = 100,
    val topK: Int = 5,
    val similarityThreshold: Double = 0.7
)
