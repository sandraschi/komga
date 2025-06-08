package org.gotson.komga.infrastructure.llm.service

import org.gotson.komga.infrastructure.llm.exception.LlmException
import org.gotson.komga.infrastructure.llm.model.LlmCompletionRequest
import org.gotson.komga.infrastructure.llm.model.LlmCompletionResponse

/**
 * Service interface for interacting with Large Language Models.
 */
interface LlmService {
  /**
   * Gets the name of the LLM provider.
   *
   * @return The provider name
   */
  fun getProviderName(): String

  /**
   * Checks if the LLM service is available.
   *
   * @return `true` if the service is available, `false` otherwise
   */
  fun isAvailable(): Boolean

  /**
   * Gets a chat completion from the LLM.
   *
   * @param request The completion request
   * @return The completion response
   * @throws LlmException if there is an error processing the request
   */
  @Throws(LlmException::class)
  fun getCompletion(request: LlmCompletionRequest): LlmCompletionResponse

  /**
   * Gets the list of available models.
   *
   * @return List of model identifiers
   * @throws LlmException if there is an error fetching the models
   */
  @Throws(LlmException::class)
  fun listModels(): List<String>
}
