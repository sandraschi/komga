package org.gotson.komga.interfaces.rest

import mu.KotlinLogging
import org.gotson.komga.application.service.VirtualBookLifecycle
import org.gotson.komga.domain.model.VirtualBook
import org.gotson.komga.domain.service.VirtualBookService
import org.gotson.komga.infrastructure.epub.omnibus.OmnibusService
import org.gotson.komga.interfaces.rest.dto.VirtualBookDto
import org.gotson.komga.interfaces.rest.dto.toDto
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.servlet.support.ServletUriComponentsBuilder
import java.net.URI

private val logger = KotlinLogging.logger {}

/**
 * REST controller for managing omnibus editions and their virtual books.
 */
@RestController
@RequestMapping("api/v1/omnibus", produces = [MediaType.APPLICATION_JSON_VALUE])
class OmnibusController(
    private val virtualBookService: VirtualBookService,
    private val omnibusService: OmnibusService
) {
    
    /**
     * Get all virtual books for an omnibus.
     */
    @GetMapping("/books/{bookId}")
    fun getVirtualBooks(
        @PathVariable bookId: String,
        pageable: Pageable
    ): Page<VirtualBookDto> =
        virtualBookService.getVirtualBooksByOmnibus(bookId, pageable)
            .map { it.toDto() }
    
    /**
     * Get a virtual book with its omnibus information.
     */
    @GetMapping("/virtual-books/{virtualBookId}")
    fun getVirtualBookWithOmnibus(
        @PathVariable virtualBookId: String
    ): VirtualBookWithOmnibusDto {
        val virtualBook = virtualBookService.getVirtualBook(virtualBookId)
        val omnibus = virtualBookService.getOmnibusForVirtualBook(virtualBookId)
            ?: throw IllegalArgumentException("Omnibus not found for virtual book: $virtualBookId")
            
        return VirtualBookWithOmnibusDto(
            virtualBook = virtualBook.toDto(),
            omnibus = VirtualBookDto(
                id = omnibus.id,
                title = omnibus.metadata.title,
                sortTitle = omnibus.metadata.sortTitle,
                number = omnibus.metadata.number,
                numberSort = omnibus.metadata.numberSort,
                fileLastModified = omnibus.fileLastModified,
                fileSize = omnibus.fileSize,
                size = omnibus.size,
                url = omnibus.url.toString(),
                createdDate = omnibus.createdDate,
                lastModifiedDate = omnibus.lastModifiedDate
            )
        )
    }
    
    /**
     * Process an omnibus to extract virtual books.
     */
    @PostMapping("/books/{bookId}/process")
    fun processOmnibus(
        @PathVariable bookId: String
    ): ResponseEntity<Void> {
        // This would trigger the omnibus processing for the book
        // In a real implementation, you might want to make this async
        // omnibusService.processBook(bookId)
        
        val location = ServletUriComponentsBuilder
            .fromCurrentRequest()
            .path("/../{id}")
            .buildAndExpand(bookId)
            .toUri()
            
        return ResponseEntity.noContent().location(location).build()
    }
    
    /**
     * Delete all virtual books for an omnibus.
     */
    @DeleteMapping("/books/{bookId}")
    fun deleteVirtualBooks(
        @PathVariable bookId: String
    ): ResponseEntity<Void> {
        virtualBookService.deleteVirtualBooksByOmnibus(bookId)
        return ResponseEntity.noContent().build()
    }
}

/**
 * DTO that combines a virtual book with its omnibus information.
 */
data class VirtualBookWithOmnibusDto(
    val virtualBook: VirtualBookDto,
    val omnibus: VirtualBookDto
)
