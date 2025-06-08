package org.gotson.komga.infrastructure.llm.openai

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import org.gotson.komga.infrastructure.llm.LlmService
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse

class OpenAIClient(
  private val apiKey: String,
  private val httpClient: HttpClient,
  private val objectMapper: ObjectMapper,
) {
  private val baseUrl = "https://api.openai.com/v1"

  suspend fun listModels(): List<OpenAIModel> {
    val request =
      HttpRequest
        .newBuilder()
        .uri(URI.create("$baseUrl/models"))
        .header("Authorization", "Bearer $apiKey")
        .header("Content-Type", "application/json")
        .GET()
        .build()

    val response = httpClient.send(request, HttpResponse.BodyHandlers.ofString())

    if (response.statusCode() !in 200..299) {
      throw RuntimeException("Failed to list models: ${response.body()}")
    }

    val modelsResponse = objectMapper.readValue<ModelsResponse>(response.body())
    return modelsResponse.data
      .filter { it.ownedBy == "openai" && it.id.startsWith("gpt") }
      .sortedByDescending { it.created }
  }

  suspend fun createChatCompletion(
    messages: List<ChatMessage>,
    options: OpenAIOptions,
  ): ChatCompletionResponse? {
    val requestBody =
      mapOf(
        "model" to options.model,
        "messages" to messages,
        "temperature" to options.temperature,
        "max_tokens" to options.maxTokens,
        "response_format" to options.responseFormat,
      ).filterValues { it != null }

    val request =
      HttpRequest
        .newBuilder()
        .uri(URI.create("$baseUrl/chat/completions"))
        .header("Authorization", "Bearer $apiKey")
        .header("Content-Type", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(requestBody)))
        .build()

    val response = httpClient.send(request, HttpResponse.BodyHandlers.ofString())

    if (response.statusCode() !in 200..299) {
      throw RuntimeException("Failed to create chat completion: ${response.body()}")
    }

    return objectMapper.readValue(response.body())
  }

  data class ModelsResponse(
    val `object`: String,
    val data: List<OpenAIModel>,
  )

  data class ChatMessage(
    val role: String,
    val content: String,
  )

  data class ChatCompletionResponse(
    val id: String,
    val `object`: String,
    val created: Long,
    val model: String,
    val choices: List<Choice>,
    val usage: Usage,
  ) {
    data class Choice(
      val index: Int,
      val message: ChatMessage,
      val finish_reason: String,
    )

    data class Usage(
      val prompt_tokens: Int,
      val completion_tokens: Int,
      val total_tokens: Int,
    )
  }
}

data class OpenAIOptions(
  val model: String = "gpt-4-turbo-preview",
  val temperature: Double = 0.7,
  val maxTokens: Int? = null,
  val responseFormat: Map<String, String>? = null,
)

data class OpenAIModel(
  val id: String,
  val `object`: String,
  val created: Long,
  val ownedBy: String,
) {
  fun toDomainModel(): LlmService.LlmModel =
    LlmService.LlmModel(
      id = id,
      name = id,
      description = "OpenAI model",
      maxTokens =
        when (id) {
          "gpt-4-turbo-preview" -> 128000
          "gpt-4" -> 8192
          "gpt-3.5-turbo" -> 4096
          else -> 2048
        },
      supportsImageGeneration = false,
      supportsTextGeneration = true,
    )
}
