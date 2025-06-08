package org.gotson.komga.interfaces.rest

import mu.KotlinLogging
import org.gotson.komga.infrastructure.llm.exception.LlmException
import org.gotson.komga.infrastructure.llm.model.ChatMessage
import org.gotson.komga.infrastructure.llm.model.FunctionCall
import org.gotson.komga.infrastructure.llm.model.FunctionDefinition
import org.gotson.komga.infrastructure.llm.model.LlmProvider
import org.gotson.komga.infrastructure.llm.service.LlmService
import org.gotson.komga.infrastructure.llm.service.LlmServiceFactory
import org.gotson.komga.interfaces.rest.dto.LlmApiDto
import org.gotson.komga.interfaces.rest.dto.LlmProviderDto
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import java.time.Instant

private val logger = KotlinLogging.logger {}

/**
 * REST controller for LLM-related operations.
 *
 * This controller provides endpoints for:
 * - Generating text completions
 * - Chatting with the LLM
 * - Managing the active LLM provider
 * - Getting information about available providers
 */
@RestController
@RequestMapping("api/v1/llm", produces = [MediaType.APPLICATION_JSON_VALUE])
class LlmApiController(
  private val llmServiceFactory: LlmServiceFactory,
  private val llmService: LlmService,
) {
  @GetMapping("/providers")
  fun getProviders(): List<LlmProviderDto> =
    LlmProvider.values().map { provider ->
      LlmProviderDto(
        id = provider.name,
        name = provider.name.replace('_', ' '),
        enabled = llmServiceFactory.isProviderEnabled(provider),
        isActive = provider == llmServiceFactory.getActiveProvider(),
      )
    }

  @GetMapping("/provider/active")
  fun getActiveProvider(): LlmProviderDto =
    llmServiceFactory.getActiveProvider()?.let { provider ->
      LlmProviderDto(
        id = provider.name,
        name = provider.name.replace('_', ' '),
        enabled = true,
        isActive = true,
      )
    } ?: throw ResponseStatusException(
      HttpStatus.SERVICE_UNAVAILABLE,
      "No active LLM provider",
    )

  @PostMapping("/provider/{providerId}/switch")
  suspend fun switchProvider(
    @PathVariable providerId: String,
  ): ResponseEntity<LlmProviderDto> =
    try {
      val provider = LlmProvider.valueOf(providerId.uppercase())
      val service = llmServiceFactory.switchProvider(provider)

      ResponseEntity.ok(
        LlmProviderDto(
          id = provider.name,
          name = provider.name.replace('_', ' '),
          enabled = true,
          isActive = true,
        ),
      )
    } catch (e: IllegalArgumentException) {
      throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid provider: $providerId")
    } catch (e: LlmException) {
      throw ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, e.message)
    }

  @PostMapping("/completions")
  suspend fun generateCompletion(
    @RequestBody request: LlmApiDto.CompletionRequest,
  ): LlmApiDto.CompletionResponse =
    try {
      val result =
        llmService.generateCompletion(
          prompt = request.prompt,
          maxTokens = request.maxTokens ?: 1000,
          temperature = request.temperature ?: 0.7,
          stopSequences = request.stop ?: emptyList(),
        )

      LlmApiDto.CompletionResponse(
        id = "cmpl_${Instant.now().toEpochMilli()}",
        content = result,
        model = llmServiceFactory.getActiveProvider()?.name ?: "unknown",
      )
    } catch (e: LlmException) {
      logger.error(e) { "Error generating completion" }
      throw ResponseStatusException(
        HttpStatus.INTERNAL_SERVER_ERROR,
        "Failed to generate completion: ${e.message}",
      )
    }

  @PostMapping("/chat/completions")
  suspend fun generateChatCompletion(
    @RequestBody request: LlmApiDto.ChatCompletionRequest,
  ): LlmApiDto.ChatCompletionResponse =
    try {
      val messages =
        request.messages.map {
          ChatMessage(
            role = ChatMessage.Role.valueOf(it.role.uppercase()),
            content = it.content,
            name = it.name,
            functionCall =
              it.functionCall?.let { fc ->
                FunctionCall(
                  name = fc.name,
                  arguments = fc.arguments,
                )
              },
          )
        }

      val functions =
        request.functions?.map {
          FunctionDefinition(
            name = it.name,
            description = it.description,
            parameters = it.parameters,
          )
        } ?: emptyList()

      val functionCall =
        request.functionCall?.let {
          FunctionCall(
            name = it.name,
            arguments = it.arguments,
          )
        }

      val result =
        llmService.generateChatCompletion(
          messages = messages,
          maxTokens = request.maxTokens ?: 1000,
          temperature = request.temperature ?: 0.7,
          functions = functions,
          functionCall = functionCall,
        )

      LlmApiDto.ChatCompletionResponse(
        id = "chatcmpl_${Instant.now().toEpochMilli()}",
        content = result.content,
        role = result.role.name.lowercase(),
        functionCall =
          result.functionCall?.let { fc ->
            LlmApiDto.FunctionCallDto(
              name = fc.name,
              arguments = fc.arguments,
            )
          },
        finishReason = result.finishReason,
        model = llmServiceFactory.getActiveProvider()?.name ?: "unknown",
      )
    } catch (e: IllegalArgumentException) {
      throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid request: ${e.message}")
    } catch (e: LlmException) {
      logger.error(e) { "Error generating chat completion" }
      throw ResponseStatusException(
        HttpStatus.INTERNAL_SERVER_ERROR,
        "Failed to generate chat completion: ${e.message}",
      )
    }

  @PostMapping("/embeddings")
  suspend fun createEmbedding(
    @RequestBody request: LlmApiDto.EmbeddingRequest,
  ): LlmApiDto.EmbeddingResponse =
    try {
      val embedding = llmService.createEmbedding(request.input)

      LlmApiDto.EmbeddingResponse(
        id = "emb_${Instant.now().toEpochMilli()}",
        embedding = embedding,
        model = llmServiceFactory.getActiveProvider()?.name ?: "unknown",
      )
    } catch (e: UnsupportedOperationException) {
      throw ResponseStatusException(
        HttpStatus.BAD_REQUEST,
        "Embeddings are not supported by the current provider",
      )
    } catch (e: LlmException) {
      logger.error(e) { "Error creating embedding" }
      throw ResponseStatusException(
        HttpStatus.INTERNAL_SERVER_ERROR,
        "Failed to create embedding: ${e.message}",
      )
    }
}
