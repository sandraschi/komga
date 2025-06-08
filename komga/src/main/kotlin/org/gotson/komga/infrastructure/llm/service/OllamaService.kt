package org.gotson.komga.infrastructure.llm.service

import com.fasterxml.jackson.databind.ObjectMapper
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import mu.KotlinLogging
import org.gotson.komga.infrastructure.llm.config.OllamaConfig
import org.gotson.komga.infrastructure.llm.exception.LlmException
import org.gotson.komga.infrastructure.llm.model.LlmModel
import org.gotson.komga.infrastructure.llm.model.LlmProvider
import org.gotson.komga.infrastructure.llm.model.LoadModelRequest
import org.gotson.komga.infrastructure.llm.model.ModelOperationResponse
import org.gotson.komga.infrastructure.llm.model.ModelStatus
import org.gotson.komga.infrastructure.llm.model.UnloadModelRequest
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpMethod
import org.springframework.http.MediaType
import org.springframework.retry.annotation.Backoff
import org.springframework.retry.annotation.Retryable
import org.springframework.stereotype.Service
import org.springframework.web.client.RestTemplate
import java.net.URI
import java.time.Instant

private data class OllamaModelInfo(
  val name: String,
  val model: String,
  val size: Long,
  val digest: String,
  val details: Map<String, Any> = emptyMap(),
)

private data class OllamaModelListResponse(
  val models: List<OllamaModelInfo>,
)

private data class OllamaShowResponse(
  val license: String? = null,
  val modelfile: String? = null,
  val parameters: String? = null,
  val template: String? = null,
  val details: Map<String, Any> = emptyMap(),
)

private data class OllamaLoadRequest(
  val name: String,
  val stream: Boolean = false,
)

private data class OllamaUnloadRequest(
  val name: String,
)

/**
 * Implementation of [LlmService] for Ollama's API with model management.
 *
 * Ollama is a lightweight, extensible framework for running and managing large language models locally.
 * This service provides integration with Ollama's API for text generation, chat completions, and model management.
 */
