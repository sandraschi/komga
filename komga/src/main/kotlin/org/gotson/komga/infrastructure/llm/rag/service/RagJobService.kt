package org.gotson.komga.infrastructure.llm.rag.service

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.gotson.komga.infrastructure.llm.rag.model.JobStatus
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Async
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import java.io.InputStream
import java.time.Duration
import java.time.Instant
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

/**
 * Service for managing background jobs in the RAG system.
 * Handles job tracking, status updates, and cleanup of completed jobs.
 */
@Service
class RagJobService(
  private val ragDocumentProcessor: RagDocumentProcessor,
) {
  private val logger = LoggerFactory.getLogger(javaClass)

  // In-memory storage for job status (in a real app, this would be a database)
  private val jobs = ConcurrentHashMap<String, JobStatus>()

  // Maximum time to keep completed/failed jobs before cleanup (1 hour)
  private val maxJobRetention = Duration.ofHours(1)

  /**
   * Processes a document asynchronously and tracks its progress.
   *
   * @param inputStream The input stream of the document
   * @param fileName The original file name
   * @param contentType The MIME type of the document
   * @param collectionName The name of the collection to add the document to
   * @param metadata Optional metadata to associate with the document
   * @return The ID of the created job
   */
  @Async
  suspend fun processDocument(
    inputStream: InputStream,
    fileName: String,
    contentType: String,
    collectionName: String = "default",
    metadata: Map<String, String> = emptyMap(),
  ): String =
    withContext(Dispatchers.IO) {
      val jobId = UUID.randomUUID().toString()
      val jobStatus =
        JobStatus(
          jobId = jobId,
          status = JobStatus.STATUS_PROCESSING,
          startedAt = Instant.now(),
        )

      jobs[jobId] = jobStatus

      try {
        // Start processing the document in a separate coroutine
        val documentId =
          ragDocumentProcessor.processDocument(
            inputStream = inputStream,
            fileName = fileName,
            contentType = contentType,
            collectionName = collectionName,
            metadata = metadata,
          )

        // Update job status to completed
        jobs[jobId] =
          jobStatus.copy(
            status = JobStatus.STATUS_COMPLETED,
            documentId = documentId,
            progress = 100,
            completedAt = Instant.now(),
          )

        jobId
      } catch (e: Exception) {
        // Update job status to failed
        jobs[jobId] =
          jobStatus.copy(
            status = JobStatus.STATUS_FAILED,
            error = e.message ?: "Unknown error",
            completedAt = Instant.now(),
          )

        // Re-throw the exception to be handled by the controller
        throw e
      }
    }

  /**
   * Gets the status of a job.
   *
   * @param jobId The ID of the job to check
   * @return The current job status, or null if the job doesn't exist
   */
  fun getJobStatus(jobId: String): JobStatus? = jobs[jobId]

  /**
   * Cancels a running job.
   *
   * @param jobId The ID of the job to cancel
   * @return true if the job was found and cancelled, false otherwise
   */
  fun cancelJob(jobId: String): Boolean {
    val job = jobs[jobId] ?: return false

    if (job.status == JobStatus.STATUS_PROCESSING) {
      // In a real implementation, we would cancel the underlying coroutine
      jobs[jobId] =
        job.copy(
          status = JobStatus.STATUS_CANCELLED,
          completedAt = Instant.now(),
        )
      return true
    }

    return false
  }

  /**
   * Gets statistics about the job service.
   *
   * @return A map of statistics
   */
  fun getStats(): Map<String, Any> {
    val now = Instant.now()
    val jobCounts = jobs.values.groupingBy { it.status }.eachCount()

    return mapOf(
      "totalJobs" to jobs.size,
      "jobsByStatus" to jobCounts,
      "oldestJob" to
        jobs.values
          .minByOrNull { it.startedAt ?: now }
          ?.startedAt
          ?.toString(),
      "newestJob" to
        jobs.values
          .maxByOrNull { it.startedAt ?: now }
          ?.startedAt
          ?.toString(),
    )
  }

  /**
   * Cleans up old completed/failed jobs.
   * This runs periodically to prevent memory leaks.
   */
  @Scheduled(fixedDelay = 5 * 60 * 1000) // Run every 5 minutes
  fun cleanupOldJobs() {
    val now = Instant.now()
    val oldJobIds =
      jobs.entries
        .filter { (_, status) ->
          (
            status.status == JobStatus.STATUS_COMPLETED ||
              status.status == JobStatus.STATUS_FAILED ||
              status.status == JobStatus.STATUS_CANCELLED
          ) &&
            status.completedAt?.let { now.minus(maxJobRetention).isAfter(it) } ?: false
        }.map { it.key }
        .toSet()

    if (oldJobIds.isNotEmpty()) {
      logger.debug("Cleaning up ${oldJobIds.size} old jobs")
      oldJobIds.forEach { jobs.remove(it) }
    }
  }
}
