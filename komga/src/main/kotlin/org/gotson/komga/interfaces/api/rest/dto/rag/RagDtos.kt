package org.gotson.komga.interfaces.api.rest.dto.rag

import org.gotson.komga.infrastructure.llm.rag.model.DocumentChunk
import org.gotson.komga.infrastructure.llm.rag.model.RagDocument
import java.time.Instant

/**
 * Request DTO for searching documents.
 */
data class SearchRequestDto(
  /** The search query. */
  val query: String,
  /** The collection to search in (optional, defaults to 'default'). */
  val collection: String? = null,
  /** Maximum number of results to return (optional, defaults to 10). */
  val limit: Int? = null,
  /** Minimum similarity score for results (0-1, optional, defaults to 0.7). */
  val minScore: Double? = null,
  /** Filter criteria for document metadata (optional). */
  val filters: Map<String, Any>? = null,
)

/**
 * Response DTO for search results.
 */
data class SearchResponseDto(
  /** List of search results. */
  val results: List<SearchResultDto>,
  /** Total number of results. */
  val totalResults: Int,
)

/**
 * A single search result.
 */
data class SearchResultDto(
  /** ID of the document. */
  val documentId: String,
  /** ID of the chunk. */
  val chunkId: String,
  /** Snippet of the chunk content. */
  val content: String,
  /** Similarity score (0-1). */
  val score: Double,
  /** Additional metadata. */
  val metadata: Map<String, Any>,
)

/**
 * Request DTO for asking a question.
 */
data class AskRequestDto(
  /** The question to ask. */
  val question: String,
  /** The collection to search in (optional, defaults to 'default'). */
  val collection: String? = null,
  /** Maximum number of relevant chunks to consider (optional, defaults to 5). */
  val maxResults: Int? = null,
  /** Minimum similarity score for chunks (0-1, optional, defaults to 0.7). */
  val minScore: Double? = null,
)

/**
 * Response DTO for question answering.
 */
data class AskResponseDto(
  /** The original question. */
  val question: String,
  /** The generated answer. */
  val answer: String,
  /** List of source chunks used to generate the answer. */
  val sources: List<String>,
  /** Similarity scores for each source chunk. */
  val scores: List<Double>,
  /** Additional metadata. */
  val metadata: Map<String, Any>,
)

/**
 * DTO for document information.
 */
data class DocumentDto(
  /** Unique identifier for the document. */
  val id: String,
  /** Human-readable name of the document. */
  val name: String,
  /** The collection this document belongs to. */
  val collection: String,
  /** Number of chunks in the document. */
  val chunkCount: Int,
  /** Document metadata. */
  val metadata: Map<String, Any>,
  /** List of document chunks (only included if requested). */
  val chunks: List<DocumentChunkDto> = emptyList(),
  /** When the document was created. */
  val createdAt: Instant,
  /** When the document was last updated. */
  val updatedAt: Instant,
)

/**
 * DTO for a document chunk.
 */
data class DocumentChunkDto(
  /** Unique identifier for the chunk. */
  val id: String,
  /** The chunk content. */
  val content: String,
  /** The position of this chunk in the document. */
  val index: Int,
  /** Similarity score (if this is a search result). */
  val score: Double? = null,
  /** Additional metadata. */
  val metadata: Map<String, Any>,
)

/**
 * DTO for job status information.
 */
data class JobStatusDto(
  /** Job identifier. */
  val id: String,
  /** Current status of the job. */
  val status: String, // PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED
  /** Human-readable status message. */
  val message: String,
  /** Progress percentage (0-100) if applicable. */
  val progress: Int?,
  /** When the job was created. */
  val createdAt: Instant = Instant.now(),
  /** When the job was last updated. */
  val updatedAt: Instant = Instant.now(),
)

/**
 * Mapper functions for converting between domain models and DTOs.
 */
object RagDtoMapper {
  /**
   * Converts a RagDocument to a DocumentDto.
   */
  fun toDto(
    document: RagDocument,
    includeChunks: Boolean = false,
  ): DocumentDto =
    DocumentDto(
      id = document.id,
      name = document.metadata["original_filename"]?.toString() ?: "Unknown",
      collection = document.metadata["collection"]?.toString() ?: "default",
      chunkCount = document.chunks.size,
      metadata = document.metadata,
      chunks =
        if (includeChunks) {
          document.chunks.map { toDto(it) }
        } else {
          emptyList()
        },
      createdAt = document.createdAt,
      updatedAt = document.updatedAt,
    )

  /**
   * Converts a DocumentChunk to a DocumentChunkDto.
   */
  fun toDto(
    chunk: DocumentChunk,
    score: Double? = null,
  ): DocumentChunkDto =
    DocumentChunkDto(
      id = chunk.id,
      content = chunk.content,
      index = chunk.chunkIndex,
      score = score ?: (chunk.metadata["score"] as? Double),
      metadata = chunk.metadata,
    )

  /**
   * Converts a search result to a SearchResultDto.
   */
  fun toSearchResultDto(
    chunk: DocumentChunk,
    score: Double,
  ): SearchResultDto =
    SearchResultDto(
      documentId = chunk.documentId,
      chunkId = chunk.id,
      content = chunk.content.take(500) + if (chunk.content.length > 500) "..." else "",
      score = score,
      metadata = chunk.metadata,
    )
}
