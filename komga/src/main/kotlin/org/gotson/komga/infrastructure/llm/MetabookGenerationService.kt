package org.gotson.komga.infrastructure.llm

import org.gotson.komga.domain.model.Book
import org.gotson.komga.domain.model.Series
import org.gotson.komga.domain.service.BookAnalyzer
import org.gotson.komga.infrastructure.configuration.KomgaProperties
import org.gotson.komga.infrastructure.mediacontainer.ContentDetector
import org.gotson.komga.infrastructure.mediacontainer.RarContentProvider
import org.gotson.komga.infrastructure.mediacontainer.ZipContentProvider
import org.gotson.komga.language.englishStopWords
import org.gotson.komga.language.removeAccents
import org.gotson.komga.language.removePunctuation
import org.gotson.komga.llm.LLMService
import org.gotson.komga.llm.model.LLMRequest
import org.gotson.komga.llm.model.LLMResponse
import org.gotson.komga.llm.model.LLMResponseStatus
import org.gotson.komga.opds.OPDSSummarizer
import org.gotson.komga.util.loggerFor
import org.springframework.stereotype.Service

@Service
class MetabookGenerationService(
  private val komgaProperties: KomgaProperties,
  private val llmService: LLMService,
  private val opdsSummarizer: OPDSSummarizer,
  private val bookAnalyzer: BookAnalyzer,
  private val contentDetector: ContentDetector,
) {
  private val log = loggerFor<MetabookGenerationService>()
  private val stopWords = englishStopWords()

  data class GenerationOptions(
    val generateTitle: Boolean = true,
    val generateSummary: Boolean = true,
    val generateTags: Boolean = true,
    val generateGenres: Boolean = true,
    val generateAgeRating: Boolean = true,
    val generateReadingDirection: Boolean = true,
    val generatePublisher: Boolean = true,
    val generateLanguage: Boolean = true,
    val generateReleaseDate: Boolean = true,
    val confidenceThreshold: Float = 0.7f,
    val model: String? = null,
    val temperature: Float = 0.3f,
    val maxTokens: Int = 1000,
  )

  data class GenerationResult(
    val title: String? = null,
    val summary: String? = null,
    val tags: Set<String> = emptySet(),
    val genres: Set<String> = emptySet(),
    val ageRating: Int? = null,
    val readingDirection: String? = null,
    val publisher: String? = null,
    val language: String? = null,
    val releaseDate: String? = null,
    val confidence: Float = 1.0f,
    val warnings: List<String> = emptyList(),
    val errors: List<String> = emptyList(),
  )

  suspend fun generateMetabook(
    book: Book,
    series: Series?,
    options: GenerationOptions = GenerationOptions(),
  ): GenerationResult {
    val result = GenerationResult()
    val warnings = mutableListOf<String>()
    val errors = mutableListOf<String>()

    try {
      // Extract text from book
      val extractedText = extractTextFromBook(book)
      if (extractedText.isBlank()) {
        warnings.add("No extractable text found in the book")
        return result.copy(warnings = warnings, errors = errors)
      }

      // Prepare context for LLM
      val context = buildContext(book, series, extractedText)

      // Generate metadata using LLM
      val llmResponse = generateWithLLM(context, options)

      // Process LLM response
      return processLLMResponse(llmResponse, options).copy(
        warnings = warnings,
        errors = errors,
      )
    } catch (e: Exception) {
      log.error("Error generating metabook for book ${book.id}", e)
      errors.add("Failed to generate metadata: ${e.message}")
      return result.copy(errors = errors)
    }
  }

  private suspend fun generateWithLLM(
    context: String,
    options: GenerationOptions,
  ): LLMResponse {
    val prompt =
      """
      You are a helpful assistant that generates metadata for comic books and manga.
      Analyze the following book information and extract relevant metadata.
      
      $context
      
      Generate a JSON response with the following structure:
      {
          "title": "string | null",
          "summary": "string | null",
          "tags": ["string"],
          "genres": ["string"],
          "age_rating": "number | null",
          "reading_direction": "string | null",
          "publisher": "string | null",
          "language": "string | null",
          "release_date": "string | null",
          "confidence": "number",
          "reasoning": "string"
      }
      
      Rules:
      - Only include fields you're confident about
      - For age_rating, use values between 0 and 21
      - For reading_direction, use: LEFT_TO_RIGHT, RIGHT_TO_LEFT, or VERTICAL
      - For language, use ISO 639-1 codes
      - For release_date, use YYYY-MM-DD format
      - confidence should be between 0 and 1
      """.trimIndent()

    return llmService.chat(
      LLMRequest(
        messages =
          listOf(
            LLMRequest.Message(
              role = "system",
              content = "You are a helpful assistant that generates metadata for comic books and manga.",
            ),
            LLMRequest.Message(
              role = "user",
              content = prompt,
            ),
          ),
        model = options.model,
        temperature = options.temperature,
        maxTokens = options.maxTokens,
      ),
    )
  }

  private fun processLLMResponse(
    response: LLMResponse,
    options: GenerationOptions,
  ): GenerationResult {
    if (response.status != LLMResponseStatus.SUCCESS) {
      throw RuntimeException("LLM request failed: ${response.error}")
    }

    // Parse the JSON response
    val json = response.content?.let { parseJsonResponse(it) } ?: return GenerationResult()

    // Extract fields with confidence check
    val confidence = json.getDouble("confidence").toFloat()

    return GenerationResult(
      title =
        if (options.generateTitle && confidence >= options.confidenceThreshold)
          json.optString("title").takeIf { it.isNotBlank() }
        else
          null,
      summary =
        if (options.generateSummary && confidence >= options.confidenceThreshold)
          json.optString("summary").takeIf { it.isNotBlank() }
        else
          null,
      tags =
        if (options.generateTags && confidence >= options.confidenceThreshold)
          json.optJSONArray("tags")?.toList<String>()?.toSet() ?: emptySet()
        else
          emptySet(),
      genres =
        if (options.generateGenres && confidence >= options.confidenceThreshold)
          json.optJSONArray("genres")?.toList<String>()?.toSet() ?: emptySet()
        else
          emptySet(),
      ageRating =
        if (options.generateAgeRating && confidence >= options.confidenceThreshold)
          json.optInt("age_rating").takeIf { it > 0 }
        else
          null,
      readingDirection =
        if (options.generateReadingDirection && confidence >= options.confidenceThreshold)
          json.optString("reading_direction").takeIf { it.isNotBlank() }
        else
          null,
      publisher =
        if (options.generatePublisher && confidence >= options.confidenceThreshold)
          json.optString("publisher").takeIf { it.isNotBlank() }
        else
          null,
      language =
        if (options.generateLanguage && confidence >= options.confidenceThreshold)
          json.optString("language").takeIf { it.isNotBlank() }
        else
          null,
      releaseDate =
        if (options.generateReleaseDate && confidence >= options.confidenceThreshold)
          json.optString("release_date").takeIf { it.isNotBlank() }
        else
          null,
      confidence = confidence,
    )
  }

  private fun extractTextFromBook(book: Book): String {
    val bookFile = komgaProperties.file.bookPath(book.libraryId, book.id)
    val contentProvider =
      when (contentDetector.getArchiveFormat(bookFile)) {
        ContentDetector.ArchiveFormat.ZIP -> ZipContentProvider(bookFile, book.fileLastModified, false)
        ContentDetector.ArchiveFormat.RAR -> RarContentProvider(bookFile, book.fileLastModified, false)
        else -> return ""
      }

    return try {
      val entries =
        contentProvider
          .entries()
          .filter { it.name.lowercase().endsWith(".txt") || it.name.lowercase().endsWith(".xml") }
          .take(5) // Limit to first 5 text files to avoid processing too much
          .joinToString("\n\n") { entry ->
            contentProvider.getEntryAsString(entry.name) ?: ""
          }
      contentProvider.close()
      entries
    } catch (e: Exception) {
      log.warn("Error extracting text from book ${book.id}", e)
      ""
    }
  }

  private fun buildContext(
    book: Book,
    series: Series?,
    extractedText: String,
  ): String {
    val context = StringBuilder()

    // Add series information if available
    if (series != null) {
      context.append("Series: ${series.metadata.title}\n")
      series.metadata.summary?.takeIf { it.isNotBlank() }?.let {
        context.append("Series Summary: $it\n")
      }
      series.metadata.publisher?.takeIf { it.isNotBlank() }?.let {
        context.append("Series Publisher: $it\n")
      }
      series.metadata.genres.takeIf { it.isNotEmpty() }?.let {
        context.append("Series Genres: ${it.joinToString(", ")}\n")
      }
    }

    // Add book information
    context.append("\nBook Title: ${book.metadata.title}\n")
    book.metadata.summary?.takeIf { it.isNotBlank() }?.let {
      context.append("Book Summary: $it\n")
    }
    book.metadata.number?.let {
      context.append("Book Number: $it\n")
    }

    // Add extracted text (first 2000 chars to avoid context limits)
    val previewText = extractedText.take(2000)
    context.append("\nExtracted Text Preview:\n$previewText")

    return context.toString()
  }

  private fun parseJsonResponse(jsonString: String): JSONObject =
    try {
      JSONObject(jsonString)
    } catch (e: Exception) {
      // Try to find JSON in code blocks if the response is markdown
      val jsonMatch = "```(?:json)?\n([\s\S]*?)\n```".toRegex().find(jsonString)
      if (jsonMatch != null) {
        JSONObject(jsonMatch.groupValues[1])
      } else {
        throw RuntimeException("Failed to parse JSON response")
      }
    }

  private fun extractKeywords(
    text: String,
    limit: Int = 10,
  ): List<String> =
    text
      .lowercase()
      .removeAccents()
      .removePunctuation()
      .split("\\s+")
      .filter { it.length > 3 && it !in stopWords }
      .groupingBy { it }
      .eachCount()
      .entries
      .sortedByDescending { it.value }
      .take(limit)
      .map { it.key }

  companion object {
    private fun JSONArray.toList(): List<String> {
      val list = mutableListOf<String>()
      for (i in 0 until this.length()) {
        list.add(this.getString(i))
      }
      return list
    }
  }
}
