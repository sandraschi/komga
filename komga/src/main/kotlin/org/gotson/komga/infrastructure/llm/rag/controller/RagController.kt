package org.gotson.komga.infrastructure.llm.rag.controller

import org.gotson.komga.infrastructure.llm.rag.service.RagService
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import org.springframework.web.server.ResponseStatusException

/**
 * REST controller for RAG (Retrieval-Augmented Generation) operations.
 */
@RestController
@RequestMapping("/api/v1/rag")
class RagController(
  private val ragService: RagService,
) {
  /**
   * Uploads and processes a document for RAG.
   *
   * @param file The document file to upload
   * @param collection The collection to add the document to (default: "default")
   * @param metadata Optional metadata to associate with the document (as form data)
   * @return The ID of the processing job
   */
  @PostMapping("/documents", consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
  suspend fun uploadDocument(
    @RequestParam("file") file: MultipartFile,
    @RequestParam("collection", required = false, defaultValue = "default") collection: String,
    @RequestParam(required = false) metadata: Map<String, String>?,
  ): Map<String, String> {
    if (file.isEmpty) {
      throw ResponseStatusException(HttpStatus.BAD_REQUEST, "File is empty")
    }

    val jobId =
      ragService.processDocument(
        file.inputStream,
        file.originalFilename ?: "unnamed.${file.contentType?.substringAfterLast('/') ?: "bin"}",
        file.contentType ?: "application/octet-stream",
        collection,
        metadata ?: emptyMap(),
      )

    return mapOf("jobId" to jobId)
  }

  /**
   * Lists all documents in the RAG system.
   *
   * @param collection The collection to list documents from (default: "default")
   * @return List of document metadata
   */
  @GetMapping("/documents")
  suspend fun listDocuments(
    @RequestParam(required = false, defaultValue = "default") collection: String,
  ): List<Map<String, Any>> =
    ragService.listDocuments(collection).map { document ->
      mapOf(
        "id" to document.id,
        "name" to document.name,
        "contentType" to document.contentType,
        "size" to document.size,
        "chunkCount" to document.chunks.size,
        "metadata" to document.metadata,
        "createdAt" to document.createdAt,
        "updatedAt" to document.updatedAt,
      )
    }

  /**
   * Gets a document by ID.
   *
   * @param documentId The ID of the document to retrieve
   * @param includeChunks Whether to include document chunks in the response
   * @return The document with optional chunks
   */
  @GetMapping("/documents/{documentId}")
  suspend fun getDocument(
    @PathVariable documentId: String,
    @RequestParam(required = false, defaultValue = "false") includeChunks: Boolean,
  ): Map<String, Any> {
    val document =
      ragService.getDocument(documentId)
        ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found: $documentId")

    return buildDocumentResponse(document, includeChunks)
  }

  /**
   * Deletes a document by ID.
   *
   * @param documentId The ID of the document to delete
   * @return 204 No Content on success
   */
  @DeleteMapping("/documents/{documentId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  suspend fun deleteDocument(
    @PathVariable documentId: String,
  ) {
    if (!ragService.deleteDocument(documentId)) {
      throw ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found: $documentId")
    }
  }

  /**
   * Searches for document chunks relevant to a query.
   *
   * @param query The search query
   * @param collection The collection to search in (default: "default")
   * @param limit Maximum number of results to return (default: 10)
   * @param minScore Minimum relevance score (0-1, default: 0.7)
   * @return List of search results with relevance scores
   */
  @GetMapping("/search")
  suspend fun search(
    @RequestParam query: String,
    @RequestParam(required = false, defaultValue = "default") collection: String,
    @RequestParam(required = false, defaultValue = "10") limit: Int,
    @RequestParam(required = false, defaultValue = "0.7") minScore: Double,
  ): List<Map<String, Any>> {
    val results = ragService.search(query, collection, limit, minScore)

    return results.map { result ->
      val doc = result.document
      mapOf(
        "chunk" to
          mapOf(
            "id" to result.chunk.id,
            "text" to result.chunk.text,
            "metadata" to result.chunk.metadata,
            "index" to result.chunk.index,
            "startOffset" to result.chunk.startOffset,
            "endOffset" to result.chunk.endOffset,
          ),
        "document" to buildDocumentResponse(doc, includeChunks = false),
        "score" to result.score,
      )
    }
  }

  /**
   * Generates an answer to a question using the RAG system.
   *
   * @param request The question and optional parameters
   * @return The generated answer with sources
   */
  @PostMapping("/ask")
  suspend fun ask(
    @RequestBody request: AskRequest,
  ): Map<String, Any> {
    val answer =
      ragService.generateAnswer(
        question = request.question,
        collectionName = request.collection ?: "default",
        maxResults = request.maxResults ?: 5,
        minScore = request.minScore ?: 0.7,
      )

    return mapOf(
      "answer" to answer.answer,
      "sources" to
        answer.sources.map { chunk ->
          mapOf(
            "id" to chunk.id,
            "text" to chunk.text,
            "metadata" to chunk.metadata,
            "documentId" to chunk.documentId,
            "index" to chunk.index,
          )
        },
      "metadata" to answer.metadata,
    )
  }

  /**
   * Gets the status of a processing job.
   *
   * @param jobId The job ID to check
   * @return The current job status
   */
  @GetMapping("/jobs/{jobId}")
  suspend fun getJobStatus(
    @PathVariable jobId: String,
  ): Map<String, Any> {
    val status =
      ragService.getJobStatus(jobId)
        ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found: $jobId")

    return mapOf(
      "jobId" to status.jobId,
      "status" to status.status,
      "progress" to status.progress,
      "documentId" to status.documentId,
      "error" to status.error,
      "startedAt" to status.startedAt,
      "completedAt" to status.completedAt,
    )
  }

  /**
   * Cancels a processing job.
   *
   * @param jobId The job ID to cancel
   * @return 204 No Content on success
   */
  @PostMapping("/jobs/{jobId}/cancel")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  suspend fun cancelJob(
    @PathVariable jobId: String,
  ) {
    if (!ragService.cancelJob(jobId)) {
      throw ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found or already completed: $jobId")
    }
  }

  /**
   * Gets statistics about the RAG system.
   *
   * @return System statistics
   */
  @GetMapping("/stats")
  suspend fun getStats(): Map<String, Any> = ragService.getStats()

  private fun buildDocumentResponse(
    document: RagDocument,
    includeChunks: Boolean,
  ): Map<String, Any> =
    mutableMapOf(
      "id" to document.id,
      "name" to document.name,
      "contentType" to document.contentType,
      "size" to document.size,
      "metadata" to document.metadata,
      "createdAt" to document.createdAt,
      "updatedAt" to document.updatedAt,
      "chunkCount" to document.chunks.size,
    ).apply {
      if (includeChunks) {
        this["chunks"] =
          document.chunks.map { chunk ->
            mapOf(
              "id" to chunk.id,
              "text" to chunk.text,
              "metadata" to chunk.metadata,
              "index" to chunk.index,
              "startOffset" to chunk.startOffset,
              "endOffset" to chunk.endOffset,
              "hasEmbedding" to (chunk.embedding != null),
            )
          }
      }
    }

  /**
   * Request body for asking a question.
   */
  data class AskRequest(
    val question: String,
    val collection: String? = null,
    val maxResults: Int? = null,
    val minScore: Double? = null,
  )
}
