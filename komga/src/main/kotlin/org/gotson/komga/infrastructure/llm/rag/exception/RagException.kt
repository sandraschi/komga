package org.gotson.komga.infrastructure.llm.rag.exception

/**
 * Base exception for all RAG-related errors.
 */
open class RagException(
  message: String,
  cause: Throwable? = null,
) : RuntimeException(message, cause)

/**
 * Thrown when a document is not found.
 */
class DocumentNotFoundException(
  documentId: String,
  cause: Throwable? = null,
) : RagException("Document not found: $documentId", cause)

/**
 * Thrown when a job is not found.
 */
class JobNotFoundException(
  jobId: String,
  cause: Throwable? = null,
) : RagException("Job not found: $jobId", cause)

/**
 * Thrown when a job is in an invalid state for the requested operation.
 */
class InvalidJobStateException(
  jobId: String,
  state: String,
  expectedStates: List<String>? = null,
  cause: Throwable? = null,
) : RagException(
    "Job $jobId is in state $state but expected ${
      expectedStates?.joinToString(" or ") ?: "a different state"
    }",
    cause,
  )

/**
 * Thrown when a document processing error occurs.
 */
class DocumentProcessingException(
  message: String,
  cause: Throwable? = null,
) : RagException(message, cause)

/**
 * Thrown when an embedding generation error occurs.
 */
class EmbeddingGenerationException(
  message: String,
  cause: Throwable? = null,
) : RagException(message, cause)

/**
 * Thrown when a search error occurs.
 */
class SearchException(
  message: String,
  cause: Throwable? = null,
) : RagException(message, cause)

/**
 * Thrown when an answer generation error occurs.
 */
class AnswerGenerationException(
  message: String,
  cause: Throwable? = null,
) : RagException(message, cause)

/**
 * Thrown when a storage error occurs.
 */
class StorageException(
  message: String,
  cause: Throwable? = null,
) : RagException(message, cause)

/**
 * Thrown when a configuration error is detected.
 */
class ConfigurationException(
  message: String,
  cause: Throwable? = null,
) : RagException(message, cause)
