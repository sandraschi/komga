package org.gotson.komga.infrastructure.persistence.jpa.entity

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import jakarta.persistence.Column
import jakarta.persistence.Convert
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table
import org.gotson.komga.domain.model.BookMetadata
import org.gotson.komga.domain.model.Media
import org.gotson.komga.domain.model.VirtualBook
import org.gotson.komga.infrastructure.persistence.jpa.converter.JsonAttributeConverter
import java.io.Serializable
import java.net.URL
import java.time.LocalDateTime

/**
 * JPA entity for VirtualBook
 */
@Entity
@Table(
  name = "virtual_books",
  indexes = [
    Index(name = "idx_virtual_book_omnibus_id", columnList = "omnibus_id"),
    Index(name = "idx_virtual_book_created_date", columnList = "created_date"),
    Index(name = "idx_virtual_book_last_modified_date", columnList = "last_modified_date"),
  ],
)
@JsonIgnoreProperties(ignoreUnknown = true)
open class JpaVirtualBook : Serializable {
  companion object {
    private const val serialVersionUID = 1L

    /**
     * Create from domain model
     */
    fun fromDomain(virtualBook: VirtualBook): JpaVirtualBook =
      JpaVirtualBook().apply {
        id = virtualBook.id
        omnibusId = virtualBook.omnibusId
        title = virtualBook.title
        sortTitle = virtualBook.sortTitle
        number = virtualBook.number
        numberSort = virtualBook.numberSort
        fileLastModified = virtualBook.fileLastModified
        fileSize = virtualBook.fileSize
        size = virtualBook.size
        url = virtualBook.url.toString()
        fileLastModifiedDate = virtualBook.fileLastModifiedDate
        createdDate = virtualBook.createdDate
        lastModifiedDate = virtualBook.lastModifiedDate
        metadata = virtualBook.metadata
        media = virtualBook.media
      }
  }

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  var id: String = ""

  @Column(name = "omnibus_id", nullable = false, updatable = false)
  var omnibusId: String = ""

  @Column(nullable = false)
  var title: String = ""

  @Column(name = "sort_title", nullable = false)
  var sortTitle: String = ""

  @Column
  var number: Float? = null

  @Column(name = "number_sort")
  var numberSort: Float? = null

  @Column(name = "file_last_modified", nullable = false, updatable = false)
  var fileLastModified: LocalDateTime = LocalDateTime.MIN

  @Column(name = "file_size", nullable = false, updatable = false)
  var fileSize: Long = 0

  @Column(nullable = false, updatable = false)
  var size: Long = 0

  @Column(nullable = false, columnDefinition = "TEXT", updatable = false)
  var url: String = ""

  @Column(name = "file_last_modified_date", nullable = false, updatable = false)
  var fileLastModifiedDate: LocalDateTime = LocalDateTime.MIN

  @Column(name = "created_date", nullable = false, updatable = false)
  var createdDate: LocalDateTime = LocalDateTime.now()

  @Column(name = "last_modified_date", nullable = false)
  var lastModifiedDate: LocalDateTime = LocalDateTime.now()

  @Convert(converter = JsonAttributeConverter::class)
  @Column(columnDefinition = "TEXT", nullable = false)
  lateinit var metadata: BookMetadata

  @Convert(converter = JsonAttributeConverter::class)
  @Column(columnDefinition = "TEXT", nullable = false)
  lateinit var media: Media

  /**
   * Required by JPA
   */
  protected constructor()

  /**
   * Convert to domain model
   */
  fun toDomain(): VirtualBook =
    VirtualBook(
      id = id,
      omnibusId = omnibusId,
      title = title,
      sortTitle = sortTitle,
      number = number ?: 0f,
      numberSort = numberSort ?: 0f,
      fileLastModified = fileLastModified,
      fileSize = fileSize,
      size = size,
      metadata = metadata,
      media = media,
      url = URL(url),
      fileLastModifiedDate = fileLastModifiedDate,
      createdDate = createdDate,
      lastModifiedDate = lastModifiedDate,
    )
}
