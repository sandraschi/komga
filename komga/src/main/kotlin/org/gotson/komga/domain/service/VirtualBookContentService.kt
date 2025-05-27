package org.gotson.komga.domain.service

import mu.KotlinLogging
import org.gotson.komga.infrastructure.epub.omnibus.Work
import org.springframework.core.io.Resource
import org.springframework.core.io.UrlResource
import org.springframework.stereotype.Service
import java.io.File
import java.io.IOException
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths

private val logger = KotlinLogging.logger {}

/**
 * Service for handling virtual book content operations.
 */
@Service
class VirtualBookContentService(
  private val virtualBookService: VirtualBookService,
  private val epubExtractionService: EpubExtractionService,
) {
  companion object {
    private const val TEMP_DIR_PREFIX = "komga-omnibus-"
    private const val CACHE_DIR_NAME = "omnibus-cache"
  }

  /**
   * Get the content of a virtual book as a resource.
   */
  @Throws(VirtualBookContentNotFoundException::class)
  fun getVirtualBookContent(virtualBookId: String): Resource {
    val virtualBookWithOmnibus = virtualBookService.getVirtualBookWithOmnibus(virtualBookId)
    val virtualBook = virtualBookWithOmnibus.virtualBook
    val omnibus = virtualBookWithOmnibus.omnibus

    val omnibusFile =
      try {
        File(omnibus.url.toURI())
      } catch (e: Exception) {
        throw VirtualBookContentNotFoundException("Invalid omnibus file URI: ${omnibus.url}", e)
      }

    if (!omnibusFile.exists()) {
      throw VirtualBookContentNotFoundException("Omnibus file not found: ${omnibus.url}")
    }

    // Create a work object from the virtual book
    val work =
      Work(
        title = virtualBook.title,
        href = virtualBook.url.path.substringAfterLast('/'),
        position = virtualBook.number?.toInt() ?: 1,
        type = Work.WorkType.GENERIC_ENTRY,
        metadata =
          virtualBook.metadata.let { metadata ->
            mapOf(
              "title" to metadata.title,
              "authors" to (metadata.authors?.joinToString(", ") ?: ""),
              "description" to (metadata.summary ?: ""),
              "language" to (metadata.language ?: ""),
            )
          },
      )

    // Get or create the cache directory
    val cacheDir = getOrCreateCacheDir()

    // Generate a unique filename for the extracted work
    val outputFileName = "${omnibusFile.nameWithoutExtension}-${virtualBook.id}.epub"
    val outputFile = cacheDir.resolve(outputFileName).toFile()

    // Check if we already have a cached version
    if (!outputFile.exists()) {
      try {
        // Extract the work from the omnibus
        epubExtractionService.extractWork(work, omnibusFile, outputFile)

        // Set appropriate permissions
        outputFile.setReadable(true, false)
        outputFile.setWritable(true, true)

        logger.info { "Extracted work '${work.title}' to ${outputFile.absolutePath}" }
      } catch (e: Exception) {
        // Clean up partially extracted file if it exists
        if (outputFile.exists()) {
          outputFile.delete()
        }
        throw VirtualBookContentNotFoundException("Failed to extract work from omnibus: ${e.message}", e)
      }
    }

    return try {
      UrlResource(outputFile.toURI())
    } catch (e: IOException) {
      throw VirtualBookContentNotFoundException("Failed to access extracted work: ${e.message}", e)
    }
  }

  /**
   * Check if a virtual book content exists.
   */
  fun virtualBookContentExists(virtualBookId: String): Boolean =
    try {
      val virtualBookWithOmnibus = virtualBookService.getVirtualBookWithOmnibus(virtualBookId)
      val omnibus = virtualBookWithOmnibus.omnibus
      val file = File(omnibus.url.toURI())
      file.exists()
    } catch (e: Exception) {
      logger.warn(e) { "Error checking if virtual book content exists: $virtualBookId" }
      false
    }

  /**
   * Get or create the cache directory for extracted works.
   */
  private fun getOrCreateCacheDir(): Path {
    val tempDir = System.getProperty("java.io.tmpdir")
    val cacheDir = Paths.get(tempDir, CACHE_DIR_NAME)

    if (!Files.exists(cacheDir)) {
      Files.createDirectories(cacheDir)
      logger.debug { "Created cache directory at $cacheDir" }
    }

    // Set appropriate permissions
    cacheDir.toFile().setReadable(true, false)
    cacheDir.toFile().setWritable(true, false)
    cacheDir.toFile().setExecutable(true, false)

    return cacheDir
  }

  /**
   * Clean up old cached files.
   * This should be called periodically to prevent the cache from growing too large.
   */
  fun cleanupCache(maxAgeHours: Long = 24) {
    val cacheDir = getOrCreateCacheDir().toFile()
    val now = System.currentTimeMillis()
    val maxAgeMillis = maxAgeHours * 60 * 60 * 1000

    cacheDir.listFiles()?.forEach { file ->
      try {
        if (now - file.lastModified() > maxAgeMillis) {
          val deleted = file.delete()
          if (deleted) {
            logger.debug { "Deleted old cached file: ${file.absolutePath}" }
          } else {
            logger.warn { "Failed to delete old cached file: ${file.absolutePath}" }
          }
        }
      } catch (e: Exception) {
        logger.error(e) { "Error cleaning up cached file: ${file.absolutePath}" }
      }
    }
  }

  class VirtualBookContentNotFoundException : RuntimeException {
    constructor(message: String) : super(message)
    constructor(message: String, cause: Throwable) : super(message, cause)
  }
}
