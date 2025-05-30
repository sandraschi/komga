package org.gotson.komga.infrastructure.llm.service

import mu.KotlinLogging
import org.gotson.komga.infrastructure.llm.exception.LlmException
import org.gotson.komga.infrastructure.llm.model.*
import org.springframework.retry.annotation.Backoff
import org.springframework.retry.annotation.Retryable
import org.springframework.web.client.RestTemplate
import java.net.URI
import java.time.Duration
import java.util.concurrent.TimeUnit

/**
 * Base implementation of [LlmService] with common functionality.
 */
abstract class BaseLlmService(
    protected val restTemplate: RestTemplate
) : LlmService {
    
    protected val logger = KotlinLogging.logger {}
    
    /**
     * Executes a request with retry logic.
     */
    @Retryable(
        value = [LlmException::class],
        maxAttempts = 3,
        backoff = Backoff(delay = 1000, multiplier = 2.0),
        include = [LlmException::class],
        exclude = [LlmException.NotRetryableException::class]
    )
    protected suspend fun <T> withRetry(
        operation: String,
        block: suspend () -> T
    ): T {
        logger.debug { "Executing LLM operation: $operation" }
        try {
            return block()
        } catch (e: Exception) {
            logger.error(e) { "LLM operation failed: $operation" }
            throw LlmException.fromException(e)
        }
    }
    
    /**
     * Creates a basic HTTP headers map with common headers.
     */
    protected fun createHeaders(
        contentType: String = "application/json",
        additionalHeaders: Map<String, String> = emptyMap()
    ): Map<String, String> {
        return mutableMapOf("Content-Type" to contentType).apply {
            putAll(additionalHeaders)
        }
    }
    
    /**
     * Default implementation of [generateCompletion] using chat completion.
     * Can be overridden by subclasses for better performance.
     */
    override suspend fun generateCompletion(
        prompt: String,
        maxTokens: Int,
        temperature: Double,
        stopSequences: List<String>
    ): String {
        val messages = listOf(
            ChatMessage(role = ChatMessage.Role.USER, content = prompt)
        )
        return generateChatCompletion(
            messages = messages,
            maxTokens = maxTokens,
            temperature = temperature,
            stopSequences = stopSequences
        ).content
    }
    
    /**
     * Default implementation of [createEmbedding] that throws [UnsupportedOperationException].
     * Should be overridden by subclasses that support embeddings.
     */
    override suspend fun createEmbedding(input: String): List<Double> {
        throw UnsupportedOperationException("Embeddings are not supported by ${provider.name}")
    }
    
    /**
     * Default implementation of [cleanup] that does nothing.
     * Can be overridden by subclasses that need cleanup.
     */
    override fun cleanup() {
        // Default implementation does nothing
    }
}
