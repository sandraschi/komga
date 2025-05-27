package org.gotson.komga.infrastructure.llm.config

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Configuration

/**
 * Main configuration class for LLM services.
 * 
 * @property enabled Whether the LLM service is enabled
 * @property defaultProvider The default LLM provider to use
 * @property openai Configuration for OpenAI
 * @property ollama Configuration for Ollama
 * @property lmStudio Configuration for LM Studio
 * @property vllm Configuration for vLLM
 * @property googleNoteLm Configuration for Google NoteLM
 */
@Configuration
@EnableConfigurationProperties(
    OpenAIConfig::class,
    OllamaConfig::class,
    LmStudioConfig::class,
    VllmConfig::class,
    GoogleNoteLmConfig::class
)
@ConfigurationProperties(prefix = "komga.llm")
data class LlmConfig(
    var enabled: Boolean = false,
    var defaultProvider: String = "openai",
    val openai: OpenAIConfig = OpenAIConfig(),
    val ollama: OllamaConfig = OllamaConfig(),
    val lmStudio: LmStudioConfig = LmStudioConfig(),
    val vllm: VllmConfig = VllmConfig(),
    val googleNoteLm: GoogleNoteLmConfig = GoogleNoteLmConfig()
)

/**
 * Base class for provider configurations.
 */
open class BaseProviderConfig(
    open var enabled: Boolean = false,
    open var apiUrl: String = "",
    open var model: String = "",
    open var temperature: Double = 0.7,
    open var maxTokens: Int = 1000,
    open var timeoutSeconds: Long = 30
)

/**
 * Configuration for OpenAI API.
 */
@ConfigurationProperties(prefix = "komga.llm.openai")
data class OpenAIConfig(
    override var enabled: Boolean = false,
    var apiKey: String = "",
    var organizationId: String? = null,
    override var apiUrl: String = "https://api.openai.com/v1",
    override var model: String = "gpt-4",
    var embeddingModel: String = "text-embedding-ada-002",
    override var temperature: Double = 0.7,
    override var maxTokens: Int = 1000,
    override var timeoutSeconds: Long = 30,
    var maxRetries: Int = 3,
    var rateLimitRequestsPerMinute: Int = 60
) : BaseProviderConfig(enabled, apiUrl, model, temperature, maxTokens, timeoutSeconds)

/**
 * Configuration for Ollama.
 */
@ConfigurationProperties(prefix = "komga.llm.ollama")
data class OllamaConfig(
    override var enabled: Boolean = false,
    override var apiUrl: String = "http://localhost:11434",
    override var model: String = "llama2",
    override var temperature: Double = 0.7,
    override var maxTokens: Int = 2000,
    override var timeoutSeconds: Long = 120,
    var contextWindow: Int = 4096
) : BaseProviderConfig(enabled, apiUrl, model, temperature, maxTokens, timeoutSeconds)

/**
 * Configuration for LM Studio.
 */
@ConfigurationProperties(prefix = "komga.llm.lmstudio")
data class LmStudioConfig(
    override var enabled: Boolean = false,
    override var apiUrl: String = "http://localhost:1234/v1",
    override var model: String = "local-model",
    override var temperature: Double = 0.7,
    override var maxTokens: Int = 2000,
    override var timeoutSeconds: Long = 120
) : BaseProviderConfig(enabled, apiUrl, model, temperature, maxTokens, timeoutSeconds)

/**
 * Configuration for vLLM.
 */
@ConfigurationProperties(prefix = "komga.llm.vllm")
data class VllmConfig(
    override var enabled: Boolean = false,
    override var apiUrl: String = "http://localhost:8000/v1",
    override var model: String = "gpt2",
    override var temperature: Double = 0.7,
    override var maxTokens: Int = 2000,
    override var timeoutSeconds: Long = 120
) : BaseProviderConfig(enabled, apiUrl, model, temperature, maxTokens, timeoutSeconds)

/**
 * Configuration for Google NoteLM.
 */
@ConfigurationProperties(prefix = "komga.llm.google-note-lm")
data class GoogleNoteLmConfig(
    override var enabled: Boolean = false,
    var apiKey: String = "",
    var projectId: String = "",
    var location: String = "us-central1",
    override var model: String = "note-lm",
    override var temperature: Double = 0.7,
    override var maxTokens: Int = 1024,
    override var timeoutSeconds: Long = 60,
    override var apiUrl: String = "https://us-central1-aiplatform.googleapis.com/v1"
) : BaseProviderConfig(enabled, "", model, temperature, maxTokens, timeoutSeconds)
