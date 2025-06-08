package org.gotson.komga.interfaces.rest

import mu.KotlinLogging
import org.gotson.komga.infrastructure.llm.LlmModelManager
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

private val logger = KotlinLogging.logger {}

@RestController
@RequestMapping(
  "api/v1/llm",
  produces = [MediaType.APPLICATION_JSON_VALUE],
)
class LlmController(
  private val modelManager: LlmModelManager,
) {
  @GetMapping("/providers")
  fun listProviders(): List<LlmModelManager.LlmProvider> = LlmModelManager.LlmProvider.values().toList()

  @GetMapping("/models")
  suspend fun listModels(
    @RequestParam provider: LlmModelManager.LlmProvider,
  ): List<LlmModelManager.ModelInfo> = modelManager.listAvailableModels(provider)

  @PostMapping("/models/load")
  suspend fun loadModel(
    @RequestParam provider: LlmModelManager.LlmProvider,
    @RequestParam modelName: String,
  ): Map<String, String> {
    val modelId = modelManager.loadModel(provider, modelName)
    return mapOf("modelId" to modelId)
  }

  @DeleteMapping("/models/{modelId}")
  suspend fun unloadModel(
    @PathVariable modelId: String,
  ) {
    modelManager.unloadModel(modelId)
  }

  @GetMapping("/models/active")
  suspend fun listActiveModels(): List<Map<String, Any>> =
    modelManager.getActiveModels().map { (id, info) ->
      mapOf(
        "id" to id,
        "modelId" to info.modelId,
        "provider" to info.provider.name,
        "loadedAt" to info.loadedAt,
        "lastUsed" to info.lastUsed,
      )
    }
}
