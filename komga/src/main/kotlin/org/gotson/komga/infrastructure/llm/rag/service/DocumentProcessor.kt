package org.gotson.komga.infrastructure.llm.rag.service

import org.apache.tika.Tika
import org.gotson.komga.infrastructure.llm.rag.model.RagDocument
import org.gotson.komga.infrastructure.llm.rag.model.RagDocumentChunk
import org.gotson.komga.infrastructure.llm.rag.model.RagDocumentMetadata
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.nio.file.Files
import java.nio.file.Path
import java.util.UUID

/**
 * Handles document processing for different file types.
 * Supports text, PDF, DOCX, and other formats via Apache Tika.
 */
@Service
class DocumentProcessor(
  private val textSplitter: TextSplitter,
  private val tika: Tika = Tika(),
) {
  private val logger = LoggerFactory.getLogger(javaClass)

  companion object {
    private const val DEFAULT_CHUNK_SIZE = 1000
    private const val DEFAULT_CHUNK_OVERLAP = 200

    // Supported MIME types
    val SUPPORTED_MIME_TYPES =
      setOf(
        "text/plain",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/markdown",
        "text/html",
      )
  }

  /**
   * Processes a file and returns a list of document chunks.
   */
  fun process(
    file: Path,
    metadata: Map<String, Any> = emptyMap(),
    chunkSize: Int = DEFAULT_CHUNK_SIZE,
    chunkOverlap: Int = DEFAULT_CHUNK_OVERLAP,
  ): List<RagDocument> {
    logger.debug("Processing file: ${file.fileName}")

    // Extract text content using Tika
    val text =
      try {
        tika.parseToString(file)
      } catch (e: Exception) {
        throw DocumentProcessingException("Failed to extract text from file: ${e.message}", e)
      }

    // Create document with metadata
    val documentId = UUID.randomUUID().toString()
    val docMetadata =
      RagDocumentMetadata(
        id = documentId,
        name = file.fileName.toString(),
        size = Files.size(file),
        mimeType = tika.detect(file),
        metadata =
          metadata.toMutableMap().apply {
            put("processing_timestamp", System.currentTimeMillis())
          },
      )

    // Split text into chunks
    val chunks = splitText(text, chunkSize, chunkOverlap, docMetadata)

    return listOf(
      RagDocument(
        id = documentId,
        content = text,
        metadata = docMetadata,
        chunks = chunks,
      ),
    )
  }

  /**
   * Splits text into chunks with optional overlap.
   */
  private fun splitText(
    text: String,
    chunkSize: Int = DEFAULT_CHUNK_SIZE,
    chunkOverlap: Int = DEFAULT_CHUNK_OVERLAP,
    metadata: RagDocumentMetadata,
  ): List<RagDocumentChunk> {
    if (text.length <= chunkSize) {
      return listOf(createChunk(text, 0, metadata))
    }

    val chunks = mutableListOf<RagDocumentChunk>()
    var start = 0
    var chunkIndex = 0

    while (start < text.length) {
      val end = minOf(start + chunkSize, text.length)

      // Try to split at sentence boundaries
      val splitPos = text.lastIndexOf('.', end - 1).takeIf { it > start + chunkSize / 2 } ?: end

      val chunkText = text.substring(start, splitPos).trim()
      if (chunkText.isNotEmpty()) {
        chunks.add(createChunk(chunkText, chunkIndex++, metadata))
      }

      // Move start position, considering overlap
      start =
        if (splitPos == end) {
          // No sentence boundary found, just move by chunk size - overlap
          start + chunkSize - chunkOverlap
        } else {
          // Split at sentence boundary
          splitPos + 1
        }
    }

    return chunks
  }

  private fun createChunk(
    text: String,
    index: Int,
    documentMetadata: RagDocumentMetadata,
  ): RagDocumentChunk =
    RagDocumentChunk(
      id = "${documentMetadata.id}_chunk_$index",
      content = text,
      chunkIndex = index,
      documentId = documentMetadata.id,
      metadata =
        documentMetadata.metadata.toMutableMap().apply {
          put("chunk_index", index)
        },
    )

  /**
   * Checks if a file type is supported for processing.
   * @param mimeType The MIME type to check
   * @return true if the type is supported, false otherwise
   */
  fun isSupportedType(mimeType: String): Boolean = SUPPORTED_MIME_TYPES.any { mimeType.startsWith(it) }
}

class DocumentProcessingException(
  message: String,
  cause: Throwable? = null,
) : RuntimeException(message, cause)
