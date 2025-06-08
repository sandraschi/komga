package org.gotson.komga.infrastructure.llm.service

import com.fasterxml.jackson.databind.ObjectMapper
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import mu.KotlinLogging
import org.gotson.komga.infrastructure.llm.config.VllmConfig
import org.gotson.komga.infrastructure.llm.exception.LlmException
import org.gotson.komga.infrastructure.llm.model.ChatCompletion
import org.gotson.komga.infrastructure.llm.model.ChatMessage
import org.gotson.komga.infrastructure.llm.model.FunctionCall
import org.gotson.komga.infrastructure.llm.model.FunctionDefinition
import org.gotson.komga.infrastructure.llm.model.LlmProvider
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.retry.annotation.Backoff
import org.springframework.retry.annotation.Retryable
import org.springframework.stereotype.Service
import org.springframework.web.client.RestTemplate
import java.net.URI

/**
 * Implementation of [LlmService] for vLLM's OpenAI-compatible API.
 *
 * vLLM is a high-throughput and memory-efficient inference and serving engine for LLMs.
 * This service provides integration with vLLM's OpenAI-compatible API.
 */
@Service
class VllmService(
  private val config: VllmConfig,
  private val restTemplate: RestTemplate,
  private val objectMapper: ObjectMapper,
) : BaseLlmService(restTemplate) {
  override val provider = LlmProvider.VLLM

  private val logger = KotlinLogging.logger {}

  init {
    logger.info { "Initialized vLLM service with model: ${config.model}" }
  }

  override suspend fun isAvailable(): Boolean =
    withContext(Dispatchers.IO) {
      try {
        val response = restTemplate.getForEntity("${config.apiUrl}/models", Map::class.java)
        response.statusCode.is2xx
      } catch (e: Exception) {
        logger.error(e) { "vLLM API is not available" }
        false
      }
    }

  @Retryable(
    value = [LlmException::class],
    maxAttempts = 3,
    backoff = Backoff(delay = 1000, multiplier = 2.0),
  )
  override suspend fun generateChatCompletion(
    messages: List<ChatMessage>,
    maxTokens: Int,
    temperature: Double,
    functions: List<FunctionDefinition>,
    functionCall: FunctionCall?,
  ): ChatCompletion =
    withRetry("generateChatCompletion") {
      val request =
        buildMap<String, Any> {
          put("model", config.model)
          put("messages", messages.map { it.toMap() })
          put("max_tokens", maxTokens)
          put("temperature", temperature.coerceIn(0.0, 2.0))
          if (functions.isNotEmpty()) {
            put("functions", functions.map { it.toMap() })
          }
          functionCall?.let { put("function_call", it.toMap()) }
        }

      val headers =
        HttpHeaders().apply {
          contentType = MediaType.APPLICATION_JSON
        }

      val response =
        restTemplate.postForObject<Map<String, Any>>(
          URI("${config.apiUrl}/chat/completions"),
          HttpEntity(request, headers),
          Map::class.java,
        )

      val choice =
        (response?.get("choices") as? List<*>)?.firstOrNull() as? Map<*, *>
          ?: throw LlmException("No choices in response")

      val message =
        (choice["message"] as? Map<*, *>)
          ?: throw LlmException("No message in choice")

      val content = message["content"] as? String ?: ""
      val role =
        (message["role"] as? String)?.let { ChatMessage.Role.valueOf(it.uppercase()) }
          ?: ChatMessage.Role.ASSISTANT

      val functionCallResponse =
        (message["function_call"] as? Map<*, *>)?.let {
          FunctionCall(
            name = it["name"] as? String ?: "",
            arguments = it["arguments"] as? String ?: "",
          )
        }
      val finishReason = choice["finish_reason"] as? String

      ChatCompletion(
        content = content,
        role = role,
        functionCall = functionCallResponse,
        finishReason = finishReason,
      )
    }

  @Retryable(
    value = [LlmException::class],
    maxAttempts = 3,
    backoff = Backoff(delay = 1000, multiplier = 2.0),
  )
  override suspend fun generateCompletion(
    prompt: String,
    maxTokens: Int,
    temperature: Double,
    stopSequences: List<String>,
  ): String =
    withRetry("generateCompletion") {
      val request =
        buildMap<String, Any> {
          put("model", config.model)
          put("prompt", prompt)
          put("max_tokens", maxTokens)
          put("temperature", temperature.coerceIn(0.0, 2.0))
          if (stopSequences.isNotEmpty()) {
            put("stop", stopSequences)
          }
        }

      val headers =
        HttpHeaders().apply {
          contentType = MediaType.APPLICATION_JSON
        }

      val response =
        restTemplate.postForObject<Map<String, Any>>(
          URI("${config.apiUrl}/completions"),
          HttpEntity(request, headers),
          Map::class.java,
        )

      val choices =
        response?.get("choices") as? List<*>
          ?: throw LlmException("No choices in response")

      (choices.firstOrNull() as? Map<*, *>)?.get("text") as? String
        ?: throw LlmException("No text in response")
    }

  private fun ChatMessage.toMap(): Map<String, Any> =
    buildMap {
      put("role", role.name.lowercase())
      put("content", content)
      name?.let { put("name", it) }
      functionCall?.let { put("function_call", it.toMap()) }
    }

  private fun FunctionDefinition.toMap(): Map<String, Any> =
    mapOf(
      "name" to name,
      "description" to description,
      "parameters" to parameters,
    )

  private fun FunctionCall.toMap(): Map<String, String> =
    mapOf(
      "name" to name,
      "arguments" to arguments,
    )

  /**
   * Gets the list of available models from the vLLM server.
   */
  suspend fun listModels(): List<String> =
    withContext(Dispatchers.IO) {
      try {
        val response = restTemplate.getForObject("${config.apiUrl}/models", Map::class.java)
        (response?.get("data") as? List<*>)?.filterIsInstance<String>() ?: emptyList()
      } catch (e: Exception) {
        logger.error(e) { "Failed to list models from vLLM" }
        emptyList()
      }
    }
}
