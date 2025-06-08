package org.gotson.komga.interfaces.rest.dto

import org.gotson.komga.infrastructure.llm.LlmConfig

/**
 * DTO for LLM settings
 */
data class LlmSettingsDto(
  val defaultProvider: String,
  val providers: Map<String, ProviderSettingsDto>,
) {
  data class ProviderSettingsDto(
    val enabled: Boolean,
    val displayName: String,
    val description: String,
    val config: Map<String, Any>,
  )

  companion object {
    fun fromConfig(config: LlmConfig): LlmSettingsDto =
      LlmSettingsDto(
        defaultProvider = config.defaultProvider,
        providers =
          mapOf(
            "openai" to
              ProviderSettingsDto(
                enabled = config.openai.enabled,
                displayName = "OpenAI",
                description = "Cloud-based AI models by OpenAI (ChatGPT, GPT-4, etc.)",
                config =
                  mapOf(
                    "apiKey" to if (config.openai.apiKey.isNotBlank()) "••••••••" else "",
                    "apiUrl" to config.openai.apiUrl,
                    "model" to config.openai.model,
                    "temperature" to config.openai.temperature,
                    "maxTokens" to config.openai.maxTokens,
                    "timeoutSeconds" to config.openai.timeoutSeconds,
                  ),
              ),
            "ollama" to
              ProviderSettingsDto(
                enabled = config.ollama.enabled,
                displayName = "Ollama",
                description = "Run and manage local models with Ollama",
                config =
                  mapOf(
                    "apiUrl" to config.ollama.apiUrl,
                    "model" to config.ollama.model,
                    "temperature" to config.ollama.temperature,
                    "maxTokens" to config.ollama.maxTokens,
                    "timeoutSeconds" to config.ollama.timeoutSeconds,
                  ),
              ),
            "lmstudio" to
              ProviderSettingsDto(
                enabled = config.lmStudio.enabled,
                displayName = "LM Studio",
                description = "Run local models with LM Studio (OpenAI-compatible API)",
                config =
                  mapOf(
                    "apiUrl" to config.lmStudio.apiUrl,
                    "model" to config.lmStudio.model,
                    "temperature" to config.lmStudio.temperature,
                    "maxTokens" to config.lmStudio.maxTokens,
                    "timeoutSeconds" to config.lmStudio.timeoutSeconds,
                  ),
              ),
            "vllm" to
              ProviderSettingsDto(
                enabled = config.vllm.enabled,
                displayName = "vLLM",
                description = "High-throughput and memory-efficient LLM serving",
                config =
                  mapOf(
                    "apiUrl" to config.vllm.apiUrl,
                    "model" to config.vllm.model,
                    "temperature" to config.vllm.temperature,
                    "maxTokens" to config.vllm.maxTokens,
                    "timeoutSeconds" to config.vllm.timeoutSeconds,
                  ),
              ),
            "google-note-lm" to
              ProviderSettingsDto(
                enabled = config.googleNoteLm.enabled,
                displayName = "Google NoteLM",
                description = "Google's NoteLM for document analysis",
                config =
                  mapOf(
                    "apiKey" to if (config.googleNoteLm.apiKey.isNotBlank()) "••••••••" else "",
                    "projectId" to config.googleNoteLm.projectId,
                    "location" to config.googleNoteLm.location,
                    "model" to config.googleNoteLm.model,
                    "temperature" to config.googleNoteLm.temperature,
                    "maxTokens" to config.googleNoteLm.maxTokens,
                    "timeoutSeconds" to config.googleNoteLm.timeoutSeconds,
                  ),
              ),
          ),
      )
  }
}

/**
 * DTO for updating LLM settings
 */
