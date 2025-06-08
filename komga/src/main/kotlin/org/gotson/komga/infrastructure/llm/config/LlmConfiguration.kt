package org.gotson.komga.infrastructure.llm.config

import jakarta.validation.Valid
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.validation.annotation.Validated
import java.time.Duration

/**
 * Root configuration for LLM services.
 *
 * @property enabled Whether LLM services are enabled
 * @property defaultProvider The default LLM provider to use (e.g., "openai", "ollama", "vllm")
 * @property openai Configuration for OpenAI
 * @property ollama Configuration for Ollama
 * @property lmStudio Configuration for LM Studio
 * @property vllm Configuration for vLLM
 * @property model Management of LLM models
 * @property rateLimit Rate limiting configuration for LLM requests
 */
@ConfigurationProperties(prefix = "komga.llm")
@Validated
data class LlmConfiguration(
  var enabled: Boolean = false,
  @field:NotBlank
  var defaultProvider: String = "openai",
  @field:Valid
  val openai: OpenAIConfig = OpenAIConfig(),
  @field:Valid
  val ollama: OllamaConfig = OllamaConfig(),
  @field:Valid
  val lmStudio: LmStudioConfig = LmStudioConfig(),
  @field:Valid
  val vllm: VllmConfig = VllmConfig(),
  @field:Valid
  val model: ModelConfig = ModelConfig(),
  @field:Valid
  val rateLimit: RateLimitConfig = RateLimitConfig(),
) {
  /**
   * Configuration for model management
   */
  data class ModelConfig(
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
    /**
     * Maximum number of models to keep in memory
     */
    @field:Min(1)
    val maxLoadedModels: Int = 3,
  )

  /**
   * Rate limiting configuration
   */
  data class RateLimitConfig(
    /**
     * Enable rate limiting
     */
    val enabled: Boolean = true,
    /**
     * Maximum number of requests per minute
     */
    @field:Min(1)
    val requestsPerMinute: Int = 60,
    /**
     * Maximum number of concurrent requests
     */
    @field:Min(1)
    val maxConcurrent: Int = 10,
    /**
     * Whether to enable adaptive rate limiting
     */
    val adaptive: Boolean = true,
  )
}
