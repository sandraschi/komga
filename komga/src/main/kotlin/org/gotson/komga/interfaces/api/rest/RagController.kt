package org.gotson.komga.interfaces.api.rest

import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.parameters.RequestBody
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.PositiveOrZero
import org.gotson.komga.domain.model.KomgaUser
import org.gotson.komga.infrastructure.llm.rag.service.DocumentProcessor
import org.gotson.komga.infrastructure.llm.rag.service.RagService
import org.gotson.komga.interfaces.api.rest.dto.AskRequestDto
import org.gotson.komga.interfaces.api.rest.dto.AskResponseDto
import org.gotson.komga.interfaces.api.rest.dto.DocumentChunkDto
import org.gotson.komga.interfaces.api.rest.dto.DocumentDto
import org.gotson.komga.interfaces.api.rest.dto.JobStatusDto
import org.gotson.komga.interfaces.api.rest.dto.SearchRequestDto
import org.gotson.komga.interfaces.api.rest.dto.SearchResponseDto
import org.gotson.komga.interfaces.api.rest.dto.SearchResultDto
import org.springframework.data.domain.Page
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
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
import java.net.URI

/**
 * REST API controller for Retrieval-Augmented Generation (RAG) functionality.
 * Provides endpoints for document management, search, and question answering.
 */
