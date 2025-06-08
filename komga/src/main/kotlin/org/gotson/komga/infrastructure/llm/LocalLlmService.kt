package org.gotson.komga.infrastructure.llm

import mu.KotlinLogging
import org.gotson.komga.infrastructure.llm.exception.LlmException
import org.gotson.komga.infrastructure.llm.model.ChatMessage
import org.gotson.komga.infrastructure.llm.model.FunctionCall
import org.gotson.komga.infrastructure.llm.model.FunctionDefinition
import org.gotson.komga.infrastructure.llm.service.LlmProvider
import org.gotson.komga.infrastructure.llm.service.LlmService
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
  private val restTemplate: RestTemplate = RestTemplate(),
) : LlmService {
  override val provider: LlmProvider = LlmProvider.LOCAL

  override suspend fun isAvailable(): Boolean =
    try {
      restTemplate.getForObject("${config.apiUrl}/v1/models", String::class.java)
      true
    } catch (e: Exception) {
      logger.warn(e) { "Failed to connect to local LLM service" }
      false
    }

  override suspend fun generateCompletion(
    prompt: String,
    maxTokens: Int,
    temperature: Double,
    stopSequences: List<String>,
  ): String {
    val messages = listOf(ChatMessage(role = "user", content = prompt))
    val response = generateChatCompletion(messages, maxTokens, temperature)
    return response.choices
      .firstOrNull()
      ?.message
      ?.content ?: throw LlmException("No completion generated")
  }

  override suspend fun generateChatCompletion(
    messages: List<ChatMessage>,
    maxTokens: Int,
    temperature: Double,
    functions: List<FunctionDefinition>,
    functionCall: FunctionCall?,
  ): ChatCompletion {
    val request =
      mapOf(
        "model" to config.model,
        "messages" to messages,
        "max_tokens" to maxTokens,
        "temperature" to temperature,
      )

    return try {
      restTemplate.postForObject(
        URI("${config.apiUrl}/v1/chat/completions"),
        request,
        ChatCompletion::class.java,
      ) ?: throw LlmException("Empty response from LLM service")
    } catch (e: Exception) {
      throw LlmException("Failed to generate chat completion: ${e.message}", e)
    }
  }

  override suspend fun createEmbedding(input: String): List<Double> {
    val request =
      mapOf(
        "model" to "text-embedding-ada-002", // Default model, can be made configurable
        "input" to input,
      )

    return try {
      val response =
        restTemplate.postForObject<Map<String, Any>>(
          URI("${config.apiUrl}/v1/embeddings"),
          request,
        )

      @Suppress("UNCHECKED_CAST")
      (response?.get("data") as? List<Map<String, Any>>)
        ?.firstOrNull()
        ?.get("embedding") as? List<Double>
        ?: throw LlmException("Invalid embedding response format")
    } catch (e: Exception) {
      throw LlmException("Failed to create embedding: ${e.message}", e)
    }
  }

  override fun cleanup() {
    // No resources to clean up
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
  val timeoutSeconds: Long = 300,
)

/**
 * Simple request/response DTOs for local LLM API
 */
private data class LlmRequest(
  val model: String,
  val messages: List<Message>,
  val max_tokens: Int,
  val temperature: Double,
)

private data class Message(
  val role: String,
  val content: String,
)

private data class LlmResponse(
  val choices: List<Choice>,
)

private data class Choice(
  val message: MessageContent,
)

private data class MessageContent(
  val content: String,
)
