package org.gotson.komga.domain.service

import mu.KotlinLogging
import nl.siegmann.epublib.domain.Resource
import nl.siegmann.epublib.epub.EpubWriter
import nl.siegmann.epublib.domain.MediaType
import org.gotson.komga.infrastructure.epub.EpubContentExtractor
import org.gotson.komga.infrastructure.epub.omnibus.Work
import org.springframework.stereotype.Service
import java.io.File
import java.io.FileOutputStream
import java.net.URL
import nl.siegmann.epublib.domain.Book as EpubBook

private val logger = KotlinLogging.logger {}

/**
 * Service for extracting content from EPUB files.
 */
@Service
class EpubExtractionService(
  private val epubContentExtractor: EpubContentExtractor,
) {
  /**
   * Extract a work from an omnibus EPUB file and save it as a new EPUB.
   *
   * @param work The work to extract
   * @param omnibusFile The omnibus EPUB file
   * @param outputFile The output file to save the extracted work
   * @return The path to the extracted work
   */
  fun extractWork(
    work: Work,
    omnibusFile: File,
    outputFile: File,
  ): File {
    logger.info { "Extracting work '${work.title}' from ${omnibusFile.name} to ${outputFile.absolutePath}" }

    // Create parent directories if they don't exist
    outputFile.parentFile?.mkdirs()

    // Read the omnibus EPUB
    val epubBook = epubContentExtractor.getEpubBook(omnibusFile)

    // Create a new EPUB for the work
    val workBook = EpubBook()

    // Copy metadata from the omnibus
    workBook.metadata = epubBook.metadata

    // Update the title to reflect the work
    workBook.metadata.titles = listOf(work.title)

    // Add the work's resources to the new EPUB
    val resources = findResourcesForWork(work, epubBook, omnibusFile)
    resources.forEach { resource ->
      workBook.resources.add(resource)
    }

    // Set the spine (order of reading)
    // For now, just add all resources in the order they appear in the work
    resources.forEach { resource ->
      workBook.spine.addResource(resource)
    }

    // Set the table of contents
    // This is a simplified version - in a real implementation, you'd want to preserve the TOC structure
    workBook.tableOfContents = epubBook.tableOfContents

    // Write the work EPUB to a file
    val writer = EpubWriter()
    writer.write(workBook, FileOutputStream(outputFile))

    return outputFile
  }

  /**
   * Find all resources that belong to a work in the omnibus.
   */
  private fun findResourcesForWork(
    work: Work,
    epubBook: EpubBook,
    omnibusFile: File,
  ): List<Resource> {
    val resources = mutableListOf<Resource>()

    // Get the main HTML file for the work
    val mainResource = epubBook.resources.getByIdOrHref(work.href)
    if (mainResource != null) {
      resources.add(mainResource)

      // Find all resources referenced by the main HTML file
      val referencedResources = findReferencedResources(mainResource, epubBook, omnibusFile)
      resources.addAll(referencedResources)
    }

    return resources.distinctBy { it.href }
  }

  /**
   * Find all resources referenced by an HTML resource (images, stylesheets, etc.).
   */
  private fun findReferencedResources(
    resource: Resource,
    epubBook: EpubBook,
    omnibusFile: File,
  ): List<Resource> {
    val referencedResources = mutableListOf<Resource>()

    try {
      // Parse the HTML to find references to other resources
      val html = String(resource.data, Charsets.UTF_8)
      val doc = org.jsoup.Jsoup.parse(html)

      // Find all elements with src, href, or data attributes that might reference other resources
      val elements =
        doc.select(
          """
          [src], [href], [data-src], [data-href], 
          link[rel="stylesheet"], 
          style:contains(@import), 
          style:contains(url())
          """.trimIndent(),
        )

      for (element in elements) {
        val url =
          when {
            element.hasAttr("src") -> element.attr("src")
            element.hasAttr("href") && element.tagName() != "a" -> element.attr("href")
            element.hasAttr("data-src") -> element.attr("data-src")
            element.hasAttr("data-href") -> element.attr("data-href")
            else -> null
          }

        if (!url.isNullOrBlank()) {
          val absoluteUrl = URL(URL("file:${omnibusFile.absolutePath}"), url).toString()
          val resourcePath = absoluteUrl.substringAfter("file:")
          val resource = epubBook.resources.getByHref(resourcePath)

          if (resource != null) {
            referencedResources.add(resource)

            // Recursively find resources referenced by this resource
            if (resource.mediaType.isCss() || resource.mediaType.isXml() || resource.mediaType.isXhtml()) {
              val nestedResources = findReferencedResources(resource, epubBook, omnibusFile)
              referencedResources.addAll(nestedResources)
            }
          }
        }
      }

      // Handle @import in CSS
      if (resource.mediaType.isCss()) {
        val css = String(resource.data, Charsets.UTF_8)
        val importRegex = "@import\s+[\"']([^\"']+)[\"']".toRegex()
        val matches = importRegex.findAll(css)

        for (match in matches) {
          val importUrl = match.groupValues[1]
          val absoluteUrl = URL(URL("file:${omnibusFile.absolutePath}"), importUrl).toString()
          val resourcePath = absoluteUrl.substringAfter("file:")
          val importedResource = epubBook.resources.getByHref(resourcePath)

          if (importedResource != null) {
            referencedResources.add(importedResource)

            // Recursively find resources referenced by the imported resource
            val nestedResources = findReferencedResources(importedResource, epubBook, omnibusFile)
            referencedResources.addAll(nestedResources)
          }
        }
      }
    } catch (e: Exception) {
      logger.error(e) { "Error finding referenced resources for ${resource.href}" }
    }

    return referencedResources.distinctBy { it.href }
  }
}

// Extension functions for MediaType
private fun MediaType.isCss(): Boolean = this.subType.equals("css", ignoreCase = true)

private fun MediaType.isXml(): Boolean = this.subType.equals("xml", ignoreCase = true) || 
    this.subType.endsWith("+xml", ignoreCase = true)

private fun MediaType.isXhtml(): Boolean = this.subType.equals("xhtml+xml", ignoreCase = true) ||
    this.subType.equals("html+xml", ignoreCase = true)
