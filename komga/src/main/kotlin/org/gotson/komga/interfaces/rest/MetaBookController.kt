package org.gotson.komga.interfaces.rest

import mu.KotlinLogging
import org.gotson.komga.application.service.MetaBookService
import org.gotson.komga.domain.model.meta.MetaBook
import org.gotson.komga.interfaces.rest.dto.MetaBookDto
import org.gotson.komga.interfaces.rest.dto.request.MetaBookCreateRequest
import org.gotson.komga.interfaces.rest.dto.request.toDomain
import org.gotson.komga.interfaces.rest.dto.toDto
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.web.bind.annotation.*
import java.net.URI

private val logger = KotlinLogging.logger {}

@RestController
@RequestMapping("api/v1/meta/books", produces = [MediaType.APPLICATION_JSON_VALUE])
class MetaBookController(
    private val metaBookService: MetaBookService
) {
    @GetMapping
    fun getAllMetaBooks(
        @RequestParam(required = false) bookId: String?,
        @RequestParam(required = false) status: MetaBook.GenerationStatus?,
        pageable: Pageable,
        @AuthenticationPrincipal user: UserDetails
    ): Page<MetaBookDto> {
        return when {
            bookId != null -> metaBookService.getMetaBooksByBookId(bookId, pageable).map { it.toDto() }
            else -> metaBookService.getMetaBooksByUserId(user.username, pageable).map { it.toDto() }
        }
    }
    
    @GetMapping("/{id}")
    fun getMetaBook(
        @PathVariable id: String,
        @AuthenticationPrincipal user: UserDetails
    ): MetaBookDto =
        metaBookService.getMetaBook(id)
            ?.takeIf { it.createdBy == user.username }
            ?.toDto()
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND)
    
    @PostMapping(consumes = [MediaType.APPLICATION_JSON_VALUE])
    @ResponseStatus(HttpStatus.ACCEPTED)
    fun createMetaBook(
        @RequestBody request: MetaBookCreateRequest,
        @AuthenticationPrincipal user: UserDetails
    ): MetaBookDto {
        val metaBook = metaBookService.generateMetaBook(
            bookIds = request.bookIds,
            options = request.options.toDomain(),
            userId = user.username
        )
        
        return metaBook.toDto()
    }
    
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteMetaBook(
        @PathVariable id: String,
        @AuthenticationPrincipal user: UserDetails
    ) {
        metaBookService.deleteMetaBook(id, user.username)
    }
    
    // Sections
    @GetMapping("/{metaBookId}/sections")
    fun getSections(
        @PathVariable metaBookId: String,
        @AuthenticationPrincipal user: UserDetails
    ): List<MetaBookSectionDto> {
        val metaBook = metaBookService.getMetaBook(metaBookId)
            ?.takeIf { it.createdBy == user.username }
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND)
            
        return metaBookService.getSections(metaBookId).map { it.toDto() }
    }
    
    @PostMapping("/{metaBookId}/sections", consumes = [MediaType.APPLICATION_JSON_VALUE])
    @ResponseStatus(HttpStatus.CREATED)
    fun addSection(
        @PathVariable metaBookId: String,
        @RequestBody request: MetaBookSectionCreateRequest,
        @AuthenticationPrincipal user: UserDetails
    ): MetaBookSectionDto {
        val metaBook = metaBookService.getMetaBook(metaBookId)
            ?.takeIf { it.createdBy == user.username }
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND)
            
        val section = metaBookService.addSection(
            metaBookId = metaBookId,
            section = request.toDomain(metaBookId)
        )
        
        return section.toDto()
    }
    
    @PatchMapping("/{metaBookId}/sections/{sectionId}/progress")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun updateSectionProgress(
        @PathVariable metaBookId: String,
        @PathVariable sectionId: String,
        @RequestBody request: SectionProgressUpdateRequest,
        @AuthenticationPrincipal user: UserDetails
    ) {
        val metaBook = metaBookService.getMetaBook(metaBookId)
            ?.takeIf { it.createdBy == user.username }
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND)
            
        metaBookService.updateSectionProgress(metaBookId, sectionId, request.progress)
    }
}
