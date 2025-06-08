package org.gotson.komga.infrastructure.llm.config

import org.springframework.boot.context.properties.ConfigurationProperties

/**
 * Configuration for OpenAI API.
 *
 * @property enabled Whether the OpenAI provider is enabled
 * @property apiKey The API key for authentication
 * @property organizationId Optional organization ID
 * @property apiUrl The base URL for the API (default: "https://api.openai.com/v1")
 * @property model The default model to use (default: "gpt-4")
 * @property embeddingModel The model to use for embeddings (default: "text-embedding-ada-002")
 * @property temperature The temperature for generation (0.0 to 2.0)
 * @property maxTokens The default maximum number of tokens to generate
 * @property timeoutSeconds Request timeout in seconds
 * @property maxRetries Maximum number of retries for failed requests
 * @property rateLimitRequestsPerMinute Maximum requests per minute (for rate limiting)
 */
@ConfigurationProperties(prefix = "komga.llm.openai")
data class OpenAIConfig(
  var enabled: Boolean = false,
  var apiKey: String = "",
  var organizationId: String? = null,
  var apiUrl: String = "https://api.openai.com/v1",
  var model: String = "gpt-4",
  var embeddingModel: String = "text-embedding-ada-002",
  var temperature: Double = 0.7,
  var maxTokens: Int = 1000,
  var timeoutSeconds: Long = 30,
  var maxRetries: Int = 3,
  var rateLimitRequestsPerMinute: Int = 60,
)
