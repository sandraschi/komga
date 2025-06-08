package org.gotson.komga.infrastructure.persistence.jpa

import jakarta.persistence.EntityManager
import jakarta.persistence.PersistenceContext
import mu.KotlinLogging
import org.gotson.komga.domain.model.VirtualBook
import org.gotson.komga.domain.persistence.VirtualBookRepository
import org.gotson.komga.infrastructure.persistence.jpa.entity.JpaVirtualBook
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional

private val logger = KotlinLogging.logger {}

/**
 * JPA implementation of VirtualBookRepository
 */
@Component
@Transactional
open class JpaVirtualBookRepository : VirtualBookRepository {
  @PersistenceContext
  private lateinit var em: EntityManager

  override fun findById(virtualBookId: String): VirtualBook? = em.find(JpaVirtualBook::class.java, virtualBookId)?.toDomain()

  override fun findByOmnibusId(omnibusId: String): java.util.List<VirtualBook> =
    em
      .createQuery(
        """
        SELECT vb FROM JpaVirtualBook vb 
        WHERE vb.omnibusId = :omnibusId
        ORDER BY vb.numberSort ASC, vb.sortTitle ASC
        """.trimIndent(),
        JpaVirtualBook::class.java,
      ).setParameter("omnibusId", omnibusId)
      .resultList
      .map { it.toDomain() }
      .toList()
      .let { java.util.ArrayList(it) }

  override fun findByOmnibusId(
    omnibusId: String,
    pageable: Pageable,
  ): Page<VirtualBook> {
    val countQuery =
      em
        .createQuery(
          """
          SELECT COUNT(vb) FROM JpaVirtualBook vb 
          WHERE vb.omnibusId = :omnibusId
          """.trimIndent(),
        ).setParameter("omnibusId", omnibusId)

    val total = countQuery.singleResult as Long

    if (total == 0L) {
      return Page.empty()
    }

    val query =
      em
        .createQuery(
          """
          SELECT vb FROM JpaVirtualBook vb 
          WHERE vb.omnibusId = :omnibusId
          ORDER BY vb.numberSort ASC, vb.sortTitle ASC
          """.trimIndent(),
          JpaVirtualBook::class.java,
        ).setParameter("omnibusId", omnibusId)
        .setFirstResult(pageable.pageNumber * pageable.pageSize)
        .setMaxResults(pageable.pageSize)

    if (pageable.sort.isSorted) {
      logger.debug { "Custom sorting not yet implemented, using default sorting" }
    }

    return PageImpl(query.resultList.map { it.toDomain() }, pageable, total)
  }

  override fun findAll(pageable: Pageable): Page<VirtualBook> {
    val count =
      em
        .createQuery(
          "SELECT COUNT(vb) FROM JpaVirtualBook vb",
          Long::class.java,
        ).singleResult

    if (count == 0L) {
      return Page.empty()
    }

    val query =
      em
        .createQuery(
          "SELECT vb FROM JpaVirtualBook vb ORDER BY vb.createdDate DESC",
          JpaVirtualBook::class.java,
        ).setFirstResult(pageable.pageNumber * pageable.pageSize)
        .setMaxResults(pageable.pageSize)

    return PageImpl(query.resultList.map { it.toDomain() }, pageable, count)
  }

  override fun save(virtualBook: VirtualBook): VirtualBook {
    val entity = JpaVirtualBook.fromDomain(virtualBook)
    return if (em.find(JpaVirtualBook::class.java, virtualBook.id) == null) {
      em.persist(entity)
      entity.toDomain()
    } else {
      em.merge(entity).toDomain()
    }
  }

  override fun saveAll(virtualBooks: Collection<VirtualBook>): java.util.List<VirtualBook> = virtualBooks.map { save(it) }.toList().let { java.util.ArrayList(it) }

  override fun delete(virtualBook: VirtualBook) {
    val entity = em.find(JpaVirtualBook::class.java, virtualBook.id)
    if (entity != null) {
      em.remove(entity)
    }
  }

  override fun deleteAll() {
    em.createQuery("DELETE FROM JpaVirtualBook").executeUpdate()
  }

  override fun deleteByOmnibusId(omnibusId: String) {
    em
      .createQuery("DELETE FROM JpaVirtualBook vb WHERE vb.omnibusId = :omnibusId")
      .setParameter("omnibusId", omnibusId)
      .executeUpdate()
  }

  override fun existsById(virtualBookId: String): Boolean =
    em
      .createQuery(
        "SELECT COUNT(vb) > 0 FROM JpaVirtualBook vb WHERE vb.id = :id",
        Boolean::class.java,
      ).setParameter("id", virtualBookId)
      .singleResult

  override fun existsByOmnibusId(omnibusId: String): Boolean =
    em
      .createQuery(
        "SELECT COUNT(vb) > 0 FROM JpaVirtualBook vb WHERE vb.omnibusId = :omnibusId",
        Boolean::class.java,
      ).setParameter("omnibusId", omnibusId)
      .singleResult

  override fun findByOmnibusIdIn(omnibusIds: Collection<String>): java.util.Map<String, java.util.List<VirtualBook>> {
    if (omnibusIds.isEmpty()) return java.util.HashMap()

    val result =
      em
        .createQuery(
          """
          SELECT vb FROM JpaVirtualBook vb 
          WHERE vb.omnibusId IN :omnibusIds
          ORDER BY vb.numberSort ASC, vb.sortTitle ASC
          """.trimIndent(),
          JpaVirtualBook::class.java,
        ).setParameter("omnibusIds", omnibusIds)
        .resultList
        .groupBy { it.omnibusId }
        .mapValues { (_, books) ->
          books.map { it.toDomain() }.let { java.util.ArrayList(it) }
        }

    return omnibusIds
      .associateWith { result[it] ?: java.util.ArrayList() }
      .toMap(java.util.HashMap())
  }

  override fun countByOmnibusIdIn(omnibusIds: Collection<String>): java.util.Map<String, Long> {
    if (omnibusIds.isEmpty()) return java.util.HashMap()

    val result =
      em
        .createQuery(
          """
          SELECT vb.omnibusId, COUNT(vb) 
          FROM JpaVirtualBook vb 
          WHERE vb.omnibusId IN :omnibusIds
          GROUP BY vb.omnibusId
          """.trimIndent(),
        ).setParameter("omnibusIds", omnibusIds)
        .resultList
        .map { row ->
          val rowArray = row as Array<*>
          rowArray[0] as String to (rowArray[1] as Long)
        }.toMap()

    return omnibusIds.associateWithTo(java.util.HashMap()) { result[it] ?: 0L }
  }
}
