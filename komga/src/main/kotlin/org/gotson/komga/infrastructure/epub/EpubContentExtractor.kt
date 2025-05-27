package org.gotson.komga.infrastructure.epub

import mu.KotlinLogging
import nl.siegmann.epublib.domain.Book
import nl.siegmann.epublib.domain.Resource
import nl.siegmann.epublib.epub.EpubReader
import org.springframework.stereotype.Component
import java.io.File
import java.io.FileInputStream
import java.io.InputStream

private val logger = KotlinLogging.logger {}

/**
 * Service for extracting content from EPUB files.
 */
@Component
class EpubContentExtractor {
    private val epubReader = EpubReader()

    /**
     * Reads an EPUB file and returns a Book object.
     *
     * @param file The EPUB file to read
     * @return A Book object representing the EPUB
     */
    fun getEpubBook(file: File): Book {
        logger.debug { "Reading EPUB file: ${file.absolutePath}" }
        return FileInputStream(file).use { inputStream ->
            epubReader.readEpub(inputStream)
        }
    }

    /**
     * Reads an EPUB from an InputStream and returns a Book object.
     *
     * @param inputStream The input stream containing the EPUB data
     * @return A Book object representing the EPUB
     */
    fun getEpubBook(inputStream: InputStream): Book {
        logger.debug { "Reading EPUB from input stream" }
        return epubReader.readEpub(inputStream)
    }

    /**
     * Gets the content of a resource as a string.
     *
     * @param resource The resource to get content from
     * @return The content as a string
     */
    fun getResourceContent(resource: Resource): String {
        return String(resource.data, Charsets.UTF_8)
    }

    /**
     * Checks if a resource is a CSS file.
     *
     * @param href The resource href
     * @return true if the resource is a CSS file, false otherwise
     */
    fun isCss(href: String): Boolean {
        return href.endsWith(".css", ignoreCase = true)
    }

    /**
     * Checks if a resource is an XML file.
     *
     * @param href The resource href
     * @return true if the resource is an XML file, false otherwise
     */
    fun isXml(href: String): Boolean {
        return href.endsWith(".xml", ignoreCase = true) ||
            href.endsWith(".opf", ignoreCase = true) ||
            href.endsWith(".ncx", ignoreCase = true)
    }

    /**
     * Checks if a resource is an XHTML file.
     *
     * @param href The resource href
     * @return true if the resource is an XHTML file, false otherwise
     */
    fun isXhtml(href: String): Boolean {
        return href.endsWith(".xhtml", ignoreCase = true) ||
            href.endsWith(".html", ignoreCase = true) ||
            href.endsWith(".htm", ignoreCase = true)
    }
}
