package org.gotson.komga.infrastructure.ai

import com.fasterxml.jackson.databind.ObjectMapper
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.logging.HttpLoggingInterceptor
import org.gotson.komga.domain.service.AIService
import org.gotson.komga.domain.service.BookContentService
import org.gotson.komga.domain.service.BookExportService
import org.gotson.komga.domain.service.BookService
import org.gotson.komga.infrastructure.configuration.KomgaSettingsProvider
import org.gotson.komga.interfaces.api.rest.dto.ExportBookRequest
import org.gotson.komga.interfaces.api.rest.dto.GenerateImageRequest
import org.gotson.komga.interfaces.api.rest.dto.GenerateImageResponse
import org.gotson.komga.interfaces.api.rest.dto.GenerateSummaryRequest
import org.gotson.komga.interfaces.api.rest.dto.GenerateSummaryResponse
import org.gotson.komga.interfaces.api.rest.dto.SummaryPage
import org.gotson.komga.language.LanguageDetector
import org.slf4j.LoggerFactory
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.stereotype.Service
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.InputStream
import java.util.concurrent.TimeUnit
import javax.annotation.PostConstruct

@Service
@ConditionalOnProperty(prefix = "komga.ai.openai", name = ["api-key"])
class OpenAIService(
  private val bookService: BookService,
  private val bookContentService: BookContentService,
  private val bookExportService: BookExportService,
  private val languageDetector: LanguageDetector,
  private val settingsProvider: KomgaSettingsProvider,
  private val objectMapper: ObjectMapper,
) : AIService {
  private val logger = LoggerFactory.getLogger(javaClass)

  private lateinit var httpClient: OkHttpClient
  private val openAIConfig = settingsProvider.getSettings().ai.openai

  @PostConstruct
  fun init() {
    val logging = HttpLoggingInterceptor { message -> logger.debug(message) }
    logging.level = HttpLoggingInterceptor.Level.BODY

    httpClient =
      OkHttpClient
        .Builder()
        .addInterceptor(logging)
        .connectTimeout(60, TimeUnit.SECONDS)
        .readTimeout(300, TimeUnit.SECONDS)
        .writeTimeout(300, TimeUnit.SECONDS)
        .build()
  }

  override suspend fun generateSummary(request: GenerateSummaryRequest): GenerateSummaryResponse {
    val book =
      bookService.getBookOrNull(request.bookId)
        ?: throw IllegalArgumentException("Book not found: ${request.bookId}")

    // Get book content
    val pages =
      (1..book.media.pagesCount).map { pageNumber ->
        val content = bookContentService.getPageContent(book.id, pageNumber - 1)
        content to pageNumber
      }

    // For minibook, select the most important pages
    val selectedPages =
      when (request.type.lowercase()) {
        "minibook" -> selectImportantPages(pages, request.pageCount ?: 10)
        "microbook" -> selectImportantPages(pages, 3) // Always 3 pages for microbook
        else -> throw IllegalArgumentException("Invalid summary type: ${request.type}")
      }

    // Generate summary using OpenAI
    val prompt = buildSummaryPrompt(book.title, selectedPages, request.type)
    val summary = generateWithOpenAI(prompt, request.temperature, request.model)

    // Generate image prompts for each page if needed
    val summaryPages =
      if (request.generateImages) {
        selectedPages.mapIndexed { index, (content, pageNumber) ->
          val imagePrompt = generateImagePrompt(book.title, content, request.type)
          SummaryPage(
            pageNumber = index + 1,
            content = content.take(1000), // Truncate for response
            imagePrompt = imagePrompt,
            imageUrl = null, // Will be generated on demand
          )
        }
      } else {
        selectedPages.mapIndexed { index, (content, pageNumber) ->
          SummaryPage(
            pageNumber = index + 1,
            content = content.take(1000),
          )
        }
      }

    return GenerateSummaryResponse(
      summary = summary,
      pages = summaryPages,
      modelUsed = request.model ?: "gpt-4",
      metadata =
        mapOf(
          "bookId" to book.id,
          "bookTitle" to book.metadata.title,
          "type" to request.type,
          "pageCount" to summaryPages.size,
          "generatedAt" to System.currentTimeMillis(),
        ),
    )
  }

  override suspend fun generateImage(request: GenerateImageRequest): GenerateImageResponse {
    val response =
      httpClient
        .newCall(
          Request
            .Builder()
            .url("${openAIConfig.apiBaseUrl}/images/generations")
            .header("Authorization", "Bearer ${openAIConfig.apiKey}")
            .header("Content-Type", "application/json")
            .post(
              """
                    |{
                    |  "prompt": ${objectMapper.writeValueAsString(request.prompt)},
                    |  "n": 1,
                    |  "size": "${request.width}x${request.height}",
                    |  "response_format": "url"
                    |}
              """.trimMargin().toRequestBody("application/json".toMediaType()),
            ).build(),
        ).execute()

    if (!response.isSuccessful) {
      throw RuntimeException("Failed to generate image: ${response.body?.string()}")
    }

    val responseBody = response.body?.string() ?: throw RuntimeException("Empty response from OpenAI")
    val imageUrl =
      objectMapper
        .readTree(responseBody)
        .path("data")[0]
        .path("url")
        .asText()
        ?: throw RuntimeException("Invalid response format from OpenAI")

    return GenerateImageResponse(
      imageUrl = imageUrl,
      modelUsed = request.model ?: "dall-e-3",
      metadata =
        mapOf(
          "width" to request.width,
          "height" to request.height,
          "prompt" to request.prompt,
        ),
    )
  }

  override suspend fun exportBook(request: ExportBookRequest): InputStream {
    val outputStream = ByteArrayOutputStream()

    // Generate images if needed
    val pagesWithImages =
      if (request.includeImages) {
        request.pages.map { page ->
          if (page.imagePrompt != null && page.imageUrl == null) {
            val imageResponse =
              generateImage(
                GenerateImageRequest(
                  prompt = page.imagePrompt,
                  width = 1024,
                  height = 1024,
                ),
              )
            page.copy(imageUrl = imageResponse.imageUrl)
          } else {
            page
          }
        }
      } else {
        request.pages
      }

    // Export to CBZ
    bookExportService.exportToCbz(
      bookId = request.bookId,
      pages = pagesWithImages.map { it.content },
      outputStream = outputStream,
    )

    return ByteArrayInputStream(outputStream.toByteArray())
  }

  private suspend fun selectImportantPages(
    pages: List<Pair<String, Int>>,
    count: Int,
  ): List<Pair<String, Int>> {
    // Simple implementation: select pages with most text
    return pages
      .sortedByDescending { it.first.length }
      .take(count)
      .sortedBy { it.second } // Sort by original page number
  }

  private fun buildSummaryPrompt(
    title: String,
    pages: List<Pair<String, Int>>,
    summaryType: String,
  ): String =
    """
            |You are an expert at summarizing comic books and graphic novels.
            |
            |Title: $title
            |
            |Pages:
            |${pages.joinToString("\n\n") { "Page ${it.second}:\n${it.first.take(2000)}..." }}
            |
            |Please provide a $summaryType summary that captures the key plot points and character developments.
            |Focus on the main story arc and important character interactions.
            |Keep the summary engaging and true to the original content.
    """.trimMargin()

  private fun generateImagePrompt(
    title: String,
    content: String,
    summaryType: String,
  ): String =
    """
            |Create a comic book style illustration for "$title" that captures the essence of this page:
            |
            |$content
            |
            |Style: Modern comic book art, dynamic composition, vibrant colors
            |Aspect Ratio: 16:9
            |Focus: Main characters and key action
            |Mood: Should match the tone of the content
    """.trimMargin()

  private suspend fun generateWithOpenAI(
    prompt: String,
    temperature: Double,
    model: String?,
  ): String {
    val requestBody =
      mapOf(
        "model" to (model ?: "gpt-4"),
        "messages" to
          listOf(
            mapOf("role" to "system", "content" to "You are a helpful assistant that summarizes comic books and graphic novels."),
            mapOf("role" to "user", "content" to prompt),
          ),
        "temperature" to temperature.coerceIn(0.0, 1.0),
      )

    val response =
      httpClient
        .newCall(
          Request
            .Builder()
            .url("${openAIConfig.apiBaseUrl}/chat/completions")
            .header("Authorization", "Bearer ${openAIConfig.apiKey}")
            .header("Content-Type", "application/json")
            .post(objectMapper.writeValueAsString(requestBody).toRequestBody("application/json".toMediaType()))
            .build(),
        ).execute()

    if (!response.isSuccessful) {
      throw RuntimeException("Failed to generate summary: ${response.body?.string()}")
    }

    val responseBody = response.body?.string() ?: throw RuntimeException("Empty response from OpenAI")
    return objectMapper
      .readTree(responseBody)
      .path("choices")[0]
      .path("message")
      .path("content")
      .asText()
      ?: throw RuntimeException("Invalid response format from OpenAI")
  }
}

data class OpenAIConfig(
  val apiKey: String = "",
  val apiBaseUrl: String = "https://api.openai.com/v1",
)
