package org.gotson.komga.interfaces.rest

import mu.KotlinLogging
import org.gotson.komga.domain.service.VirtualBookContentService
import org.gotson.komga.interfaces.rest.dto.VirtualBookDto
import org.gotson.komga.interfaces.rest.dto.toDto
import org.springframework.core.io.Resource
import org.springframework.http.CacheControl
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.concurrent.TimeUnit

private val logger = KotlinLogging.logger {}

/**
 * REST controller for virtual book content operations.
 */
@RestController
@RequestMapping("api/v1/virtual-books/{virtualBookId}", produces = [MediaType.APPLICATION_OCTET_STREAM_VALUE])
class VirtualBookContentController(
    private val virtualBookContentService: VirtualBookContentService,
    private val virtualBookService: VirtualBookService
) {
    
    /**
     * Get the content of a virtual book.
     */
    @GetMapping("/content")
    fun getVirtualBookContent(
        @PathVariable virtualBookId: String,
        @RequestParam(name = "download", required = false, defaultValue = "false") download: Boolean
    ): ResponseEntity<Resource> {
        val resource = virtualBookContentService.getVirtualBookContent(virtualBookId)
        val virtualBook = virtualBookService.getVirtualBook(virtualBookId)
        
        return ResponseEntity.ok()
            .cacheControl(CacheControl.maxAge(365, TimeUnit.DAYS))
            .contentLength(resource.contentLength())
            .contentType(MediaType.APPLICATION_OCTET_STREAM)
            .header(
                HttpHeaders.CONTENT_DISPOSITION,
                "${if (download) "attachment" else "inline"}; filename="${virtualBook.title}.epub""
            )
            .header(HttpHeaders.EXPIRES, (System.currentTimeMillis() + 31536000000L).toString()) // 1 year
            .body(resource)
    }
    
    /**
     * Check if a virtual book content exists.
     */
    @GetMapping("/content/exists")
    fun virtualBookContentExists(
        @PathVariable virtualBookId: String
    ): ResponseEntity<Map<String, Boolean>> {
        val exists = virtualBookContentService.virtualBookContentExists(virtualBookId)
        return ResponseEntity.ok(mapOf("exists" to exists))
    }
}
