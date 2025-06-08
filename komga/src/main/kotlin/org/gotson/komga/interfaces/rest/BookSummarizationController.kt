package org.gotson.komga.interfaces.rest

import org.gotson.komga.domain.service.BookLifecycle
import org.gotson.komga.infrastructure.llm.BookSummarizationService
import org.gotson.komga.library.LibraryService
import org.springframework.http.MediaType
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("api/v1/books", produces = [MediaType.APPLICATION_JSON_VALUE])
class BookSummarizationController(
  private val bookLifecycle: BookLifecycle,
  private val libraryService: LibraryService,
  private val bookSummarizationService: BookSummarizationService,
) {
  @PostMapping("{bookId}/summarize/minibook")
  @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGE_BOOKS') or hasRole('EDIT_BOOKS')")
  fun generateMinibook(
    @PathVariable bookId: String,
    @RequestParam(defaultValue = "10") pageCount: Int,
    @RequestParam(required = false) model: String?,
    @RequestParam(defaultValue = "0.7") temperature: Float,
  ): SummarizationResult {
    val book = bookLifecycle.getBookOrThrow(bookId)
    val series = book.seriesId?.let { libraryService.getSeriesOrNull(it) }

    return bookSummarizationService.generateMinibook(
      book = book,
      series = series,
      pageCount = pageCount,
      model = model,
      temperature = temperature,
    )
  }

  @PostMapping("{bookId}/summarize/microbook")
  @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGE_BOOKS') or hasRole('EDIT_BOOKS')")
  fun generateMicrobook(
    @PathVariable bookId: String,
    @RequestParam(required = false) model: String?,
    @RequestParam(defaultValue = "0.8") temperature: Float,
  ): SummarizationResult {
    val book = bookLifecycle.getBookOrThrow(bookId)
    val series = book.seriesId?.let { libraryService.getSeriesOrNull(it) }

    return bookSummarizationService.generateMicrobook(
      book = book,
      series = series,
      model = model,
      temperature = temperature,
    )
  }
}

data class SummarizationResult(
  val summary: String,
  val pages: List<SummarizedPage>,
  val modelUsed: String,
  val warnings: List<String> = emptyList(),
  val errors: List<String> = emptyList(),
)

data class SummarizedPage(
  val pageNumber: Int,
  val content: String,
  val imagePrompt: String?,
)
