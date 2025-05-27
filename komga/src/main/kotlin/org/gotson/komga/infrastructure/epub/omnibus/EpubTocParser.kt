package org.gotson.komga.infrastructure.epub.omnibus

import mu.KotlinLogging
import nl.siegmann.epublib.domain.TOCReference
import org.gotson.komga.domain.model.Book
import org.gotson.komga.infrastructure.epub.EpubContentExtractor
import org.springframework.stereotype.Service
import java.io.File
import java.util.Locale
import nl.siegmann.epublib.domain.Book as EpubBook

private val logger = KotlinLogging.logger {}

/**
 * Parses the table of contents of an EPUB to identify individual works.
 */
@Service
class EpubTocParser(
  private val epubContentExtractor: EpubContentExtractor,
) {
  // Common prefixes and suffixes to clean up from work titles
  private val titleCleanupRegexes =
    listOf(
      "^\\d+[\\s.-]+".toRegex(), // Leading numbers with separators
      "[\\[({].*?[})\\]\]".toRegex(), // Anything in brackets/parentheses
      "[\\s.,;:]+$".toRegex(), // Trailing punctuation
    )

  /**
   * Extracts individual works from an EPUB based on its table of contents.
   */
  fun extractWorks(
    book: Book,
    epubFile: File,
  ): List<Work> =
    try {
      val epubBook = epubContentExtractor.getEpubBook(epubFile)
      val toc = epubBook.tableOfContents.tocReferences

      // Extract metadata from the EPUB
      val metadata = extractMetadata(epubBook)

      // Try different extraction strategies
      val works =
        when (detectTocType(toc)) {
          TocType.DELPHI_CLASSICS -> extractDelphiClassicsWorks(book, epubBook, toc, metadata)
          TocType.GENERIC -> extractGenericWorks(book, epubBook, toc, metadata)
          TocType.SHAKESPEARE -> extractShakespeareWorks(book, epubBook, toc, metadata)
          TocType.UNKNOWN -> emptyList()
        }

      // If no works found, try fallback extraction
      works.ifEmpty { fallbackExtraction(book, epubBook, metadata) }
    } catch (e: Exception) {
      logger.error(e) { "Error extracting works from EPUB: ${book.name}" }
      emptyList()
    }

  private fun detectTocType(toc: List<TOCReference>): TocType {
    if (toc.isEmpty()) return TocType.UNKNOWN

    // Check for Shakespeare pattern (Complete Works with plays as top-level entries)
    val firstLevelTitles = toc.map { it.title?.lowercase(Locale.getDefault()) ?: "" }
    val shakespeareKeywords = listOf("hamlet", "macbeth", "romeo", "juliet", "lear", "othello")
    if (firstLevelTitles.any { title -> shakespeareKeywords.any { keyword -> title.contains(keyword) } }) {
      return TocType.SHAKESPEARE
    }

    // Check for Delphi Classics pattern (each work is a child of a section)
    val firstLevel = toc.first()
    if (firstLevel.children.isNotEmpty() && firstLevel.children.all { it.children.isEmpty() }) {
      return TocType.DELPHI_CLASSICS
    }

    // Check for generic pattern (multiple top-level entries)
    if (toc.size > 1) {
      return TocType.GENERIC
    }

    return TocType.UNKNOWN
  }

  private fun extractShakespeareWorks(
    book: Book,
    epubBook: EpubBook,
    toc: List<TOCReference>,
    metadata: Map<String, String>,
  ): List<Work> {
    logger.info { "Processing Shakespeare works format" }

    return toc.mapIndexedNotNull { index, entry ->
      val title = cleanTitle(entry.title ?: return@mapIndexedNotNull null)

      Work(
        title = title,
        href = entry.resource?.href ?: "",
        position = index + 1,
        type = determineWorkType(title),
        metadata = metadata + mapOf("author" to "William Shakespeare"),
      )
    }
  }

  private fun extractDelphiClassicsWorks(
    book: Book,
    epubBook: EpubBook,
    toc: List<TOCReference>,
    metadata: Map<String, String>,
  ): List<Work> {
    logger.info { "Processing Delphi Classics format" }

    return toc.flatMap { section ->
      section.children.mapIndexed { index, work ->
        val title = cleanTitle(work.title ?: "Work ${index + 1}")

        Work(
          title = title,
          href = work.resource?.href ?: "",
          position = index + 1,
          type = WorkType.DELPHI_CHAPTER,
          metadata = metadata + mapOf("section" to (section.title ?: "")),
        )
      }
    }
  }

  private fun extractGenericWorks(
    book: Book,
    epubBook: EpubBook,
    toc: List<TOCReference>,
    metadata: Map<String, String>,
  ): List<Work> {
    logger.info { "Processing generic TOC format" }

    return toc.mapIndexed { index, entry ->
      val title = cleanTitle(entry.title ?: "Work ${index + 1}")

      Work(
        title = title,
        href = entry.resource?.href ?: "",
        position = index + 1,
        type = determineWorkType(title),
        metadata = metadata,
      )
    }
  }

  private fun fallbackExtraction(
    book: Book,
    epubBook: EpubBook,
    metadata: Map<String, String>,
  ): List<Work> {
    logger.info { "Falling back to spine-based extraction" }

    return epubBook.spine.spineReferences.mapIndexed { index, spineRef ->
      val resource = spineRef.resource
      Work(
        title = "Work ${index + 1}",
        href = resource.href,
        position = index + 1,
        type = WorkType.OTHER,
        metadata = metadata,
      )
    }
  }

  private fun extractMetadata(epubBook: EpubBook): Map<String, String> {
    val metadata = mutableMapOf<String, String>()

    try {
      epubBook.metadata.titles.firstOrNull()?.let {
        metadata["title"] = it
      }

      epubBook.metadata.authors.forEachIndexed { index, author ->
        val authorName = "${author.firstname ?: ""} ${author.lastname ?: ""}".trim()
        if (authorName.isNotBlank()) {
          metadata["author$index"] = authorName
        }
      }

      epubBook.metadata.descriptions.firstOrNull()?.let {
        metadata["description"] = it
      }

      epubBook.metadata.language?.let {
        metadata["language"] = it
      }

      epubBook.metadata.publishers.takeIf { it.isNotEmpty() }?.let { publishers ->
        metadata["publisher"] = publishers.joinToString(", ")
      }
    } catch (e: Exception) {
      logger.error(e) { "Error extracting metadata from EPUB" }
    }

    return metadata
  }

  private fun cleanTitle(title: String): String {
    var cleaned = title.trim()

    // Apply cleanup regexes
    titleCleanupRegexes.forEach { regex ->
      cleaned = cleaned.replace(regex, "")
    }

    return cleaned.trim()
  }

  private fun determineWorkType(title: String): WorkType {
    val lowerTitle = title.lowercase(Locale.getDefault())

    return when {
      lowerTitle.contains("sonnet") -> WorkType.POEM
      lowerTitle.contains("poem") -> WorkType.POEM
      lowerTitle.contains("play") -> WorkType.PLAY
      lowerTitle.contains("act") && lowerTitle.contains("scene") -> WorkType.PLAY
      lowerTitle.contains("essay") -> WorkType.ESSAY
      lowerTitle.contains("letter") -> WorkType.LETTER
      lowerTitle.contains("chapter") -> WorkType.DELPHI_CHAPTER
      lowerTitle.contains("short") && lowerTitle.contains("story") -> WorkType.SHORT_STORY
      lowerTitle.contains("novel") -> WorkType.NOVEL
      else -> WorkType.GENERIC_ENTRY
    }
  }

  private enum class TocType {
    SHAKESPEARE, // Complete Works of Shakespeare format
    DELPHI_CLASSICS, // Each work is a child of a section
    GENERIC, // Each top-level entry is a work
    UNKNOWN, // Could not determine structure
  }
}

/**
 * Represents a work within an omnibus.
 */
data class Work(
  val title: String,
  val href: String,
  val position: Int,
  val type: WorkType,
  val metadata: Map<String, String> = emptyMap(),
)

/**
 * Type of work within an omnibus.
 */
enum class WorkType {
  DELPHI_CHAPTER, // A chapter in a Delphi Classics omnibus
  GENERIC_ENTRY, // A generic entry in an omnibus
  NOVEL, // A complete novel
  SHORT_STORY, // A short story
  ESSAY, // An essay or article
  PLAY, // A theatrical play
  POEM, // A poem or collection of poems
  LETTER, // A letter or collection of letters
  OTHER, // Other type of work
}
