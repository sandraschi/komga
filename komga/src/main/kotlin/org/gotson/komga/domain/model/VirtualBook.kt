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
  val size: Long = fileSize,
  val metadata: BookMetadata,
  val media: Media,
  val url: URL,
  val fileLastModifiedDate: LocalDateTime = fileLastModified,
  val createdDate: LocalDateTime = LocalDateTime.now(),
  val lastModifiedDate: LocalDateTime = LocalDateTime.now(),
) {
  /**
   * Creates a VirtualBook from a Book, Media, BookMetadata, and additional omnibus-specific information.
   */
  constructor(
    book: Book,
    media: Media,
    metadata: BookMetadata,
    omnibusId: String,
    number: Float,
    title: String,
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
    metadata =
      metadata.copy(
        title = title,
        number = number.toString(),
        numberSort = number,
        bookId = book.id,
      ),
    media = media,
    url = book.url,
    fileLastModifiedDate = book.fileLastModifiedDate,
    createdDate = book.createdDate,
    lastModifiedDate = book.lastModifiedDate,
  )

  /**
   * Creates a VirtualBook from a BookWithMedia, BookMetadata, and additional omnibus-specific information.
   */
  constructor(
    book: BookWithMedia,
    metadata: BookMetadata,
    omnibusId: String,
    number: Float,
    title: String,
  ) : this(
    book = book.book,
    media = book.media,
    metadata = metadata,
    omnibusId = omnibusId,
    number = number,
    title = title,
  )
}
