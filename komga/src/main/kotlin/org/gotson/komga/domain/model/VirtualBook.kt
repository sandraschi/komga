package org.gotson.komga.domain.model

import java.net.URL
import java.time.LocalDateTime

/**
 * Represents a virtual book that is part of an omnibus edition.
 */
data class VirtualBook(
    val id: String,
    val omnibusId: String,
    val title: String,
    val sortTitle: String,
    val number: Float,
    val numberSort: Float,
    val fileLastModified: LocalDateTime,
    val fileSize: Long,
    val size: Long,
    val metadata: BookMetadata,
    val media: Media,
    val url: URL,
    val fileLastModifiedDate: LocalDateTime = fileLastModified,
    val createdDate: LocalDateTime = LocalDateTime.now(),
    val lastModifiedDate: LocalDateTime = LocalDateTime.now()
) {
    /**
     * Creates a VirtualBook from a Book and additional omnibus-specific information.
     */
    constructor(
        book: Book,
        omnibusId: String,
        number: Float,
        title: String
    ) : this(
        id = book.id,
        omnibusId = omnibusId,
        title = title,
        sortTitle = title,
        number = number,
        numberSort = number,
        fileLastModified = book.fileLastModified,
        fileSize = book.fileSize,
        size = book.size,
        metadata = book.metadata.copy(title = title, number = number),
        media = book.media,
        url = book.url,
        fileLastModifiedDate = book.fileLastModifiedDate,
        createdDate = book.createdDate,
        lastModifiedDate = book.lastModifiedDate
    )
}
