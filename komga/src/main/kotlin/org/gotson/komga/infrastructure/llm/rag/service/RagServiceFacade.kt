package org.gotson.komga.infrastructure.llm.rag.service

import org.gotson.komga.infrastructure.llm.rag.exception.DocumentNotFoundException
import org.gotson.komga.infrastructure.llm.rag.model.RagDocument
import org.gotson.komga.infrastructure.llm.rag.model.RagDocumentChunk
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.io.InputStream

/**
 * Facade that provides a simplified interface to the RAG system.
 * Coordinates between the document processor and job service.
 */
@Service
class RagServiceFacade(
  private val ragDocumentProcessor: RagDocumentProcessor,
  private val ragJobService: RagJobService,
) {
  private val logger = LoggerFactory.getLogger(javaClass)

  /**
   * Processes a document asynchronously and returns a job ID for tracking.
   *
   * @param inputStream The input stream of the document
   * @param fileName The original file name
   * @param contentType The MIME type of the document
   * @param collection The collection to add the document to
   * @param metadata Optional metadata to associate with the document
   * @return The ID of the processing job
   */
  suspend fun processDocument(
    inputStream: InputStream,
    fileName: String,
    contentType: String,
    collection: String = "default",
    metadata: Map<String, String> = emptyMap(),
  ): String =
    ragJobService.processDocument(
      inputStream = inputStream,
      fileName = fileName,
      contentType = contentType,
      collectionName = collection,
      metadata = metadata,
    )

  /**
   * Lists all documents in a collection.
   *
   * @param collection The name of the collection to list documents from
   * @return List of document metadata
   */
  suspend fun listDocuments(collection: String = "default"): List<RagDocument> = ragDocumentProcessor.listDocuments(collection)

  /**
   * Gets a document by ID.
   *
   * @param documentId The ID of the document to retrieve
   * @param includeChunks Whether to include document chunks in the response
   * @return The document with optional chunks
   * @throws DocumentNotFoundException if the document is not found
   */
  suspend fun getDocument(
    documentId: String,
    includeChunks: Boolean = false,
  ): RagDocument =
    ragDocumentProcessor.getDocument(documentId)
      ?: throw DocumentNotFoundException("Document not found: $documentId")

  /**
   * Deletes a document by ID.
   *
   * @param documentId The ID of the document to delete
   * @return true if the document was found and deleted, false otherwise
   */
  suspend fun deleteDocument(documentId: String): Boolean = ragDocumentProcessor.deleteDocument(documentId)

  /**
   * Searches for document chunks relevant to a query.
   *
   * @param query The search query
   * @param collection The name of the collection to search in
   * @param limit Maximum number of results to return
   * @param minScore Minimum similarity score (0-1) for results
   * @return List of search results with relevance scores
   */
  suspend fun search(
    query: String,
    collection: String = "default",
    limit: Int = 10,
    minScore: Double = 0.7,
  ): List<SearchResult> {
    val results = ragDocumentProcessor.search(query, collection, limit, minScore)

    return results.map { (chunk, score) ->
      val document =
        ragDocumentProcessor.getDocument(chunk.documentId)
          ?: throw DocumentNotFoundException("Document not found: ${chunk.documentId}")

      SearchResult(
        document = document,
        chunk = chunk,
        score = score,
      )
    }
  }

  /**
   * Generates an answer to a question using the RAG system.
   *
   * @param question The question to answer
   * @param collectionName The name of the collection to search in
   * @param maxResults Maximum number of relevant chunks to consider
   * @param minScore Minimum similarity score for chunks
   * @return Generated answer with relevant context
   */
  suspend fun generateAnswer(
    question: String,
    collectionName: String = "default",
    maxResults: Int = 5,
    minScore: Double = 0.7,
  ): RagAnswer =
    ragDocumentProcessor.generateAnswer(
      question = question,
      collectionName = collectionName,
      maxResults = maxResults,
      minScore = minScore,
    )

  /**
   * Gets the status of a processing job.
   *
   * @param jobId The job ID to check
   * @return The current job status, or null if not found
   */
  fun getJobStatus(jobId: String): JobStatus? = ragJobService.getJobStatus(jobId)

  /**
   * Cancels a processing job.
   *
   * @param jobId The job ID to cancel
   * @return true if the job was found and cancelled, false otherwise
   */
  fun cancelJob(jobId: String): Boolean = ragJobService.cancelJob(jobId)

  /**
   * Gets statistics about the RAG system.
   *
   * @return A map of statistics
   */
  fun getStats(): Map<String, Any> = ragJobService.getStats()

  /**
   * Represents a search result with document, chunk, and score.
   */
  data class SearchResult(
    val document: RagDocument,
    val chunk: RagDocumentChunk,
    val score: Double,
  )
}
