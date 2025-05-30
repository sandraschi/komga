package org.gotson.komga.infrastructure.llm.rag

import jakarta.annotation.PreDestroy
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.gotson.komga.infrastructure.llm.LlmService
import org.gotson.komga.infrastructure.llm.rag.model.*
import org.gotson.komga.infrastructure.llm.rag.service.EmbeddingService
import org.gotson.komga.infrastructure.llm.rag.store.VectorStore
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.stereotype.Service
import kotlin.math.min

/**
 * Main service for Retrieval-Augmented Generation (RAG) functionality.
 */
@Service
@ConditionalOnProperty("komga.rag.enabled", havingValue = "true")
class RagService(
    private val embeddingService: EmbeddingService,
    private val vectorStore: VectorStore,
    @Qualifier("llmService") private val llmService: LlmService,
    private val ragConfig: RagConfig = RagConfig()
) {

    private val logger = LoggerFactory.getLogger(javaClass)

    /**
     * Adds documents to the RAG system.
     *
     * @param documents List of documents to add
     * @param metadata Optional metadata to associate with the documents
     * @return List of processed document IDs
     */
    suspend fun addDocuments(
        documents: List<String>,
        metadata: Map<String, Any> = emptyMap()
    ): List<String> = withContext(Dispatchers.IO) {
        try {
            val processedDocs = documents.map { text ->
                embeddingService.processDocument(text, metadata, ragConfig)
            }
            
            vectorStore.addDocuments(processedDocs)
            processedDocs.map { it.id }
        } catch (e: Exception) {
            logger.error("Error adding documents to RAG system", e)
            throw e
        }
    }

    /**
     * Removes documents from the RAG system.
     *
     * @param documentIds List of document IDs to remove
     */
    suspend fun removeDocuments(documentIds: List<String>) {
        withContext(Dispatchers.IO) {
            try {
                vectorStore.removeDocuments(documentIds)
            } catch (e: Exception) {
                logger.error("Error removing documents from RAG system", e)
                throw e
            }
        }
    }

    /**
     * Retrieves relevant documents for a query using RAG.
     *
     * @param query The query to search for
     * @param k Number of results to return
     * @param filter Optional filter to apply to the search
     * @return List of relevant document chunks with scores
     */
    suspend fun retrieve(
        query: String,
        k: Int = ragConfig.topK,
        filter: Map<String, Any>? = null
    ): List<RagSearchResult> = withContext(Dispatchers.IO) {
        try {
            // Get query embedding
            val queryEmbedding = embeddingService.embedTexts(listOf(query)).firstOrNull() ?: return@withContext emptyList()
            
            // Search for similar chunks
            val results = vectorStore.similaritySearchWithEmbedding(
                queryEmbedding = queryEmbedding,
                k = k,
                filter = filter
            )
            
            // Filter by similarity threshold
            results.filter { it.score >= ragConfig.similarityThreshold }
        } catch (e: Exception) {
            logger.error("Error retrieving documents for query: $query", e)
            emptyList()
        }
    }

    /**
     * Generates a response using RAG.
     *
     * @param query The query to generate a response for
     * @param context Additional context to include in the prompt
     * @param maxTokens Maximum number of tokens in the response
     * @param temperature Temperature for response generation
     * @return Generated response text
     */
    suspend fun generateResponse(
        query: String,
        context: String = "",
        maxTokens: Int = 1000,
        temperature: Double = 0.7
    ): String = withContext(Dispatchers.IO) {
        try {
            // Retrieve relevant documents
            val relevantDocs = retrieve(query)
            
            // Build context from retrieved documents
            val contextBuilder = StringBuilder()
            if (context.isNotBlank()) {
                contextBuilder.append("Additional context: $context\n\n")
            }
            
            contextBuilder.append("Relevant information:\n")
            relevantDocs.forEachIndexed { index, result ->
                contextBuilder.append("${index + 1}. ${result.chunk.content}\n")
            }
            
            // Generate response using LLM
            val prompt = """
                |You are a helpful assistant. Use the following information to answer the question.
                |If you don't know the answer, just say that you don't know, don't try to make up an answer.
                |
                |${contextBuilder}
                |
                |Question: $query
                |Answer:
            """.trimMargin()
            
            llmService.generateCompletion(
                prompt = prompt,
                maxTokens = maxTokens,
                temperature = temperature
            )
        } catch (e: Exception) {
            logger.error("Error generating RAG response for query: $query", e)
            "I'm sorry, I encountered an error while processing your request."
        }
    }
    
    /**
     * Gets a document by its ID.
     *
     * @param documentId The ID of the document to retrieve
     * @return The document, or null if not found
     */
    suspend fun getDocument(documentId: String): RagDocument? {
        return try {
            vectorStore.getDocument(documentId)
        } catch (e: Exception) {
            logger.error("Error retrieving document: $documentId", e)
            null
        }
    }
    
    /**
     * Gets all chunks for a document.
     *
     * @param documentId The ID of the document
     * @return List of document chunks
     */
    suspend fun getDocumentChunks(documentId: String): List<DocumentChunk> {
        return try {
            vectorStore.getDocumentChunks(documentId)
        } catch (e: Exception) {
            logger.error("Error retrieving chunks for document: $documentId", e)
            emptyList()
        }
    }
    
    @PreDestroy
    fun cleanup() {
        if (vectorStore is AutoCloseable) {
            try {
                (vectorStore as AutoCloseable).close()
            } catch (e: Exception) {
                logger.error("Error cleaning up vector store", e)
            }
        }
    }
}
