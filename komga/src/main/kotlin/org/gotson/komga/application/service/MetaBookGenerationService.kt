package org.gotson.komga.application.service

import mu.KotlinLogging
import org.gotson.komga.domain.model.Book
import org.gotson.komga.domain.model.meta.MetaBook
import org.gotson.komga.domain.persistence.BookRepository
import org.gotson.komga.infrastructure.analysis.AnalysisService
import org.gotson.komga.infrastructure.llm.LlmService
import org.gotson.komga.infrastructure.storage.StorageManager
import org.gotson.komga.infrastructure.template.TemplateService
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.context.annotation.Primary
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant

private val logger = KotlinLogging.logger {}

/**
 * Service responsible for generating meta books using either local or cloud-based LLMs
 */
@Service
@Primary
@Transactional
class MetaBookGenerationService(
    private val bookRepository: BookRepository,
    private val analysisService: AnalysisService,
    private val templateService: TemplateService,
    private val storageManager: StorageManager,
    @Qualifier("llmService") private val llmService: LlmService
) {
    
    /**
     * Generate a meta book by analyzing the specified books
     */
    suspend fun generateMetaBook(metaBook: MetaBook): MetaBook {
        try {
            logger.info { "Starting meta book generation: ${metaBook.id} using ${llmService::class.simpleName}" }
            
            // 1. Get the books
            val books = metaBook.bookIds.map { bookId ->
                bookRepository.findById(bookId) 
                    ?: throw IllegalStateException("Book not found: $bookId")
            }
            
            // 2. Analyze the content using the configured LLM
            logger.debug { "Analyzing content for meta book: ${metaBook.id}" }
            val analysis = analysisService.analyze(books, metaBook.options)
            
            // 3. Generate content using templates
            logger.debug { "Generating content for meta book: ${metaBook.id}" }
            val content = templateService.render(metaBook.options.format, analysis)
            
            // 4. Save the generated content
            logger.debug { "Saving generated content for meta book: ${metaBook.id}" }
            val storagePath = saveContent(metaBook, content)
            
            // 5. Update metadata
            val metadata = MetaBook.MetaBookMetadata(
                title = analysis.title,
                description = analysis.description,
                coverImage = analysis.coverImage,
                wordCount = content.wordCount,
                sectionCount = analysis.sections.size,
                generatedAt = Instant.now(),
                llmProvider = llmService::class.simpleName ?: "unknown"
            )
            
            logger.info { "Successfully generated meta book: ${metaBook.id} (${content.wordCount} words)" }
            
            return metaBook.copy(
                metadata = metadata,
                storagePath = storagePath.toString(),
                progress = 1.0f,
                updatedAt = Instant.now()
            )
            
        } catch (e: Exception) {
            logger.error(e) { "Failed to generate meta book: ${metaBook.id}" }
            throw e
        }
    }
    
    private suspend fun saveContent(metaBook: MetaBook, content: ByteArray): String {
        val fileName = "meta-${metaBook.id}.${getFileExtension(metaBook.options.format)}"
        val path = storageManager.storeMetaBook(
            content = content,
            fileName = fileName,
            metaBookId = metaBook.id
        )
        return path.toString()
    }
    
    private fun getFileExtension(format: MetaBook.OutputFormat): String {
        return when (format) {
            MetaBook.OutputFormat.EPUB -> "epub"
            MetaBook.OutputFormat.PDF -> "pdf"
            MetaBook.OutputFormat.MARKDOWN -> "md"
            MetaBook.OutputFormat.WEB -> "html"
        }
    }
}

// Extension function to make MetaBook.kt more concise
private fun MetaBook.GenerationOptions.getFileExtension(): String {
    return when (this.format) {
        MetaBook.OutputFormat.EPUB -> "epub"
        MetaBook.OutputFormat.PDF -> "pdf"
        MetaBook.OutputFormat.MARKDOWN -> "md"
        MetaBook.OutputFormat.WEB -> "html"
    }
}
