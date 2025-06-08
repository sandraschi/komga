package org.gotson.komga.infrastructure.llm.rag.model

import java.time.Instant
import java.util.UUID

/**
 * Represents a document in the RAG system.
 *
 * @property id Unique identifier for the document.
 * @property name Name of the document (e.g., file name).
 * @property contentType MIME type of the document.
 * @property size Size of the document in bytes.
 * @property metadata Additional metadata about the document.
 * @property chunks List of chunks that make up the document.
 * @property createdAt When the document was created in the system.
 * @property updatedAt When the document was last updated.
 */
data class RagDocument(
  val id: String = UUID.randomUUID().toString(),
  val name: String,
  val contentType: String,
  val size: Long,
  val metadata: Map<String, String> = emptyMap(),
  val chunks: List<RagDocumentChunk> = emptyList(),
  val createdAt: Instant = Instant.now(),
  val updatedAt: Instant = Instant.now(),
) {
  /**
   * Creates a new instance with the given chunks and updated timestamp.
   */
  fun withChunks(chunks: List<RagDocumentChunk>): RagDocument =
    copy(
      chunks = chunks,
      updatedAt = Instant.now(),
    )

  /**
   * Creates a new instance with the given metadata and updated timestamp.
   */
  fun withMetadata(metadata: Map<String, String>): RagDocument =
    copy(
      metadata = metadata,
      updatedAt = Instant.now(),
    )
}

/**
 * Represents a chunk of text from a document.
 *
 * @property id Unique identifier for the chunk.
 * @property documentId ID of the document this chunk belongs to.
 * @property text The actual text content of the chunk.
 * @property metadata Additional metadata about the chunk.
 * @property embedding The vector embedding of the chunk text.
 * @property index The position of this chunk in the original document.
 * @property startOffset The character offset where this chunk starts in the original document.
 * @property endOffset The character offset where this chunk ends in the original document.
 */
data class RagDocumentChunk(
  val id: String = UUID.randomUUID().toString(),
  val documentId: String,
  val text: String,
  val metadata: Map<String, String> = emptyMap(),
  val embedding: FloatArray? = null,
  val index: Int = 0,
  val startOffset: Int = 0,
  val endOffset: Int = 0,
) {
  override fun equals(other: Any?): Boolean {
    if (this === other) return true
    if (javaClass != other?.javaClass) return false

    other as RagDocumentChunk

    if (id != other.id) return false
    if (documentId != other.documentId) return false
    if (text != other.text) return false
    if (metadata != other.metadata) return false
    if (embedding != null) {
      if (other.embedding == null) return false
      if (!embedding.contentEquals(other.embedding)) return false
    } else if (other.embedding != null)
      return false
    if (index != other.index) return false
    if (startOffset != other.startOffset) return false
    if (endOffset != other.endOffset) return false

    return true
  }

  override fun hashCode(): Int {
    var result = id.hashCode()
    result = 31 * result + documentId.hashCode()
    result = 31 * result + text.hashCode()
    result = 31 * result + metadata.hashCode()
    result = 31 * result + (embedding?.contentHashCode() ?: 0)
    result = 31 * result + index
    result = 31 * result + startOffset
    result = 31 * result + endOffset
    return result
  }

  /**
   * Creates a new instance with the given embedding.
   */
  fun withEmbedding(embedding: FloatArray): RagDocumentChunk = copy(embedding = embedding)

  /**
   * Creates a new instance with the given metadata.
   */
  fun withMetadata(metadata: Map<String, String>): RagDocumentChunk = copy(metadata = metadata)
}

/**
 * Represents the result of a search operation.
 *
 * @property chunk The document chunk that matched the search.
 * @property score The similarity score of the match (0-1).
 * @property document The document that contains the matching chunk.
 */
data class RagSearchResult(
  val chunk: RagDocumentChunk,
  val score: Double,
  val document: RagDocument,
)

/**
 * Represents the answer to a question using the RAG system.
 *
 * @property answer The generated answer text.
 * @property sources List of document chunks used to generate the answer.
 * @property metadata Additional metadata about the answer generation process.
 */
data class RagAnswer(
  val answer: String,
  val sources: List<RagDocumentChunk> = emptyList(),
  val metadata: Map<String, Any> = emptyMap(),
)

/**
 * Represents the status of a document processing job.
 *
 * @property jobId Unique identifier for the job.
 * @property status Current status of the job (e.g., "PENDING", "PROCESSING", "COMPLETED", "FAILED").
 * @property progress Progress of the job (0-100).
 * @property documentId ID of the document being processed (if any).
 * @property error Error message if the job failed.
 * @property startedAt When the job started processing.
 * @property completedAt When the job completed (if finished).
 */
data class RagJobStatus(
  val jobId: String,
  val status: String,
  val progress: Int = 0,
  val documentId: String? = null,
  val error: String? = null,
  val startedAt: Instant? = null,
  val completedAt: Instant? = null,
) {
  companion object {
    const val STATUS_PENDING = "PENDING"
    const val STATUS_PROCESSING = "PROCESSING"
    const val STATUS_COMPLETED = "COMPLETED"
    const val STATUS_FAILED = "FAILED"
    const val STATUS_CANCELLED = "CANCELLED"
  }

  /**
   * Creates a new instance with the given status.
   */
  fun withStatus(
    status: String,
    progress: Int = this.progress,
    error: String? = null,
    completedAt: Instant? = null,
  ): RagJobStatus =
    copy(
      status = status,
      progress = progress,
      error = error,
      completedAt = completedAt,
    )

  /**
   * Creates a new instance with the given progress.
   */
  fun withProgress(progress: Int): RagJobStatus = copy(progress = progress.coerceIn(0, 100))
}
