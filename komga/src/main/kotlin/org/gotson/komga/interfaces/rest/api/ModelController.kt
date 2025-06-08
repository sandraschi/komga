package org.gotson.komga.interfaces.rest.api

import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.Parameter
import io.swagger.v3.oas.annotations.tags.Tag
import mu.KotlinLogging
import org.gotson.komga.infrastructure.llm.model.LlmModel
import org.gotson.komga.infrastructure.llm.service.LlmServiceFactory
import org.gotson.komga.infrastructure.llm.service.ModelManager
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.server.ResponseStatusException

private val logger = KotlinLogging.logger {}

/**
 * REST API for managing LLM models.
 * Provides endpoints to list, load, and unload models from different providers.
 */
@RestController
@RequestMapping(
  value = ["/api/v1/llm/models"],
  produces = [MediaType.APPLICATION_JSON_VALUE],
)
@Tag(name = "Model Management")
class ModelController(
  private val llmServiceFactory: LlmServiceFactory,
) {
  /**
   * List all available models across all providers.
   */
  @Operation(
    summary = "List all available models",
    description = "List all available models from all configured LLM providers",
  )
  @GetMapping
  @ResponseStatus(HttpStatus.OK)
  suspend fun listModels(): List<LlmModel> =
    llmServiceFactory.getActiveService().let { service ->
      if (service is ModelManager) {
        service.listModels()
      } else {
        emptyList()
      }
    }

  /**
   * Get details about a specific model.
   */
  @Operation(
    summary = "Get model details",
    description = "Get detailed information about a specific model",
  )
  @GetMapping("/{modelId}")
  @ResponseStatus(HttpStatus.OK)
  suspend fun getModel(
    @Parameter(description = "ID of the model to retrieve", required = true)
    @PathVariable modelId: String,
  ): LlmModel =
    llmServiceFactory.getActiveService().let { service ->
      if (service is ModelManager) {
        service.getModel(modelId) ?: throw ResponseStatusException(
          HttpStatus.NOT_FOUND,
          "Model not found: $modelId",
        )
      } else {
        throw ResponseStatusException(
          HttpStatus.NOT_IMPLEMENTED,
          "Model management not supported by the current provider",
        )
      }
    }

  /**
   * Load a model into memory.
   */
  @Operation(
    summary = "Load a model",
    description = "Load a model into memory for inference",
  )
  @PostMapping("/{modelId}/load")
  @ResponseStatus(HttpStatus.ACCEPTED)
  suspend fun loadModel(
    @Parameter(description = "ID of the model to load", required = true)
    @PathVariable modelId: String,
    @Parameter(description = "Force load even if already loaded")
    @RequestParam(required = false, defaultValue = "false") force: Boolean,
  ) = llmServiceFactory.getActiveService().let { service ->
    if (service is ModelManager) {
      service.loadModel(LoadModelRequest(modelId, force)).also { response ->
        if (!response.success) {
          throw ResponseStatusException(
            HttpStatus.INTERNAL_SERVER_ERROR,
            response.message,
          )
        }
      }
    } else {
      throw ResponseStatusException(
        HttpStatus.NOT_IMPLEMENTED,
        "Model management not supported by the current provider",
      )
    }
  }

  /**
   * Unload a model from memory.
   */
  @Operation(
    summary = "Unload a model",
    description = "Unload a model from memory",
  )
  @PostMapping("/{modelId}/unload")
  @ResponseStatus(HttpStatus.ACCEPTED)
  suspend fun unloadModel(
    @Parameter(description = "ID of the model to unload", required = true)
    @PathVariable modelId: String,
    @Parameter(description = "Force unload even if in use")
    @RequestParam(required = false, defaultValue = "false") force: Boolean,
  ) = llmServiceFactory.getActiveService().let { service ->
    if (service is ModelManager) {
      service.unloadModel(UnloadModelRequest(modelId, force)).also { response ->
        if (!response.success) {
          throw ResponseStatusException(
            HttpStatus.INTERNAL_SERVER_ERROR,
            response.message,
          )
        }
      }
    } else {
      throw ResponseStatusException(
        HttpStatus.NOT_IMPLEMENTED,
        "Model management not supported by the current provider",
      )
    }
  }

  /**
   * Get the status of all models.
   */
  @Operation(
    summary = "Get model statuses",
    description = "Get the status of all models",
  )
  @GetMapping("/status")
  @ResponseStatus(HttpStatus.OK)
  suspend fun getModelStatuses(): List<LlmModel> =
    llmServiceFactory.getActiveService().let { service ->
      if (service is ModelManager) {
        service.getModelStatuses()
      } else {
        emptyList()
      }
    }

  /**
   * Get the status of a specific model.
   */
  @Operation(
    summary = "Get model status",
    description = "Get the status of a specific model",
  )
  @GetMapping("/{modelId}/status")
  @ResponseStatus(HttpStatus.OK)
  suspend fun getModelStatus(
    @Parameter(description = "ID of the model to get status for", required = true)
    @PathVariable modelId: String,
  ): LlmModel =
    llmServiceFactory.getActiveService().let { service ->
      if (service is ModelManager) {
        service.getModelStatus(modelId) ?: throw ResponseStatusException(
          HttpStatus.NOT_FOUND,
          "Model not found: $modelId",
        )
      } else {
        throw ResponseStatusException(
          HttpStatus.NOT_IMPLEMENTED,
          "Model management not supported by the current provider",
        )
      }
    }
}

// DTOs for request/response

/**
 * Request to load a model
 */
data class LoadModelRequest(
  val modelId: String,
  val force: Boolean = false,
)

/**
 * Request to unload a model
 */
data class UnloadModelRequest(
  val modelId: String,
  val force: Boolean = false,
)

/**
 * Response for model operations
 */
data class ModelOperationResponse(
  val success: Boolean,
  val message: String,
  val model: LlmModel? = null,
)
