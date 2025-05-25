package org.gotson.komga.domain.service

import org.gotson.komga.domain.model.Book
import org.gotson.komga.domain.model.VirtualBook
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable

interface VirtualBookService {
    /**
     * Get a virtual book by ID.
     */
    fun getVirtualBook(virtualBookId: String): VirtualBook
    
    /**
     * Get all virtual books for an omnibus with pagination.
     */
    fun getVirtualBooksByOmnibus(omnibusId: String, pageable: Pageable): Page<VirtualBook>
    
    /**
     * Get all virtual books for an omnibus as a list.
     */
    fun getVirtualBooksByOmnibus(omnibusId: String): List<VirtualBook>
    
    /**
     * Get all virtual books with pagination.
     */
    fun getAllVirtualBooks(pageable: Pageable): Page<VirtualBook>
    
    /**
     * Create virtual books from an omnibus book.
     */
    fun createVirtualBooks(omnibusBook: Book, virtualBooks: List<VirtualBook>): List<VirtualBook>
    
    /**
     * Update a virtual book.
     */
    fun updateVirtualBook(virtualBook: VirtualBook): VirtualBook
    
    /**
     * Delete a virtual book.
     */
    fun deleteVirtualBook(virtualBookId: String)
    
    /**
     * Delete all virtual books for an omnibus.
     */
    fun deleteVirtualBooksByOmnibus(omnibusId: String)
    
    /**
     * Check if a book is an omnibus with virtual books.
     */
    fun isOmnibus(bookId: String): Boolean
    
    /**
     * Get the omnibus book for a virtual book.
     */
    fun getOmnibusForVirtualBook(virtualBookId: String): Book?
    
    /**
     * Get a virtual book with its omnibus information.
     */
    fun getVirtualBookWithOmnibus(virtualBookId: String): VirtualBookWithOmnibus
    
    data class VirtualBookWithOmnibus(
        val virtualBook: VirtualBook,
        val omnibus: Book
    )
}
