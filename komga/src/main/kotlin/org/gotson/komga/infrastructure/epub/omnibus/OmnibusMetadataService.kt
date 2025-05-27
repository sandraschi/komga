package org.gotson.komga.infrastructure.epub.omnibus

import mu.KotlinLogging
import nl.siegmann.epublib.domain.Book as EpubBook
import org.gotson.komga.domain.model.Author
import org.gotson.komga.domain.model.BookMetadata
import org.gotson.komga.infrastructure.epub.EpubContentExtractor
import org.gotson.komga.infrastructure.metadata.epub.EpubMetadataProvider
import org.jsoup.Jsoup
import org.jsoup.parser.Parser
import org.springframework.stereotype.Service
import java.io.File
import java.time.LocalDate
import java.time.format.DateTimeFormatter

private val logger = KotlinLogging.logger {}

private const val DESCRIPTION_KEY = "description"

/**
 * Service responsible for creating and managing metadata for omnibus virtual books.
 */
@Service
class OmnibusMetadataService(
  private val epubContentExtractor: EpubContentExtractor,
  private val epubMetadataProvider: EpubMetadataProvider
) {
  fun getMetadata(epubFile: File): BookMetadata {
    return try {
      val epubBook = epubContentExtractor.getEpubBook(epubFile)
      extractMetadataFromEpub(epubBook)
    } catch (e: Exception) {
      logger.error(e) { "Failed to extract metadata from EPUB: ${epubFile.name}" }
      createDefaultMetadata()
    }
  }

  private fun extractMetadataFromEpub(epubBook: EpubBook): BookMetadata {
    val metadata = epubBook.metadata
    val title = metadata.titles.firstOrNull() ?: ""
    val description = metadata.descriptions.firstOrNull() ?: ""
    val authors = metadata.authors.map { Author(it.firstname + " " + it.lastname, "writer") }
    val isbn = metadata.identifiers.values.firstOrNull() ?: ""
    val date = metadata.dates.firstOrNull()?.value?.let { parseDate(it) }

    return BookMetadata(
      title = title,
      summary = description,
      number = "1",
      numberSort = 1f,
      releaseDate = date,
      authors = authors,
      tags = emptySet(),
      isbn = isbn,
      links = emptyList(),
      bookId = "",
      titleLock = false,
      summaryLock = false,
      numberLock = false,
      numberSortLock = false,
      releaseDateLock = false,
      authorsLock = false,
      tagsLock = false,
      isbnLock = false,
      linksLock = false,
    )
  }

  private fun createDefaultMetadata(): BookMetadata {
    return BookMetadata(
      title = "",
      summary = "",
      number = "",
      numberSort = 0f,
      releaseDate = null,
      authors = emptyList(),
      tags = emptySet(),
      isbn = "",
      links = emptyList(),
      bookId = "",
      titleLock = false,
      summaryLock = false,
      numberLock = false,
      numberSortLock = false,
      releaseDateLock = false,
      authorsLock = false,
      tagsLock = false,
      isbnLock = false,
      linksLock = false,
    )
  }

  private fun parseDate(dateStr: String): LocalDate? {
    return try {
      LocalDate.parse(dateStr, DateTimeFormatter.ISO_DATE)
    } catch (e: Exception) {
      logger.warn { "Failed to parse date: $dateStr" }
      null
    }
  }

  fun createBookMetadata(
    bookId: String,
    workTitle: String,
    omnibusTitle: String,
    description: String,
    position: Int,
  ): BookMetadata {
    val positionFloat = position.toFloat()

    return BookMetadata(
      title = workTitle,
      summary = "Part of omnibus: $omnibusTitle$description",
      number = position.toString(),
      numberSort = positionFloat,
      releaseDate = null,
      authors = emptyList(),
      tags = emptySet(),
      isbn = "",
      links = emptyList(),
      bookId = bookId,
      titleLock = false,
      summaryLock = false,
      numberLock = false,
      numberSortLock = false,
      releaseDateLock = false,
      authorsLock = false,
      tagsLock = false,
      isbnLock = false,
      linksLock = false,
    )
  }

  fun extractDescription(metadata: Map<String, String>): String = metadata[DESCRIPTION_KEY]?.let { "\n\n$it" } ?: ""
}
