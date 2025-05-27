package org.gotson.komga.infrastructure.job

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import mu.KotlinLogging
import org.gotson.komga.domain.model.meta.MetaBook
import org.gotson.komga.domain.persistence.MetaBookRepository
import org.springframework.stereotype.Component

private val logger = KotlinLogging.logger {}

interface JobProcessor {
    fun processMetaBookGeneration(metaBookId: String)
}

@Component
class DefaultJobProcessor(
    private val metaBookRepository: MetaBookRepository,
    private val metaBookJobProcessor: MetaBookJobProcessor
) : JobProcessor {
    
    private val scope = CoroutineScope(Dispatchers.IO)
    
    override fun processMetaBookGeneration(metaBookId: String) {
        scope.launch {
            try {
                logger.info { "Starting meta book generation job: $metaBookId" }
                val metaBook = metaBookRepository.findById(metaBookId)
                    ?: throw IllegalArgumentException("MetaBook not found: $metaBookId")
                
                metaBookJobProcessor.process(metaBook)
                logger.info { "Completed meta book generation job: $metaBookId" }
                
            } catch (e: Exception) {
                logger.error(e) { "Failed to process meta book generation job: $metaBookId" }
                // The error is already handled in the MetaBookJobProcessor
            }
        }
    }
}
