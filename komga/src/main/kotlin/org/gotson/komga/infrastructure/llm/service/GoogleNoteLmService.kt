package org.gotson.komga.infrastructure.llm.service

import com.fasterxml.jackson.databind.ObjectMapper
import com.google.auth.oauth2.GoogleCredentials
import com.google.auth.oauth2.ServiceAccountCredentials
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import mu.KotlinLogging
import org.gotson.komga.infrastructure.llm.config.GoogleNoteLmConfig
import org.gotson.komga.infrastructure.llm.exception.LlmException
import org.gotson.komga.infrastructure.llm.model.*
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.retry.annotation.Backoff
import org.springframework.retry.annotation.Retryable
import org.springframework.stereotype.Service
import org.springframework.web.client.RestTemplate
import java.io.ByteArrayInputStream
import java.net.URI

data class PredictionResponse(val content: String)

data class Prediction(
    val content: String
)

data class PredictionsResponse(
    val predictions: List<Prediction>
)


/**
 * Implementation of [LlmService] for Google's NoteLM API.
 *
 * NoteLM is a family of models designed for document understanding and question answering.
 * This service provides integration with Google's NoteLM API.
 */
@Service
class GoogleNoteLmService(
    private val config: GoogleNoteLmConfig,
    private val restTemplate: RestTemplate,
    private val objectMapper: ObjectMapper
) : BaseLlmService(restTemplate) {

    override val provider = LlmProvider.GOOGLE_NOTE_LM
    
    private val logger = KotlinLogging.logger {}
    private var accessToken: String? = null
    private var tokenExpiryTime: Long = 0
    
    init {
        logger.info { "Initialized Google NoteLM service with model: ${config.model}" }
    }

    override suspend fun isAvailable(): Boolean = withContext(Dispatchers.IO) {
        try {
            // Simple health check - try to get an access token
            getAccessToken().isNotBlank()
        } catch (e: Exception) {
            logger.error(e) { "Google NoteLM API is not available" }
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
        val token = getAccessToken()
        
        // Convert messages to NoteLM format
        val noteLmMessages = messages.map { message ->
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
            put("instances", listOf(
                mapOf(
                    "messages" to noteLmMessages,
                    "max_tokens" to maxTokens,
                    "temperature" to temperature.coerceIn(0.0, 1.0)
                )
            ))
        }

        val headers = HttpHeaders().apply {
            contentType = MediaType.APPLICATION_JSON
            bearerAuth = "Bearer $token"
        }

        val endpoint = "${config.apiUrl}/projects/${config.projectId}/locations/${config.location}/publishers/google/models/${config.model}:predict"
        
        val response = restTemplate.postForObject<Map<String, Any>>(
            URI(endpoint),
            HttpEntity(request, headers),
            Map::class.java
        )

        val predictions = response?.get("predictions") as? List<*>
            ?: throw LlmException("No predictions in response")
            
        val prediction = predictions.firstOrNull() as? Map<*, *>
            ?: throw LlmException("No prediction data")
            
        val content = prediction["content"] as? String
            ?: throw LlmException("No content in prediction")
            
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
        val token = getAccessToken()
        
        val request = buildMap<String, Any> {
            put("instances", listOf(
                mapOf(
                    "prompt" to prompt,
                    "max_tokens" to maxTokens,
                    "temperature" to temperature.coerceIn(0.0, 1.0),
                    "stop_sequences" to stopSequences.takeIf { it.isNotEmpty() } ?: emptyList<String>()
                )
            ))
        }

        val headers = HttpHeaders().apply {
            contentType = MediaType.APPLICATION_JSON
            bearerAuth = "Bearer $token"
        }

        val endpoint = "${config.apiUrl}/projects/${config.projectId}/locations/${config.location}/publishers/google/models/${config.model}:predict"
        
        val response = try {
            restTemplate.postForObject<Map<String, Any>>(
                URI(endpoint),
                HttpEntity(request, headers),
                Map::class.java
            )
        } catch (e: Exception) {
            throw LlmException("Failed to get prediction: ${e.message}", e)
        }

        val predictions = response?.get("predictions") as? List<*>
            ?: throw LlmException("No predictions in response")
            
        val firstPrediction = predictions.firstOrNull() as? Map<*, *>
            ?: throw LlmException("Invalid prediction format")
            
        @Suppress("UNCHECKED_CAST")
        val content = firstPrediction["content"] as? String
            ?: throw LlmException("No content in prediction")
            
        content
    }
    
    /**
     * Gets an access token for authenticating with the Google Cloud API.
     * Reuses the token if it's still valid, otherwise requests a new one.
     */
    @Synchronized
    private fun getAccessToken(): String {
        // Return cached token if it's still valid (with 1-minute buffer)
        if (accessToken != null && System.currentTimeMillis() < tokenExpiryTime - 60000) {
            return accessToken!!
        }
        
        return try {
            val credentials = ServiceAccountCredentials
                .fromStream(ByteArrayInputStream(config.apiKey.toByteArray()))
                .createScoped(listOf("https://www.googleapis.com/auth/cloud-platform"))
            
            credentials.refreshIfExpired()
            
            // Cache the token and its expiry time (with a 5-minute buffer)
            accessToken = credentials.accessToken.tokenValue
            tokenExpiryTime = (credentials.accessToken.expirationTime?.time ?: 0) - 300000
            
            accessToken!!
        } catch (e: Exception) {
            throw LlmException("Failed to get Google Cloud access token: ${e.message}", e)
        }
    }
    
    companion object {
        private var HttpHeaders.bearerAuth: String?
            get() = this[HttpHeaders.AUTHORIZATION]?.firstOrNull()?.removePrefix("Bearer ")
            set(value) {
                if (value == null) {
                    remove(HttpHeaders.AUTHORIZATION)
                } else {
                    set(HttpHeaders.AUTHORIZATION, "Bearer $value")
                }
            }
    }
}
