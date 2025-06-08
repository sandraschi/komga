package org.gotson.komga.infrastructure.job

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import mu.KotlinLogging
import org.gotson.komga.application.service.MetaBookGenerationService
import org.gotson.komga.domain.model.meta.MetaBook
import org.gotson.komga.domain.persistence.MetaBookRepository
import org.springframework.stereotype.Component

private val logger = KotlinLogging.logger {}

/**
 * Processor for meta book generation jobs
 */
@Component
class MetaBookJobProcessor(
  private val metaBookRepository: MetaBookRepository,
  private val metaBookGenerationService: MetaBookGenerationService,
) {
  /**
   * Process a meta book generation job
   */
  suspend fun process(metaBook: MetaBook) =
    withContext(Dispatchers.IO) {
      try {
        logger.debug { "Processing meta book generation: ${metaBook.id}" }

        // Generate the meta book
        val updatedMetaBook = metaBookGenerationService.generateMetaBook(metaBook)

        // Save the updated meta book
        metaBookRepository.save(updatedMetaBook)

        logger.info { "Successfully processed meta book generation: ${metaBook.id}" }
      } catch (e: Exception) {
        logger.error(e) { "Failed to process meta book generation: ${metaBook.id}" }
        throw e
      }
    }
}
