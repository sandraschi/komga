package org.gotson.komga.domain.service

import org.gotson.komga.interfaces.api.rest.dto.GenerateImageRequest
import org.gotson.komga.interfaces.api.rest.dto.GenerateImageResponse
import org.gotson.komga.interfaces.api.rest.dto.GenerateSummaryRequest
import org.gotson.komga.interfaces.api.rest.dto.GenerateSummaryResponse
import java.io.InputStream

/**
 * Service interface for AI-related operations
 */
interface AIService {
  /**
   * Generates a summary for a book
   *
   * @param request The summary generation request
   * @return The generated summary
   */
  suspend fun generateSummary(request: GenerateSummaryRequest): GenerateSummaryResponse

  /**
   * Generates an image from a text prompt
   *
   * @param request The image generation request
   * @return The generated image response
   */
  suspend fun generateImage(request: GenerateImageRequest): GenerateImageResponse

  /**
   * Exports a book with the given pages and options
   *
   * @param request The export request
   * @return InputStream containing the exported book data
   */
  suspend fun exportBook(request: ExportBookRequest): InputStream
}
