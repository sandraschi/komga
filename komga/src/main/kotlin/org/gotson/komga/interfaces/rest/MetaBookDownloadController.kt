package org.gotson.komga.interfaces.rest

import mu.KotlinLogging
import org.gotson.komga.domain.model.meta.MetaBook
import org.gotson.komga.domain.persistence.MetaBookRepository
import org.gotson.komga.infrastructure.storage.StorageManager
import org.springframework.core.io.ByteArrayResource
import org.springframework.core.io.Resource
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import java.nio.file.Paths

private val logger = KotlinLogging.logger {}

@RestController
@RequestMapping("api/v1/meta/books/{id}/download", produces = [MediaType.APPLICATION_OCTET_STREAM_VALUE])
class MetaBookDownloadController(
  private val metaBookRepository: MetaBookRepository,
  private val storageManager: StorageManager,
) {
  @GetMapping
  fun downloadMetaBook(
    @PathVariable id: String,
    @AuthenticationPrincipal user: UserDetails,
  ): ResponseEntity<Resource> {
    val metaBook =
      metaBookRepository
        .findById(id)
        ?.takeIf { it.createdBy == user.username }
        ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "MetaBook not found or access denied")

    if (metaBook.status != MetaBook.GenerationStatus.COMPLETED) {
      throw ResponseStatusException(HttpStatus.BAD_REQUEST, "MetaBook generation is not complete")
    }

    val storagePath =
      metaBook.storagePath ?: throw ResponseStatusException(
        HttpStatus.INTERNAL_SERVER_ERROR,
        "MetaBook has no associated storage path",
      )

    val fileName = Paths.get(storagePath).fileName.toString()
    val content =
      storageManager.getMetaBookContent(metaBook.id, fileName)
        ?: throw ResponseStatusException(
          HttpStatus.INTERNAL_SERVER_ERROR,
          "Could not retrieve MetaBook content",
        )

    return ResponseEntity
      .ok()
      .contentType(MediaType.APPLICATION_OCTET_STREAM)
      .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"$fileName\"")
      .header(HttpHeaders.CONTENT_LENGTH, content.size.toString())
      .body(ByteArrayResource(content))
  }
}
