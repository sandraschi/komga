package org.gotson.komga.infrastructure.llm.rag.model

import org.gotson.komga.infrastructure.llm.rag.service.DocumentProcessingStatus
import java.time.Instant
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
  val embedding: List<Double> = emptyList(),
  val metadata: MutableMap<String, Any> = mutableMapOf(),
  val documentId: String,
  val chunkIndex: Int,
  val createdAt: Instant = Instant.now(),
) {
  fun toMap(): Map<String, Any> =
    mapOf(
      "id" to id,
      "content" to content,
      "documentId" to documentId,
      "chunkIndex" to chunkIndex,
      "createdAt" to createdAt.toString(),
      "metadata" to metadata,
    )
}

/**
 * Represents a document that has been processed for RAG.
 *
 * @property id Unique identifier for the document
 * @property content The full text content of the document
 * @property metadata Additional metadata about the document
 * @property chunks The document split into chunks with embeddings
 * @property status The processing status of the document
 */
data class RagDocument(
  val id: String = UUID.randomUUID().toString(),
  val content: String = "",
  val metadata: MutableMap<String, Any> = mutableMapOf(),
  val chunks: List<DocumentChunk> = emptyList(),
  val status: DocumentProcessingStatus = DocumentProcessingStatus.PENDING,
  val createdAt: Instant = Instant.now(),
  val updatedAt: Instant = Instant.now(),
) {
  fun toMap(): Map<String, Any> =
    mapOf(
      "id" to id,
      "content" to content.take(500) + if (content.length > 500) "..." else "",
      "status" to status.name,
      "chunkCount" to chunks.size,
      "createdAt" to createdAt.toString(),
      "updatedAt" to updatedAt.toString(),
      "metadata" to metadata,
    )

  fun withChunks(chunks: List<DocumentChunk>): RagDocument =
    copy(
      chunks = chunks,
      updatedAt = Instant.now(),
    )

  fun withStatus(newStatus: DocumentProcessingStatus): RagDocument =
    copy(
      status = newStatus,
      updatedAt = Instant.now(),
    )
}

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
  val document: RagDocument,
) {
  fun toMap(): Map<String, Any> =
    mapOf(
      "chunk" to chunk.toMap(),
      "score" to score,
      "document" to document.toMap(),
    )
}

/**
 * Represents a collection of documents in the RAG system.
 *
 * @property id Unique identifier for the collection
 * @property name Human-readable name of the collection
 * @property description Optional description of the collection
 * @property metadata Additional metadata about the collection
 * @property documentCount Number of documents in the collection
 * @property createdAt When the collection was created
 * @property updatedAt When the collection was last updated
 */
data class RagCollection(
  val id: String = UUID.randomUUID().toString(),
  val name: String,
  val description: String = "",
  val metadata: MutableMap<String, Any> = mutableMapOf(),
  val documentCount: Int = 0,
  val createdAt: Instant = Instant.now(),
  val updatedAt: Instant = Instant.now(),
) {
  fun toMap(): Map<String, Any> =
    mapOf(
      "id" to id,
      "name" to name,
      "description" to description,
      "documentCount" to documentCount,
      "createdAt" to createdAt,
      "updatedAt" to updatedAt,
      "metadata" to metadata,
    )
}

/**
 * Configuration for the RAG system.
 *
 * @property chunking Configuration for text chunking
 * @property embedding Configuration for text embeddings
 * @property search Configuration for semantic search
 * @property storage Configuration for document storage
 * @property cleanOnStart Whether to clean temporary files on startup
 * @property cleanOnExit Whether to clean temporary files on shutdown
 */
data class RagConfig(
  val chunking: ChunkingConfig = ChunkingConfig(),
  val embedding: EmbeddingConfig = EmbeddingConfig(),
  val search: SearchConfig = SearchConfig(),
  val storage: StorageConfig = StorageConfig(),
  val cleanOnStart: Boolean = true,
  val cleanOnExit: Boolean = true,
) {
  /**
   * Configuration for text chunking.
   *
   * @property chunkSize Maximum number of characters per chunk
   * @property chunkOverlap Number of characters to overlap between chunks
   * @property strategy The chunking strategy to use
   */
  data class ChunkingConfig(
    val chunkSize: Int = 1000,
    val chunkOverlap: Int = 200,
    val strategy: ChunkingStrategy = ChunkingStrategy.RECURSIVE,
  )

  /**
   * Configuration for text embeddings.
   *
   * @property model Name of the embedding model to use
   * @property dimensions Number of dimensions in the embedding vectors
   * @property batchSize Number of texts to embed in a single batch
   */
  data class EmbeddingConfig(
    val model: String = "text-embedding-3-small",
    val dimensions: Int = 1536,
    val batchSize: Int = 32,
  )

  /**
   * Configuration for semantic search.
   *
   * @property topK Number of results to return from similarity search
   * @property similarityThreshold Minimum similarity score (0-1) for results
   * @property useHybridSearch Whether to use hybrid search (keyword + vector)
   */
  data class SearchConfig(
    val topK: Int = 5,
    val similarityThreshold: Double = 0.7,
    val useHybridSearch: Boolean = true,
  )

  /**
   * Configuration for document storage.
   *
   * @property type Type of storage to use (memory, filesystem, s3, etc.)
   * @property path Path for filesystem storage
   * @property maxDocumentSize Maximum size of a single document in bytes
   */
  data class StorageConfig(
    val type: StorageType = StorageType.MEMORY,
    val path: String = "data/rag/documents",
    val maxDocumentSize: Long = 10 * 1024 * 1024, // 10MB
  )

  /**
   * Supported chunking strategies.
   */
  enum class ChunkingStrategy {
    /** Split by fixed size chunks */
    FIXED,

    /** Recursively split by separators */
    RECURSIVE,

    /** Split by paragraphs */
    PARAGRAPH,

    /** Split by sentences */
    SENTENCE,
  }

  /**
   * Supported storage types.
   */
  enum class StorageType {
    /** Store chunks in memory (not persistent) */
    MEMORY,

    /** Store chunks on the filesystem */
    FILESYSTEM,

    /** Store chunks in a database */
    DATABASE,

    /** Store chunks in object storage (S3-compatible) */
    OBJECT_STORAGE,
  }
}
