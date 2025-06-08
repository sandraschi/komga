package org.gotson.komga.infrastructure.llm.rag.service

/**
 * Interface for splitting text into chunks.
 */
interface TextSplitter {
  /**
   * Splits text into chunks.
   *
   * @param text The text to split
   * @param chunkSize The maximum size of each chunk
   * @param chunkOverlap The number of characters that should overlap between chunks
   * @return List of text chunks
   */
  fun splitText(
    text: String,
    chunkSize: Int,
    chunkOverlap: Int,
  ): List<String>

  /**
   * Splits text into chunks with a default chunk size and overlap.
   */
  fun splitText(text: String): List<String>

  /**
   * Gets the default chunk size.
   */
  val defaultChunkSize: Int

  /**
   * Gets the default chunk overlap.
   */
  val defaultChunkOverlap: Int
}

/**
 * Splits text by recursively looking at characters and trying to split on separators.
 * This tries to keep paragraphs, sentences, and words together as much as possible.
 */
class RecursiveCharacterTextSplitter(
  private val chunkSize: Int = 1000,
  private val chunkOverlap: Int = 200,
  private val lengthFunction: (String) -> Int = { it.length },
  private val separators: List<String> = listOf("\n\n", "\n", " ", ""),
  private val keepSeparator: Boolean = true,
) : TextSplitter {
  override val defaultChunkSize: Int = chunkSize
  override val defaultChunkOverlap: Int = chunkOverlap

  init {
    require(chunkOverlap < chunkSize) {
      "chunkOverlap ($chunkOverlap) must be less than chunkSize ($chunkSize)"
    }
  }

  override fun splitText(text: String): List<String> = splitText(text, chunkSize, chunkOverlap)

  override fun splitText(
    text: String,
    chunkSize: Int,
    chunkOverlap: Int,
  ): List<String> {
    require(chunkOverlap < chunkSize) {
      "chunkOverlap ($chunkOverlap) must be less than chunkSize ($chunkSize)"
    }

    val finalChunks = mutableListOf<String>()

    // Split text by the first separator that is found
    fun split(
      text: String,
      separators: List<String>,
    ): List<String> {
      if (text.isEmpty()) {
        return emptyList()
      }

      val (separator, nextSeparators) =
        if (separators.isNotEmpty()) {
          separators.first() to separators.drop(1)
        } else {
          "" to emptyList()
        }

      val splits =
        if (separator.isNotEmpty()) {
          text.split(separator)
        } else {
          text.toList().map { it.toString() }
        }

      val goodSplits = mutableListOf<String>()
      val currentChunk = StringBuilder()

      for (s in splits) {
        val newLength = lengthFunction(currentChunk.toString() + s) + if (currentChunk.isNotEmpty()) lengthFunction(separator) else 0

        if (newLength <= chunkSize) {
          if (currentChunk.isNotEmpty()) {
            currentChunk.append(if (keepSeparator) separator + s else s)
          } else {
            currentChunk.append(s)
          }
        } else {
          if (currentChunk.isNotEmpty()) {
            goodSplits.add(currentChunk.toString())
            currentChunk.clear()
          }

          // Recursively split the current text if needed
          if (s.length > chunkSize) {
            if (nextSeparators.isNotEmpty()) {
              val subSplits = split(s, nextSeparators)
              goodSplits.addAll(subSplits.dropLast(1))
              currentChunk.append(subSplits.last())
            } else {
              currentChunk.append(s)
            }
          } else {
            currentChunk.append(s)
          }
        }
      }

      if (currentChunk.isNotEmpty()) {
        goodSplits.add(currentChunk.toString())
      }

      return goodSplits
    }

    // Initial split
    val splits = split(text, separators)

    // Merge small chunks with their neighbors
    val mergedSplits = mutableListOf<String>()
    var currentChunk = ""

    for (split in splits) {
      val newLength = lengthFunction(currentChunk) + lengthFunction(split) + if (currentChunk.isNotEmpty()) 1 else 0

      if (newLength <= chunkSize) {
        currentChunk = if (currentChunk.isEmpty()) split else "$currentChunk $split"
      } else {
        if (currentChunk.isNotEmpty()) {
          mergedSplits.add(currentChunk)
        }
        currentChunk = split
      }
    }

    if (currentChunk.isNotEmpty()) {
      mergedSplits.add(currentChunk)
    }

    return mergedSplits
  }
}
