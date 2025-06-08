package org.gotson.komga.infrastructure.llm

import org.gotson.komga.domain.model.Book
import org.gotson.komga.domain.model.Series
import org.gotson.komga.infrastructure.llm.LlmService.SummarizationOptions
import org.gotson.komga.interfaces.rest.SummarizationResult
import org.gotson.komga.interfaces.rest.SummarizedPage
import org.springframework.stereotype.Service

@Service
class BookSummarizationService(
  private val llmService: LlmService,
  private val contentExtractor: BookContentExtractor,
) {
  suspend fun generateMinibook(
    book: Book,
    series: Series?,
    pageCount: Int = 10,
    model: String? = null,
    temperature: Float = 0.7f,
  ): SummarizationResult {
    val content = contentExtractor.extractContent(book)
    val context = buildContext(book, series, content)

    val prompt =
      """
      Create a $pageCount-page summary version of the following book, called a "Minibook". 
      Each page should be a concise but complete summary of a section of the book.
      Include key plot points, character development, and major events.
      
      Book: ${book.metadata.title}
      ${series?.let { "Series: ${it.metadata.title}\n" } ?: ""}
      ${book.metadata.summary?.let { "Summary: $it\n" } ?: ""}
      
      Content:
      $content
      
      Return the response as a JSON object with:
      - summary: A 2-3 sentence overview of the entire book
      - pages: An array of $pageCount objects, each with:
        - pageNumber: The page number (1-based)
        - content: The content for this page (2-3 paragraphs)
        - imagePrompt: A detailed prompt that could be used to generate an image for this page
      """.trimIndent()

    val options =
      LlmService.SummarizationOptions(
        prompt = prompt,
        model = model,
        temperature = temperature,
        responseFormat = "json",
      )

    return try {
      val result = llmService.summarize(options)
      // Parse and validate the result
      parseSummarizationResult(result, pageCount)
    } catch (e: Exception) {
      throw RuntimeException("Failed to generate Minibook: ${e.message}", e)
    }
  }

  suspend fun generateMicrobook(
    book: Book,
    series: Series?,
    model: String? = null,
    temperature: Float = 0.8f,
  ): SummarizationResult {
    val content = contentExtractor.extractContent(book)
    val context = buildContext(book, series, content)

    val prompt =
      """
      Create a single-page humorous summary of the following book, called a "Microbook".
      The summary should be funny and capture the essence of the book in a lighthearted way.
      
      Book: ${book.metadata.title}
      ${series?.let { "Series: ${it.metadata.title}\n" } ?: ""}
      ${book.metadata.summary?.let { "Summary: $it\n" } ?: ""}
      
      Content:
      $content
      
      Return the response as a JSON object with:
      - summary: A funny one-sentence summary of the book
      - pages: An array with a single object containing:
        - pageNumber: 1
        - content: The humorous summary (2-3 paragraphs)
        - imagePrompt: A funny and creative prompt for generating an image
      """.trimIndent()

    val options =
      LlmService.SummarizationOptions(
        prompt = prompt,
        model = model,
        temperature = temperature,
        responseFormat = "json",
      )

    return try {
      val result = llmService.summarize(options)
      // Parse and validate the result
      parseSummarizationResult(result, 1)
    } catch (e: Exception) {
      throw RuntimeException("Failed to generate Microbook: ${e.message}", e)
    }
  }

  private fun buildContext(
    book: Book,
    series: Series?,
    content: String,
  ): String =
    """
    Book Title: ${book.metadata.title}
    ${series?.let { "Series: ${it.metadata.title}\n" } ?: ""}
    ${book.metadata.summary?.let { "Summary: $it\n" } ?: ""}
    ${book.metadata.authors
      .joinToString(", ") { it.name }
      .takeIf { it.isNotBlank() }
      ?.let { "Authors: $it\n" } ?: ""}
    ${book.metadata.releaseDate?.let { "Release Date: $it\n" } ?: ""}
    
    Content:
    $content
    """.trimIndent()

  private fun parseSummarizationResult(
    result: String,
    expectedPages: Int,
  ): SummarizationResult {
    // Parse the JSON response
    val json =
      try {
        jacksonObjectMapper().readTree(result)
      } catch (e: Exception) {
        throw IllegalArgumentException("Invalid JSON response from LLM: ${e.message}")
      }

    // Extract summary
    val summary =
      json.path("summary").asText()
        ?: throw IllegalArgumentException("Missing 'summary' in LLM response")

    // Extract pages
    val pagesNode = json.path("pages")
    if (!pagesNode.isArray || pagesNode.size() != expectedPages) {
      throw IllegalArgumentException("Expected $expectedPages pages in LLM response, got ${pagesNode.size()}")
    }

    val pages =
      pagesNode.mapIndexed { index, node ->
        val pageNumber = node.path("pageNumber").asInt(index + 1)
        val content =
          node.path("content").asText()
            ?: throw IllegalArgumentException("Missing 'content' for page ${index + 1}")
        val imagePrompt =
          node.path("imagePrompt").asText()
            ?: throw IllegalArgumentException("Missing 'imagePrompt' for page ${index + 1}")

        SummarizedPage(
          pageNumber = pageNumber,
          content = content,
          imagePrompt = imagePrompt,
        )
      }

    return SummarizationResult(
      summary = summary,
      pages = pages,
      modelUsed = "LLM", // This would come from the LLM service
      warnings = emptyList(),
      errors = emptyList(),
    )
  }

  companion object {
    private val jacksonObjectMapper =
      jacksonObjectMapper()
        .registerModule(JavaTimeModule())
        .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
  }
}
