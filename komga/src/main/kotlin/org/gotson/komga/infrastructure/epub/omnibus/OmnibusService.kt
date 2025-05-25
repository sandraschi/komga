package org.gotson.komga.infrastructure.epub.omnibus

import mu.KotlinLogging
import org.gotson.komga.application.service.VirtualBookLifecycle
import org.gotson.komga.domain.model.Book
import org.gotson.komga.domain.model.Media
import org.gotson.komga.domain.model.OmnibusType
import org.gotson.komga.domain.model.VirtualBook
import org.gotson.komga.domain.service.BookAnalyzer
import org.gotson.komga.infrastructure.metadata.epub.EpubMetadataProvider
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.io.File
import java.net.URL
import java.time.LocalDateTime
import java.util.*

private val logger = KotlinLogging.logger {}

/**
 * Service for handling omnibus EPUB files.
 */
@Service
class OmnibusService(
    private val omnibusDetector: OmnibusDetector,
    private val bookAnalyzer: BookAnalyzer,
    private val epubMetadataProvider: EpubMetadataProvider,
    private val epubTocParser: EpubTocParser,
    private val virtualBookService: VirtualBookLifecycle
) {
    
    /**
     * Processes a book to detect if it's an omnibus and extracts works if needed.
     * @param book The book to process
     * @return The detected OmnibusType
     */
    @Transactional
    fun processBook(book: Book): OmnibusType {
        if (!book.media.mediaType.equals("application/epub+zip", ignoreCase = true)) {
            return OmnibusType.NONE
        }
        
        val bookFile = File(book.url.toURI())
        val omnibusType = omnibusDetector.detectOmnibus(bookFile)
        
        when (omnibusType) {
            OmnibusType.DELPHI_CLASSICS -> handleDelphiClassics(book, bookFile)
            OmnibusType.GENERIC_OMNIBUS -> handleGenericOmnibus(book, bookFile)
            OmnibusType.NONE -> { /* Not an omnibus, clean up any existing virtual books */
                virtualBookService.deleteVirtualBooksByOmnibus(book.id)
            }
        }
        
        return omnibusType
    }
    
    private fun handleDelphiClassics(book: Book, bookFile: File) {
        logger.info { "Processing Delphi Classics omnibus: ${book.name}" }
        
        try {
            // Extract works from TOC
            val works = epubTocParser.extractWorks(book, bookFile)
            
            if (works.isEmpty()) {
                logger.warn { "No works found in Delphi Classics omnibus: ${book.name}" }
                return
            }
            
            // Create virtual books for each work
            val virtualBooks = works.map { work ->
                VirtualBook(
                    id = UUID.randomUUID().toString(),
                    omnibusId = book.id,
                    title = work.title,
                    sortTitle = work.title,
                    number = work.position.toFloat(),
                    numberSort = work.position.toFloat(),
                    fileLastModified = book.fileLastModified,
                    fileSize = book.fileSize,
                    size = book.size,
                    metadata = book.metadata.copy(
                        title = work.title,
                        number = work.position.toFloat(),
                        // Preserve series info but mark as part of omnibus
                        summary = "Part of omnibus: ${book.name}\n\n${work.metadata["description"] ?: ""}"
                    ),
                    media = book.media.copy(
                        // Update media type if needed
                        mediaType = "application/epub+omnibus"
                    ),
                    url = URL("virtual:${book.id}/${work.href}")
                )
            }
            
            // Save virtual books
            virtualBookService.createVirtualBooks(book, virtualBooks)
            logger.info { "Created ${virtualBooks.size} virtual books for omnibus: ${book.name}" }
            
        } catch (e: Exception) {
            logger.error(e) { "Error processing Delphi Classics omnibus: ${book.name}" }
        }
    }
    
    private fun handleGenericOmnibus(book: Book, bookFile: File) {
        logger.info { "Processing generic omnibus: ${book.name}" }
        
        try {
            // Extract works from TOC
            val works = epubTocParser.extractWorks(book, bookFile)
            
            if (works.isEmpty()) {
                logger.warn { "No works found in generic omnibus: ${book.name}" }
                return
            }
            
            // Create virtual books for each work
            val virtualBooks = works.map { work ->
                VirtualBook(
                    id = UUID.randomUUID().toString(),
                    omnibusId = book.id,
                    title = work.title,
                    sortTitle = work.title,
                    number = work.position.toFloat(),
                    numberSort = work.position.toFloat(),
                    fileLastModified = book.fileLastModified,
                    fileSize = book.fileSize,
                    size = book.size,
                    metadata = book.metadata.copy(
                        title = work.title,
                        number = work.position.toFloat(),
                        // Preserve series info but mark as part of omnibus
                        summary = "Part of omnibus: ${book.name}\n\n${work.metadata["description"] ?: ""}"
                    ),
                    media = book.media.copy(
                        // Update media type if needed
                        mediaType = "application/epub+omnibus"
                    ),
                    url = URL("virtual:${book.id}/${work.href}")
                )
            }
            
            // Save virtual books
            virtualBookService.createVirtualBooks(book, virtualBooks)
            logger.info { "Created ${virtualBooks.size} virtual books for omnibus: ${book.name}" }
            
        } catch (e: Exception) {
            logger.error(e) { "Error processing generic omnibus: ${book.name}" }
        }
    }
}