data class LlmSettingsUpdateDto(
  val defaultProvider: String? = null,
  val providers: Map<String, ProviderSettingsUpdateDto>? = null,
) {
  data class ProviderSettingsUpdateDto(
    val enabled: Boolean? = null,
    val config: Map<String, Any>? = null,
  )

  fun toLlmConfig(current: LlmConfig): LlmConfig =
    current.copy(
      defaultProvider = this.defaultProvider ?: current.defaultProvider,
      openai =
        this.providers?.get("openai")?.let { update ->
          current.openai.copy(
            enabled = update.enabled ?: current.openai.enabled,
            apiKey = (update.config?.get("apiKey") as? String)?.takeIf { it != "••••••••" } ?: current.openai.apiKey,
            apiUrl = (update.config?.get("apiUrl") as? String) ?: current.openai.apiUrl,
            model = (update.config?.get("model") as? String) ?: current.openai.model,
            temperature = (update.config?.get("temperature") as? Double) ?: current.openai.temperature,
            maxTokens = (update.config?.get("maxTokens") as? Int) ?: current.openai.maxTokens,
            timeoutSeconds = (update.config?.get("timeoutSeconds") as? Long) ?: current.openai.timeoutSeconds,
          )
        } ?: current.openai,
      ollama =
        this.providers?.get("ollama")?.let { update ->
          current.ollama.copy(
            enabled = update.enabled ?: current.ollama.enabled,
            apiUrl = (update.config?.get("apiUrl") as? String) ?: current.ollama.apiUrl,
            model = (update.config?.get("model") as? String) ?: current.ollama.model,
            temperature = (update.config?.get("temperature") as? Double) ?: current.ollama.temperature,
            maxTokens = (update.config?.get("maxTokens") as? Int) ?: current.ollama.maxTokens,
            timeoutSeconds = (update.config?.get("timeoutSeconds") as? Long) ?: current.ollama.timeoutSeconds,
          )
        } ?: current.ollama,
      lmStudio =
        this.providers?.get("lmstudio")?.let { update ->
          current.lmStudio.copy(
            enabled = update.enabled ?: current.lmStudio.enabled,
            apiUrl = (update.config?.get("apiUrl") as? String) ?: current.lmStudio.apiUrl,
            model = (update.config?.get("model") as? String) ?: current.lmStudio.model,
            temperature = (update.config?.get("temperature") as? Double) ?: current.lmStudio.temperature,
            maxTokens = (update.config?.get("maxTokens") as? Int) ?: current.lmStudio.maxTokens,
            timeoutSeconds = (update.config?.get("timeoutSeconds") as? Long) ?: current.lmStudio.timeoutSeconds,
          )
        } ?: current.lmStudio,
      vllm =
        this.providers?.get("vllm")?.let { update ->
          current.vllm.copy(
            enabled = update.enabled ?: current.vllm.enabled,
            apiUrl = (update.config?.get("apiUrl") as? String) ?: current.vllm.apiUrl,
            model = (update.config?.get("model") as? String) ?: current.vllm.model,
            temperature = (update.config?.get("temperature") as? Double) ?: current.vllm.temperature,
            maxTokens = (update.config?.get("maxTokens") as? Int) ?: current.vllm.maxTokens,
            timeoutSeconds = (update.config?.get("timeoutSeconds") as? Long) ?: current.vllm.timeoutSeconds,
          )
        } ?: current.vllm,
      googleNoteLm =
        this.providers?.get("google-note-lm")?.let { update ->
          current.googleNoteLm.copy(
            enabled = update.enabled ?: current.googleNoteLm.enabled,
            apiKey = (update.config?.get("apiKey") as? String)?.takeIf { it != "••••••••" } ?: current.googleNoteLm.apiKey,
            projectId = (update.config?.get("projectId") as? String) ?: current.googleNoteLm.projectId,
            location = (update.config?.get("location") as? String) ?: current.googleNoteLm.location,
            model = (update.config?.get("model") as? String) ?: current.googleNoteLm.model,
            temperature = (update.config?.get("temperature") as? Double) ?: current.googleNoteLm.temperature,
            maxTokens = (update.config?.get("maxTokens") as? Int) ?: current.googleNoteLm.maxTokens,
            timeoutSeconds = (update.config?.get("timeoutSeconds") as? Long) ?: current.googleNoteLm.timeoutSeconds,
          )
        } ?: current.googleNoteLm,
    )
}
