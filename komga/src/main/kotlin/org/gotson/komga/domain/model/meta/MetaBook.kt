package org.gotson.komga.domain.model.meta

import java.time.Instant
import java.util.UUID

/**
 * Represents a generated meta book that provides analysis and insights about one or more books.
 */
data class MetaBook(
  val id: String = UUID.randomUUID().toString(),
  val bookIds: List<String>,
  val type: MetaBookType,
  val status: GenerationStatus = GenerationStatus.PENDING,
  val format: OutputFormat,
  val storagePath: String? = null,
  val error: String? = null,
  val progress: Float = 0f,
  val metadata: MetaBookMetadata? = null,
  val options: GenerationOptions,
  val createdAt: Instant = Instant.now(),
  val updatedAt: Instant = Instant.now(),
  val completedAt: Instant? = null,
  val createdBy: String,
) {
  enum class MetaBookType {
    /** Analysis of a single book */
    INDIVIDUAL,

    /** Comparison of multiple books */
    COMPARATIVE,

    /** Thematic analysis across books */
    THEMATIC,
  }

  enum class GenerationStatus {
    PENDING,
    PROCESSING,
    COMPLETED,
    FAILED,
  }

  enum class OutputFormat {
    EPUB,
    PDF,
    MARKDOWN,
    WEB,
  }

  data class MetaBookMetadata(
    val title: String,
    val description: String,
    val coverImage: String?,
    val wordCount: Int,
    val sectionCount: Int,
    val generatedAt: Instant,
    val llmProvider: String? = null,
  )

  data class GenerationOptions(
    val depth: AnalysisDepth,
    val includeSpoilers: Boolean,
    val sections: Set<AnalysisSection>,
    val language: String,
    val theme: String? = null,
    val style: AnalysisStyle = AnalysisStyle.ANALYTICAL,
  )

  enum class AnalysisDepth {
    /** Brief overview (1-2 pages) */
    BRIEF,

    /** Standard analysis (5-10 pages) */
    STANDARD,

    /** Comprehensive study (20+ pages) */
    COMPREHENSIVE,
  }

  enum class AnalysisSection {
    SUMMARY,
    CHARACTERS,
    THEMES,
    STYLE,
    CONTEXT,
    RECEPTION,
    QUOTES,
    COMPARISON,
  }

  enum class AnalysisStyle {
    ACADEMIC,
    JOURNALISTIC,
    CASUAL,
    ANALYTICAL,
  }
}

/**
 * Represents a section within a meta book
 */
data class MetaBookSection(
  val id: String = UUID.randomUUID().toString(),
  val metaBookId: String,
  val sectionType: String,
  val title: String,
  val content: String,
  val order: Int,
  val metadata: Map<String, Any> = emptyMap(),
)
