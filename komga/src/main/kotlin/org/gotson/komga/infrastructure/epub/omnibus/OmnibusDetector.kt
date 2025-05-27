package org.gotson.komga.infrastructure.epub.omnibus

import mu.KotlinLogging
import org.gotson.komga.domain.model.OmnibusType
import org.gotson.komga.infrastructure.epub.EpubContentExtractor
import org.gotson.komga.infrastructure.metadata.epub.EpubMetadataProvider
import org.springframework.stereotype.Component
import java.io.File

private val logger = KotlinLogging.logger {}

/**
 * Detects omnibus EPUB files based on various heuristics.
 */
interface OmnibusDetector {
  /**
   * Detects if the given EPUB file is an omnibus edition.
   * @param epubFile The EPUB file to check
   * @return The detected OmnibusType or NONE if not an omnibus
   */
  fun detectOmnibus(epubFile: File): OmnibusType
}

@Component
class OmnibusDetectorImpl(
  private val epubContentExtractor: EpubContentExtractor,
  private val metadataService: OmnibusMetadataService
) : OmnibusDetector {
  // Title patterns that suggest an omnibus
  private val omnibusTitlePatterns =
    listOf(
      "(?i)^collected".toRegex(),
      "(?i)^complete".toRegex(),
      "(?i)omnibus".toRegex(),
      "(?i)collection".toRegex(),
      "(?i)anthology".toRegex(),
      "(?i)complete works".toRegex(),
      "(?i)collected works".toRegex(),
    )

  override fun detectOmnibus(epubFile: File): OmnibusType {
    try {
      val epubBook = epubContentExtractor.getEpubBook(epubFile)
      val title = epubBook.metadata.titles.firstOrNull()?.lowercase() ?: ""
      val authors = epubBook.metadata.authors

      // Check title patterns
      if (omnibusTitlePatterns.any { it.containsMatchIn(title) }) {
        logger.debug { "Detected generic omnibus by title: $title" }
        return OmnibusType.GENERIC_OMNIBUS
      }

      // Check for multiple authors (weaker indicator)
      if (authors.size > 1) {
        logger.debug { "Multiple authors detected, possible omnibus" }
        return OmnibusType.GENERIC_OMNIBUS
      }
    } catch (e: Exception) {
      logger.error(e) { "Error detecting omnibus for file: ${epubFile.name}" }
    }

    return OmnibusType.NONE
  }
}
