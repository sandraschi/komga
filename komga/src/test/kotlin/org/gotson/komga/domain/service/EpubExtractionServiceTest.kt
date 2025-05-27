package org.gotson.komga.domain.service

import com.nhaarman.mockitokotlin2.any
import com.nhaarman.mockitokotlin2.whenever
import nl.siegmann.epublib.domain.Resource
import nl.siegmann.epublib.epub.EpubReader
import org.assertj.core.api.Assertions.assertThat
import org.gotson.komga.infrastructure.epub.EpubContentExtractor
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.springframework.core.io.ClassPathResource
import java.io.File
import java.io.FileInputStream
import java.nio.file.Files
import nl.siegmann.epublib.domain.Book as EpubBook
import org.gotson.komga.infrastructure.epub.omnibus.Work as OmnibusWork

@ExtendWith(MockitoExtension::class)
class EpubExtractionServiceTest {
  @Mock
  private lateinit var epubContentExtractor: EpubContentExtractor

  private lateinit var epubExtractionService: EpubExtractionService
  private lateinit var testEpubFile: File
  private lateinit var testEpubBook: EpubBook

  @BeforeEach
  fun setup() {
    epubExtractionService = EpubExtractionService(epubContentExtractor)

    // Load a test EPUB file
    val epubResource = ClassPathResource("test.epub")
    testEpubFile = File.createTempFile("test", ".epub")
    testEpubFile.outputStream().use { output ->
      epubResource.inputStream.use { input ->
        input.copyTo(output)
      }
    }

    // Read the EPUB file into an EpubBook
    testEpubBook = EpubReader().readEpub(FileInputStream(testEpubFile))

    // Mock the EpubContentExtractor to return our test EpubBook
    whenever(epubContentExtractor.getEpubBook(any<File>())).thenReturn(testEpubBook)
  }

  @Test
  fun `extractWork should create a valid EPUB file`() {
    // Given
    val work =
      OmnibusWork(
        title = "Test Work",
        href = "chapter1.xhtml",
        position = 1,
        type = OmnibusWork.WorkType.GENERIC_ENTRY,
      )

    val outputFile = Files.createTempFile("extracted-work", ".epub").toFile()

    // When
    val result = epubExtractionService.extractWork(work, testEpubFile, outputFile)

    // Then
    assertThat(result).exists()
    assertThat(result.length()).isGreaterThan(0)

    // Verify the output is a valid EPUB file
    val extractedBook = EpubReader().readEpub(FileInputStream(result))
    assertThat(extractedBook).isNotNull
    assertThat(extractedBook.title).isEqualTo(work.title)

    // Clean up
    result.delete()
  }

  @Test
  fun `extractWork should include all referenced resources`() {
    // Given
    // Create a mock resource with references to other resources
    val htmlContent =
      """
      <!DOCTYPE html>
      <html>
      <head>
          <title>Test Chapter</title>
          <link rel="stylesheet" href="styles.css" />
      </head>
      <body>
          <h1>Test Chapter</h1>
          <img src="images/test.jpg" alt="Test Image" />
          <p>This is a test chapter.</p>
      </body>
      </html>
      """.trimIndent()

    val htmlResource = Resource(htmlContent.toByteArray(Charsets.UTF_8), "chapter1.xhtml")
    val cssResource = Resource("body { color: black; }".toByteArray(Charsets.UTF_8), "styles.css")
    val imageResource = Resource(ByteArray(100), "images/test.jpg")

    // Create a mock EpubBook with these resources
    val mockEpubBook = EpubBook()
    mockEpubBook.resources.add(htmlResource)
    mockEpubBook.resources.add(cssResource)
    mockEpubBook.resources.add(imageResource)

    whenever(epubContentExtractor.getEpubBook(any<File>())).thenReturn(mockEpubBook)

    val work =
      OmnibusWork(
        title = "Test Work with Resources",
        href = "chapter1.xhtml",
        position = 1,
        type = OmnibusWork.WorkType.GENERIC_ENTRY,
      )

    val outputFile = Files.createTempFile("extracted-work-resources", ".epub").toFile()

    // When
    val result = epubExtractionService.extractWork(work, testEpubFile, outputFile)

    // Then
    assertThat(result).exists()

    // Verify the extracted EPUB contains all the resources
    val extractedBook = EpubReader().readEpub(FileInputStream(result))
    assertThat(extractedBook.resources.getByIdOrHref("chapter1.xhtml")).isNotNull
    assertThat(extractedBook.resources.getByIdOrHref("styles.css")).isNotNull
    assertThat(extractedBook.resources.getByIdOrHref("images/test.jpg")).isNotNull

    // Clean up
    result.delete()
  }

  @Test
  fun `findReferencedResources should find all resources referenced in HTML`() {
    // Given
    val htmlContent =
      """
      <!DOCTYPE html>
      <html>
      <head>
          <title>Test Chapter</title>
          <link rel="stylesheet" href="styles.css" />
          <style>
              @import url('imported.css');
              body { background-image: url('bg.jpg'); }
          </style>
      </head>
      <body>
          <h1>Test Chapter</h1>
          <img src="images/test.jpg" alt="Test Image" />
          <img data-src="lazy.jpg" class="lazy" />
          <div style="background-image: url('div-bg.jpg')">
              <p>This is a test chapter.</p>
          </div>
      </body>
      </html>
      """.trimIndent()

    val resource = Resource(htmlContent.toByteArray(Charsets.UTF_8), "chapter1.xhtml")

    // Create a mock EpubBook with some resources
    val mockEpubBook = EpubBook()
    mockEpubBook.resources.add(Resource("body {}".toByteArray(Charsets.UTF_8), "styles.css"))
    mockEpubBook.resources.add(Resource("@import url('nested.css');".toByteArray(Charsets.UTF_8), "imported.css"))
    mockEpubBook.resources.add(Resource("div {}".toByteArray(Charsets.UTF_8), "nested.css"))
    mockEpubBook.resources.add(Resource(ByteArray(100), "bg.jpg"))
    mockEpubBook.resources.add(Resource(ByteArray(100), "images/test.jpg"))
    mockEpubBook.resources.add(Resource(ByteArray(100), "lazy.jpg"))
    mockEpubBook.resources.add(Resource(ByteArray(100), "div-bg.jpg"))

    // When
    val referencedResources = epubExtractionService.findReferencedResources(resource, mockEpubBook, testEpubFile)

    // Then
    val referencedHrefs = referencedResources.map { it.href }.toSet()
    assertThat(referencedHrefs).containsExactlyInAnyOrder(
      "styles.css",
      "imported.css",
      "nested.css",
      "bg.jpg",
      "images/test.jpg",
      "lazy.jpg",
      "div-bg.jpg",
    )
  }
}
