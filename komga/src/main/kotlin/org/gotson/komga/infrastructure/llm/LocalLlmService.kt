package org.gotson.komga.infrastructure.llm

import mu.KotlinLogging
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.context.annotation.Profile
import org.springframework.stereotype.Service
import org.springframework.web.client.RestTemplate
import java.net.URI

private val logger = KotlinLogging.logger {}

/**
 * Service for interacting with locally hosted LLM models
 * Compatible with any OpenAI API-compatible local server (e.g., Ollama, LocalAI, etc.)
 */
@Service
@Profile("local-llm")
class LocalLlmService(
    private val config: LocalLlmConfig,
    private val restTemplate: RestTemplate = RestTemplate()
) : LlmService {
    
    override suspend fun generateAnalysis(prompt: String, maxTokens: Int): String {
        logger.debug { "Sending request to local LLM: ${config.model}" }
        
        val request = LlmRequest(
            model = config.model,
            messages = listOf(
                Message(
                    role = "user",
                    content = prompt
                )
            ),
            max_tokens = maxTokens,
            temperature = config.temperature
        )
        
        return try {
            val response = restTemplate.postForObject(
                URI("${config.apiUrl}/v1/chat/completions"),
                request,
                LlmResponse::class.java
            )
            
            response?.choices?.firstOrNull()?.message?.content 
                ?: throw LlmException("No content in LLM response")
                
        } catch (e: Exception) {
            logger.error(e) { "Failed to generate analysis with local LLM" }
            throw LlmException("Failed to generate analysis: ${e.message}", e)
        }
    }
}

@ConfigurationProperties(prefix = "komga.llm.local")
data class LocalLlmConfig(
    /**
     * Base URL of the local LLM API server
     */
    val apiUrl: String = "http://localhost:11434",
    
    /**
     * Model name to use for generation
     */
    val model: String = "llama3",
    
    /**
     * Temperature for generation (0.0 to 1.0)
     */
    val temperature: Double = 0.7,
    
    /**
     * Timeout in seconds for API requests
     */
    val timeoutSeconds: Long = 300
)
