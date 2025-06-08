package org.gotson.komga.infrastructure.llm.rag.controller

import org.gotson.komga.infrastructure.llm.rag.exception.AnswerGenerationException
import org.gotson.komga.infrastructure.llm.rag.exception.ConfigurationException
import org.gotson.komga.infrastructure.llm.rag.exception.DocumentNotFoundException
import org.gotson.komga.infrastructure.llm.rag.exception.DocumentProcessingException
import org.gotson.komga.infrastructure.llm.rag.exception.EmbeddingGenerationException
import org.gotson.komga.infrastructure.llm.rag.exception.InvalidJobStateException
import org.gotson.komga.infrastructure.llm.rag.exception.JobNotFoundException
import org.gotson.komga.infrastructure.llm.rag.exception.RagException
import org.gotson.komga.infrastructure.llm.rag.exception.SearchException
import org.gotson.komga.infrastructure.llm.rag.exception.StorageException
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.context.request.WebRequest
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler
import java.time.Instant

/**
 * Global exception handler for RAG-related exceptions.
 */
@RestControllerAdvice(basePackages = ["org.gotson.komga.infrastructure.llm.rag.controller"])
class RagControllerAdvice : ResponseEntityExceptionHandler() {
  /**
   * Error response data class.
   */
  data class ErrorResponse(
    val timestamp: Instant = Instant.now(),
    val status: Int,
    val error: String,
    val message: String,
    val path: String = "",
  )

  @ExceptionHandler(DocumentNotFoundException::class)
  fun handleDocumentNotFoundException(
    ex: DocumentNotFoundException,
    request: WebRequest,
  ): ResponseEntity<ErrorResponse> =
    ResponseEntity
      .status(HttpStatus.NOT_FOUND)
      .body(createErrorResponse(HttpStatus.NOT_FOUND, ex, request))

  @ExceptionHandler(JobNotFoundException::class)
  fun handleJobNotFoundException(
    ex: JobNotFoundException,
    request: WebRequest,
  ): ResponseEntity<ErrorResponse> =
    ResponseEntity
      .status(HttpStatus.NOT_FOUND)
      .body(createErrorResponse(HttpStatus.NOT_FOUND, ex, request))

  @ExceptionHandler(InvalidJobStateException::class)
  fun handleInvalidJobStateException(
    ex: InvalidJobStateException,
    request: WebRequest,
  ): ResponseEntity<ErrorResponse> =
    ResponseEntity
      .status(HttpStatus.CONFLICT)
      .body(createErrorResponse(HttpStatus.CONFLICT, ex, request))

  @ExceptionHandler(DocumentProcessingException::class)
  fun handleDocumentProcessingException(
    ex: DocumentProcessingException,
    request: WebRequest,
  ): ResponseEntity<ErrorResponse> =
    ResponseEntity
      .status(HttpStatus.UNPROCESSABLE_ENTITY)
      .body(createErrorResponse(HttpStatus.UNPROCESSABLE_ENTITY, ex, request))

  @ExceptionHandler(EmbeddingGenerationException::class)
  fun handleEmbeddingGenerationException(
    ex: EmbeddingGenerationException,
    request: WebRequest,
  ): ResponseEntity<ErrorResponse> =
    ResponseEntity
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .body(createErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, ex, request))

  @ExceptionHandler(SearchException::class)
  fun handleSearchException(
    ex: SearchException,
    request: WebRequest,
  ): ResponseEntity<ErrorResponse> =
    ResponseEntity
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .body(createErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, ex, request))

  @ExceptionHandler(AnswerGenerationException::class)
  fun handleAnswerGenerationException(
    ex: AnswerGenerationException,
    request: WebRequest,
  ): ResponseEntity<ErrorResponse> =
    ResponseEntity
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .body(createErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, ex, request))

  @ExceptionHandler(StorageException::class)
  fun handleStorageException(
    ex: StorageException,
    request: WebRequest,
  ): ResponseEntity<ErrorResponse> =
    ResponseEntity
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .body(createErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, ex, request))

  @ExceptionHandler(ConfigurationException::class)
  fun handleConfigurationException(
    ex: ConfigurationException,
    request: WebRequest,
  ): ResponseEntity<ErrorResponse> =
    ResponseEntity
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .body(createErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, ex, request))

  @ExceptionHandler(RagException::class)
  fun handleRagException(
    ex: RagException,
    request: WebRequest,
  ): ResponseEntity<ErrorResponse> =
    ResponseEntity
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .body(createErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, ex, request))

  private fun createErrorResponse(
    status: HttpStatus,
    ex: Exception,
    request: WebRequest,
  ): ErrorResponse =
    ErrorResponse(
      status = status.value(),
      error = status.reasonPhrase,
      message = ex.message ?: "An unexpected error occurred",
      path = request.getDescription(false).removePrefix("uri="),
    )
}
