package org.gotson.komga.interfaces.rest.llm

import mu.KotlinLogging
import org.gotson.komga.infrastructure.llm.model.LlmModel
import org.gotson.komga.infrastructure.llm.service.ModelManager
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

private val logger = KotlinLogging.logger {}

/**
 * REST API for managing LLM models and operations
 */
@RestController
@RequestMapping(
  path = ["/api/v1/llm"],
  produces = [MediaType.APPLICATION_JSON_VALUE],
)
class LlmController(
  private val modelManager: ModelManager,
) {
  /**
   * List all available models
   */
  @GetMapping("/models")
  suspend fun listModels(): List<LlmModel> = modelManager.listModels()

  /**
   * Get model details
   */
  @GetMapping("/models/{modelId}")
  suspend fun getModel(
    @PathVariable modelId: String,
  ): ResponseEntity<LlmModel> =
    modelManager.getModel(modelId)?.let {
      ResponseEntity.ok(it)
    } ?: ResponseEntity.notFound().build()

  /**
   * Load a model
   */
  @PostMapping("/models/{modelId}/load")
  @ResponseStatus(HttpStatus.ACCEPTED)
  suspend fun loadModel(
    @PathVariable modelId: String,
    @RequestParam(required = false, defaultValue = "false") force: Boolean,
  ) = modelManager.loadModel(LoadModelRequest(modelId, force))

  /**
   * Unload a model
   */
  @PostMapping("/models/{modelId}/unload")
  @ResponseStatus(HttpStatus.ACCEPTED)
  suspend fun unloadModel(
    @PathVariable modelId: String,
    @RequestParam(required = false, defaultValue = "false") force: Boolean,
  ) = modelManager.unloadModel(UnloadModelRequest(modelId, force))

  /**
   * Get status of all models
   */
  @GetMapping("/models/status")
  suspend fun getModelStatuses(): List<LlmModel> = modelManager.getModelStatuses()

  /**
   * Get status of a specific model
   */
  @GetMapping("/models/{modelId}/status")
  suspend fun getModelStatus(
    @PathVariable modelId: String,
  ): ResponseEntity<LlmModel> =
    modelManager.getModelStatus(modelId)?.let {
      ResponseEntity.ok(it)
    } ?: ResponseEntity.notFound().build()

  /**
   * Generate text using a loaded model
   */
  @PostMapping("/generate")
  suspend fun generateText(
    @RequestBody request: GenerateTextRequest,
  ): GenerateTextResponse {
    // Implementation will be added when text generation is implemented
    TODO("Text generation will be implemented in a future update")
  }

  /**
   * Analyze content using a loaded model
   */
  @PostMapping("/analyze")
  suspend fun analyzeContent(
    @RequestBody request: AnalyzeContentRequest,
  ): AnalyzeContentResponse {
    // Implementation will be added when content analysis is implemented
    TODO("Content analysis will be implemented in a future update")
  }

  /**
   * Request/response classes for the API
   */
  data class GenerateTextRequest(
    val modelId: String,
    val prompt: String,
    val maxTokens: Int = 1024,
    val temperature: Double = 0.7,
    val stop: List<String> = emptyList(),
  )

  data class GenerateTextResponse(
    val text: String,
    val model: String,
    val tokensUsed: Int,
    val finishReason: String,
  )

  data class AnalyzeContentRequest(
    val modelId: String,
    val content: String,
    val analysisType: AnalysisType,
    val options: Map<String, Any> = emptyMap(),
  )

  data class AnalyzeContentResponse(
    val results: Map<String, Any>,
    val model: String,
    val analysisType: AnalysisType,
  )

  enum class AnalysisType {
    SENTIMENT,
    KEYWORDS,
    SUMMARY,
    ENTITIES,
    TOPICS,
  }

  @ExceptionHandler(NoSuchElementException::class)
  @ResponseStatus(HttpStatus.NOT_FOUND)
  fun handleNotFound(e: NoSuchElementException): Map<String, String> = mapOf("error" to e.message ?: "Resource not found")

  @ExceptionHandler(IllegalStateException::class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  fun handleBadRequest(e: IllegalStateException): Map<String, String> = mapOf("error" to e.message ?: "Invalid request")

  @ExceptionHandler(Exception::class)
  @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
  fun handleGenericException(e: Exception): Map<String, String> {
    logger.error(e) { "Unexpected error" }
    return mapOf("error" to "An unexpected error occurred: ${e.message}")
  }
}
