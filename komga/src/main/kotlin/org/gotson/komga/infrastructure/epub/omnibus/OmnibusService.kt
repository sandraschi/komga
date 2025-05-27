package org.gotson.komga.infrastructure.epub.omnibus

import mu.KotlinLogging
import org.gotson.komga.domain.model.Book
import org.gotson.komga.domain.model.OmnibusType
import org.gotson.komga.domain.service.BookAnalyzer
import org.gotson.komga.domain.service.VirtualBookLifecycle
import org.gotson.komga.infrastructure.metadata.epub.EpubMetadataProvider
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.io.File

private val logger = KotlinLogging.logger {}
private const val EPUB_MIME_TYPE = "application/epub+zip"

/**
 * Main service for detecting and processing omnibus EPUB files.
 * An omnibus is a collection of multiple works published in a single volume.
 */
@Service
class OmnibusService(
  private val omnibusDetector: OmnibusDetector,
  private val bookAnalyzer: BookAnalyzer,
  private val epubMetadataProvider: EpubMetadataProvider,
  private val omnibusProcessor: OmnibusProcessor,
  private val virtualBookService: VirtualBookLifecycle,
) {
  /**
   * Processes a book to detect if it's an omnibus and extracts works if needed.
   *
   * @param book The book to process
   * @return The detected [OmnibusType]
   */
  @Transactional
  fun processBook(book: Book): OmnibusType {
    if (!book.media.mediaType.equals(EPUB_MIME_TYPE, ignoreCase = true)) {
      return OmnibusType.NONE
    }

    return try {
      val bookFile = File(book.url.toURI())
      val omnibusType = omnibusDetector.detectOmnibus(bookFile)
      processOmnibusType(book, bookFile, omnibusType)
      omnibusType
    } catch (e: Exception) {
      logger.error(e) { "Error processing book ${book.id} for omnibus detection" }
      OmnibusType.NONE
    }
  }

  private fun processOmnibusType(
    book: Book,
    bookFile: File,
    type: OmnibusType,
  ) {
    when (type) {
      OmnibusType.DELPHI_CLASSICS -> omnibusProcessor.processOmnibus(book, bookFile, "Delphi Classics")
      OmnibusType.GENERIC_OMNIBUS -> omnibusProcessor.processOmnibus(book, bookFile, "Generic")
      OmnibusType.NONE -> virtualBookService.deleteVirtualBooksByOmnibus(book.id)
    }
  }
}
