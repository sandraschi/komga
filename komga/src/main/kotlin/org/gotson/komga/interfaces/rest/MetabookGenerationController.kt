package org.gotson.komga.interfaces.rest

import org.gotson.komga.domain.service.BookLifecycle
import org.gotson.komga.infrastructure.llm.MetabookGenerationService
import org.gotson.komga.interfaces.rest.request.MetabookGenerationRequest
import org.gotson.komga.interfaces.rest.response.MetabookGenerationResponse
import org.gotson.komga.library.LibraryService
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("api/v1/books", produces = [MediaType.APPLICATION_JSON_VALUE])
class MetabookGenerationController(
  private val libraryService: LibraryService,
  private val bookLifecycle: BookLifecycle,
  private val metabookGenerationService: MetabookGenerationService,
) {
  @PostMapping("{bookId}/metabook/generate")
  @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGE_BOOKS') or hasRole('EDIT_BOOKS')")
  @ResponseStatus(HttpStatus.OK)
  fun generateMetabook(
    @PathVariable bookId: String,
    @RequestBody request: MetabookGenerationRequest,
  ): MetabookGenerationResponse {
    val book = bookLifecycle.getBookOrThrow(bookId)
    val series = book.seriesId?.let { libraryService.getSeriesOrNull(it) }

    val result =
      metabookGenerationService.generateMetabook(
        book = book,
        series = series,
        options =
          MetabookGenerationService.GenerationOptions(
            generateTitle = request.generateTitle,
            generateSummary = request.generateSummary,
            generateTags = request.generateTags,
            generateGenres = request.generateGenres,
            generateAgeRating = request.generateAgeRating,
            generateReadingDirection = request.generateReadingDirection,
            generatePublisher = request.generatePublisher,
            generateLanguage = request.generateLanguage,
            generateReleaseDate = request.generateReleaseDate,
            confidenceThreshold = request.confidenceThreshold ?: 0.7f,
            model = request.model,
            temperature = request.temperature ?: 0.3f,
            maxTokens = request.maxTokens ?: 1000,
          ),
      )

    return MetabookGenerationResponse(
      title = result.title,
      summary = result.summary,
      tags = result.tags.toList(),
      genres = result.genres.toList(),
      ageRating = result.ageRating,
      readingDirection = result.readingDirection,
      publisher = result.publisher,
      language = result.language,
      releaseDate = result.releaseDate,
      confidence = result.confidence,
      warnings = result.warnings,
      errors = result.errors,
    )
  }

  @PostMapping("{bookId}/metabook/apply")
  @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGE_BOOKS') or hasRole('EDIT_BOOKS')")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  fun applyMetabook(
    @PathVariable bookId: String,
    @RequestBody request: MetabookGenerationResponse,
  ) {
    val book = bookLifecycle.getBookOrThrow(bookId)

    // Update book metadata
    val updatedBook =
      book.copy(
        metadata =
          book.metadata.copy(
            title = request.title ?: book.metadata.title,
            summary = request.summary ?: book.metadata.summary,
            tags = request.tags.toSet() + book.metadata.tags,
            genres = request.genres.toSet() + book.metadata.genres,
            ageRating = request.ageRating ?: book.metadata.ageRating,
            readingDirection = request.readingDirection ?: book.metadata.readingDirection,
            publisher = request.publisher ?: book.metadata.publisher,
            language = request.language ?: book.metadata.language,
            releaseDate = request.releaseDate ?: book.metadata.releaseDate,
          ),
      )

    // Save the updated book
    bookLifecycle.updateMetadata(updatedBook)
  }
}

data class MetabookGenerationRequest(
  val generateTitle: Boolean = true,
  val generateSummary: Boolean = true,
  val generateTags: Boolean = true,
  val generateGenres: Boolean = true,
  val generateAgeRating: Boolean = true,
  val generateReadingDirection: Boolean = true,
  val generatePublisher: Boolean = true,
  val generateLanguage: Boolean = true,
  val generateReleaseDate: Boolean = true,
  val confidenceThreshold: Float? = null,
  val model: String? = null,
  val temperature: Float? = null,
  val maxTokens: Int? = null,
)

data class MetabookGenerationResponse(
  val title: String?,
  val summary: String?,
  val tags: List<String>,
  val genres: List<String>,
  val ageRating: Int?,
  val readingDirection: String?,
  val publisher: String?,
  val language: String?,
  val releaseDate: String?,
  val confidence: Float,
  val warnings: List<String>,
  val errors: List<String>,
)