@RestController
@RequestMapping("/api/v1/rag", produces = [MediaType.APPLICATION_JSON_VALUE])
@Tag(name = "RAG", description = "Retrieval-Augmented Generation API")
class RagController(
  private val ragService: RagService,
  private val documentProcessor: DocumentProcessor,
) {
  private val logger = org.slf4j.LoggerFactory.getLogger(javaClass)

  // Document Management Endpoints

  @PostMapping("/documents", consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
  @Operation(
    summary = "Upload and process a document",
    description = "Uploads a document, processes it into chunks, and adds it to the vector store.",
  )
  @PreAuthorize("hasRole('ADMIN')")
  @SecurityRequirement(name = "httpBasic", scopes = ["admin"])
  @ResponseStatus(HttpStatus.ACCEPTED)
  fun uploadDocument(
    @AuthenticationPrincipal user: KomgaUser,
    @RequestParam("file") file: MultipartFile,
    @RequestParam("collection", required = false, defaultValue = "default") collectionName: String,
    @RequestParam("chunkSize", required = false) chunkSize: Int?,
    @RequestParam("chunkOverlap", required = false) chunkOverlap: Int?,
    @RequestParam("metadata", required = false) metadata: Map<String, String>?,
  ): ResponseEntity<JobStatusDto> {
    if (file.isEmpty) {
      throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Uploaded file is empty")
    }

    val jobId =
      ragService.processDocument(
        inputStream = file.inputStream,
        fileName = file.originalFilename ?: "document.${file.contentType?.substringAfter('/') ?: "txt"}",
        metadata = metadata ?: emptyMap(),
        collectionName = collectionName,
        chunkSize = chunkSize ?: documentProcessor.defaultChunkSize,
        chunkOverlap = chunkOverlap ?: documentProcessor.defaultChunkOverlap,
      )

    return ResponseEntity
      .accepted()
      .location(URI.create("/api/v1/rag/jobs/$jobId"))
      .body(JobStatusDto(jobId, "PENDING", "Document upload and processing started"))
  }

  @GetMapping("/documents")
  @Operation(summary = "List all documents")
  @PreAuthorize("hasRole('ADMIN')")
  @SecurityRequirement(name = "httpBasic", scopes = ["admin"])
  suspend fun listDocuments(
    @AuthenticationPrincipal user: KomgaUser,
    @RequestParam("collection", required = false) collectionName: String?,
    @RequestParam("page", defaultValue = "0") @PositiveOrZero page: Int,
    @RequestParam("size", defaultValue = "20") @Positive size: Int,
  ): Page<DocumentDto> {
    // TODO: Implement pagination and filtering
    val documents = ragService.listDocuments(collectionName ?: "default")
    return Page.empty<DocumentDto>() // Placeholder
  }

  @GetMapping("/documents/{documentId}")
  @Operation(summary = "Get document by ID")
  @PreAuthorize("hasRole('ADMIN')")
  @SecurityRequirement(name = "httpBasic", scopes = ["admin"])
  suspend fun getDocument(
    @AuthenticationPrincipal user: KomgaUser,
    @PathVariable documentId: String,
    @RequestParam("includeChunks", defaultValue = "false") includeChunks: Boolean,
  ): DocumentDto {
    val document =
      ragService.getDocument(documentId)
        ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found")

    return DocumentDto(
      id = document.id,
      name = document.metadata["original_filename"]?.toString() ?: "Unknown",
      collection = "default", // TODO: Get actual collection
      chunkCount = document.chunks.size,
      metadata = document.metadata,
      chunks =
        if (includeChunks) {
          document.chunks.map { chunk ->
            DocumentChunkDto(
              id = chunk.id,
              content = chunk.content.take(200) + if (chunk.content.length > 200) "..." else "",
              index = chunk.chunkIndex,
              score = null,
              metadata = chunk.metadata,
            )
          }
        } else {
          emptyList()
        },
      createdAt = document.createdAt,
      updatedAt = document.updatedAt,
    )
  }

  @DeleteMapping("/documents/{documentId}")
  @Operation(summary = "Delete a document")
  @PreAuthorize("hasRole('ADMIN')")
  @SecurityRequirement(name = "httpBasic", scopes = ["admin"])
  @ResponseStatus(HttpStatus.NO_CONTENT)
  suspend fun deleteDocument(
    @AuthenticationPrincipal user: KomgaUser,
    @PathVariable documentId: String,
  ) {
    if (!ragService.deleteDocument(documentId)) {
      throw ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found")
    }
  }

  // Search and Query Endpoints

  @PostMapping("/search")
  @Operation(summary = "Search for relevant document chunks")
  @PreAuthorize("hasRole('ADMIN')")
  @SecurityRequirement(name = "httpBasic", scopes = ["admin"])
  suspend fun search(
    @AuthenticationPrincipal user: KomgaUser,
    @Valid @RequestBody request: SearchRequestDto,
  ): SearchResponseDto {
    val results =
      ragService.search(
        query = request.query,
        collectionName = request.collection ?: "default",
        limit = request.limit ?: 10,
        minScore = request.minScore ?: 0.7,
        filter = request.filters,
      )

    return SearchResponseDto(
      results =
        results.map { (chunk, score) ->
          SearchResultDto(
            documentId = chunk.documentId,
            chunkId = chunk.id,
            content = chunk.content.take(500) + if (chunk.content.length > 500) "..." else "",
            score = score,
            metadata = chunk.metadata,
          )
        },
      totalResults = results.size,
    )
  }

  @PostMapping("/ask")
  @Operation(summary = "Ask a question and get an answer using RAG")
  @PreAuthorize("hasRole('ADMIN')")
  @SecurityRequirement(name = "httpBasic", scopes = ["admin"])
  suspend fun askQuestion(
    @AuthenticationPrincipal user: KomgaUser,
    @Valid @RequestBody request: AskRequestDto,
  ): AskResponseDto {
    val answer =
      ragService.generateAnswer(
        question = request.question,
        collectionName = request.collection ?: "default",
        maxResults = request.maxResults ?: 5,
        minScore = request.minScore ?: 0.7,
      )

    return AskResponseDto(
      question = request.question,
      answer = answer.answer,
      sources = answer.context,
      scores = answer.scores,
      metadata = emptyMap(), // TODO: Add relevant metadata
    )
  }

  // Job Management Endpoints

  @GetMapping("/jobs/{jobId}")
  @Operation(summary = "Get job status")
  @PreAuthorize("hasRole('ADMIN')")
  @SecurityRequirement(name = "httpBasic", scopes = ["admin"])
  fun getJobStatus(
    @AuthenticationPrincipal user: KomgaUser,
    @PathVariable jobId: String,
  ): JobStatusDto {
    val status =
      ragService.getJobStatus(jobId)
        ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found")

    return JobStatusDto(
      id = jobId,
      status =
        when {
          status.isActive -> "PROCESSING"
          status.isCompleted -> "COMPLETED"
          status.isCancelled -> "CANCELLED"
          else -> "UNKNOWN"
        },
      message = "",
      progress = null, // TODO: Track progress
    )
  }

  @DeleteMapping("/jobs/{jobId}")
  @Operation(summary = "Cancel a job")
  @PreAuthorize("hasRole('ADMIN')")
  @SecurityRequirement(name = "httpBasic", scopes = ["admin"])
  @ResponseStatus(HttpStatus.ACCEPTED)
  fun cancelJob(
    @AuthenticationPrincipal user: KomgaUser,
    @PathVariable jobId: String,
  ) {
    if (!ragService.cancelJob(jobId)) {
      throw ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found or already completed")
    }
  }

  // System Endpoints

  @GetMapping("/stats")
  @Operation(summary = "Get RAG system statistics")
  @PreAuthorize("hasRole('ADMIN')")
  @SecurityRequirement(name = "httpBasic", scopes = ["admin"])
  suspend fun getStats(
    @AuthenticationPrincipal user: KomgaUser,
  ): Map<String, Any> = ragService.getStats()

  @PostMapping("/query")
  @Operation(summary = "Query the RAG system (legacy)")
  @PreAuthorize("hasRole('ADMIN')")
  @SecurityRequirement(name = "httpBasic", scopes = ["admin"])
  @Deprecated("Use /search or /ask endpoints instead")
  suspend fun query(
    @AuthenticationPrincipal user: KomgaUser,
    @Valid @RequestBody query: RagQueryDto,
  ): RagResponseDto {
    val results =
      ragService.search(
        query = query.query,
        collectionName = "default",
        limit = query.topK ?: 5,
        minScore = 0.7,
        filter = query.filters,
      )

    val answer =
      if (query.generateAnswer == true) {
        ragService
          .generateAnswer(
            question = query.query,
            collectionName = "default",
            maxResults = query.topK ?: 5,
            minScore = 0.7,
          ).answer
      } else {
        null
      }

    return RagResponseDto(
      results =
        results.map { (chunk, score) ->
          RagSearchResultDto(
            document =
              RagDocumentDto(
                id = chunk.documentId,
                content = chunk.content.take(500) + if (chunk.content.length > 500) "..." else "",
                metadata = chunk.metadata,
              ),
            score = score,
            chunk =
              RagDocumentChunkDto(
                id = chunk.id,
                content = chunk.content.take(200) + if (chunk.content.length > 200) "..." else "",
                index = chunk.chunkIndex,
                metadata = chunk.metadata,
              ),
          )
        },
      answer = answer,
    )
  }

  @PostMapping("/documents")
  @Operation(summary = "Add documents to the RAG system")
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasRole('ADMIN')")
  @SecurityRequirement(name = "httpBasic", scopes = ["admin"])
  suspend fun addDocuments(
    @AuthenticationPrincipal user: KomgaUser,
    @Valid @RequestBody documents: List<@NotBlank String>,
    @RequestParam(required = false) metadata: Map<String, Any>?,
  ): List<String> = ragService.addDocuments(documents, metadata ?: emptyMap())

  @DeleteMapping("/documents/{documentId}")
  @Operation(summary = "Remove a document from the RAG system")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @PreAuthorize("hasRole('ADMIN')")
  @SecurityRequirement(name = "httpBasic", scopes = ["admin"])
  suspend fun removeDocument(
    @AuthenticationPrincipal user: KomgaUser,
    @PathVariable documentId: String,
  ) {
    ragService.removeDocuments(listOf(documentId))
  }

  @DeleteMapping("/documents")
  @Operation(summary = "Remove multiple documents from the RAG system")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @PreAuthorize("hasRole('ADMIN')")
  @SecurityRequirement(name = "httpBasic", scopes = ["admin"])
  suspend fun removeDocuments(
    @AuthenticationPrincipal user: KomgaUser,
    @RequestBody documentIds: List<String>,
  ) {
    ragService.removeDocuments(documentIds)
  }

  companion object {
    private val objectMapper = jacksonObjectMapper()
  }
}
