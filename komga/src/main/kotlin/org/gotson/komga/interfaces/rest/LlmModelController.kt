package org.gotson.komga.interfaces.rest

import mu.KotlinLogging
import org.gotson.komga.infrastructure.llm.LlmModelManager
import org.gotson.komga.interfaces.rest.dto.LlmModelDto
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

private val logger = KotlinLogging.logger {}

@RestController
@RequestMapping(
  "api/v1/llm/models",
  produces = [MediaType.APPLICATION_JSON_VALUE],
)
class LlmModelController(
  private val modelManager: LlmModelManager,
) {
  private val emitters = CopyOnWriteArrayList<SseEmitter>()
  private val executor = Executors.newSingleThreadScheduledExecutor()

  @GetMapping
  suspend fun listModels(
    @RequestParam provider: LlmModelManager.LlmProvider,
  ): List<LlmModelDto> =
    modelManager
      .listAvailableModels(provider)
      .map { LlmModelDto.fromModelInfo(it) }

  @PostMapping("/load")
  suspend fun loadModel(
    @RequestParam provider: LlmModelManager.LlmProvider,
    @RequestParam modelName: String,
  ): LlmModelDto {
    val modelId = modelManager.loadModel(provider, modelName)
    val modelInfo =
      modelManager.getModelInfo(modelId)
        ?: throw IllegalArgumentException("Failed to load model: $modelName")

    // Notify all subscribers
    broadcastModelUpdate(modelInfo)

    return LlmModelDto.fromModelInfo(modelInfo)
  }

  @DeleteMapping("/{modelId}")
  suspend fun unloadModel(
    @PathVariable modelId: String,
  ) {
    val modelInfo =
      modelManager.getModelInfo(modelId)
        ?: throw IllegalArgumentException("Model not found: $modelId")

    modelManager.unloadModel(modelId)

    // Notify all subscribers
    broadcastModelUpdate(modelInfo.copy(loaded = false))
  }

  @GetMapping("/active")
  suspend fun listActiveModels(): List<LlmModelDto> =
    modelManager.getActiveModels().map { (_, info) ->
      LlmModelDto.fromModelInfo(info)
    }

  @GetMapping("/events")
  fun streamModelUpdates(): SseEmitter {
    val emitter = SseEmitter(TimeUnit.MINUTES.toMillis(30))
    emitters.add(emitter)

    // Send initial state
    executor.execute {
      try {
        val activeModels =
          modelManager
            .getActiveModels()
            .map { (_, info) -> LlmModelDto.fromModelInfo(info) }

        emitter.send(
          SseEmitter
            .event()
            .name("models")
            .data(activeModels),
        )
      } catch (e: Exception) {
        logger.error(e) { "Failed to send initial model state" }
        emitters.remove(emitter)
      }
    }

    emitter.onCompletion {
      logger.debug { "SSE connection closed" }
      emitters.remove(emitter)
    }

    emitter.onTimeout {
      logger.debug { "SSE connection timed out" }
      emitters.remove(emitter)
    }

    return emitter
  }

  private fun broadcastModelUpdate(modelInfo: LlmModelManager.ModelInfo) {
    val dto = LlmModelDto.fromModelInfo(modelInfo)
    val deadEmitters = mutableListOf<SseEmitter>()

    emitters.forEach { emitter ->
      try {
        emitter.send(
          SseEmitter
            .event()
            .name("model_update")
            .data(dto),
        )
      } catch (e: Exception) {
        logger.error(e) { "Failed to send model update to client" }
        deadEmitters.add(emitter)
      }
    }

    emitters.removeAll(deadEmitters)
  }
}

/**
 * DTO for LLM model information
 */
data class LlmModelDto(
  val id: String,
  val name: String,
  val provider: String,
  val loaded: Boolean,
  val size: Long? = null,
  val parameters: Map<String, Any> = emptyMap(),
) {
  companion object {
    fun fromModelInfo(info: LlmModelManager.ModelInfo): LlmModelDto =
      LlmModelDto(
        id = info.id,
        name = info.name,
        provider = info.provider.name,
        loaded = info.loaded,
        size = info.size,
        parameters = info.parameters,
      )
  }
}