@Service
class OllamaService(
  private val config: OllamaConfig,
  private val restTemplate: RestTemplate,
  private val objectMapper: ObjectMapper,
) : BaseLlmService(restTemplate),
  ModelManager {
  override val provider = LlmProvider.OLLAMA

  private val logger = KotlinLogging.logger {}
  private val modelMutex = Mutex()

  init {
    logger.info { "Initialized Ollama service with base URL: ${config.apiUrl}" }
  }

  // ModelManager implementation

  override suspend fun listModels(): List<LlmModel> =
    withContext(Dispatchers.IO) {
      try {
        val response =
          restTemplate.getForEntity(
            "${config.apiUrl}/api/tags",
            OllamaModelListResponse::class.java,
          )

        response.body?.models?.map { model ->
          LlmModel(
            id = model.name,
            name = model.name,
            provider = provider,
            status = ModelStatus.UNLOADED, // We don't know the loaded status from this endpoint
            loaded = false,
            sizeBytes = model.size,
            parameters = model.details,
          )
        } ?: emptyList()
      } catch (e: Exception) {
        logger.error(e) { "Failed to list Ollama models" }
        throw LlmException("Failed to list models: ${e.message}", e)
      }
    }

  override suspend fun getModel(modelId: String): LlmModel? =
    withContext(Dispatchers.IO) {
      try {
        // First try to get model details
        val showResponse =
          restTemplate.exchange(
            "${config.apiUrl}/api/show",
            HttpMethod.POST,
            HttpEntity(mapOf("name" to modelId)),
            OllamaShowResponse::class.java,
          )

        // Then check if it's currently loaded
        val loadedModels =
          try {
            restTemplate
              .getForEntity<OllamaModelListResponse>(
                "${config.apiUrl}/api/tags",
              ).body
              ?.models
              ?.map { it.name } ?: emptyList()
          } catch (e: Exception) {
            logger.warn(e) { "Failed to check loaded models" }
            emptyList()
          }

        val isLoaded = loadedModels.contains(modelId)

        LlmModel(
          id = modelId,
          name = modelId,
          provider = provider,
          status = if (isLoaded) ModelStatus.LOADED else ModelStatus.UNLOADED,
          loaded = isLoaded,
          parameters =
            showResponse.body?.let { body ->
              mapOf(
                "license" to body.license,
                "modelfile" to body.modelfile,
                "parameters" to body.parameters,
                "template" to body.template,
              ) + (body.details ?: emptyMap())
            } ?: emptyMap(),
        )
      } catch (e: Exception) {
        logger.error(e) { "Failed to get model: $modelId" }
        null
      }
    }

  @Synchronized
  override suspend fun loadModel(request: LoadModelRequest): ModelOperationResponse {
    val modelId = request.modelId

    return modelMutex.withLock {
      try {
        // Check if already loaded
        val currentStatus = getModelStatus(modelId)
        if (currentStatus?.loaded == true && !request.force) {
          return ModelOperationResponse(
            success = true,
            message = "Model is already loaded",
            model = currentStatus,
          )
        }

        // Mark as loading
        markModelLoading(modelId, true)
        updateModel(
          currentStatus?.copy(
            status = ModelStatus.LOADING,
          ) ?: LlmModel(
            id = modelId,
            name = modelId,
            provider = provider,
            status = ModelStatus.LOADING,
          ),
        )

        // Make the API call
        val response =
          restTemplate.postForEntity(
            "${config.apiUrl}/api/pull",
            OllamaLoadRequest(modelId, stream = false),
            Map::class.java,
          )

        if (response.statusCode.is2xx) {
          val loadedModel =
            LlmModel(
              id = modelId,
              name = modelId,
              provider = provider,
              status = ModelStatus.LOADED,
              loaded = true,
              lastLoaded = Instant.now(),
            )
          updateModel(loadedModel)
          ModelOperationResponse(
            success = true,
            message = "Model loaded successfully",
            model = loadedModel,
          )
        } else {
          val error = "Failed to load model: ${response.statusCode}"
          logger.error { error }
          val errorModel =
            LlmModel(
              id = modelId,
              name = modelId,
              provider = provider,
              status = ModelStatus.ERROR,
              error = error,
            )
          updateModel(errorModel)
          ModelOperationResponse(
            success = false,
            message = error,
            model = errorModel,
          )
        }
      } catch (e: Exception) {
        val error = "Error loading model: ${e.message}"
        logger.error(e) { error }
        val errorModel =
          LlmModel(
            id = modelId,
            name = modelId,
            provider = provider,
            status = ModelStatus.ERROR,
            error = error,
          )
        updateModel(errorModel)
        ModelOperationResponse(
          success = false,
          message = error,
          model = errorModel,
        )
      } finally {
        markModelLoading(modelId, false)
      }
    }
  }

  @Synchronized
  override suspend fun unloadModel(request: UnloadModelRequest): ModelOperationResponse {
    val modelId = request.modelId

    return modelMutex.withLock {
      try {
        // Check if already unloaded
        val currentStatus = getModelStatus(modelId)
        if (currentStatus?.loaded != true) {
          return ModelOperationResponse(
            success = true,
            message = "Model is not loaded",
            model = currentStatus,
          )
        }

        // Mark as unloading
        updateModel(
          currentStatus.copy(
            status = ModelStatus.UNLOADED,
            loaded = false,
          ),
        )

        // Make the API call
        restTemplate.postForEntity<Unit>(
          "${config.apiUrl}/api/delete",
          OllamaUnloadRequest(modelId),
          Unit::class.java,
        )

        val unloadedModel =
          currentStatus.copy(
            status = ModelStatus.UNLOADED,
            loaded = false,
            lastLoaded = null,
          )
        updateModel(unloadedModel)

        ModelOperationResponse(
          success = true,
          message = "Model unloaded successfully",
          model = unloadedModel,
        )
      } catch (e: Exception) {
        val error = "Error unloading model: ${e.message}"
        logger.error(e) { error }
        val errorModel =
          getModelStatus(modelId)?.copy(
            status = ModelStatus.ERROR,
            error = error,
          ) ?: LlmModel(
            id = modelId,
            name = modelId,
            provider = provider,
            status = ModelStatus.ERROR,
            error = error,
          )
        updateModel(errorModel)
        ModelOperationResponse(
          success = false,
          message = error,
          model = errorModel,
        )
      }
    }
  }

  override suspend fun isAvailable(): Boolean =
    withContext(Dispatchers.IO) {
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
      // Convert messages to Ollama format
      val ollamaMessages =
        messages.map { message ->
          mapOf(
            "role" to
              when (message.role) {
                ChatMessage.Role.SYSTEM -> "system"
                ChatMessage.Role.USER -> "user"
                ChatMessage.Role.ASSISTANT -> "assistant"
                ChatMessage.Role.FUNCTION -> "function"
              },
            "content" to message.content,
          )
        }

      val request =
        buildMap<String, Any> {
          put("model", config.model)
          put("messages", ollamaMessages)
          put(
            "options",
            mapOf(
              "temperature" to temperature.coerceIn(0.0, 1.0),
              "num_predict" to maxTokens.coerceAtMost(4096), // Ollama has a context window limit
            ),
          )
          // Ollama doesn't support functions natively, we'll need to handle this in the prompt
        }

      val headers =
        HttpHeaders().apply {
          contentType = MediaType.APPLICATION_JSON
        }

      val response =
        restTemplate.postForObject<Map<String, Any>>(
          URI("${config.apiUrl}/api/chat"),
          HttpEntity(request, headers),
          Map::class.java,
        )

      val message =
        response?.get("message") as? Map<*, *>
          ?: throw LlmException("No message in response")

      val content = message["content"] as? String ?: ""

      ChatCompletion(
        content = content,
        role = ChatMessage.Role.ASSISTANT,
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
          put(
            "options",
            mapOf(
              "temperature" to temperature.coerceIn(0.0, 1.0),
              "num_predict" to maxTokens.coerceAtMost(4096),
            ),
          )
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
          URI("${config.apiUrl}/api/generate"),
          HttpEntity(request, headers),
          Map::class.java,
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
    backoff = Backoff(delay = 5000, multiplier = 2.0), // Longer delay for model pulls
  )
  suspend fun pullModel(modelName: String) =
    withRetry("pullModel") {
      val request = mapOf("name" to modelName)
      val headers =
        HttpHeaders().apply {
          contentType = MediaType.APPLICATION_JSON
        }

      restTemplate.postForObject<Map<String, Any>>(
        URI("${config.apiUrl}/api/pull"),
        HttpEntity(request, headers),
        Map::class.java,
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
  suspend fun isModelAvailable(modelName: String): Boolean =
    withContext(Dispatchers.IO) {
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
