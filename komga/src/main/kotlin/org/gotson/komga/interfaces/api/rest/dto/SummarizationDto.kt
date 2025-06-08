package org.gotson.komga.interfaces.api.rest.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.PositiveOrZero

/**
 * Request DTO for generating a book summary
 */
data class GenerateSummaryRequest(
  /**
   * ID of the book to summarize
   */
  @field:NotBlank
  val bookId: String,
  /**
   * Type of summary to generate (e.g., "minibook", "microbook")
   */
  @field:NotBlank
  val type: String,
  /**
   * Number of pages to include in the summary (for minibook)
   */
  @field:Positive
  val pageCount: Int? = null,
  /**
   * Creativity/temperature parameter (0.0 to 1.0)
   */
  @field:PositiveOrZero
  val temperature: Double = 0.7,
  /**
   * Model to use for generation
   */
  val model: String? = null,
  /**
   * Whether to generate images for the summary
   */
  val generateImages: Boolean = true,
)

/**
 * Response DTO for a generated summary
 */
data class GenerateSummaryResponse(
  /**
   * The generated summary text
   */
  val summary: String,
  /**
   * List of pages in the summary
   */
  val pages: List<SummaryPage>,
  /**
   * Model used for generation
   */
  val modelUsed: String,
  /**
   * Generation metadata
   */
  val metadata: Map<String, Any> = emptyMap(),
)

/**
 * Represents a page in the generated summary
 */
data class SummaryPage(
  /**
   * Page number (1-based)
   */
  val pageNumber: Int,
  /**
   * Page content
   */
  val content: String,
  /**
   * Optional image prompt for this page
   */
  val imagePrompt: String? = null,
  /**
   * Optional generated image URL
   */
  val imageUrl: String? = null,
)

/**
 * Request DTO for generating an image
 */
data class GenerateImageRequest(
  /**
   * Text prompt for image generation
   */
  @field:NotBlank
  val prompt: String,
  /**
   * Width of the generated image
   */
  @field:Positive
  val width: Int = 1024,
  /**
   * Height of the generated image
   */
  @field:Positive
  val height: Int = 1024,
  /**
   * Model to use for generation
   */
  val model: String? = null,
)

/**
 * Response DTO for a generated image
 */
data class GenerateImageResponse(
  /**
   * URL or base64-encoded image data
   */
  val imageUrl: String,
  /**
   * Model used for generation
   */
  val modelUsed: String,
  /**
   * Generation metadata
   */
  val metadata: Map<String, Any> = emptyMap(),
)

/**
 * Request DTO for exporting a book
 */
data class ExportBookRequest(
  /**
   * ID of the book to export
   */
  @field:NotBlank
  val bookId: String,
  /**
   * Title of the exported book
   */
  @field:NotBlank
  val title: String,
  /**
   * Pages to include in the export
   */
  val pages: List<ExportPage>,
  /**
   * Export format (default: cbz)
   */
  val format: String = "cbz",
  /**
   * Whether to include generated images
   */
  val includeImages: Boolean = true,
)

/**
 * Represents a page in the exported book
 */
data class ExportPage(
  /**
   * Page number (1-based)
   */
  val pageNumber: Int,
  /**
   * Page content
   */
  val content: String,
  /**
   * Optional image prompt for this page
   */
  val imagePrompt: String? = null,
  /**
   * Optional image URL
   */
  val imageUrl: String? = null,
)
