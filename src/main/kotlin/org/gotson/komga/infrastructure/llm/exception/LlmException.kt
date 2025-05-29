package org.gotson.komga.infrastructure.llm.exception

/**
 * Base exception class for all LLM-related exceptions.
 *
 * @property message the detail message
 * @property cause the cause of the exception
 */
open class LlmException(
  message: String? = null,
  cause: Throwable? = null,
) : RuntimeException(message, cause)

/**
 * Exception thrown when there is an issue with LLM configuration.
 */
class LlmConfigurationException(
  message: String? = null,
  cause: Throwable? = null,
) : LlmException(message, cause)

/**
 * Exception thrown when there is an error during LLM processing.
 */
class LlmProcessingException(
  message: String? = null,
  cause: Throwable? = null,
) : LlmException(message, cause)
