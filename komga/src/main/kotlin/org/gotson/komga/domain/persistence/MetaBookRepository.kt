package org.gotson.komga.domain.persistence

import org.gotson.komga.domain.model.meta.MetaBook
import org.gotson.komga.domain.model.meta.MetaBookSection
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable

interface MetaBookRepository {
  fun findById(id: String): MetaBook?

  fun findAllByBookId(
    bookId: String,
    pageable: Pageable,
  ): Page<MetaBook>

  fun findAllByUserId(
    userId: String,
    pageable: Pageable,
  ): Page<MetaBook>

  fun findAllByStatus(status: MetaBook.GenerationStatus): List<MetaBook>

  fun save(metaBook: MetaBook): MetaBook

  fun delete(metaBook: MetaBook)

  fun deleteAllByBookId(bookId: String)

  // Section operations
  fun findSectionsByMetaBookId(metaBookId: String): List<MetaBookSection>

  fun saveSection(section: MetaBookSection): MetaBookSection

  fun deleteSectionsByMetaBookId(metaBookId: String)

  fun existsByBookId(bookId: String): Boolean

  fun countByBookId(bookId: String): Long

  fun countByStatus(status: MetaBook.GenerationStatus): Long
}
