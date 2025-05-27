package org.gotson.komga.infrastructure.llm.service

import com.fasterxml.jackson.databind.ObjectMapper
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import mu.KotlinLogging
import org.gotson.komga.infrastructure.llm.config.OpenAIConfig
import org.gotson.komga.infrastructure.llm.exception.LlmException
import org.gotson.komga.infrastructure.llm.model.ChatCompletion
import org.gotson.komga.infrastructure.llm.model.ChatMessage
import org.gotson.komga.infrastructure.llm.model.FunctionCall
import org.gotson.komga.infrastructure.llm.model.FunctionDefinition
import org.gotson.komga.infrastructure.llm.model.LlmProvider
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpMethod
import org.springframework.retry.annotation.Backoff
import org.springframework.retry.annotation.Retryable
import org.springframework.stereotype.Service
import org.springframework.web.client.RestTemplate
import java.net.URI

/**
 * Implementation of [LlmService] for OpenAI's API.
 */
@Service
class OpenAIService(
    private val config: OpenAIConfig,
    private val restTemplate: RestTemplate,
    private val objectMapper: ObjectMapper
) : BaseLlmService(restTemplate) {

    override val provider = LlmProvider.OPENAI
    
    private val logger = KotlinLogging.logger {}
    
    init {
        logger.info { "Initialized OpenAI service with model: ${config.model}" }
    }

    override suspend fun isAvailable(): Boolean = withContext(Dispatchers.IO) {
        try {
            val headers = createOpenAIHeaders()
            val response = restTemplate.exchange<Map<String, Any>>(
                "${config.apiUrl}/models",
                HttpMethod.GET,
                HttpEntity<Any>(headers),
                Map::class.java
            )
            response.statusCode.is2xx
        } catch (e: Exception) {
            logger.error(e) { "OpenAI API is not available" }
            false
        }
    }

    @Retryable(
        value = [LlmException::class],
        maxAttemptsExpression = "\${komga.llm.openai.max-retries:3}",
        backoff = Backoff(
            delayExpression = "\${komga.llm.openai.retry-delay:1000}",
            multiplierExpression = "\${komga.llm.openai.retry-multiplier:2.0}"
        )
    )
    override suspend fun generateChatCompletion(
        messages: List<ChatMessage>,
        maxTokens: Int,
        temperature: Double,
        functions: List<FunctionDefinition>,
        functionCall: FunctionCall?
    ): ChatCompletion = withRetry("generateChatCompletion") {
        val request = buildMap<String, Any> {
            put("model", config.model)
            put("messages", messages.map { it.toMap() })
            put("max_tokens", maxTokens)
            put("temperature", temperature.coerceIn(0.0, 2.0))
            if (functions.isNotEmpty()) {
                put("functions", functions.map { it.toMap() })
            }
            functionCall?.let { put("function_call", it.toMap()) }
        }

        val headers = createOpenAIHeaders()
        val response = restTemplate.postForObject<Map<String, Any>>(
            URI("${config.apiUrl}/chat/completions"),
            HttpEntity(request, headers),
            Map::class.java
        )

        val choice = (response?.get("choices") as? List<*>)?.firstOrNull() as? Map<*, *>
            ?: throw LlmException("No choices in response")

        val message = (choice["message"] as? Map<*, *>)
            ?: throw LlmException("No message in choice")

        val content = message["content"] as? String ?: ""
        val role = (message["role"] as? String)?.let { ChatMessage.Role.valueOf(it.uppercase()) }
            ?: ChatMessage.Role.ASSISTANT

        val functionCall = (message["function_call"] as? Map<*, *>)?.let {
            FunctionCall(
                name = it["name"] as? String ?: "",
                arguments = it["arguments"] as? String ?: ""
            )
        }

        val finishReason = choice["finish_reason"] as? String

        ChatCompletion(
            content = content,
            role = role,
            functionCall = functionCall,
            finishReason = finishReason
        )
    }

    @Retryable(
        value = [LlmException::class],
        maxAttemptsExpression = "\${komga.llm.openai.max-retries:3}",
        backoff = Backoff(
            delayExpression = "\${komga.llm.openai.retry-delay:1000}",
            multiplierExpression = "\${komga.llm.openai.retry-multiplier:2.0}"
        )
    )
    override suspend fun createEmbedding(input: String): List<Double> = withRetry("createEmbedding") {
        val request = mapOf(
            "model" to config.embeddingModel,
            "input" to input
        )

        val headers = createOpenAIHeaders()
        val response = restTemplate.postForObject<Map<String, Any>>(
            URI("${config.apiUrl}/embeddings"),
            HttpEntity(request, headers),
            Map::class.java
        )

        val data = (response?.get("data") as? List<*>)?.firstOrNull() as? Map<*, *>
            ?: throw LlmException("No data in response")

        @Suppress("UNCHECKED_CAST")
        (data["embedding"] as? List<Double>)
            ?: throw LlmException("No embedding in response")
    }

    private fun createOpenAIHeaders(): HttpHeaders {
        return HttpHeaders().apply {
            set("Authorization", "Bearer ${config.apiKey}")
            config.organizationId?.takeIf { it.isNotBlank() }?.let {
                set("OpenAI-Organization", it)
            }
            set("Content-Type", "application/json")
        }
    }

    private fun ChatMessage.toMap(): Map<String, Any> {
        return buildMap {
            put("role", role.name.lowercase())
            put("content", content)
            name?.let { put("name", it) }
            functionCall?.let { put("function_call", it.toMap()) }
        }
    }

    private fun FunctionDefinition.toMap(): Map<String, Any> {
        return mapOf(
            "name" to name,
            "description" to description,
            "parameters" to parameters
        )
    }

    private fun FunctionCall.toMap(): Map<String, String> {
        return mapOf(
            "name" to name,
            "arguments" to arguments
        )
    }
}
