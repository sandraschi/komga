package org.gotson.komga.infrastructure.llm

import com.fasterxml.jackson.databind.ObjectMapper
import org.gotson.komga.domain.model.LlmModel
import org.gotson.komga.domain.model.LlmProvider
import org.gotson.komga.infrastructure.configuration.KomgaProperties
import org.gotson.komga.infrastructure.llm.openai.OpenAIClient
import org.gotson.komga.infrastructure.llm.openai.OpenAIOptions
import org.gotson.komga.infrastructure.llm.openai.toDomainModel
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.net.http.HttpClient
import java.time.Duration

@Service
class LlmService(
  private val komgaProperties: KomgaProperties,
  private val objectMapper: ObjectMapper,
) {
  private val log = LoggerFactory.getLogger(javaClass)

  private val httpClient =
    HttpClient
      .newBuilder()
      .connectTimeout(Duration.ofSeconds(30))
      .build()

  private val openAIClient by lazy {
    val apiKey = komgaProperties.llm.openai.apiKey
    if (apiKey.isBlank()) {
      log.warn("OpenAI API key is not configured")
      null
    } else {
      OpenAIClient(apiKey, httpClient, objectMapper)
    }
  }

  suspend fun listProviders(): List<LlmProvider> {
    val providers = mutableListOf<LlmProvider>()

    // Add OpenAI provider if configured
    if (openAIClient != null) {
      providers.add(
        LlmProvider(
          id = "openai",
          name = "OpenAI",
          description = "OpenAI's GPT models",
          supportsImageGeneration = true,
          supportsTextGeneration = true,
        ),
      )
    }

    return providers
  }

  suspend fun listModels(providerId: String): List<LlmModel> =
    when (providerId) {
      "openai" -> openAIClient?.listModels()?.map { it.toDomainModel() } ?: emptyList()
      else -> emptyList()
    }

  suspend fun summarize(options: SummarizationOptions): String =
    when (options.providerId) {
      "openai" -> {
        val openAIOptions =
          OpenAIOptions(
            model = options.model ?: "gpt-4-turbo-preview",
            temperature = options.temperature.toDouble(),
            maxTokens = options.maxTokens,
            responseFormat =
              if (options.responseFormat == "json") {
                mapOf("type" to "json_object")
              } else {
                null
              },
          )

        openAIClient
          ?.createChatCompletion(
            messages =
              listOf(
                OpenAIClient.ChatMessage(
                  role = "user",
                  content = options.prompt,
                ),
              ),
            options = openAIOptions,
          )?.choices
          ?.firstOrNull()
          ?.message
          ?.content
          ?: throw IllegalStateException("No response from LLM provider")
      }
      else -> throw IllegalArgumentException("Unsupported provider: ${options.providerId}")
    }

  data class SummarizationOptions(
    val providerId: String,
    val prompt: String,
    val model: String? = null,
    val temperature: Float = 0.7f,
    val maxTokens: Int? = null,
    val responseFormat: String? = null,
  )
}
