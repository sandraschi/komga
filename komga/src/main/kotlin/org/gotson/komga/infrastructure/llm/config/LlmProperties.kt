package org.gotson.komga.infrastructure.llm.config

import jakarta.validation.constraints.Positive
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.boot.context.properties.ConstructorBinding
import org.springframework.validation.annotation.Validated
import java.time.Duration

/**
 * Configuration properties for LLM integration.
 */
@ConfigurationProperties(prefix = "komga.llm")
@ConstructorBinding
@Validated
data class LlmProperties(
  /**
   * Whether LLM features are enabled
   */
  val enabled: Boolean = false,
  /**
   * Default provider to use when none is specified
   */
  val defaultProvider: LlmProvider = LlmProvider.OPENAI,
  /**
   * Rate limiting configuration
   */
  val rateLimit: RateLimit = RateLimit(),
  /**
   * Model management settings
   */
  val modelManagement: ModelManagement = ModelManagement(),
  /**
   * Provider-specific configurations
   */
  val providers: ProviderConfigs = ProviderConfigs(),
) {
  data class RateLimit(
    /**
     * Maximum number of requests per minute
     */
    @field:Positive
    val requestsPerMinute: Int = 60,
    /**
     * Maximum number of concurrent requests
     */
    @field:Positive
    val maxConcurrent: Int = 10,
  )

  data class ModelManagement(
    /**
     * Whether to automatically load models on startup
     */
    val autoLoad: Boolean = false,
    /**
     * List of model IDs to load on startup (if autoLoad is true)
     */
    val autoLoadModels: List<String> = emptyList(),
    /**
     * Interval for refreshing model status
     */
    val statusRefreshInterval: Duration = Duration.ofMinutes(5),
  )

  data class ProviderConfigs(
    val openai: OpenAIConfig = OpenAIConfig(),
    val ollama: OllamaConfig = OllamaConfig(),
    val lmstudio: LMStudioConfig = LMStudioConfig(),
    val vllm: VLLMConfig = VLLMConfig(),
  )
}

/**
 * Base configuration for LLM providers
 */
sealed class BaseProviderConfig {
  abstract val enabled: Boolean
  abstract val model: String
}

/**
 * OpenAI configuration
 */
data class OpenAIConfig(
  override val enabled: Boolean = false,
  override val model: String = "gpt-3.5-turbo",
  val apiKey: String = "",
  val apiUrl: String = "https://api.openai.com/v1",
  val organization: String? = null,
) : BaseProviderConfig()

/**
 * Ollama configuration
 */
data class OllamaConfig(
  override val enabled: Boolean = false,
  override val model: String = "llama2",
  val apiUrl: String = "http://localhost:11434",
  val keepAlive: Duration = Duration.ofMinutes(30),
) : BaseProviderConfig()

/**
 * LM Studio configuration
 */
data class LMStudioConfig(
  override val enabled: Boolean = false,
  override val model: String = "local-model",
  val apiUrl: String = "http://localhost:1234/v1",
) : BaseProviderConfig()

/**
 * vLLM configuration
 */
data class VLLMConfig(
  override val enabled: Boolean = false,
  override val model: String = "TheBloke/Llama-2-7b-Chat-AWQ",
  val apiUrl: String = "http://localhost:8000/v1",
) : BaseProviderConfig()

/**
 * Enumeration of supported LLM providers
 */
enum class LlmProvider {
  OPENAI,
  OLLAMA,
  LM_STUDIO,
  VLLM,
}
