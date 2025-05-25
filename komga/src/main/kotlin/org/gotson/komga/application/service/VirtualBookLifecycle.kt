package org.gotson.komga.application.service

import mu.KotlinLogging
import org.gotson.komga.domain.model.Book
import org.gotson.komga.domain.model.VirtualBook
import org.gotson.komga.domain.persistence.BookRepository
import org.gotson.komga.domain.persistence.VirtualBookRepository
import org.gotson.komga.domain.service.VirtualBookService
import org.gotson.komga.infrastructure.validation.LocalEntityValidator
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

private val logger = KotlinLogging.logger {}

@Service
transactional
class VirtualBookLifecycle(
    private val virtualBookRepository: VirtualBookRepository,
    private val bookRepository: BookRepository,
    private val validator: LocalEntityValidator
) : VirtualBookService {

    override fun getVirtualBook(virtualBookId: String): VirtualBook =
        virtualBookRepository.findById(virtualBookId) ?: throw IllegalArgumentException("Virtual book not found with id: $virtualBookId")

    override fun getVirtualBooksByOmnibus(omnibusId: String, pageable: Pageable): Page<VirtualBook> =
        virtualBookRepository.findByOmnibusId(omnibusId, pageable)
        
    override fun getVirtualBooksByOmnibus(omnibusId: String): List<VirtualBook> =
        virtualBookRepository.findByOmnibusId(omnibusId)

    override fun getAllVirtualBooks(pageable: Pageable): Page<VirtualBook> =
        virtualBookRepository.findAll(pageable)

    override fun createVirtualBooks(omnibusBook: Book, virtualBooks: List<VirtualBook>): List<VirtualBook> {
        // Delete any existing virtual books for this omnibus
        virtualBookRepository.deleteByOmnibusId(omnibusBook.id)
        
        // Save all virtual books
        val now = LocalDateTime.now()
        val savedBooks = virtualBooks.map { 
            it.copy(
                omnibusId = omnibusBook.id,
                createdDate = now,
                lastModifiedDate = now
            )
        }
        
        validator.validate(savedBooks)
        return virtualBookRepository.saveAll(savedBooks)
    }

    override fun updateVirtualBook(virtualBook: VirtualBook): VirtualBook {
        val existing = getVirtualBook(virtualBook.id)
        val updated = virtualBook.copy(
            lastModifiedDate = LocalDateTime.now(),
            createdDate = existing.createdDate
        )
        validator.validate(updated)
        return virtualBookRepository.save(updated)
    }

    override fun deleteVirtualBook(virtualBookId: String) {
        virtualBookRepository.delete(getVirtualBook(virtualBookId))
    }

    override fun deleteVirtualBooksByOmnibus(omnibusId: String) {
        virtualBookRepository.deleteByOmnibusId(omnibusId)
    }

    override fun isOmnibus(bookId: String): Boolean =
        virtualBookRepository.existsByOmnibusId(bookId)

    override fun getOmnibusForVirtualBook(virtualBookId: String): Book? {
        val virtualBook = virtualBookRepository.findById(virtualBookId) ?: return null
        return bookRepository.findById(virtualBook.omnibusId).orElse(null)
    }
    
    override fun getVirtualBookWithOmnibus(virtualBookId: String): VirtualBookService.VirtualBookWithOmnibus {
        val virtualBook = getVirtualBook(virtualBookId)
        val omnibus = getOmnibusForVirtualBook(virtualBookId)
            ?: throw IllegalArgumentException("Omnibus not found for virtual book: $virtualBookId")
            
        return VirtualBookService.VirtualBookWithOmnibus(virtualBook, omnibus)
    }
}
