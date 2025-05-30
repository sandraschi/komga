package org.gotson.komga.infrastructure.llm.config

import org.springframework.boot.context.properties.ConfigurationProperties

/**
 * Configuration for vLLM.
 *
 * @property enabled Whether the vLLM provider is enabled
 * @property apiUrl The base URL for the vLLM API (default: "http://localhost:8000/v1")
 * @property model The model to use (must be loaded in vLLM)
 * @property temperature The temperature for generation (0.0 to 2.0)
 * @property maxTokens The default maximum number of tokens to generate
 * @property timeoutSeconds Request timeout in seconds
 */
@ConfigurationProperties(prefix = "komga.llm.vllm")
data class VllmConfig(
    var enabled: Boolean = false,
    var apiUrl: String = "http://localhost:8000/v1",
    var model: String = "gpt2",
    var temperature: Double = 0.7,
    var maxTokens: Int = 2000,
    var timeoutSeconds: Long = 120
)
