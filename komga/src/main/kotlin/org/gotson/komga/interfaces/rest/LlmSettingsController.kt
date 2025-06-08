package org.gotson.komga.interfaces.rest

import mu.KotlinLogging
import org.gotson.komga.infrastructure.llm.LlmConfig
import org.gotson.komga.interfaces.rest.dto.LlmSettingsDto
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
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
  "api/v1/llm/settings",
  produces = [MediaType.APPLICATION_JSON_VALUE],
)
class LlmSettingsController(
  private val llmConfig: LlmConfig,
) {
  private val emitters = CopyOnWriteArrayList<SseEmitter>()
  private val executor = Executors.newSingleThreadScheduledExecutor()

  @GetMapping
  fun getSettings(): LlmSettingsDto = LlmSettingsDto.fromConfig(llmConfig)

  @PutMapping
  fun updateSettings(
    @RequestBody update: LlmSettingsDto.LlmSettingsUpdateDto,
  ): LlmSettingsDto {
    // In a real implementation, this would update the configuration
    // and persist it to disk
    logger.info { "Updating LLM settings: $update" }

    // For now, we'll just return the current config
    return LlmSettingsDto.fromConfig(llmConfig)
  }

  @GetMapping("/events")
  fun streamSettings(): SseEmitter {
    val emitter = SseEmitter(TimeUnit.MINUTES.toMillis(30))
    emitters.add(emitter)

    // Send initial state
    executor.execute {
      try {
        emitter.send(
          SseEmitter
            .event()
            .name("settings")
            .data(getSettings()),
        )
      } catch (e: Exception) {
        logger.error(e) { "Failed to send initial settings" }
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

  @PostMapping("/test-connection")
  suspend fun testConnection(
    @RequestParam provider: String,
    @RequestParam model: String? = null,
  ): ResponseEntity<Map<String, Any>> =
    try {
      // In a real implementation, this would test the connection to the provider
      // and return the result
      val success = true
      val message = "Successfully connected to $provider" + (model?.let { " with model $it" } ?: "")

      ResponseEntity.ok(
        mapOf(
          "success" to success,
          "message" to message,
        ),
      )
    } catch (e: Exception) {
      logger.error(e) { "Failed to test connection to $provider" }
      ResponseEntity.badRequest().body(
        mapOf(
          "success" to false,
          "message" to "Failed to connect to $provider: ${e.message}",
        ),
      )
    }

  private fun broadcastSettings() {
    val settings = getSettings()
    val deadEmitters = mutableListOf<SseEmitter>()

    emitters.forEach { emitter ->
      try {
        emitter.send(
          SseEmitter
            .event()
            .name("settings")
            .data(settings),
        )
      } catch (e: Exception) {
        logger.error(e) { "Failed to send settings update to client" }
        deadEmitters.add(emitter)
      }
    }

    emitters.removeAll(deadEmitters)
  }
}
