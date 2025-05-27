package org.gotson.komga.application.task

import com.nhaarman.mockitokotlin2.any
import com.nhaarman.mockitokotlin2.verify
import org.gotson.komga.domain.service.VirtualBookContentService
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension

@ExtendWith(MockitoExtension::class)
class CacheCleanupTaskTest {
  @Mock
  private lateinit var virtualBookContentService: VirtualBookContentService

  @InjectMocks
  private lateinit var cacheCleanupTask: CacheCleanupTask

  @Test
  fun `cleanupOldCachedFiles should call service with default max age`() {
    // When
    cacheCleanupTask.cleanupOldCachedFiles()

    // Then - should use default 24 hours
    verify(virtualBookContentService).cleanupCache(24)
  }

  @Test
  fun `cleanupOldCachedFiles should handle errors gracefully`() {
    // Given
    val error = RuntimeException("Cleanup failed")
    doThrow(error).whenever(virtualBookContentService).cleanupCache(any())

    // When - should not throw
    cacheCleanupTask.cleanupOldCachedFiles()

    // Then - should still call the service
    verify(virtualBookContentService).cleanupCache(24)
  }
}
