package org.gotson.komga.infrastructure.llm

import io.mockk.every
import org.gotson.komga.infrastructure.llm.model.LlmProvider
import org.gotson.komga.infrastructure.llm.service.LlmService

/**
 * Test utilities for LLM service tests.
 */
object LlmTestUtils {
  /**
   * Mocks an LLM service to be available and return the given provider.
   */
  fun <T : LlmService> mockAvailableService(
    service: T,
    provider: LlmProvider,
  ): T {
    every { service.provider } returns provider
    every { service.isAvailable() } returns true
    every { service.cleanup() } returns Unit
    return service
  }

  /**
   * Mocks an LLM service to be unavailable.
   */
  fun <T : LlmService> mockUnavailableService(
    service: T,
    provider: LlmProvider,
  ): T {
    every { service.provider } returns provider
    every { service.isAvailable() } returns false
    return service
  }

  /**
   * Creates a test LLM configuration with the specified providers enabled.
   */
  fun createTestConfig(
    defaultProvider: LlmProvider = LlmProvider.OPENAI,
    vararg enabledProviders: LlmProvider = LlmProvider.values(),
  ): LlmConfig =
    object : LlmConfig() {
      override val enabled = true
      override val defaultProvider = defaultProvider.name.lowercase()

      override val openai =
        object : LlmProviderConfig() {
          override val enabled = enabledProviders.contains(LlmProvider.OPENAI)
        }

      override val ollama =
        object : LlmProviderConfig() {
          override val enabled = enabledProviders.contains(LlmProvider.OLLAMA)
        }

      override val lmStudio =
        object : LlmProviderConfig() {
          override val enabled = enabledProviders.contains(LlmProvider.LM_STUDIO)
        }

      override val vllm =
        object : LlmProviderConfig() {
          override val enabled = enabledProviders.contains(LlmProvider.VLLM)
        }

      override val googleNoteLm =
        object : LlmProviderConfig() {
          override val enabled = enabledProviders.contains(LlmProvider.GOOGLE_NOTE_LM)
        }

      override val rateLimit =
        object : LlmConfig.RateLimitConfig() {
          override val requestsPerMinute = 60
          override val maxConcurrent = 10
        }
    }
}
