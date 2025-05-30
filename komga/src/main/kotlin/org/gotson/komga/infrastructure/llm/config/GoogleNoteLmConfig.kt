package org.gotson.komga.infrastructure.llm.config

import org.springframework.boot.context.properties.ConfigurationProperties

/**
 * Configuration for Google NoteLM.
 *
 * @property enabled Whether the Google NoteLM provider is enabled
 * @property apiKey The API key for authentication
 * @property projectId The Google Cloud project ID
 * @property location The location/region of the NoteLM service
 * @property model The model to use (e.g., "note-lm")
 * @property temperature The temperature for generation (0.0 to 1.0)
 * @property maxTokens The default maximum number of tokens to generate
 * @property timeoutSeconds Request timeout in seconds
 */
@ConfigurationProperties(prefix = "komga.llm.googlenotelm")
data class GoogleNoteLmConfig(
    var enabled: Boolean = false,
    var apiKey: String = "",
    var projectId: String = "",
    var location: String = "us-central1",
    var model: String = "note-lm",
    var temperature: Double = 0.7,
    var maxTokens: Int = 1024,
    var timeoutSeconds: Long = 60
)
