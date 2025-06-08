package org.gotson.komga.infrastructure.llm.rag.service

/**
 * Represents the status of a document in the processing pipeline.
 */
enum class DocumentProcessingStatus {
  /** Document is queued for processing but not yet started */
  PENDING,

  /** Document is currently being processed */
  PROCESSING,

  /** Document has been successfully processed and is ready for querying */
  COMPLETED,

  /** Document processing failed with an error */
  FAILED,

  /** Document is marked for deletion */
  DELETING,

  /** Document has been deleted */
  DELETED,
}
