package org.gotson.komga.domain.persistence

import org.gotson.komga.domain.model.VirtualBook
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import java.util.Collection
import java.util.List
import java.util.Map

interface VirtualBookRepository {
  fun findById(virtualBookId: String): VirtualBook?

  fun findByOmnibusId(omnibusId: String): List<VirtualBook>

  /**
   * Find all virtual books for the given omnibus ID with pagination.
   */
  fun findByOmnibusId(
    omnibusId: String,
    pageable: Pageable,
  ): Page<VirtualBook>

  fun findAll(pageable: Pageable): Page<VirtualBook>

  fun save(virtualBook: VirtualBook): VirtualBook

  fun saveAll(virtualBooks: Collection<VirtualBook>): List<VirtualBook>

  fun delete(virtualBook: VirtualBook)

  fun deleteAll()

  fun deleteByOmnibusId(omnibusId: String)

  fun existsById(virtualBookId: String): Boolean

  fun existsByOmnibusId(omnibusId: String): Boolean

  /**
   * Find all virtual books for the given omnibus IDs.
   */
  fun findByOmnibusIdIn(omnibusIds: Collection<String>): Map<String, List<VirtualBook>>

  /**
   * Count virtual books for each omnibus ID.
   */
  fun countByOmnibusIdIn(omnibusIds: Collection<String>): Map<String, Long>
}
