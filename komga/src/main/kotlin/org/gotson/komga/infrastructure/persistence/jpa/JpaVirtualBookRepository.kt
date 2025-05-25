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

@Component
transactional
class JpaVirtualBookRepository : VirtualBookRepository {
    
    @PersistenceContext
    private lateinit var em: EntityManager
    
    override fun findById(virtualBookId: String): VirtualBook? =
        em.find(JpaVirtualBook::class.java, virtualBookId)?.toDomain()
    
    override fun findByOmnibusId(omnibusId: String, pageable: Pageable): Page<VirtualBook> {
        val countQuery = em.createQuery(
            """
            SELECT COUNT(vb) FROM JpaVirtualBook vb 
            WHERE vb.omnibusId = :omnibusId
            """.trimIndent()
        ).setParameter("omnibusId", omnibusId)
        
        val total = countQuery.singleResult as Long
        
        if (total == 0L) {
            return Page.empty()
        }
        
        val query = em.createQuery(
            """
            SELECT vb FROM JpaVirtualBook vb 
            WHERE vb.omnibusId = :omnibusId
            ORDER BY vb.numberSort ASC, vb.sortTitle ASC
            """.trimIndent(),
            JpaVirtualBook::class.java
        )
            .setParameter("omnibusId", omnibusId)
            .setFirstResult(pageable.pageNumber * pageable.pageSize)
            .setMaxResults(pageable.pageSize)
        
        // Apply sorting
        if (pageable.sort.isSorted) {
            // In a real implementation, you would parse the Sort object and add ORDER BY clauses
            // For simplicity, we're using default sorting defined in the query
            logger.debug { "Custom sorting not yet implemented, using default sorting" }
        }
        
        val result = query.resultList.map { it.toDomain() }
        return PageImpl(result, pageable, total)
    }
    
    override fun findByOmnibusId(omnibusId: String): List<VirtualBook> =
        em.createQuery(
            """
            SELECT vb FROM JpaVirtualBook vb 
            WHERE vb.omnibusId = :omnibusId
            ORDER BY vb.numberSort ASC, vb.sortTitle ASC
            """.trimIndent(),
            JpaVirtualBook::class.java
        )
            .setParameter("omnibusId", omnibusId)
            .resultList
            .map { it.toDomain() }
    
    override fun findAll(pageable: Pageable): Page<VirtualBook> {
        val count = em.createQuery("SELECT COUNT(vb) FROM JpaVirtualBook vb", Long::class.java)
            .singleResult
        
        if (count == 0L) {
            return Page.empty()
        }
        
        val result = em.createQuery(
            "SELECT vb FROM JpaVirtualBook vb ORDER BY vb.createdDate DESC",
            JpaVirtualBook::class.java
        )
            .setFirstResult(pageable.pageNumber * pageable.pageSize)
            .setMaxResults(pageable.pageSize)
            .resultList
            .map { it.toDomain() }
            
        return PageImpl(result, pageable, count)
    }
    
    override fun save(virtualBook: VirtualBook): VirtualBook {
        val entity = JpaVirtualBook.fromDomain(virtualBook)
        return if (entity.id.isEmpty()) {
            entity.id = UUID.randomUUID().toString()
            em.persist(entity)
            entity.toDomain()
        } else {
            em.merge(entity).toDomain()
        }
    }
    
    override fun saveAll(virtualBooks: Collection<VirtualBook>): List<VirtualBook> =
        virtualBooks.map { save(it) }
    
    override fun delete(virtualBook: VirtualBook) {
        val entity = em.find(JpaVirtualBook::class.java, virtualBook.id)
        if (entity != null) {
            em.remove(entity)
        }
    }
    
    override fun deleteByOmnibusId(omnibusId: String) {
        em.createQuery("DELETE FROM JpaVirtualBook vb WHERE vb.omnibusId = :omnibusId")
            .setParameter("omnibusId", omnibusId)
            .executeUpdate()
    }
    
    override fun existsByOmnibusId(omnibusId: String): Boolean =
        em.createQuery(
            "SELECT COUNT(vb) > 0 FROM JpaVirtualBook vb WHERE vb.omnibusId = :omnibusId",
            Boolean::class.java
        )
            .setParameter("omnibusId", omnibusId)
            .singleResult
}
