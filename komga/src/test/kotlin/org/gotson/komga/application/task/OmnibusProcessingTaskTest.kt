package org.gotson.komga.application.task

import com.nhaarman.mockitokotlin2.any
import com.nhaarman.mockitokotlin2.doReturn
import com.nhaarman.mockitokotlin2.mock
import com.nhaarman.mockitokotlin2.never
import com.nhaarman.mockitokotlin2.verify
import com.nhaarman.mockitokotlin2.whenever
import kotlinx.coroutines.runBlocking
import org.gotson.komga.TestData
import org.gotson.komga.domain.model.Book
import org.gotson.komga.domain.model.OmnibusType
import org.gotson.komga.domain.persistence.BookRepository
import org.gotson.komga.domain.service.BookAnalyzer
import org.gotson.komga.domain.service.VirtualBookService
import org.gotson.komga.infrastructure.epub.omnibus.OmnibusService
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.springframework.test.util.ReflectionTestUtils
import java.time.LocalDateTime

@ExtendWith(MockitoExtension::class)
class OmnibusProcessingTaskTest {
  @Mock
  private lateinit var omnibusService: OmnibusService

  @Mock
  private lateinit var bookAnalyzer: BookAnalyzer

  @Mock
  private lateinit var virtualBookService: VirtualBookService

  private lateinit var omnibusProcessingTask: OmnibusProcessingTask

  @BeforeEach
  fun setup() {
    omnibusProcessingTask =
      OmnibusProcessingTask(
        omnibusService = omnibusService,
        bookAnalyzer = bookAnalyzer,
        virtualBookService = virtualBookService,
      )
  }

  @Test
  fun `processBook should process EPUB books`() {
    // Given
    val book =
      Book(
        id = "book-123",
        name = "Test Book.epub",
        url = TestData.file("test.epub").toURI().toURL(),
        fileLastModified = LocalDateTime.now(),
        fileSize = 1024,
        media = Book.Media("application/epub+zip", 10, 800, 1200, "#000000"),
        createdDate = LocalDateTime.now(),
        lastModifiedDate = LocalDateTime.now(),
      )

    whenever(omnibusService.processBook(book)).thenReturn(OmnibusType.DELPHI_CLASSICS)

    // When
    omnibusProcessingTask.processBook(book)

    // Then
    verify(omnibusService).processBook(book)
    verify(bookAnalyzer).analyze(book)
  }

  @Test
  fun `processBook should skip non-EPUB books`() {
    // Given
    val book =
      Book(
        id = "book-123",
        name = "Test Book.pdf",
        url = TestData.file("test.pdf").toURI().toURL(),
        fileLastModified = LocalDateTime.now(),
        fileSize = 1024,
        media = Book.Media("application/pdf", 1, 800, 1200, "#000000"),
        createdDate = LocalDateTime.now(),
        lastModifiedDate = LocalDateTime.now(),
      )

    // When
    omnibusProcessingTask.processBook(book)

    // Then
    verify(omnibusService, never()).processBook(any())
    verify(bookAnalyzer, never()).analyze(any())
  }

  @Test
  fun `processBook should handle processing errors gracefully`() {
    // Given
    val book =
      Book(
        id = "book-123",
        name = "Test Book.epub",
        url = TestData.file("test.epub").toURI().toURL(),
        fileLastModified = LocalDateTime.now(),
        fileSize = 1024,
        media = Book.Media("application/epub+zip", 10, 800, 1200, "#000000"),
        createdDate = LocalDateTime.now(),
        lastModifiedDate = LocalDateTime.now(),
      )

    val error = RuntimeException("Processing failed")
    whenever(omnibusService.processBook(book)).thenThrow(error)

    // When
    omnibusProcessingTask.processBook(book)

    // Then - should not throw, just log the error
    verify(omnibusService).processBook(book)
    verify(bookAnalyzer, never()).analyze(any())
  }

  @Test
  fun `processAllBooks should process all books in the library`() =
    runBlocking {
      // Given
      val book1 =
        Book(
          id = "book-1",
          name = "Book 1.epub",
          url = TestData.file("book1.epub").toURI().toURL(),
          fileLastModified = LocalDateTime.now(),
          fileSize = 1024,
          media = Book.Media("application/epub+zip", 10, 800, 1200, "#000000"),
          createdDate = LocalDateTime.now(),
          lastModifiedDate = LocalDateTime.now(),
        )

      val book2 =
        Book(
          id = "book-2",
          name = "Book 2.epub",
          url = TestData.file("book2.epub").toURI().toURL(),
          fileLastModified = LocalDateTime.now(),
          fileSize = 2048,
          media = Book.Media("application/epub+zip", 20, 800, 1200, "#000000"),
          createdDate = LocalDateTime.now(),
          lastModifiedDate = LocalDateTime.now(),
        )

      // Mock the repository to return our test books
      val bookRepository =
        mock<BookRepository> {
          on { findAll() } doReturn listOf(book1, book2)
        }

      // Replace the book repository in the task with our mock
      ReflectionTestUtils.setField(omnibusProcessingTask, "bookRepository", bookRepository)

      // When
      omnibusProcessingTask.processAllBooks()

      // Then - both books should be processed
      verify(omnibusService).processBook(book1)
      verify(omnibusService).processBook(book2)
      verify(bookAnalyzer).analyze(book1)
      verify(bookAnalyzer).analyze(book2)
    }

  @Test
  fun `processAllBooks should handle processing errors for individual books`() =
    runBlocking {
      // Given
      val book1 =
        Book(
          id = "book-1",
          name = "Book 1.epub",
          url = TestData.file("book1.epub").toURI().toURL(),
          fileLastModified = LocalDateTime.now(),
          fileSize = 1024,
          media = Book.Media("application/epub+zip", 10, 800, 1200, "#000000"),
          createdDate = LocalDateTime.now(),
          lastModifiedDate = LocalDateTime.now(),
        )

      val book2 =
        Book(
          id = "book-2",
          name = "Book 2.epub",
          url = TestData.file("book2.epub").toURI().toURL(),
          fileLastModified = LocalDateTime.now(),
          fileSize = 2048,
          media = Book.Media("application/epub+zip", 20, 800, 1200, "#000000"),
          createdDate = LocalDateTime.now(),
          lastModifiedDate = LocalDateTime.now(),
        )

      // Mock the repository to return our test books
      val bookRepository =
        mock<BookRepository> {
          on { findAll() } doReturn listOf(book1, book2)
        }

      // Replace the book repository in the task with our mock
      ReflectionTestUtils.setField(omnibusProcessingTask, "bookRepository", bookRepository)

      // Make processing fail for book1 but succeed for book2
      whenever(omnibusService.processBook(book1)).thenThrow(RuntimeException("Processing failed"))
      whenever(omnibusService.processBook(book2)).thenReturn(OmnibusType.DELPHI_CLASSICS)

      // When
      omnibusProcessingTask.processAllBooks()

      // Then - both books should be processed, but only book2 should be analyzed
      verify(omnibusService).processBook(book1)
      verify(omnibusService).processBook(book2)
      verify(bookAnalyzer, never()).analyze(book1) // Not analyzed due to error
      verify(bookAnalyzer).analyze(book2) // Analyzed successfully
    }
}
