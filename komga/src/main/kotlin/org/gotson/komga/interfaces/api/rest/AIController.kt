package org.gotson.komga.interfaces.api.rest

import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import org.gotson.komga.domain.service.AIService
import org.gotson.komga.interfaces.api.rest.dto.ExportBookRequest
import org.gotson.komga.interfaces.api.rest.dto.GenerateImageRequest
import org.gotson.komga.interfaces.api.rest.dto.GenerateImageResponse
import org.gotson.komga.interfaces.api.rest.dto.GenerateSummaryRequest
import org.gotson.komga.interfaces.api.rest.dto.GenerateSummaryResponse
import org.gotson.komga.interfaces.api.rest.response.RestResponse
import org.gotson.komga.interfaces.api.rest.response.RestResponseEntity
import org.springframework.core.io.InputStreamResource
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody

@RestController
@RequestMapping("/api/v1/ai", produces = [MediaType.APPLICATION_JSON_VALUE])
@Tag(name = "AI", description = "AI-powered features")
class AIController(
  private val aiService: AIService,
) {
  private val logger = org.slf4j.LoggerFactory.getLogger(javaClass)

  @PostMapping("/generate-summary")
  @Operation(
    summary = "Generate a book summary",
    description = "Generates a summary of the specified book using AI",
  )
  @PreAuthorize("hasRole('ADMIN')")
  @SecurityRequirement(name = "httpBasic", scopes = ["admin"])
  suspend fun generateSummary(
    @AuthenticationPrincipal user: org.gotson.komga.domain.model.KomgaUser,
    @Valid @RequestBody request: GenerateSummaryRequest,
  ): RestResponseEntity<GenerateSummaryResponse> {
    logger.info("Generating summary for book: ${request.bookId}, type: ${request.type}")
    val response = aiService.generateSummary(request)
    return RestResponse.of(response).toResponseEntity()
  }

  @PostMapping("/generate-image")
  @Operation(
    summary = "Generate an image from a text prompt",
    description = "Generates an image based on the provided text prompt using AI",
  )
  @PreAuthorize("hasRole('ADMIN')")
  @SecurityRequirement(name = "httpBasic", scopes = ["admin"])
  suspend fun generateImage(
    @AuthenticationPrincipal user: org.gotson.komga.domain.model.KomgaUser,
    @Valid @RequestBody request: GenerateImageRequest,
  ): RestResponseEntity<GenerateImageResponse> {
    logger.info("Generating image with prompt: ${request.prompt.take(100)}...")
    val response = aiService.generateImage(request)
    return RestResponse.of(response).toResponseEntity()
  }

  @PostMapping("/export-book")
  @Operation(
    summary = "Export a book with AI-generated content",
    description = "Exports a book with the provided pages and options",
  )
  @PreAuthorize("hasRole('ADMIN')")
  @SecurityRequirement(name = "httpBasic", scopes = ["admin"])
  fun exportBook(
    @AuthenticationPrincipal user: org.gotson.komga.domain.model.KomgaUser,
    @Valid @RequestBody request: ExportBookRequest,
  ): ResponseEntity<StreamingResponseBody> {
    logger.info("Exporting book: ${request.bookId}, format: ${request.format}")

    val resource =
      object : InputStreamResource(aiService.exportBook(request)) {
        override fun getFilename(): String {
          val safeTitle = request.title.replace("[^a-zA-Z0-9.-]".toRegex(), "_")
          return "$safeTitle.${request.format.lowercase()}"
        }
      }

    return ResponseEntity
      .ok()
      .contentType(MediaType.APPLICATION_OCTET_STREAM)
      .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"${resource.filename}\"")
      .body { output ->
        resource.inputStream.use { input ->
          input.copyTo(output)
        }
      }
  }
}
