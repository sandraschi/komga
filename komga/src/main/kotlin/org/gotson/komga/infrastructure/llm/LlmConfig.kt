package org.gotson.komga.infrastructure.llm

import jakarta.annotation.PostConstruct
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Positive
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.boot.context.properties.ConstructorBinding
import org.springframework.validation.annotation.Validated
import java.net.URI

/**
 * Configuration properties for LLM integration.
 *
 * All timeouts are in seconds. Temperature ranges from 0.0 (deterministic) to 1.0 (creative).
 */
@ConstructorBinding
@ConfigurationProperties(prefix = "komga.llm")
@Validated
data class LlmConfig(
  /** Whether LLM features are enabled */
  val enabled: Boolean = true,
  /** Default provider to use when none is specified */
  @field:NotBlank
  val defaultProvider: String = "openai",
  @field:Valid
  val openai: OpenAIConfig = OpenAIConfig(),
  @field:Valid
  val ollama: OllamaConfig = OllamaConfig(),
  @field:Valid
  val lmStudio: LmStudioConfig = LmStudioConfig(),
  @field:Valid
  val vllm: VllmConfig = VllmConfig(),
  @field:Valid
  val googleNoteLm: GoogleNoteLmConfig = GoogleNoteLmConfig(),
  /** Global rate limiting settings */
  @field:Valid
  val rateLimit: RateLimitConfig = RateLimitConfig(),
) {
  @PostConstruct
  fun validate() {
    // Ensure default provider is valid
    val validProviders = listOf("openai", "ollama", "lmstudio", "vllm", "googlenotelm")
    require(defaultProvider.lowercase() in validProviders) {
      "Invalid defaultProvider: $defaultProvider. Must be one of: ${validProviders.joinToString()}"
    }
  }
}

/** Configuration for rate limiting LLM API calls */
data class RateLimitConfig(
  /** Maximum number of requests per minute */
  @field:Positive
  val requestsPerMinute: Int = 60,
  /** Maximum number of concurrent requests */
  @field:Positive
  val maxConcurrent: Int = 5,
)

/** Base configuration for LLM providers */
sealed class BaseLlmConfig(
  open val enabled: Boolean = false,
  open val apiUrl: String,
  open val model: String,
  open val temperature: Double = 0.7,
  open val maxTokens: Int = 2000,
  open val timeoutSeconds: Long = 300,
) {
  init {
    require(temperature in 0.0..2.0) { "Temperature must be between 0.0 and 2.0" }
    require(maxTokens in 1..8192) { "maxTokens must be between 1 and 8192" }
    require(timeoutSeconds > 0) { "timeoutSeconds must be positive" }

    try {
      URI(apiUrl).toURL()
    } catch (e: Exception) {
      throw IllegalArgumentException("Invalid API URL: $apiUrl", e)
    }
  }
}

data class OpenAIConfig(
  override val enabled: Boolean = false,
  override val apiUrl: String = "https://api.openai.com/v1",
  val apiKey: String = System.getenv("OPENAI_API_KEY") ?: "",
  override val model: String = "gpt-4",
  override val temperature: Double = 0.7,
  override val maxTokens: Int = 2000,
  override val timeoutSeconds: Long = 300,
) : BaseLlmConfig(enabled, apiUrl, model, temperature, maxTokens, timeoutSeconds) {
  init {
    if (enabled) {
      require(apiKey.isNotBlank()) { "OpenAI API key is required when enabled" }
    }
  }
}

data class OllamaConfig(
  override val enabled: Boolean = false,
  override val apiUrl: String = "http://localhost:11434",
  override val model: String = "llama3",
  override val temperature: Double = 0.7,
  override val maxTokens: Int = 2000,
  override val timeoutSeconds: Long = 600,
) : BaseLlmConfig(enabled, apiUrl, model, temperature, maxTokens, timeoutSeconds)

data class LmStudioConfig(
  override val enabled: Boolean = false,
  override val apiUrl: String = "http://localhost:1234",
  override val model: String = "local-model",
  override val temperature: Double = 0.7,
  override val maxTokens: Int = 2000,
  override val timeoutSeconds: Long = 600,
) : BaseLlmConfig(enabled, apiUrl, model, temperature, maxTokens, timeoutSeconds)

data class VllmConfig(
  override val enabled: Boolean = false,
  override val apiUrl: String = "http://localhost:8000",
  override val model: String = "TheBloke/Mistral-7B-Instruct-v0.1",
  override val temperature: Double = 0.7,
  override val maxTokens: Int = 2000,
  override val timeoutSeconds: Long = 600,
) : BaseLlmConfig(enabled, apiUrl, model, temperature, maxTokens, timeoutSeconds)

data class GoogleNoteLmConfig(
  override val enabled: Boolean = false,
  override val apiUrl: String = "https://us-central1-aiplatform.googleapis.com",
  val apiKey: String = System.getenv("GOOGLE_API_KEY") ?: "",
  val projectId: String = System.getenv("GOOGLE_PROJECT_ID") ?: "",
  val location: String = "us-central1",
  override val model: String = "note-lm-document-v1",
  override val temperature: Double = 0.7,
  override val maxTokens: Int = 1024,
  override val timeoutSeconds: Long = 300,
) : BaseLlmConfig(enabled, apiUrl, model, temperature, maxTokens, timeoutSeconds) {
  init {
    if (enabled) {
      require(apiKey.isNotBlank()) { "Google API key is required when enabled" }
      require(projectId.isNotBlank()) { "Google Project ID is required when enabled" }
    }
  }
}
