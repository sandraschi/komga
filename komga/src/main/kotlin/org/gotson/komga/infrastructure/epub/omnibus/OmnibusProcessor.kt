package org.gotson.komga.infrastructure.epub.omnibus

import mu.KotlinLogging
import org.gotson.komga.domain.model.Book
import org.gotson.komga.domain.model.VirtualBook
import org.gotson.komga.domain.service.VirtualBookLifecycle
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.io.File

private val logger = KotlinLogging.logger {}

/**
 * Handles the processing of omnibus files and creation of virtual books.
 */
@Service
@Transactional
class OmnibusProcessor(
  private val epubTocParser: EpubTocParser,
  private val virtualBookService: VirtualBookLifecycle,
  private val metadataService: OmnibusMetadataService,
) {
  private val omnibusMediaType = "application/epub+omnibus"

  /**
   * Processes an omnibus file and creates virtual books for each work.
   *
   * @param book The book to process
   * @param bookFile The EPUB file to process
   * @param omnibusType The type of omnibus
   * @return The number of virtual books created
   */
  fun processOmnibus(
    book: Book,
    bookFile: File,
    omnibusType: String,
  ): Int {
    return try {
      val works = epubTocParser.extractWorks(book, bookFile)
      if (works.isEmpty()) {
        logger.warn { "No works found in $omnibusType omnibus: ${book.name}" }
        return 0
      }

      val virtualBooks = works.map { createVirtualBook(book, it) }
      virtualBookService.createVirtualBooks(book, virtualBooks)

      logger.info {
        "Successfully created ${virtualBooks.size} virtual books for $omnibusType omnibus: ${book.name}"
      }
      virtualBooks.size
    } catch (e: Exception) {
      logger.error(e) { "Failed to process $omnibusType omnibus: ${book.name}" }
      throw e
    }
  }

  /**
   * Creates a virtual book from a work in the omnibus.
   */
  private fun createVirtualBook(
    book: Book,
    work: Work,
  ): VirtualBook {
    val media =
      book.media
        .copy(mediaType = omnibusMediaType)

    val description =
      metadataService
        .extractDescription(work.metadata)

    val metadata =
      metadataService
        .createBookMetadata(
          bookId = book.id,
          workTitle = work.title,
          omnibusTitle = book.name,
          description = description,
          position = work.position,
        )

    return VirtualBook(
      book = book,
      media = media,
      metadata = metadata,
      omnibusId = book.id,
      number = work.position.toFloat(),
      title = work.title,
    )
  }
}
