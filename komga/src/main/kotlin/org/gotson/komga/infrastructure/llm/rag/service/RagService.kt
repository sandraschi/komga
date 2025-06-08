package org.gotson.komga.infrastructure.llm.rag.service

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.gotson.komga.infrastructure.llm.rag.exception.RagException
import org.gotson.komga.infrastructure.llm.rag.model.DocumentChunk
import org.gotson.komga.infrastructure.llm.rag.model.RagAnswer
import org.gotson.komga.infrastructure.llm.rag.model.RagConfig
import org.gotson.komga.infrastructure.llm.rag.model.RagDocument
import org.gotson.komga.infrastructure.llm.rag.vectorstore.VectorStoreFactory
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Service
import java.io.InputStream
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.time.Instant
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.locks.ReentrantLock
import kotlin.concurrent.withLock

/**
 * Main service for Retrieval-Augmented Generation (RAG) functionality.
 * Handles document ingestion, retrieval, and question answering.
 */
@Service
class RagService(
  private val documentProcessor: DocumentProcessor,
  private val embeddingService: EmbeddingService,
  private val vectorStoreFactory: VectorStoreFactory,
  private val ragConfig: RagConfig,
) {
  private val logger = LoggerFactory.getLogger(javaClass)

  // Track active processing jobs
  private val activeJobs = ConcurrentHashMap<String, JobStatus>()

  // Default collection for documents
  private val defaultCollection = "default"

  // In-memory document store (in a real app, this would be a database)
  private val documentStore = mutableMapOf<String, RagDocument>()

  // Lock for document store operations
  private val documentStoreLock =
    java.util.concurrent.locks
      .ReentrantLock()

  /**
   * Processes a document and adds it to the vector store.
   *
   * @param inputStream Input stream of the document
   * @param fileName Original file name
   * @param metadata Additional metadata for the document
   * @param collectionName Name of the collection to add the document to
   * @param chunkSize Maximum size of each chunk
   * @param chunkOverlap Number of characters to overlap between chunks
   * @return Job ID for tracking progress
   */
  @Async
  fun processDocument(
    inputStream: InputStream,
    fileName: String,
    metadata: Map<String, Any> = emptyMap(),
    collectionName: String = defaultCollection,
    chunkSize: Int = ragConfig.chunking.chunkSize,
    chunkOverlap: Int = ragConfig.chunking.chunkOverlap,
  ): String {
    val jobId = UUID.randomUUID().toString()

    val job =
      CoroutineScope(Dispatchers.IO).launch {
        try {
          activeJobs[jobId] =
            JobStatus(
              isActive = true,
              progress = 0.0f,
              message = "Processing document: $fileName",
            )

          // Save the file temporarily
          val tempFile = Files.createTempFile("rag_doc_", ".${fileName.substringAfterLast('.').takeIf { it != fileName } ?: "bin"}")
          try {
            Files.copy(inputStream, tempFile, StandardCopyOption.REPLACE_EXISTING)

            // Process the document
            updateJobStatus(jobId) { it.copy(progress = 0.2f, message = "Extracting text from document") }
            val document = documentProcessor.processDocument(tempFile, metadata, chunkSize, chunkOverlap)

            // Generate embeddings for chunks
            updateJobStatus(jobId) { it.copy(progress = 0.4f, message = "Generating embeddings") }
            val chunksWithEmbeddings = embedChunks(document.chunks)

            // Store document and chunks
            updateJobStatus(jobId) { it.copy(progress = 0.8f, message = "Storing document") }
            val ragDocument =
              document.copy(
                metadata =
                  document.metadata +
                    mapOf(
                      "original_filename" to fileName,
                      "collection" to collectionName,
                      "processed_at" to Instant.now().toString(),
                    ),
                chunks = chunksWithEmbeddings,
              )

            // Save to document store and vector store
            documentStoreLock.withLock {
              documentStore[ragDocument.id] = ragDocument
              val vectorStore = vectorStoreFactory.getOrCreateVectorStore(collectionName)
              vectorStore.addDocument(ragDocument)
            }

            updateJobStatus(jobId) { it.copy(progress = 1.0f, isCompleted = true, message = "Document processed successfully") }
          } finally {
            Files.deleteIfExists(tempFile)
          }
        } catch (e: Exception) {
          logger.error("Error processing document: ${e.message}", e)
          updateJobStatus(jobId) {
            it.copy(
              isActive = false,
              error = e.message ?: "Unknown error",
              message = "Failed to process document: ${e.message}",
            )
          }
          throw RagException("Failed to process document: ${e.message}", e)
        } finally {
          activeJobs.remove(jobId)
        }
      }

    // Handle job cancellation
    job.invokeOnCompletion { cause ->
      if (cause is CancellationException) {
        updateJobStatus(jobId) {
          it.copy(
            isActive = false,
            isCancelled = true,
            message = "Job was cancelled",
          )
        }
      }
    }

    return jobId
  }

  /**
   * Searches for relevant document chunks based on a query.
   *
   * @param query The search query
   * @param collectionName Name of the collection to search in
   * @param limit Maximum number of results to return
   * @param minScore Minimum similarity score (0-1)
   * @param filter Optional filter criteria
   * @return List of matching chunks with their similarity scores
   */
  suspend fun search(
    query: String,
    collectionName: String = defaultCollection,
    limit: Int = 10,
    minScore: Double = 0.7,
    filter: Map<String, Any>? = null,
  ): List<Pair<DocumentChunk, Double>> {
    if (query.isBlank()) return emptyList()

    return withContext(Dispatchers.IO) {
      try {
        // Generate embedding for the query
        val queryEmbedding = embeddingService.embedText(query).first()

        // Search the vector store
        val vectorStore = vectorStoreFactory.getOrCreateVectorStore(collectionName)
        val results = vectorStore.search(queryEmbedding, limit, minScore, filter)

        // Get the full chunk details from the document store
        results.mapNotNull { (chunkId, score) ->
          documentStoreLock
            .withLock {
              documentStore.values.flatMap { it.chunks }.find { it.id == chunkId }
            }?.let { it to score }
        }
      } catch (e: Exception) {
        logger.error("Error searching documents: ${e.message}", e)
        throw RagException("Failed to search documents: ${e.message}", e)
      }
    }
  }

  /**
   * Generates an answer to a question using the RAG system.
   *
   * @param question The question to answer
   * @param collectionName Name of the collection to search in
   * @param maxResults Maximum number of relevant chunks to consider
   * @param minScore Minimum similarity score for chunks (0-1)
   * @return Generated answer with context and scores
   */
  suspend fun generateAnswer(
    question: String,
    collectionName: String = defaultCollection,
    maxResults: Int = 5,
    minScore: Double = 0.7,
  ): RagAnswer {
    if (question.isBlank()) {
      return RagAnswer("Please provide a question.", emptyList(), emptyList())
    }

    return withContext(Dispatchers.IO) {
      try {
        // Find relevant chunks
        val relevantChunks = search(question, collectionName, maxResults, minScore)

        if (relevantChunks.isEmpty()) {
          return@withContext RagAnswer(
            "I couldn't find any relevant information to answer your question.",
            emptyList(),
            emptyList(),
          )
        }

        // For now, just concatenate the top chunks as a simple answer
        // In a real implementation, you would use an LLM to generate a coherent answer
        val answer =
          relevantChunks.joinToString("\n\n") { (chunk, _) ->
            "[${chunk.chunkIndex + 1}] ${chunk.content.take(500)}${if (chunk.content.length > 500) "..." else ""}"
          }

        RagAnswer(
          answer = answer,
          context = relevantChunks.map { it.first.content },
          scores = relevantChunks.map { it.second },
        )
      } catch (e: Exception) {
        logger.error("Error generating answer: ${e.message}", e)
        throw RagException("Failed to generate answer: ${e.message}", e)
      }
    }
  }

  /**
   * Gets a document by ID.
   *
   * @param documentId The document ID
   * @return The document, or null if not found
   */
  fun getDocument(documentId: String): RagDocument? =
    documentStoreLock.withLock {
      documentStore[documentId]
    }

  /**
   * Lists all documents in a collection.
   *
   * @param collectionName Name of the collection
   * @return List of documents in the collection
   */
  fun listDocuments(collectionName: String = defaultCollection): List<RagDocument> =
    documentStoreLock.withLock {
      documentStore.values.filter { it.metadata["collection"] == collectionName }
    }

  /**
   * Deletes a document by ID.
   *
   * @param documentId The document ID
   * @return true if the document was deleted, false if not found
   */
  fun deleteDocument(documentId: String): Boolean {
    return documentStoreLock.withLock {
      val document = documentStore[documentId] ?: return@withLock false
      val collection = document.metadata["collection"]?.toString() ?: defaultCollection

      // Remove from vector store
      val vectorStore = vectorStoreFactory.getOrCreateVectorStore(collection)
      vectorStore.removeDocument(documentId)

      // Remove from document store
      documentStore.remove(documentId)

      true
    }
  }

  /**
   * Gets the status of a job.
   *
   * @param jobId The job ID
   * @return The job status, or null if not found
   */
  fun getJobStatus(jobId: String): JobStatus? = activeJobs[jobId]

  /**
   * Cancels a job.
   *
   * @param jobId The job ID
   * @return true if the job was cancelled, false if not found or already completed
   */
  fun cancelJob(jobId: String): Boolean {
    val job = activeJobs[jobId] ?: return false
    if (!job.isActive) return false

    // Update status to cancelled
    updateJobStatus(jobId) { it.copy(isActive = false, isCancelled = true) }

    // Cancel the coroutine
    activeJobs.remove(jobId)
    return true
  }

  /**
   * Gets statistics about the RAG system.
   *
   * @return Map of statistics
   */
  fun getStats(): Map<String, Any> =
    documentStoreLock.withLock {
      mapOf(
        "documents" to documentStore.size,
        "chunks" to documentStore.values.sumOf { it.chunks.size },
        "activeJobs" to activeJobs.size,
        "collections" to
          documentStore.values
            .map { it.metadata["collection"] ?: defaultCollection }
            .distinct()
            .size,
        "lastUpdated" to Instant.now().toString(),
      )
    }

  // Helper methods

  private suspend fun embedChunks(chunks: List<DocumentChunk>): List<DocumentChunk> {
    if (chunks.isEmpty()) return emptyList()

    val embeddings = embeddingService.embedTexts(chunks.map { it.content })

    return chunks.mapIndexed { index, chunk ->
      chunk.copy(embedding = embeddings.getOrNull(index) ?: FloatArray(0))
    }
  }

  private fun updateJobStatus(
    jobId: String,
    update: (JobStatus) -> JobStatus,
  ) {
    activeJobs.computeIfPresent(jobId) { _, status -> update(status) }
  }

  private inline fun <T> java.util.concurrent.locks.Lock.withLock(action: () -> T): T {
    lock()
    try {
      return action()
    } finally {
      unlock()
    }
  }

  companion object {
    // Default chunk size and overlap if not specified
    private const val DEFAULT_CHUNK_SIZE = 1000
    private const val DEFAULT_CHUNK_OVERLAP = 200
  }
}

/**
 * Represents the status of a document processing job.
 */
data class JobStatus(
  val isActive: Boolean = true,
  val isCompleted: Boolean = false,
  val isCancelled: Boolean = false,
  val progress: Float = 0f,
  val message: String = "",
  val error: String? = null,
)

/**
 * Represents an answer generated by the RAG system.
 */
data class RagAnswer(
  val answer: String,
  val context: List<String>,
  val scores: List<Double>,
  val metadata: Map<String, Any> = emptyMap(),
)

/**
 * Exception thrown when there is an error in RAG processing.
 */
class RagException(
  message: String,
  cause: Throwable? = null,
) : RuntimeException(message, cause)
