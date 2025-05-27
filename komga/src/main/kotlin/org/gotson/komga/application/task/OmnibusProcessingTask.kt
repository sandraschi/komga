package org.gotson.komga.application.task

import mu.KotlinLogging
import org.gotson.komga.domain.model.Book
import org.gotson.komga.domain.model.OmnibusType
import org.gotson.komga.domain.service.BookAnalyzer
import org.gotson.komga.domain.service.VirtualBookService
import org.gotson.komga.infrastructure.epub.omnibus.OmnibusService
import org.springframework.stereotype.Component
import org.springframework.transaction.event.TransactionalEventListener

private val logger = KotlinLogging.logger {}

/**
 * Task that processes books to detect and handle omnibus editions.
 */
@Component
class OmnibusProcessingTask(
  private val omnibusService: OmnibusService,
  private val bookAnalyzer: BookAnalyzer,
  private val virtualBookService: VirtualBookService,
) {
  /**
   * Process a book to detect if it's an omnibus and extract virtual books if needed.
   */
  @TransactionalEventListener
  fun processBook(book: Book) {
    try {
      logger.info { "Processing book for omnibus detection: ${book.id} - ${book.name}" }

      // Skip if the book is not an EPUB
      if (!book.media.mediaType.equals("application/epub+zip", ignoreCase = true)) {
        logger.debug { "Skipping non-EPUB book: ${book.id}" }
        return
      }

      // Process the book with the omnibus service
      val omnibusType = omnibusService.processBook(book)

      if (omnibusType != OmnibusType.NONE) {
        logger.info { "Processed omnibus book: ${book.id} - ${book.name} (Type: $omnibusType)" }

        // Re-analyze the book to update metadata and other attributes
        bookAnalyzer.analyze(book)
      }
    } catch (e: Exception) {
      logger.error(e) { "Error processing book for omnibus detection: ${book.id}" }
    }
  }

  /**
   * Process all books in the library to detect omnibus editions.
   * This is useful for initial setup or when the detection logic is updated.
   */
  suspend fun processAllBooks() {
    logger.info { "Starting omnibus detection for all books" }

    // In a real implementation, you would fetch all books from the repository
    // and process them in batches to avoid memory issues
    // For now, this is a placeholder
    logger.warn { "Processing all books is not yet implemented" }
  }
}
