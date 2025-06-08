package org.gotson.komga.infrastructure.llm.service

import io.mockk.clearAllMocks
import io.mockk.every
import io.mockk.impl.annotations.MockK
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import kotlinx.coroutines.runBlocking
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.gotson.komga.infrastructure.llm.LlmConfig
import org.gotson.komga.infrastructure.llm.exception.LlmException
import org.gotson.komga.infrastructure.llm.model.LlmProvider
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.context.ApplicationContext

@ExtendWith(MockKExtension::class)
class LlmServiceFactoryTest {
  @MockK
  private lateinit var config: LlmConfig

  @MockK
  private lateinit var applicationContext: ApplicationContext

  @RelaxedMockK
  private lateinit var openAIService: OpenAIService

  @RelaxedMockK
  private lateinit var ollamaService: OllamaService

  @RelaxedMockK
  private lateinit var lmStudioService: LmStudioService

  @RelaxedMockK
  private lateinit var vllmService: VllmService

  @RelaxedMockK
  private lateinit var googleNoteLmService: GoogleNoteLmService

  @MockK
  private lateinit var rateLimitConfig: LlmConfig.RateLimitConfig

  private lateinit var factory: LlmServiceFactory

  @BeforeEach
  fun setUp() {
    // Setup default config
    every { config.enabled } returns true
    every { config.defaultProvider } returns "OPENAI"
    every { config.rateLimit } returns rateLimitConfig
    every { rateLimitConfig.requestsPerMinute } returns 60
    every { rateLimitConfig.maxConcurrent } returns 10

    // Enable all providers by default
    every { config.openai.enabled } returns true
    every { config.ollama.enabled } returns true
    every { config.lmStudio.enabled } returns true
    every { config.vllm.enabled } returns true
    every { config.googleNoteLm.enabled } returns true

    factory =
      LlmServiceFactory(
        config = config,
        applicationContext = applicationContext,
        openAIService = openAIService,
        ollamaService = ollamaService,
        lmStudioService = lmStudioService,
        vllmService = vllmService,
        googleNoteLmService = googleNoteLmService,
      )

    // Mock service availability
    every { openAIService.isAvailable() } returns true
    every { ollamaService.isAvailable() } returns true
    every { lmStudioService.isAvailable() } returns true
    every { vllmService.isAvailable() } returns true
    every { googleNoteLmService.isAvailable() } returns true
  }

  @AfterEach
  fun tearDown() {
    clearAllMocks()
  }

  @Nested
  inner class GetActiveService {
    @Test
    fun `should return active service when initialized`() {
      // when
      val service = factory.getActiveService()

      // then
      assertThat(service).isNotNull
      assertThat(service.provider).isEqualTo(LlmProvider.OPENAI)
    }

    @Test
    fun `should throw exception when no active service`() {
      // given
      every { config.enabled } returns false

      // when / then
      assertThatThrownBy { factory.getActiveService() }
        .isInstanceOf(IllegalStateException::class.java)
        .hasMessageContaining("No LLM service is currently active")
    }
  }

  @Nested
  inner class SwitchProvider {
    @Test
    fun `should switch to specified provider`() =
      runBlocking {
        // when
        val service = factory.switchProvider(LlmProvider.OLLAMA)

        // then
        assertThat(service.provider).isEqualTo(LlmProvider.OLLAMA)
        assertThat(factory.getActiveProvider()).isEqualTo(LlmProvider.OLLAMA)
      }

    @Test
    fun `should throw exception when provider is not enabled`() =
      runBlocking {
        // given
        every { config.ollama.enabled } returns false

        // when / then
        assertThatThrownBy { factory.switchProvider(LlmProvider.OLLAMA) }
          .isInstanceOf(IllegalArgumentException::class.java)
          .hasMessageContaining("Provider OLLAMA is not enabled")
      }

    @Test
    fun `should throw exception when service is not available`() =
      runBlocking {
        // given
        every { ollamaService.isAvailable() } returns false

        // when / then
        assertThatThrownBy { factory.switchProvider(LlmProvider.OLLAMA) }
          .isInstanceOf(LlmException.ServiceUnavailableException::class.java)
      }
  }

  @Nested
  inner class IsProviderEnabled {
    @Test
    fun `should return true when provider is enabled`() {
      // given
      every { config.ollama.enabled } returns true

      // when
      val result = factory.isProviderEnabled(LlmProvider.OLLAMA)

      // then
      assertThat(result).isTrue()
    }

    @Test
    fun `should return false when provider is disabled`() {
      // given
      every { config.ollama.enabled } returns false

      // when
      val result = factory.isProviderEnabled(LlmProvider.OLLAMA)

      // then
      assertThat(result).isFalse()
    }
  }

  @Test
  fun `should clean up services on destroy`() {
    // given
    runBlocking {
      factory.switchProvider(LlmProvider.OPENAI)
      factory.switchProvider(LlmProvider.OLLAMA)
    }

    // when
    factory.destroy()

    // then - verify cleanup was called on services
    verify(exactly = 1) { openAIService.cleanup() }
    verify(exactly = 1) { ollamaService.cleanup() }
  }

  @Test
  fun `should handle errors during service cleanup`() {
    // given
    every { openAIService.cleanup() } throws RuntimeException("Cleanup failed")

    // when
    factory.destroy()

    // then - should not throw, error should be logged
    verify(exactly = 1) { openAIService.cleanup() }
  }
}
