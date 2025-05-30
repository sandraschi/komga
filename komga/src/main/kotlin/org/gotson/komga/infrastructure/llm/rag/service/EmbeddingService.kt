package org.gotson.komga.infrastructure.llm.rag.service

import ai.djl.huggingface.tokenizers.HuggingFaceTokenizer
import ai.djl.inference.Predictor
import ai.djl.modality.nlp.bert.BertFullTokenizer
import ai.djl.repository.zoo.Criteria
import ai.djl.training.util.ProgressBar
import ai.djl.translate.TranslateException
import org.gotson.komga.infrastructure.llm.LlmService
import org.gotson.komga.infrastructure.llm.rag.model.*
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.nio.file.Paths
import java.util.*

/**
 * Service for generating and managing text embeddings.
 */
@Service
class EmbeddingService(private val llmService: LlmService) {

    private val logger = LoggerFactory.getLogger(javaClass)
    
    companion object {
        private const val MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
        private const val MAX_SEQ_LENGTH = 512
    }
    
    private val tokenizer: HuggingFaceTokenizer by lazy {
        try {
            val tokenizerPath = Paths.get("models", "tokenizer.json")
            HuggingFaceTokenizer.newInstance(tokenizerPath, Collections.singletonMap("padding", "true"))
        } catch (e: Exception) {
            logger.warn("Failed to load local tokenizer, using online version", e)
            HuggingFaceTokenizer.newInstance(MODEL_NAME)
        }
    }
    
    /**
     * Generates embeddings for a list of text chunks.
     *
     * @param texts List of text chunks to embed
     * @return List of embedding vectors
     */
    suspend fun embedTexts(texts: List<String>): List<List<Double>> {
        return texts.chunked(10).flatMap { batch ->
            try {
                llmService.createEmbedding(batch.joinToString("\n"))
                    .chunked(768) // Assuming 768-dimensional embeddings
                    .map { it.toList() }
            } catch (e: Exception) {
                logger.error("Failed to generate embeddings", e)
                throw RuntimeException("Failed to generate embeddings: ${e.message}", e)
            }
        }
    }
    
    /**
     * Processes a document by splitting it into chunks and generating embeddings.
     *
     * @param document The document to process
     * @param config Configuration for chunking
     * @return Processed document with chunks and embeddings
     */
    suspend fun processDocument(document: String, metadata: Map<String, Any> = emptyMap(), config: RagConfig): RagDocument {
        val textSplitter = TextSplitter()
        val chunks = textSplitter.splitText(document, config)
        
        val embeddings = embedTexts(chunks)
        
        val documentId = UUID.randomUUID().toString()
        val documentChunks = chunks.mapIndexed { index, chunk ->
            DocumentChunk(
                content = chunk,
                embedding = embeddings.getOrElse(index) { emptyList() },
                metadata = metadata + mapOf("chunk_index" to index),
                documentId = documentId,
                chunkIndex = index
            )
        }
        
        return RagDocument(
            id = documentId,
            content = document,
            metadata = metadata,
            chunks = documentChunks
        )
    }
}
