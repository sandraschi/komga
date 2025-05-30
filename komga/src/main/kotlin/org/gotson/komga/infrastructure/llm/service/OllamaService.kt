package org.gotson.komga.infrastructure.llm.service

import com.fasterxml.jackson.databind.ObjectMapper
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import mu.KotlinLogging
import org.gotson.komga.infrastructure.llm.config.OllamaConfig
import org.gotson.komga.infrastructure.llm.exception.LlmException
import org.gotson.komga.infrastructure.llm.model.*
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.retry.annotation.Backoff
import org.springframework.retry.annotation.Retryable
import org.springframework.stereotype.Service
import org.springframework.web.client.RestTemplate
import java.net.URI

/**
 * Implementation of [LlmService] for Ollama's API.
 *
 * Ollama is a lightweight, extensible framework for running and managing large language models locally.
 * This service provides integration with Ollama's API for text generation and chat completions.
 */
@Service
class OllamaService(
    private val config: OllamaConfig,
    private val restTemplate: RestTemplate,
    private val objectMapper: ObjectMapper
) : BaseLlmService(restTemplate) {

    override val provider = LlmProvider.OLLAMA
    
    private val logger = KotlinLogging.logger {}
    
    init {
        logger.info { "Initialized Ollama service with model: ${config.model}" }
    }

    override suspend fun isAvailable(): Boolean = withContext(Dispatchers.IO) {
        try {
            val response = restTemplate.getForEntity("${config.apiUrl}/api/tags", Map::class.java)
            response.statusCode.is2xx
        } catch (e: Exception) {
            logger.error(e) { "Ollama API is not available" }
            false
        }
    }

    @Retryable(
        value = [LlmException::class],
        maxAttempts = 3,
        backoff = Backoff(delay = 1000, multiplier = 2.0)
    )
    override suspend fun generateChatCompletion(
        messages: List<ChatMessage>,
        maxTokens: Int,
        temperature: Double,
        functions: List<FunctionDefinition>,
        functionCall: FunctionCall?
    ): ChatCompletion = withRetry("generateChatCompletion") {
        // Convert messages to Ollama format
        val ollamaMessages = messages.map { message ->
            mapOf(
                "role" to when (message.role) {
                    ChatMessage.Role.SYSTEM -> "system"
                    ChatMessage.Role.USER -> "user"
                    ChatMessage.Role.ASSISTANT -> "assistant"
                    ChatMessage.Role.FUNCTION -> "function"
                },
                "content" to message.content
            )
        }

        val request = buildMap<String, Any> {
            put("model", config.model)
            put("messages", ollamaMessages)
            put("options", mapOf(
                "temperature" to temperature.coerceIn(0.0, 1.0),
                "num_predict" to maxTokens.coerceAtMost(4096) // Ollama has a context window limit
            ))
            // Ollama doesn't support functions natively, we'll need to handle this in the prompt
        }

        val headers = HttpHeaders().apply {
            contentType = MediaType.APPLICATION_JSON
        }

        val response = restTemplate.postForObject<Map<String, Any>>(
            URI("${config.apiUrl}/api/chat"),
            HttpEntity(request, headers),
            Map::class.java
        )

        val message = response?.get("message") as? Map<*, *>
            ?: throw LlmException("No message in response")

        val content = message["content"] as? String ?: ""

        ChatCompletion(
            content = content,
            role = ChatMessage.Role.ASSISTANT
        )
    }

    @Retryable(
        value = [LlmException::class],
        maxAttempts = 3,
        backoff = Backoff(delay = 1000, multiplier = 2.0)
    )
    override suspend fun generateCompletion(
        prompt: String,
        maxTokens: Int,
        temperature: Double,
        stopSequences: List<String>
    ): String = withRetry("generateCompletion") {
        val request = buildMap<String, Any> {
            put("model", config.model)
            put("prompt", prompt)
            put("options", mapOf(
                "temperature" to temperature.coerceIn(0.0, 1.0),
                "num_predict" to maxTokens.coerceAtMost(4096)
            ))
            if (stopSequences.isNotEmpty()) {
                put("stop", stopSequences)
            }
        }

        val headers = HttpHeaders().apply {
            contentType = MediaType.APPLICATION_JSON
        }

        val response = restTemplate.postForObject<Map<String, Any>>(
            URI("${config.apiUrl}/api/generate"),
            HttpEntity(request, headers),
            Map::class.java
        )

        response?.get("response") as? String
            ?: throw LlmException("No response in completion")
    }

    /**
     * Pulls a model from Ollama's model registry.
     *
     * @param modelName The name of the model to pull (e.g., "llama2", "mistral")
     */
    @Retryable(
        value = [LlmException::class],
        maxAttempts = 3,
        backoff = Backoff(delay = 5000, multiplier = 2.0) // Longer delay for model pulls
    )
    suspend fun pullModel(modelName: String) = withRetry("pullModel") {
        val request = mapOf("name" to modelName)
        val headers = HttpHeaders().apply {
            contentType = MediaType.APPLICATION_JSON
        }

        restTemplate.postForObject<Map<String, Any>>(
            URI("${config.apiUrl}/api/pull"),
            HttpEntity(request, headers),
            Map::class.java
        )
        
        // Wait until the model is actually available
        var attempts = 0
        val maxAttempts = 60 // 60 * 5s = 5 minutes max wait
        
        while (attempts < maxAttempts) {
            try {
                if (isModelAvailable(modelName)) {
                    logger.info { "Successfully pulled and loaded model: $modelName" }
                    return@withRetry
                }
                kotlinx.coroutines.delay(5000) // Wait 5 seconds between checks
                attempts++
            } catch (e: Exception) {
                logger.warn(e) { "Error checking if model is available: ${e.message}" }
                kotlinx.coroutines.delay(5000)
                attempts++
            }
        }
        
        throw LlmException("Timed out waiting for model $modelName to be available after $maxAttempts attempts")
    }
    
    /**
     * Checks if a specific model is available in Ollama.
     */
    suspend fun isModelAvailable(modelName: String): Boolean = withContext(Dispatchers.IO) {
        try {
            val response = restTemplate.getForEntity("${config.apiUrl}/api/tags", Map::class.java)
            if (response.statusCode.is2xx) {
                val models = (response.body?.get("models") as? List<*>) ?: return@withContext false
                models.any { (it as? Map<*, *>)?.get("name")?.toString()?.startsWith("$modelName:") == true }
            } else {
                false
            }
        } catch (e: Exception) {
            logger.warn(e) { "Error checking if model $modelName is available" }
            false
        }
    }
}
