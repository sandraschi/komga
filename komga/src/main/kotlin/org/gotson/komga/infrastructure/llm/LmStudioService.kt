package org.gotson.komga.infrastructure.llm

import mu.KotlinLogging
import org.springframework.stereotype.Service
import org.springframework.web.client.RestTemplate
import java.net.URI

private val logger = KotlinLogging.logger {}

/**
 * Implementation for LM Studio
 * LM Studio provides an OpenAI-compatible API
 */
@Service
@Profile("lmstudio")
class LmStudioService(
  private val config: LlmConfig.LmStudioConfig,
  private val restTemplate: RestTemplate = RestTemplate(),
) : LlmService {
  override val provider = LlmModelManager.LlmProvider.LM_STUDIO

  override suspend fun isAvailable(): Boolean =
    try {
      restTemplate
        .getForEntity(
          "${config.apiUrl}/v1/models",
          Map::class.java,
        ).statusCode.is2xx
    } catch (e: Exception) {
      logger.error(e) { "LM Studio API is not available" }
      false
    }

  override suspend fun generateAnalysis(
    prompt: String,
    maxTokens: Int,
  ): String {
    logger.debug { "Sending request to LM Studio API (model: ${config.model})" }

    val request =
      mapOf(
        "model" to config.model,
        "messages" to
          listOf(
            mapOf(
              "role" to "user",
              "content" to prompt,
            ),
          ),
        "max_tokens" to maxTokens,
        "temperature" to config.temperature,
        "stream" to false,
      )

    return try {
      val response =
        restTemplate.postForObject<Map<String, Any>>(
          URI("${config.apiUrl}/v1/chat/completions"),
          request,
        )

      (response?.get("choices") as? List<*>)
        ?.firstOrNull()
        ?.let { (it as? Map<*, *>)?.get("message") as? Map<*, *> }
        ?.get("content") as? String
        ?: throw LlmException("No content in LM Studio response")
    } catch (e: Exception) {
      logger.error(e) { "LM Studio API request failed" }
      throw LlmException("Failed to generate analysis: ${e.message}", e)
    }
  }

  suspend fun listAvailableModels(): List<LlmModelManager.ModelInfo> {
    return try {
      val response =
        restTemplate.getForObject<Map<String, Any>>(
          "${config.apiUrl}/v1/models",
        )

      (response?.get("data") as? List<*>)?.mapNotNull { model ->
        (model as? Map<*, *>)?.let { modelData ->
          LlmModelManager.ModelInfo(
            id = (modelData["id"] as? String) ?: return@mapNotNull null,
            name = (modelData["id"] as? String) ?: "Unknown",
            provider = provider,
            loaded = true, // LM Studio loads models automatically
          )
        }
      } ?: emptyList()
    } catch (e: Exception) {
      logger.error(e) { "Failed to list LM Studio models" }
      emptyList()
    }
  }
}
