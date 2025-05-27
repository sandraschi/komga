package org.gotson.komga.infrastructure.llm

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.boot.context.properties.ConstructorBinding

@ConstructorBinding
@ConfigurationProperties(prefix = "komga.llm")
data class LlmConfig(
    val enabled: Boolean = true,
    val defaultProvider: String = "openai",
    val openai: OpenAIConfig = OpenAIConfig(),
    val ollama: OllamaConfig = OllamaConfig(),
    val lmStudio: LmStudioConfig = LmStudioConfig(),
    val vllm: VllmConfig = VllmConfig(),
    val googleNoteLm: GoogleNoteLmConfig = GoogleNoteLmConfig()
)

data class OpenAIConfig(
    val enabled: Boolean = false,
    val apiKey: String = "",
    val apiUrl: String = "https://api.openai.com/v1",
    val model: String = "gpt-4",
    val temperature: Double = 0.7,
    val maxTokens: Int = 2000,
    val timeoutSeconds: Long = 300
)

data class OllamaConfig(
    val enabled: Boolean = false,
    val apiUrl: String = "http://localhost:11434",
    val model: String = "llama3",
    val temperature: Double = 0.7,
    val maxTokens: Int = 2000,
    val timeoutSeconds: Long = 600
)

data class LmStudioConfig(
    val enabled: Boolean = false,
    val apiUrl: String = "http://localhost:1234",
    val model: String = "local-model",
    val temperature: Double = 0.7,
    val maxTokens: Int = 2000,
    val timeoutSeconds: Long = 600
)

data class VllmConfig(
    val enabled: Boolean = false,
    val apiUrl: String = "http://localhost:8000",
    val model: String = "TheBloke/Mistral-7B-Instruct-v0.1",
    val temperature: Double = 0.7,
    val maxTokens: Int = 2000,
    val timeoutSeconds: Long = 600
)

data class GoogleNoteLmConfig(
    val enabled: Boolean = false,
    val apiKey: String = "",
    val projectId: String = "",
    val location: String = "us-central1",
    val model: String = "note-lm-document-v1",
    val temperature: Double = 0.7,
    val maxTokens: Int = 1024,
    val timeoutSeconds: Long = 300
)
