package org.gotson.komga.infrastructure.llm.rag.util

import org.gotson.komga.infrastructure.llm.rag.model.RagConfig
import org.springframework.stereotype.Component
import java.text.BreakIterator

/**
 * Utility for splitting text into chunks with configurable size and overlap.
 */
@Component
class TextSplitter {
  /**
   * Splits text into chunks based on the provided configuration.
   * Tries to split at sentence boundaries when possible.
   *
   * @param text The text to split
   * @param config Configuration for chunking
   * @return List of text chunks
   */
  fun splitText(
    text: String,
    config: RagConfig,
  ): List<String> {
    if (text.length <= config.chunkSize) {
      return listOf(text)
    }

    val chunks = mutableListOf<String>()
    var start = 0

    while (start < text.length) {
      var end = (start + config.chunkSize).coerceAtMost(text.length)

      // Try to find a sentence boundary near the chunk end
      if (end < text.length) {
        val boundary = findSentenceBoundary(text, end)
        if (boundary in (start + config.chunkSize / 2)..(start + config.chunkSize)) {
          end = boundary
        }
      }

      chunks.add(text.substring(start, end).trim())

      // Calculate next start position with overlap
      start =
        (end - config.chunkOverlap).coerceAtLeast(
          if (chunks.size > 1) chunks[chunks.size - 2].length else 0,
        )

      // Prevent infinite loop with very small chunks
      if (start >= end) {
        start = end
      }
    }

    return chunks
  }

  private fun findSentenceBoundary(
    text: String,
    position: Int,
  ): Int {
    val boundary = BreakIterator.getSentenceInstance()
    boundary.setText(text)

    var boundaryPos = boundary.following(position)
    // If we're at the end, return the position
    if (boundaryPos == BreakIterator.DONE) {
      return text.length
    }

    // Look for the next sentence start after the boundary
    var nextStart = boundary.next()
    while (nextStart != BreakIterator.DONE && nextStart <= position) {
      nextStart = boundary.next()
    }

    return if (nextStart != BreakIterator.DONE) nextStart else text.length
  }
}
