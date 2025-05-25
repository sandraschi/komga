package org.gotson.komga.infrastructure.persistence.jpa.entity

import jakarta.persistence.*
import org.gotson.komga.domain.model.VirtualBook
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.time.LocalDateTime
import java.util.*

@Entity
@Table(name = "virtual_books")
class JpaVirtualBook(
    @Id
    var id: String,
    
    @Column(name = "omnibus_id", nullable = false)
    var omnibusId: String,
    
    @Column(nullable = false)
    var title: String,
    
    @Column(name = "sort_title", nullable = false)
    var sortTitle: String,
    
    var number: Float? = null,
    
    @Column(name = "number_sort")
    var numberSort: Float? = null,
    
    @Column(name = "file_last_modified", nullable = false)
    var fileLastModified: LocalDateTime,
    
    @Column(name = "file_size", nullable = false)
    var fileSize: Long,
    
    @Column(nullable = false)
    var size: Long,
    
    @Column(nullable = false, columnDefinition = "TEXT")
    var url: String,
    
    @Column(name = "created_date", nullable = false, updatable = false)
    var createdDate: LocalDateTime = LocalDateTime.now(),
    
    @Column(name = "last_modified_date", nullable = false)
    var lastModifiedDate: LocalDateTime = LocalDateTime.now(),
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "TEXT")
    var metadata: VirtualBook.Metadata? = null
) {
    fun toDomain(): VirtualBook = VirtualBook(
        id = id,
        omnibusId = omnibusId,
        title = title,
        sortTitle = sortTitle,
        number = number,
        numberSort = numberSort,
        fileLastModified = fileLastModified,
        fileSize = fileSize,
        size = size,
        url = java.net.URL(url),
        createdDate = createdDate,
        lastModifiedDate = lastModifiedDate,
        metadata = metadata ?: VirtualBook.Metadata()
    )
    
    companion object {
        fun fromDomain(virtualBook: VirtualBook): JpaVirtualBook = JpaVirtualBook(
            id = virtualBook.id,
            omnibusId = virtualBook.omnibusId,
            title = virtualBook.title,
            sortTitle = virtualBook.sortTitle,
            number = virtualBook.number,
            numberSort = virtualBook.numberSort,
            fileLastModified = virtualBook.fileLastModified,
            fileSize = virtualBook.fileSize,
            size = virtualBook.size,
            url = virtualBook.url.toString(),
            createdDate = virtualBook.createdDate,
            lastModifiedDate = virtualBook.lastModifiedDate,
            metadata = virtualBook.metadata
        )
    }
}
