package org.gotson.komga.infrastructure.llm.config

import org.springframework.boot.context.properties.ConfigurationProperties

/**
 * Configuration for Ollama.
 *
 * @property enabled Whether the Ollama provider is enabled
 * @property apiUrl The base URL for the Ollama API (default: "http://localhost:11434")
 * @property model The default model to use (default: "llama2")
 * @property temperature The temperature for generation (0.0 to 2.0)
 * @property maxTokens The default maximum number of tokens to generate
 * @property timeoutSeconds Request timeout in seconds
 * @property contextWindow The context window size in tokens
 */
@ConfigurationProperties(prefix = "komga.llm.ollama")
data class OllamaConfig(
    var enabled: Boolean = false,
    var apiUrl: String = "http://localhost:11434",
    var model: String = "llama2",
    var temperature: Double = 0.7,
    var maxTokens: Int = 2000,
    var timeoutSeconds: Long = 120,
    var contextWindow: Int = 4096
)
