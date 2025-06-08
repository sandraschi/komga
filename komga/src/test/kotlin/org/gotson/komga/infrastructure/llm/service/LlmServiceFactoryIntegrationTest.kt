package org.gotson.komga.infrastructure.llm.service

import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.runBlocking
import org.assertj.core.api.Assertions.assertThat
import org.gotson.komga.infrastructure.llm.LlmTestUtils
import org.gotson.komga.infrastructure.llm.model.LlmProvider
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.mock.mockito.MockBean
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.TestPropertySource

@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(
  properties = [
    "komga.llm.enabled=true",
    "komga.llm.default-provider=openai",
    "komga.llm.openai.enabled=true",
    "komga.llm.ollama.enabled=true",
  ],
)
class LlmServiceFactoryIntegrationTest {
  @Autowired
  private lateinit var factory: LlmServiceFactory

  @MockBean
  private lateinit var openAIService: OpenAIService

  @MockBean
  private lateinit var ollamaService: OllamaService

  @Test
  fun `should initialize with default provider`() {
    // given
    every { openAIService.isAvailable() } returns true
    every { openAIService.provider } returns LlmProvider.OPENAI

    // when
    val activeService = factory.getActiveService()

    // then
    assertThat(activeService.provider).isEqualTo(LlmProvider.OPENAI)
  }

  @Test
  fun `should switch to fallback provider when default is unavailable`() =
    runBlocking {
      // given
      every { openAIService.isAvailable() } returns false
      every { ollamaService.isAvailable() } returns true
      every { ollamaService.provider } returns LlmProvider.OLLAMA

      // when
      val activeService = factory.getActiveService()

      // then
      assertThat(activeService.provider).isEqualTo(LlmProvider.OLLAMA)
    }

  @Test
  fun `should clean up services on shutdown`() {
    // given
    every { openAIService.isAvailable() } returns true
    every { openAIService.provider } returns LlmProvider.OPENAI
    every { openAIService.cleanup() } returns Unit

    // when
    factory.destroy()

    // then
    verify(exactly = 1) { openAIService.cleanup() }
  }

  @Test
  fun `should not fail when destroying uninitialized factory`() {
    // given
    val testFactory =
      LlmServiceFactory(
        config = LlmTestUtils.createTestConfig(),
        applicationContext = mockk(relaxed = true),
        openAIService = mockk(relaxed = true),
        ollamaService = mockk(relaxed = true),
        lmStudioService = mockk(relaxed = true),
        vllmService = mockk(relaxed = true),
        googleNoteLmService = mockk(relaxed = true),
      )

    // when / then - should not throw
    testFactory.destroy()
  }
}
