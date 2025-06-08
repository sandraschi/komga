package org.gotson.komga.infrastructure.llm.exception

import mu.KotlinLogging
import org.gotson.komga.interfaces.rest.dto.ErrorResponse
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.context.request.WebRequest
import java.time.LocalDateTime

private val logger = KotlinLogging.logger {}

/**
 * Global exception handler for LLM-related exceptions.
 *
 * This handler catches LLM exceptions and converts them into appropriate HTTP responses.
 */
@RestControllerAdvice
class LlmExceptionHandler {
  /**
   * Handles LlmException and returns an appropriate HTTP response.
   *
   * @param ex The exception that was thrown
   * @param request The current web request
   * @return A ResponseEntity containing the error details
   */
  @ExceptionHandler(LlmException::class)
  fun handleLlmException(
    ex: LlmException,
    request: WebRequest,
  ): ResponseEntity<ErrorResponse> {
    val status =
      when (ex.errorType) {
        LlmException.ErrorType.CONFIGURATION_ERROR -> HttpStatus.BAD_REQUEST
        LlmException.ErrorType.PROVIDER_NOT_AVAILABLE -> HttpStatus.SERVICE_UNAVAILABLE
        LlmException.ErrorType.QUOTA_EXCEEDED -> HttpStatus.TOO_MANY_REQUESTS
        LlmException.ErrorType.AUTHENTICATION_ERROR -> HttpStatus.UNAUTHORIZED
        LlmException.ErrorType.INVALID_REQUEST -> HttpStatus.BAD_REQUEST
        LlmException.ErrorType.RATE_LIMIT_EXCEEDED -> HttpStatus.TOO_MANY_REQUESTS
        LlmException.ErrorType.MODEL_NOT_FOUND -> HttpStatus.NOT_FOUND
        LlmException.ErrorType.PROCESSING_ERROR -> HttpStatus.INTERNAL_SERVER_ERROR
        LlmException.ErrorType.TIMEOUT -> HttpStatus.REQUEST_TIMEOUT
        LlmException.ErrorType.UNKNOWN -> HttpStatus.INTERNAL_SERVER_ERROR
      }

    logger.error(ex) { "LLM error: ${ex.message}" }

    val errorResponse =
      ErrorResponse(
        timestamp = LocalDateTime.now(),
        status = status.value(),
        error = status.reasonPhrase,
        message = ex.message ?: "An unknown error occurred",
        path = request.getDescription(false).substring(4), // Remove "uri=" prefix
        errorCode = ex.errorType.name,
        details = ex.details,
      )

    return ResponseEntity.status(status).body(errorResponse)
  }

  /**
   * Handles any other uncaught exceptions and returns a 500 Internal Server Error.
   *
   * @param ex The exception that was thrown
   * @param request The current web request
   * @return A ResponseEntity containing the error details
   */
  @ExceptionHandler(Exception::class)
  fun handleAllExceptions(
    ex: Exception,
    request: WebRequest,
  ): ResponseEntity<ErrorResponse> {
    logger.error(ex) { "Unhandled exception: ${ex.message}" }

    val status = HttpStatus.INTERNAL_SERVER_ERROR
    val errorResponse =
      ErrorResponse(
        timestamp = LocalDateTime.now(),
        status = status.value(),
        error = status.reasonPhrase,
        message = "An unexpected error occurred: ${ex.message}",
        path = request.getDescription(false).substring(4), // Remove "uri=" prefix
        errorCode = "INTERNAL_SERVER_ERROR",
      )

    return ResponseEntity.status(status).body(errorResponse)
  }
}
