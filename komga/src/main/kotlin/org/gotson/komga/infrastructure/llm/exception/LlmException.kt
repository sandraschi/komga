package org.gotson.komga.infrastructure.llm.exception

/**
 * Exception thrown when an error occurs in the LLM service.
 *
 * @property message The detail message
 * @property cause The cause of the exception
 * @property retryable Whether the operation can be retried
 * @property errorType The type of error that occurred
 */
class LlmException(
    message: String,
    cause: Throwable? = null,
    val retryable: Boolean = false,
    val errorType: ErrorType = ErrorType.UNKNOWN
) : RuntimeException(message, cause) {
    
    /**
     * Types of errors that can occur in the LLM service.
     */
    enum class ErrorType {
        /** An unknown error occurred. */
        UNKNOWN,
        
        /** The model was not found. */
        MODEL_NOT_FOUND,
        
        /** The request was invalid. */
        INVALID_REQUEST,
        
        /** The request was not authorized. */
        UNAUTHORIZED,
        
        /** The request was rate limited. */
        RATE_LIMIT,
        
        /** The server encountered an error. */
        SERVER_ERROR,
        
        /** The service is currently unavailable. */
        SERVICE_UNAVAILABLE,
        
        /** The request timed out. */
        TIMEOUT
    }
    
    companion object {
        /**
         * Creates a new [LlmException] from an HTTP status code.
         *
         * @param statusCode The HTTP status code
         * @param message The error message
         * @param cause The cause of the exception
         * @return A new [LlmException]
         */
        fun fromStatusCode(
            statusCode: Int,
            message: String,
            cause: Throwable? = null
        ): LlmException {
            val (errorType, retryable) = when (statusCode) {
                in 400..499 -> when (statusCode) {
                    401 -> ErrorType.UNAUTHORIZED to false
                    403 -> ErrorType.UNAUTHORIZED to false
                    404 -> ErrorType.MODEL_NOT_FOUND to false
                    422 -> ErrorType.INVALID_REQUEST to false
                    429 -> ErrorType.RATE_LIMIT to true
                    else -> ErrorType.INVALID_REQUEST to false
                }
                in 500..599 -> when (statusCode) {
                    503 -> ErrorType.SERVICE_UNAVAILABLE to true
                    504 -> ErrorType.TIMEOUT to true
                    else -> ErrorType.SERVER_ERROR to true
                }
                else -> ErrorType.UNKNOWN to false
            }
            return LlmException(message, cause, retryable, errorType)
        }
        
        /**
         * Creates a new [LlmException] from an exception.
         */
        fun fromException(e: Exception): LlmException {
            return when (e) {
                is LlmException -> e
                else -> LlmException("LLM operation failed: ${e.message}", e)
            }
        }
    }
}
