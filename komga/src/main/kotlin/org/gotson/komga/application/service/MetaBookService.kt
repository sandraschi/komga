package org.gotson.komga.application.service

import jakarta.transaction.Transactional
import mu.KotlinLogging
import org.gotson.komga.domain.model.meta.MetaBook
import org.gotson.komga.domain.model.meta.MetaBookSection
import org.gotson.komga.domain.persistence.BookRepository
import org.gotson.komga.domain.persistence.MetaBookRepository
import org.gotson.komga.infrastructure.job.JobProcessor
import org.gotson.komga.infrastructure.job.TaskEmitter
import org.springframework.stereotype.Service
import java.util.UUID

private val logger = KotlinLogging.logger {}

@Service
@Transactional
class MetaBookService(
  private val metaBookRepository: MetaBookRepository,
  private val bookRepository: BookRepository,
  private val taskEmitter: TaskEmitter,
  private val jobProcessor: JobProcessor,
) {
  fun getMetaBook(id: String): MetaBook? = metaBookRepository.findById(id)

  fun getMetaBooksByBookId(
    bookId: String,
    pageable: org.springframework.data.domain.Pageable,
  ): org.springframework.data.domain.Page<MetaBook> = metaBookRepository.findAllByBookId(bookId, pageable)

  fun getMetaBooksByUserId(
    userId: String,
    pageable: org.springframework.data.domain.Pageable,
  ): org.springframework.data.domain.Page<MetaBook> = metaBookRepository.findAllByUserId(userId, pageable)

  fun generateMetaBook(
    bookIds: List<String>,
    options: MetaBook.GenerationOptions,
    userId: String,
  ): MetaBook {
    // Validate all books exist
    val books =
      bookIds.map { bookId ->
        bookRepository.findById(bookId) ?: throw IllegalArgumentException("Book not found: $bookId")
      }

    val metaBook =
      MetaBook(
        bookIds = bookIds,
        type = determineType(bookIds, options),
        format = options.format,
        options = options,
        createdBy = userId,
      )

    val savedMetaBook = metaBookRepository.save(metaBook)

    // Emit task for background processing
    taskEmitter.emitMetaBookGeneration(savedMetaBook.id)

    return savedMetaBook
  }

  @Transactional(Transactional.TxType.REQUIRES_NEW)
  fun processMetaBookGeneration(metaBookId: String) {
    val metaBook =
      metaBookRepository.findById(metaBookId)
        ?: throw IllegalArgumentException("MetaBook not found: $metaBookId")

    try {
      // Update status to processing
      val updatedMetaBook =
        metaBook.copy(
          status = MetaBook.GenerationStatus.PROCESSING,
          updatedAt = java.time.Instant.now(),
        )
      metaBookRepository.save(updatedMetaBook)

      // Process the meta book generation
      jobProcessor.processMetaBookGeneration(updatedMetaBook)

      // Mark as completed
      val completedMetaBook =
        updatedMetaBook.copy(
          status = MetaBook.GenerationStatus.COMPLETED,
          completedAt = java.time.Instant.now(),
          updatedAt = java.time.Instant.now(),
          progress = 1.0f,
        )
      metaBookRepository.save(completedMetaBook)
    } catch (e: Exception) {
      logger.error(e) { "Failed to generate meta book: $metaBookId" }
      val failedMetaBook =
        metaBook.copy(
          status = MetaBook.GenerationStatus.FAILED,
          error = e.message,
          updatedAt = java.time.Instant.now(),
        )
      metaBookRepository.save(failedMetaBook)
    }
  }

  fun deleteMetaBook(
    id: String,
    userId: String,
  ) {
    val metaBook =
      metaBookRepository.findById(id)
        ?: throw IllegalArgumentException("MetaBook not found: $id")

    // Verify ownership
    if (metaBook.createdBy != userId) {
      throw SecurityException("Not authorized to delete this meta book")
    }

    metaBookRepository.delete(metaBook)
  }

  private fun determineType(
    bookIds: List<String>,
    options: MetaBook.GenerationOptions,
  ): MetaBook.MetaBookType =
    when {
      bookIds.size > 1 && options.theme != null -> MetaBook.MetaBookType.THEMATIC
      bookIds.size > 1 -> MetaBook.MetaBookType.COMPARATIVE
      else -> MetaBook.MetaBookType.INDIVIDUAL
    }

  // Section management
  fun getSections(metaBookId: String): List<MetaBookSection> = metaBookRepository.findSectionsByMetaBookId(metaBookId)

  fun addSection(
    metaBookId: String,
    section: MetaBookSection,
  ): MetaBookSection {
    val metaBook =
      metaBookRepository.findById(metaBookId)
        ?: throw IllegalArgumentException("MetaBook not found: $metaBookId")

    val newSection =
      section.copy(
        metaBookId = metaBook.id,
        id = UUID.randomUUID().toString(),
      )

    return metaBookRepository.saveSection(newSection)
  }

  fun updateSectionProgress(
    metaBookId: String,
    sectionType: String,
    progress: Float,
  ) {
    // Implementation for updating section progress
  }
}
