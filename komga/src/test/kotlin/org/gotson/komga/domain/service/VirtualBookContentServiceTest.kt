package org.gotson.komga.domain.service

import com.nhaarman.mockitokotlin2.any
import com.nhaarman.mockitokotlin2.verify
import com.nhaarman.mockitokotlin2.whenever
import org.assertj.core.api.Assertions.assertThat
import org.gotson.komga.domain.model.Metadata
import org.gotson.komga.domain.model.Omnibus
import org.gotson.komga.domain.model.VirtualBook
import org.gotson.komga.domain.service.VirtualBookService.VirtualBookWithOmnibus
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import java.io.File
import java.net.URL
import java.nio.file.Files
import java.time.LocalDateTime

@ExtendWith(MockitoExtension::class)
class VirtualBookContentServiceTest {
  @Mock
  private lateinit var virtualBookService: VirtualBookService

  @Mock
  private lateinit var epubExtractionService: EpubExtractionService

  private lateinit var virtualBookContentService: VirtualBookContentService

  private lateinit var testEpubFile: File

  @BeforeEach
  fun setup() {
    virtualBookContentService = VirtualBookContentService(virtualBookService, epubExtractionService)

    // Create a test EPUB file
    testEpubFile = Files.createTempFile("test-omnibus", ".epub").toFile()
    testEpubFile.writeBytes(ByteArray(1024)) // Empty file, content doesn't matter for these tests
  }

  @Test
  fun `getVirtualBookContent should extract work from omnibus`() {
    // Given
    val virtualBookId = "virtual-123"
    val virtualBook =
      VirtualBook(
        id = virtualBookId,
        title = "Test Work",
        number = 1,
        url = URL("file:/path/to/omnibus.epub#chapter1.xhtml"),
        metadata =
          Metadata(
            title = "Test Work",
            summary = "Test summary",
            language = "en",
          ),
        createdDate = LocalDateTime.now(),
        lastModifiedDate = LocalDateTime.now(),
      )

    val omnibus =
      Omnibus(
        id = "omnibus-123",
        title = "Test Omnibus",
        url = testEpubFile.toURI().toURL(),
        metadata =
          Metadata(
            title = "Test Omnibus",
            summary = "Test omnibus summary",
            language = "en",
          ),
        createdDate = LocalDateTime.now(),
        lastModifiedDate = LocalDateTime.now(),
      )

    val virtualBookWithOmnibus = VirtualBookWithOmnibus(virtualBook, omnibus)

    whenever(virtualBookService.getVirtualBookWithOmnibus(virtualBookId))
      .thenReturn(virtualBookWithOmnibus)

    val extractedFile = Files.createTempFile("extracted-work", ".epub").toFile()
    extractedFile.writeBytes(ByteArray(2048)) // Simulate extracted content

    // When
    val result = virtualBookContentService.getVirtualBookContent(virtualBookId)

    // Then
    assertThat(result).isNotNull()
    assertThat(result.exists()).isTrue()

    // Verify the extraction service was called with the correct parameters
    verify(epubExtractionService).extractWork(
      work = any(),
      omnibusFile = testEpubFile,
      outputFile = any(),
    )

    // Clean up
    extractedFile.delete()
  }

  @Test
  fun `getVirtualBookContent should use cached version if available`() {
    // Given
    val virtualBookId = "virtual-123"
    val virtualBook =
      VirtualBook(
        id = virtualBookId,
        title = "Test Work",
        number = 1,
        url = URL("file:/path/to/omnibus.epub#chapter1.xhtml"),
        metadata =
          Metadata(
            title = "Test Work",
            summary = "Test summary",
            language = "en",
          ),
        createdDate = LocalDateTime.now(),
        lastModifiedDate = LocalDateTime.now(),
      )

    val omnibus =
      Omnibus(
        id = "omnibus-123",
        title = "Test Omnibus",
        url = testEpubFile.toURI().toURL(),
        metadata =
          Metadata(
            title = "Test Omnibus",
            summary = "Test omnibus summary",
            language = "en",
          ),
        createdDate = LocalDateTime.now(),
        lastModifiedDate = LocalDateTime.now(),
      )

    val virtualBookWithOmnibus = VirtualBookWithOmnibus(virtualBook, omnibus)

    whenever(virtualBookService.getVirtualBookWithOmnibus(virtualBookId))
      .thenReturn(virtualBookWithOmnibus)

    // First call - should extract the work
    val firstResult = virtualBookContentService.getVirtualBookContent(virtualBookId)

    // Reset mock to verify it's not called again
    verify(epubExtractionService).extractWork(any(), any(), any())

    // Second call - should use cached version
    val secondResult = virtualBookContentService.getVirtualBookContent(virtualBookId)

    // Verify the extraction service was only called once
    verify(epubExtractionService).extractWork(any(), any(), any())

    // Both results should be the same file
    assertThat(firstResult.file).isEqualTo(secondResult.file)
  }

