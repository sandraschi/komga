package org.gotson.komga.infrastructure.llm

import io.mockk.mockk
import org.gotson.komga.infrastructure.llm.service.GoogleNoteLmService
import org.gotson.komga.infrastructure.llm.service.LmStudioService
import org.gotson.komga.infrastructure.llm.service.OllamaService
import org.gotson.komga.infrastructure.llm.service.OpenAIService
import org.gotson.komga.infrastructure.llm.service.VllmService
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Primary
import org.springframework.web.client.RestTemplate

/**
 * Test configuration for LLM service tests.
 * Provides mock implementations of LLM services for testing.
 */
@Configuration
class TestConfig {
  @Bean
  @Primary
  fun mockOpenAIService(): OpenAIService = mockk(relaxed = true)

  @Bean
  @Primary
  fun mockOllamaService(): OllamaService = mockk(relaxed = true)

  @Bean
  @Primary
  fun mockLmStudioService(): LmStudioService = mockk(relaxed = true)

  @Bean
  @Primary
  fun mockVllmService(): VllmService = mockk(relaxed = true)

  @Bean
  @Primary
  fun mockGoogleNoteLmService(): GoogleNoteLmService = mockk(relaxed = true)

  @Bean
  @Primary
  fun mockRestTemplate(): RestTemplate = mockk(relaxed = true)

  @Bean
  @Primary
  fun mockLlmConfig(): LlmConfig =
    mockk(relaxed = true) {
      every { enabled } returns true
      every { defaultProvider } returns "OPENAI"
    }
}
