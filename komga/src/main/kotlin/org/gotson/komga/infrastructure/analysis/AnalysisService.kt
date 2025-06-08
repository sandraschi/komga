package org.gotson.komga.infrastructure.analysis

import mu.KotlinLogging
import org.gotson.komga.domain.model.Book
import org.gotson.komga.domain.model.meta.MetaBook
import org.gotson.komga.infrastructure.llm.service.LlmService
import org.gotson.komga.infrastructure.text.TextExtractor
import org.springframework.stereotype.Service

private val logger = KotlinLogging.logger {}

data class BookAnalysis(
  val title: String,
  val description: String,
  val coverImage: String?,
  val sections: List<AnalysisSection>,
  val metadata: Map<String, Any>,
)

data class AnalysisSection(
  val id: String,
  val title: String,
  val content: String,
  val sectionType: String,
)

@Service
class AnalysisService(
  private val textExtractor: TextExtractor,
  private val llmService: LlmService,
) {
  suspend fun analyze(
    books: List<Book>,
    options: MetaBook.GenerationOptions,
  ): BookAnalysis {
    logger.info { "Analyzing ${books.size} books with options: $options" }

    // 1. Extract text from books
    val extractedTexts =
      books.associateWith { book ->
        textExtractor.extractText(book).takeIf { it.isNotBlank() }
          ?: throw IllegalStateException("Could not extract text from book: ${book.id}")
      }

    // 2. Generate analysis using LLM
    return when (options.type) {
      MetaBook.MetaBookType.INDIVIDUAL -> analyzeIndividualBook(extractedTexts.entries.first(), options)
      MetaBook.MetaBookType.COMPARATIVE -> analyzeComparativeBooks(extractedTexts, options)
      MetaBook.MetaBookType.THEMATIC -> analyzeThematicBooks(extractedTexts, options)
    }
  }

  private suspend fun analyzeIndividualBook(
    bookEntry: Map.Entry<Book, String>,
    options: MetaBook.GenerationOptions,
  ): BookAnalysis {
    val (book, text) = bookEntry
    val prompt = buildPrompt(book, text, options)

    val response =
      llmService.generateAnalysis(
        prompt = prompt,
        maxTokens = calculateMaxTokens(options.depth),
      )

    return parseAnalysisResponse(response, book.metadata.title, book.metadata.coverImage)
  }

  private suspend fun analyzeComparativeBooks(
    books: Map<Book, String>,
    options: MetaBook.GenerationOptions,
  ): BookAnalysis {
    // Implementation for comparing multiple books
    TODO("Implement comparative analysis")
  }

  private suspend fun analyzeThematicBooks(
    books: Map<Book, String>,
    options: MetaBook.GenerationOptions,
  ): BookAnalysis {
    // Implementation for thematic analysis
    TODO("Implement thematic analysis")
  }

  private fun buildPrompt(
    book: Book,
    text: String,
    options: MetaBook.GenerationOptions,
  ): String =
    """
    Analyze the following book and provide a ${options.depth.toString().lowercase()} analysis.
    Focus on: ${options.sections.joinToString(", ")}
    Style: ${options.style}
    
    Title: ${book.metadata.title}
    Author: ${book.metadata.authors.joinToString(", ")}
    
    Content:
    ${text.take(10000)}... [truncated for brevity]
    
    Provide the analysis in the requested format.
    """.trimIndent()

  private fun calculateMaxTokens(depth: MetaBook.AnalysisDepth): Int =
    when (depth) {
      MetaBook.AnalysisDepth.BRIEF -> 1000
      MetaBook.AnalysisDepth.STANDARD -> 3000
      MetaBook.AnalysisDepth.COMPREHENSIVE -> 10000
    }

  private fun parseAnalysisResponse(
    response: String,
    title: String,
    coverImage: String?,
  ): BookAnalysis {
    // Parse the LLM response into structured data
    // This is a simplified version - in reality, you'd want to parse the response
    // based on the actual format returned by your LLM
    return BookAnalysis(
      title = "Analysis of $title",
      description = "In-depth analysis of $title",
      coverImage = coverImage,
      sections =
        listOf(
          AnalysisSection(
            id = "summary",
            title = "Summary",
            content = response.take(500),
            sectionType = "SUMMARY",
          ),
        ),
      metadata = emptyMap(),
    )
  }
}
