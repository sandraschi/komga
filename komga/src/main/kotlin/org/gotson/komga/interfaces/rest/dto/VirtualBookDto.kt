package org.gotson.komga.interfaces.rest.dto

import com.fasterxml.jackson.annotation.JsonInclude
import org.gotson.komga.domain.model.VirtualBook
import java.time.LocalDateTime

@JsonInclude(JsonInclude.Include.NON_NULL)
data class VirtualBookDto(
    val id: String,
    val omnibusId: String? = null,
    val title: String,
    val sortTitle: String,
    val number: Float? = null,
    val numberSort: Float? = null,
    val fileLastModified: LocalDateTime,
    val fileSize: Long,
    val size: Long,
    val url: String,
    val createdDate: LocalDateTime,
    val lastModifiedDate: LocalDateTime
)

// Extension functions for DTO conversion
fun VirtualBook.toDto(): VirtualBookDto =
    VirtualBookDto(
        id = id,
        omnibusId = omnibusId,
        title = title,
        sortTitle = sortTitle,
        number = number,
        numberSort = numberSort,
        fileLastModified = fileLastModified,
        fileSize = fileSize,
        size = size,
        url = url.toString(),
        createdDate = createdDate,
        lastModifiedDate = lastModifiedDate
    )
