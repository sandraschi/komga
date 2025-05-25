package org.gotson.komga.application.task

import mu.KotlinLogging
import org.gotson.komga.domain.service.VirtualBookContentService
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import java.time.Duration

private val logger = KotlinLogging.logger {}

/**
 * Scheduled task for cleaning up old cached files.
 */
@Component
class CacheCleanupTask(
    private val virtualBookContentService: VirtualBookContentService
) {
    
    /**
     * Clean up old cached files every 6 hours.
     * Files older than 24 hours will be deleted.
     */
    @Scheduled(fixedRate = 6 * 60 * 60 * 1000) // 6 hours
    fun cleanupOldCachedFiles() {
        try {
            logger.info { "Starting cache cleanup task" }
            
            val startTime = System.currentTimeMillis()
            
            // Clean up files older than 24 hours
            virtualBookContentService.cleanupCache(24)
            
            val duration = Duration.ofMillis(System.currentTimeMillis() - startTime)
            logger.info { "Cache cleanup completed in ${duration.seconds} seconds" }
            
        } catch (e: Exception) {
            logger.error(e) { "Error during cache cleanup" }
        }
    }
}
