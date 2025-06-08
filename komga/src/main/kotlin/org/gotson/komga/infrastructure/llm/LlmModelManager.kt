package org.gotson.komga.infrastructure.llm

import mu.KotlinLogging
import org.springframework.stereotype.Service
import org.springframework.web.client.RestTemplate
import org.springframework.web.client.getForObject
import java.util.concurrent.ConcurrentHashMap

private val logger = KotlinLogging.logger {}

/**
 * Manages LLM models across different providers
 */
@Service
class LlmModelManager(
  private val llmConfig: LlmConfig,
  private val restTemplate: RestTemplate = RestTemplate(),
) {
  private val activeModels = ConcurrentHashMap<String, ActiveModelInfo>()

  data class ActiveModelInfo(
    val modelId: String,
    val provider: LlmProvider,
    val loadedAt: Long = System.currentTimeMillis(),
    var lastUsed: Long = System.currentTimeMillis(),
  )

  enum class LlmProvider {
    OLLAMA,
    LM_STUDIO,
    VLLM,
    OPENAI,
    GOOGLE_NOTE_LM,
  }

  suspend fun listAvailableModels(provider: LlmProvider): List<ModelInfo> =
    when (provider) {
      LlmProvider.OLLAMA -> listOllamaModels()
      LlmProvider.LM_STUDIO -> listLmStudioModels()
      LlmProvider.VLLM -> listVllmModels()
      else -> emptyList()
    }

  suspend fun loadModel(
    provider: LlmProvider,
    modelName: String,
  ): String {
    val modelId = "${provider.name.toLowerCase()}-${java.util.UUID.randomUUID()}"

    when (provider) {
      LlmProvider.OLLAMA -> loadOllamaModel(modelName)
      LlmProvider.LM_STUDIO -> loadLmStudioModel(modelName)
      LlmProvider.VLLM -> loadVllmModel(modelName)
      else -> throw UnsupportedOperationException("Model loading not supported for $provider")
    }

    activeModels[modelId] =
      ActiveModelInfo(
        modelId = modelName,
        provider = provider,
      )

    return modelId
  }

  suspend fun unloadModel(modelId: String) {
    val modelInfo = activeModels[modelId] ?: return

    when (modelInfo.provider) {
      LlmProvider.OLLAMA -> unloadOllamaModel(modelInfo.modelId)
      LlmProvider.LM_STUDIO -> unloadLmStudioModel(modelInfo.modelId)
      LlmProvider.VLLM -> unloadVllmModel(modelInfo.modelId)
      else -> {}
    }

    activeModels.remove(modelId)
  }

  private suspend fun listOllamaModels(): List<ModelInfo> =
    try {
      val response =
        restTemplate.getForObject<OllamaListResponse>(
          "${llmConfig.ollama.apiUrl}/api/tags",
        )
      response?.models?.map { model ->
        ModelInfo(
          id = model.name,
          name = model.name,
          provider = LlmProvider.OLLAMA,
          size = model.size,
          loaded = false, // Need to check active models
        )
      } ?: emptyList()
    } catch (e: Exception) {
      logger.error(e) { "Failed to list Ollama models" }
      emptyList()
    }

  private suspend fun loadOllamaModel(modelName: String) {
    try {
      restTemplate.postForObject<Unit>(
        "${llmConfig.ollama.apiUrl}/api/pull",
        mapOf("name" to modelName),
      )
    } catch (e: Exception) {
      logger.error(e) { "Failed to load Ollama model: $modelName" }
      throw e
    }
  }

  private suspend fun unloadOllamaModel(modelName: String) {
    try {
      restTemplate.delete(
        "${llmConfig.ollama.apiUrl}/api/delete",
        mapOf("name" to modelName),
      )
    } catch (e: Exception) {
      logger.error(e) { "Failed to unload Ollama model: $modelName" }
    }
  }

  private suspend fun listLmStudioModels(): List<ModelInfo> {
    // LM Studio uses the same API as Ollama
    return listOllamaModels()
  }

  private suspend fun loadLmStudioModel(modelName: String) {
    // LM Studio loads models automatically on first use
    // Just verify the model is available
    val models = listLmStudioModels()
    if (models.none { it.name == modelName }) {
      throw IllegalArgumentException("Model $modelName not found in LM Studio")
    }
  }

  private suspend fun unloadLmStudioModel(modelName: String) {
    // LM Studio manages model unloading automatically
  }

  private suspend fun listVllmModels(): List<ModelInfo> =
    try {
      val response =
        restTemplate.getForObject<VllmListResponse>(
          "${llmConfig.vllm.apiUrl}/v1/models",
        )
      response?.data?.map { model ->
        ModelInfo(
          id = model.id,
          name = model.id,
          provider = LlmProvider.VLLM,
          loaded = model.owned_by == "vllm",
        )
      } ?: emptyList()
    } catch (e: Exception) {
      logger.error(e) { "Failed to list vLLM models" }
      emptyList()
    }

  private suspend fun loadVllmModel(modelName: String) {
    try {
      restTemplate.postForObject<Unit>(
        "${llmConfig.vllm.apiUrl}/v1/models/load",
        mapOf("model" to modelName),
      )
    } catch (e: Exception) {
      logger.error(e) { "Failed to load vLLM model: $modelName" }
      throw e
    }
  }

  private suspend fun unloadVllmModel(modelName: String) {
    try {
      restTemplate.postForObject<Unit>(
        "${llmConfig.vllm.apiUrl}/v1/models/unload",
        mapOf("model" to modelName),
      )
    } catch (e: Exception) {
      logger.error(e) { "Failed to unload vLLM model: $modelName" }
    }
  }

  data class ModelInfo(
    val id: String,
    val name: String,
    val provider: LlmProvider,
    val size: Long? = null,
    val loaded: Boolean = false,
  )

  private data class OllamaListResponse(
    val models: List<OllamaModel>,
  )

  private data class OllamaModel(
    val name: String,
    val size: Long,
  )

  private data class VllmListResponse(
    val `object`: String,
    val data: List<VllmModel>,
  )

  private data class VllmModel(
    val id: String,
    val `object`: String,
    val owned_by: String,
  )
}
