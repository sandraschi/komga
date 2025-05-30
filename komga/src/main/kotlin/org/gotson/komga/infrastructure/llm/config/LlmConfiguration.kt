package org.gotson.komga.infrastructure.llm.config

import org.springframework.boot.context.properties.ConfigurationProperties

/**
 * Root configuration for LLM services.
 *
 * @property enabled Whether LLM services are enabled
 * @property defaultProvider The default LLM provider to use (e.g., "openai", "ollama", "vllm")
 * @property openai Configuration for OpenAI
 * @property ollama Configuration for Ollama
 * @property lmStudio Configuration for LM Studio
 * @property vllm Configuration for vLLM
 * @property googleNoteLm Configuration for Google NoteLM
 */
@ConfigurationProperties(prefix = "komga.llm")
data class LlmConfiguration(
    var enabled: Boolean = false,
    var defaultProvider: String = "openai",
    val openai: OpenAIConfig = OpenAIConfig(),
    val ollama: OllamaConfig = OllamaConfig(),
    val lmStudio: LmStudioConfig = LmStudioConfig(),
    val vllm: VllmConfig = VllmConfig(),
    val googleNoteLm: GoogleNoteLmConfig = GoogleNoteLmConfig()
)
