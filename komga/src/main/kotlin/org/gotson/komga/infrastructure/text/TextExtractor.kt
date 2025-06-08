package org.gotson.komga.infrastructure.text

import mu.KotlinLogging
import org.gotson.komga.domain.model.Book
import org.springframework.stereotype.Component
import java.io.InputStream

private val logger = KotlinLogging.logger {}

@Component
class TextExtractor {
  fun extractText(book: Book): String =
    when (book.media.mediaType) {
      "application/epub+zip" -> extractFromEpub(book)
      "application/pdf" -> extractFromPdf(book)
      "text/plain" -> extractFromText(book)
      else -> {
        logger.warn { "Unsupported media type for text extraction: ${book.media.mediaType}" }
        ""
      }
    }

  private fun extractFromEpub(book: Book): String {
    logger.debug { "Extracting text from EPUB: ${book.name}" }
    // TODO: Implement actual EPUB text extraction
    // This would involve:
    // 1. Extracting the EPUB file
    // 2. Parsing the OPF to find content documents
    // 3. Extracting and concatenating text from HTML/XML content
    return ""
  }

  private fun extractFromPdf(book: Book): String {
    logger.debug { "Extracting text from PDF: ${book.name}" }
    // TODO: Implement actual PDF text extraction
    // This would use a PDF library to extract text
    return ""
  }

  private fun extractFromText(book: Book): String {
    logger.debug { "Extracting text from plain text: ${book.name}" }
    // TODO: Implement text file reading
    return ""
  }

  private fun readBookContent(book: Book): InputStream {
    // TODO: Implement reading book content from storage
    // This would use the storage service to get an input stream to the book file
    throw UnsupportedOperationException("Reading book content not implemented")
  }
}