  @Test
  fun `cleanupCache should remove old cached files`() {
    // Given - create some test files in the cache directory
    val cacheDir = Files.createTempDirectory("komga-cache-test")

    // Create a new service with a custom cache directory
    val testService = VirtualBookContentService(virtualBookService, epubExtractionService)

    // Create some test files with different modification times
    val recentFile = cacheDir.resolve("recent.epub").toFile()
    recentFile.writeBytes(ByteArray(1024))
    recentFile.setLastModified(System.currentTimeMillis() - 1000 * 60 * 60) // 1 hour old

    val oldFile = cacheDir.resolve("old.epub").toFile()
    oldFile.writeBytes(ByteArray(1024))
    oldFile.setLastModified(System.currentTimeMillis() - 1000 * 60 * 60 * 25) // 25 hours old

    // When - clean up files older than 24 hours
    testService.cleanupCache(24)

    // Then - only the old file should be deleted
    assertThat(recentFile).exists()
    assertThat(oldFile).doesNotExist()

    // Clean up
    recentFile.delete()
    Files.deleteIfExists(cacheDir)
  }

  @Test
  fun `virtualBookContentExists should return true if content exists`() {
    // Given
    val virtualBookId = "virtual-123"
    val virtualBook =
      VirtualBook(
        id = virtualBookId,
        title = "Test Work",
        number = 1,
        url = URL("file:/path/to/omnibus.epub#chapter1.xhtml"),
        metadata =
          Metadata(
            title = "Test Work",
            summary = "Test summary",
            language = "en",
          ),
        createdDate = LocalDateTime.now(),
        lastModifiedDate = LocalDateTime.now(),
      )

    val omnibus =
      Omnibus(
        id = "omnibus-123",
        title = "Test Omnibus",
        url = testEpubFile.toURI().toURL(),
        metadata =
          Metadata(
            title = "Test Omnibus",
            summary = "Test omnibus summary",
            language = "en",
          ),
        createdDate = LocalDateTime.now(),
        lastModifiedDate = LocalDateTime.now(),
      )

    whenever(virtualBookService.getVirtualBookWithOmnibus(virtualBookId))
      .thenReturn(VirtualBookWithOmnibus(virtualBook, omnibus))

    // When
    val exists = virtualBookContentService.virtualBookContentExists(virtualBookId)

    // Then
    assertThat(exists).isTrue()
  }

  @Test
  fun `virtualBookContentExists should return false if omnibus file does not exist`() {
    // Given
    val virtualBookId = "virtual-123"
    val nonExistentFile = File("/path/to/nonexistent.epub")

    val virtualBook =
      VirtualBook(
        id = virtualBookId,
        title = "Test Work",
        number = 1,
        url = URL("file:/path/to/omnibus.epub#chapter1.xhtml"),
        metadata =
          Metadata(
            title = "Test Work",
            summary = "Test summary",
            language = "en",
          ),
        createdDate = LocalDateTime.now(),
        lastModifiedDate = LocalDateTime.now(),
      )

    val omnibus =
      Omnibus(
        id = "omnibus-123",
        title = "Test Omnibus",
        url = nonExistentFile.toURI().toURL(),
        metadata =
          Metadata(
            title = "Test Omnibus",
            summary = "Test omnibus summary",
            language = "en",
          ),
        createdDate = LocalDateTime.now(),
        lastModifiedDate = LocalDateTime.now(),
      )

    whenever(virtualBookService.getVirtualBookWithOmnibus(virtualBookId))
      .thenReturn(VirtualBookWithOmnibus(virtualBook, omnibus))

    // When
    val exists = virtualBookContentService.virtualBookContentExists(virtualBookId)

    // Then
    assertThat(exists).isFalse()
  }
}
