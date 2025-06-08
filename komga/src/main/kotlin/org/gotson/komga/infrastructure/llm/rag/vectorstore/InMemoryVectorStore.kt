package org.gotson.komga.infrastructure.llm.rag.vectorstore

import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.gotson.komga.infrastructure.llm.rag.model.DocumentChunk
import org.gotson.komga.infrastructure.llm.rag.model.RagDocument
import org.slf4j.LoggerFactory
import kotlin.math.sqrt

/**
 * An in-memory implementation of the VectorStore interface.
 * This is suitable for development and testing but not for production use.
 */
class InMemoryVectorStore : VectorStore {
  private val logger = LoggerFactory.getLogger(javaClass)

  // Thread-safe storage for documents and chunks
  private val documents = mutableMapOf<String, RagDocument>()
  private val chunks = mutableMapOf<String, MutableList<DocumentChunk>>()
  private val mutex = Mutex()

  override suspend fun initialize() {
    // No initialization needed for in-memory store
    logger.info("Initialized in-memory vector store")
  }

  override suspend fun addDocument(
    document: RagDocument,
    chunks: List<DocumentChunk>,
  ): Int =
    mutex.withLock {
      documents[document.id] = document
      this.chunks[document.id] = chunks.toMutableList()
      chunks.size
    }

  override suspend fun addDocuments(documents: List<Pair<RagDocument, List<DocumentChunk>>>): Int =
    mutex.withLock {
      var totalChunks = 0
      documents.forEach { (doc, chks) ->
        this.documents[doc.id] = doc
        this.chunks[doc.id] = chks.toMutableList()
        totalChunks += chks.size
      }
      totalChunks
    }

  override suspend fun removeDocument(documentId: String): Boolean =
    mutex.withLock {
      val docRemoved = documents.remove(documentId) != null
      val chunksRemoved = chunks.remove(documentId)?.size ?: 0
      logger.debug("Removed document $documentId and $chunksRemoved chunks")
      docRemoved
    }

  override suspend fun similaritySearch(
    embedding: List<Double>,
    limit: Int,
    minScore: Double,
    filter: Map<String, Any>?,
  ): List<Pair<DocumentChunk, Double>> =
    mutex.withLock {
      val results = mutableListOf<Pair<DocumentChunk, Double>>()

      chunks.values.flatten().forEach { chunk ->
        if (chunk.embedding.isNotEmpty()) {
          val score = cosineSimilarity(embedding, chunk.embedding)
          if (score >= minScore) {
            results.add(chunk to score)
          }
        }
      }

      // Sort by score descending and take top N
      results.sortedByDescending { it.second }.take(limit)
    }

  override suspend fun getStats(): Map<String, Any> =
    mutex.withLock {
      val totalChunks = chunks.values.sumOf { it.size }
      val avgChunksPerDoc = if (documents.isNotEmpty()) totalChunks.toDouble() / documents.size else 0.0

      mapOf(
        "documents" to documents.size,
        "chunks" to totalChunks,
        "avg_chunks_per_doc" to avgChunksPerDoc,
        "store_type" to "in-memory",
      )
    }

  override suspend fun documentExists(documentId: String): Boolean =
    mutex.withLock {
      documents.containsKey(documentId)
    }

  override suspend fun getDocument(documentId: String): RagDocument? =
    mutex.withLock {
      documents[documentId]
    }

  override suspend fun listDocuments(
    limit: Int,
    offset: Int,
  ): List<RagDocument> =
    mutex.withLock {
      documents.values.drop(offset).take(limit)
    }

  override suspend fun getDocumentChunks(documentId: String): List<DocumentChunk> =
    mutex.withLock {
      chunks[documentId]?.sortedBy { it.chunkIndex } ?: emptyList()
    }

  override suspend fun cleanup() {
    mutex.withLock {
      documents.clear()
      chunks.clear()
      logger.info("Cleaned up in-memory vector store")
    }
  }

  /**
   * Calculates the cosine similarity between two vectors.
   *
   * @param a First vector
   * @param b Second vector
   * @return Cosine similarity between the vectors (range: -1 to 1)
   */
  private fun cosineSimilarity(
    a: List<Double>,
    b: List<Double>,
  ): Double {
    require(a.size == b.size) { "Vectors must have the same length" }

    var dotProduct = 0.0
    var normA = 0.0
    var normB = 0.0

    for (i in a.indices) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    return if (normA > 0 && normB > 0) {
      dotProduct / (sqrt(normA) * sqrt(normB))
    } else {
      0.0
    }
  }

  companion object {
    /**
     * Creates a new instance of InMemoryVectorStore with optional initial data.
     *
     * @param initialDocuments Initial documents to add to the store
     * @param initialChunks Initial chunks to add to the store (mapped by document ID)
     * @return A new InMemoryVectorStore instance
     */
    fun create(
      initialDocuments: Map<String, RagDocument> = emptyMap(),
      initialChunks: Map<String, List<DocumentChunk>> = emptyMap(),
    ): InMemoryVectorStore =
      InMemoryVectorStore().apply {
        mutex.withLock {
          documents.putAll(initialDocuments)
          initialChunks.forEach { (docId, chks) ->
            chunks[docId] = chks.toMutableList()
          }
        }
      }
  }
}
