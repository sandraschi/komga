package org.gotson.komga.infrastructure.llm.config

import com.fasterxml.jackson.databind.ObjectMapper
import mu.KotlinLogging
import org.gotson.komga.infrastructure.llm.service.LlmService
import org.gotson.komga.infrastructure.llm.service.LmStudioService
import org.gotson.komga.infrastructure.llm.service.OllamaService
import org.gotson.komga.infrastructure.llm.service.OpenAIService
import org.gotson.komga.infrastructure.llm.service.VllmService
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.ApplicationContext
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Primary
import org.springframework.retry.annotation.EnableRetry
import org.springframework.scheduling.annotation.EnableScheduling
import org.springframework.web.client.RestTemplate
import java.util.concurrent.Executor
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService

private val logger = KotlinLogging.logger {}

/**
 * Auto-configuration for the LLM module.
 *
 * This configuration sets up the necessary beans for the LLM services and ensures they're
 * properly configured based on the application properties.
 */
@Configuration
@EnableRetry
@EnableScheduling
@ConditionalOnWebApplication
@EnableConfigurationProperties(
  LlmConfiguration::class,
  OpenAIConfig::class,
  OllamaConfig::class,
  LmStudioConfig::class,
  VllmConfig::class,
)
class LlmAutoConfiguration(
  private val llmConfig: LlmConfiguration,
) {
  @Bean
  @ConditionalOnProperty("komga.llm.enabled", havingValue = "true")
  fun llmServiceFactory(
    config: LlmConfiguration,
    openAIService: OpenAIService?,
    ollamaService: OllamaService?,
    lmStudioService: LmStudioService?,
    vllmService: VllmService?,
    restTemplate: RestTemplate,
    objectMapper: ObjectMapper,
    applicationContext: ApplicationContext,
  ): LlmServiceFactory {
    logger.info { "Initializing LLM Service Factory" }
    return LlmServiceFactory(
      config = config,
      applicationContext = applicationContext,
      openAIService = openAIService,
      ollamaService = ollamaService,
      lmStudioService = lmStudioService,
      vllmService = vllmService,
    )
  }

  /**
   * Task scheduler for model status updates
   */
  @Bean
  @ConditionalOnProperty("komga.llm.enabled", havingValue = "true")
  fun llmScheduledExecutor(): ScheduledExecutorService =
    Executors.newScheduledThreadPool(1) { r ->
      Thread(r, "llm-scheduler").apply {
        isDaemon = true
        priority = Thread.MIN_PRIORITY
      }
    }

  /**
   * Task executor for model operations
   */
  @Bean
  @ConditionalOnProperty("komga.llm.enabled", havingValue = "true")
  fun llmTaskExecutor(): Executor = Executors.newVirtualThreadPerTaskExecutor()

  /**
   * Rate limiter for LLM API calls
   */
  @Bean
  @ConditionalOnProperty("komga.llm.enabled", havingValue = "true")
  fun llmRateLimiter(): RateLimiter =
    RateLimiter(
      requestsPerMinute = llmConfig.rateLimit.requestsPerMinute,
      maxConcurrent = llmConfig.rateLimit.maxConcurrent,
      adaptive = llmConfig.rateLimit.adaptive,
    )

  /**
   * Model manager for handling model lifecycle
   */
  @Bean
  @ConditionalOnProperty("komga.llm.enabled", havingValue = "true")
  fun modelManager(
    llmServiceFactory: LlmServiceFactory,
    scheduledExecutor: ScheduledExecutorService,
  ): ModelManager =
    ModelManager(
      llmServiceFactory = llmServiceFactory,
      scheduledExecutor = scheduledExecutor,
      refreshInterval = llmConfig.model.statusRefreshInterval,
      autoLoad = llmConfig.model.autoLoad,
      autoLoadModels = llmConfig.model.autoLoadModels.toSet(),
      maxLoadedModels = llmConfig.model.maxLoadedModels,
    )

  @Bean
  @ConditionalOnProperty("komga.llm.openai.enabled", havingValue = "true")
  fun openAIService(
    config: OpenAIConfig,
    restTemplate: RestTemplate,
    objectMapper: ObjectMapper,
  ): OpenAIService {
    logger.info { "Initializing OpenAI Service with model: ${config.model}" }
    return OpenAIService(config, restTemplate, objectMapper)
  }

  @Bean
  @ConditionalOnProperty("komga.llm.ollama.enabled", havingValue = "true")
  fun ollamaService(
    config: OllamaConfig,
    restTemplate: RestTemplate,
    objectMapper: ObjectMapper,
  ): OllamaService {
    logger.info { "Initializing Ollama Service with model: ${config.model}" }
    return OllamaService(config, restTemplate, objectMapper)
  }

  @Bean
  @ConditionalOnProperty("komga.llm.lmstudio.enabled", havingValue = "true")
  fun lmStudioService(
    config: LmStudioConfig,
    restTemplate: RestTemplate,
    objectMapper: ObjectMapper,
  ): LmStudioService {
    logger.info { "Initializing LM Studio Service with model: ${config.model}" }
    return LmStudioService(config, restTemplate, objectMapper)
  }

  @Bean
  @ConditionalOnProperty("komga.llm.vllm.enabled", havingValue = "true")
  fun vllmService(
    config: VllmConfig,
    restTemplate: RestTemplate,
    objectMapper: ObjectMapper,
  ): VllmService {
    logger.info { "Initializing vLLM Service with model: ${config.model}" }
    return VllmService(config, restTemplate, objectMapper)
  }

  @Bean
  @ConditionalOnProperty("komga.llm.google-note-lm.enabled", havingValue = "true")
  fun googleNoteLmService(
    config: GoogleNoteLmConfig,
    restTemplate: RestTemplate,
    objectMapper: ObjectMapper,
  ): GoogleNoteLmService {
    logger.info { "Initializing Google NoteLM Service with model: ${config.model}" }
    return GoogleNoteLmService(config, restTemplate, objectMapper)
  }

  @Bean
  @Primary
  fun llmService(llmServiceFactory: LlmServiceFactory): LlmService =
    object : LlmService {
      private val logger = KotlinLogging.logger {}

      override val provider: org.gotson.komga.infrastructure.llm.model.LlmProvider
        get() =
          llmServiceFactory.getActiveProvider()
            ?: throw IllegalStateException("No active LLM provider")

      override suspend fun isAvailable(): Boolean =
        try {
          llmServiceFactory.getActiveService().isAvailable()
        } catch (e: Exception) {
          logger.error(e) { "Error checking if LLM service is available" }
          false
        }

      override suspend fun generateCompletion(
        prompt: String,
        maxTokens: Int,
        temperature: Double,
        stopSequences: List<String>,
      ): String =
        llmServiceFactory
          .getActiveService()
          .generateCompletion(prompt, maxTokens, temperature, stopSequences)

      override suspend fun generateChatCompletion(
        messages: List<org.gotson.komga.infrastructure.llm.model.ChatMessage>,
        maxTokens: Int,
        temperature: Double,
        functions: List<org.gotson.komga.infrastructure.llm.model.FunctionDefinition>,
        functionCall: org.gotson.komga.infrastructure.llm.model.FunctionCall?,
      ): org.gotson.komga.infrastructure.llm.model.ChatCompletion =
        llmServiceFactory
          .getActiveService()
          .generateChatCompletion(messages, maxTokens, temperature, functions, functionCall)

      override suspend fun createEmbedding(input: String): List<Double> = llmServiceFactory.getActiveService().createEmbedding(input)

      override fun cleanup() {
        try {
          llmServiceFactory.getActiveService().cleanup()
        } catch (e: Exception) {
          logger.error(e) { "Error cleaning up LLM service" }
        }
      }
    }

  @Bean
  fun llmRestTemplate(): RestTemplate =
    RestTemplate().apply {
      // Configure the RestTemplate with sensible defaults
      // You can add interceptors, error handlers, etc. here
    }
}
