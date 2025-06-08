package org.gotson.komga.infrastructure.job

/**
 * Interface for emitting tasks to be processed asynchronously
 */
interface TaskEmitter {
  /**
   * Emit a task to generate a meta book
   * @param metaBookId ID of the meta book to generate
   */
  fun emitMetaBookGeneration(metaBookId: String)
}

/**
 * Default implementation of TaskEmitter that processes tasks immediately
 */
@Component
class DefaultTaskEmitter(
  private val jobProcessor: JobProcessor,
) : TaskEmitter {
  override fun emitMetaBookGeneration(metaBookId: String) {
    jobProcessor.processMetaBookGeneration(metaBookId)
  }
}
