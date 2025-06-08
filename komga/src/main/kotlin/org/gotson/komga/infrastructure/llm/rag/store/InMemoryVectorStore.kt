package org.gotson.komga.infrastructure.llm.rag.store

import org.gotson.komga.infrastructure.llm.rag.model.DocumentChunk
import org.gotson.komga.infrastructure.llm.rag.model.RagDocument
import org.gotson.komga.infrastructure.llm.rag.model.RagSearchResult
import org.slf4j.LoggerFactory
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.stereotype.Component
import kotlin.math.sqrt

/**
 * Simple in-memory implementation of VectorStore for testing and development.
 * Not suitable for production use with large datasets.
 */
@Component
@ConditionalOnProperty("komga.rag.vector-store", havingValue = "memory", matchIfMissing = true)
class InMemoryVectorStore : VectorStore {
  private val logger = LoggerFactory.getLogger(javaClass)

  private val documents = mutableMapOf<String, RagDocument>()
  private val chunks = mutableListOf<DocumentChunk>()

  override suspend fun addDocuments(documents: List<RagDocument>) {
    documents.forEach { doc ->
      this.documents[doc.id] = doc
      this.chunks.addAll(doc.chunks)
      logger.debug("Added document ${doc.id} with ${doc.chunks.size} chunks")
    }
  }

  override suspend fun removeDocuments(documentIds: List<String>) {
    documentIds.forEach { docId ->
      documents.remove(docId)
      chunks.removeAll { it.documentId == docId }
      logger.debug("Removed document $docId")
    }
  }

  override suspend fun similaritySearch(
    query: String,
    k: Int,
    filter: Map<String, Any>?,
  ): List<RagSearchResult> {
    // In a real implementation, we'd generate an embedding for the query
    // For simplicity, we'll just do a text search
    val queryTerms = query.lowercase().split("\\s+").toSet()

    return chunks
      .mapNotNull { chunk ->
        val content = chunk.content.lowercase()
        val score = queryTerms.count { it in content }.toDouble() / queryTerms.size
        if (score > 0) {
          val doc = documents[chunk.documentId]
          if (doc != null) {
            RagSearchResult(chunk, score, doc)
          } else {
            null
          }
        } else {
          null
        }
      }.sortedByDescending { it.score }
      .take(k)
  }

  override suspend fun similaritySearchWithEmbedding(
    queryEmbedding: List<Double>,
    k: Int,
    filter: Map<String, Any>?,
  ): List<RagSearchResult> {
    if (chunks.isEmpty()) return emptyList()

    return chunks
      .map { chunk ->
        val score = cosineSimilarity(queryEmbedding, chunk.embedding)
        val doc = documents[chunk.documentId] ?: throw IllegalStateException("Document ${chunk.documentId} not found")
        RagSearchResult(chunk, score, doc)
      }.sortedByDescending { it.score }
      .take(k)
      .filter { it.score > 0 }
  }

  private fun cosineSimilarity(
    v1: List<Double>,
    v2: List<Double>,
  ): Double {
    require(v1.size == v2.size) { "Vectors must have the same length" }

    val dotProduct = v1.zip(v2) { a, b -> a * b }.sum()
    val norm1 = sqrt(v1.sumOf { it * it })
    val norm2 = sqrt(v2.sumOf { it * it })

    return if (norm1 > 0 && norm2 > 0) {
      dotProduct / (norm1 * norm2)
    } else {
      0.0
    }
  }

  override suspend fun getDocument(documentId: String): RagDocument? = documents[documentId]

  override suspend fun getDocumentChunks(documentId: String): List<DocumentChunk> = chunks.filter { it.documentId == documentId }.sortedBy { it.chunkIndex }
}
