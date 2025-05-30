package org.gotson.komga.infrastructure.llm.config

import org.springframework.boot.context.properties.ConfigurationProperties

/**
 * Configuration for LM Studio.
 *
 * @property enabled Whether the LM Studio provider is enabled
 * @property apiUrl The base URL for the LM Studio API (default: "http://localhost:1234/v1")
 * @property model The model to use (LM Studio loads models automatically)
 * @property temperature The temperature for generation (0.0 to 2.0)
 * @property maxTokens The default maximum number of tokens to generate
 * @property timeoutSeconds Request timeout in seconds
 */
@ConfigurationProperties(prefix = "komga.llm.lmstudio")
data class LmStudioConfig(
    var enabled: Boolean = false,
    var apiUrl: String = "http://localhost:1234/v1",
    var model: String = "local-model",
    var temperature: Double = 0.7,
    var maxTokens: Int = 2000,
    var timeoutSeconds: Long = 120
)
