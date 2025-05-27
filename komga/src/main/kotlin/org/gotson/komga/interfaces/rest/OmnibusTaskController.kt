package org.gotson.komga.interfaces.rest

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import mu.KotlinLogging
import org.gotson.komga.application.task.OmnibusProcessingTask
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

private val logger = KotlinLogging.logger {}

/**
 * REST controller for managing omnibus processing tasks.
 */
@RestController
@RequestMapping("api/v1/tasks/omnibus", produces = [MediaType.APPLICATION_JSON_VALUE])
class OmnibusTaskController(
  private val omnibusProcessingTask: OmnibusProcessingTask,
) {
  /**
   * Trigger processing of all books to detect omnibus editions.
   * This is a long-running task that should be run asynchronously.
   */
  @PostMapping("/process-all")
  suspend fun processAllBooks(): ResponseEntity<Map<String, String>> =
    withContext(Dispatchers.IO) {
      logger.info { "Received request to process all books for omnibus detection" }

      try {
        // Start processing in the background
        omnibusProcessingTask.processAllBooks()

        ResponseEntity.accepted().body(
          mapOf(
            "status" to "accepted",
            "message" to "Omnibus detection task started. Check server logs for progress.",
          ),
        )
      } catch (e: Exception) {
        logger.error(e) { "Error starting omnibus processing task" }
        ResponseEntity.internalServerError().body(
          mapOf(
            "status" to "error",
            "message" to "Failed to start omnibus detection task: ${e.message}",
          ),
        )
      }
    }
}
