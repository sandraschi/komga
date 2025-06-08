package org.gotson.komga.interfaces.api.rest.dto

import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank

/**
 * Request DTO for RAG queries
 */
data class RagQueryDto(
  /**
   * The query text
   */
  @field:NotBlank
  val query: String,
  /**
   * Maximum number of results to return
   */
  @field:Min(1)
  @field:Max(20)
  val topK: Int? = 5,
  /**
   * Whether to generate an answer using the retrieved context
   */
  val generateAnswer: Boolean = false,
  /**
   * Maximum number of tokens in the generated answer
   */
  @field:Min(10)
  @field:Max(2000)
  val maxTokens: Int? = 1000,
  /**
   * Temperature for answer generation (0.0 to 2.0)
   */
  @field:Min(0)
  @field:Max(2)
  val temperature: Double? = 0.7,
  /**
   * Filters to apply to the search
   */
  val filters: Map<String, Any>? = null,
)

/**
 * Response DTO for RAG queries
 */
data class RagResponseDto(
  /**
   * List of search results
   */
  val results: List<RagSearchResultDto>,
  /**
   * Generated answer (if requested)
   */
  val answer: String? = null,
)

/**
 * DTO for a document in the RAG system
 */
data class RagDocumentDto(
  /**
   * Document ID
   */
  val id: String,
  /**
   * Document content
   */
  val content: String,
  /**
   * Document metadata
   */
  val metadata: Map<String, Any>,
  /**
   * Document chunks
   */
  val chunks: List<DocumentChunkDto>,
)

/**
 * DTO for a document chunk in the RAG system
 */
data class DocumentChunkDto(
  /**
   * Chunk ID
   */
  val id: String,
  /**
   * Chunk content
   */
  val content: String,
  /**
   * Chunk metadata
   */
  val metadata: Map<String, Any>,
  /**
   * Position of the chunk in the document
   */
  val chunkIndex: Int,
)

/**
 * DTO for a search result from the RAG system
 */
data class RagSearchResultDto(
  /**
   * The matching document chunk
   */
  val chunk: DocumentChunkDto,
  /**
   * The similarity score (higher is more relevant)
   */
  val score: Double,
  /**
   * The parent document
   */
  val document: RagDocumentDto,
)
