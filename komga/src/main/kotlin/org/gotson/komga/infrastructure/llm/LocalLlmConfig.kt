package org.gotson.komga.infrastructure.llm

import org.springframework.boot.context.properties.ConfigurationProperties

/**
 * Configuration for local LLM service (e.g., Ollama, LocalAI)
 */
@ConfigurationProperties(prefix = "komga.llm.local")
data class LocalLlmConfig(
  /**
   * Whether the local LLM service is enabled
   */
  val enabled: Boolean = false,
  /**
   * Base URL of the local LLM API server
   */
  val apiUrl: String = "http://localhost:11434",
  /**
   * Model name to use for generation
   */
  val model: String = "llama3",
  /**
   * Temperature for generation (0.0 to 1.0)
   */
  val temperature: Double = 0.7,
  /**
   * Timeout in seconds for API requests
   */
  val timeoutSeconds: Long = 300,
  /**
   * Maximum number of tokens to generate
   */
  val maxTokens: Int = 2000,
  /**
   * System prompt template (optional)
   */
  val systemPrompt: String? =
    """
    You are a helpful assistant that analyzes books and generates comprehensive summaries and analyses.
    Please provide detailed and insightful responses.
    """.trimIndent(),
)
