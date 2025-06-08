package org.gotson.komga.infrastructure.metadata.opf

import io.github.oshai.kotlinlogging.KotlinLogging
import org.apache.commons.validator.routines.ISBNValidator
import org.gotson.komga.domain.model.Author
import org.gotson.komga.domain.model.BookMetadataPatch
import org.gotson.komga.domain.model.BookMetadataPatchCapability
import org.gotson.komga.domain.model.BookWithMedia
import org.gotson.komga.domain.model.Library
import org.gotson.komga.domain.model.MediaType
import org.gotson.komga.domain.model.MetadataPatchTarget
import org.gotson.komga.domain.model.SeriesMetadataPatch
import org.gotson.komga.domain.model.Sidecar
import org.gotson.komga.infrastructure.metadata.BookMetadataProvider
import org.gotson.komga.infrastructure.metadata.SeriesMetadataFromBookProvider
import org.gotson.komga.infrastructure.sidecar.SidecarBookConsumer
import org.jsoup.Jsoup
import org.jsoup.safety.Safelist
import org.springframework.stereotype.Service
import java.io.File
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import kotlin.io.path.nameWithoutExtension

/**
 * Provider for extracting metadata from OPF files that are sidecar files for PDFs.
 * The OPF file should have the same name as the PDF file but with a .opf extension.
 * For example: mybook.pdf -> mybook.opf
 */
@Service
class OpfMetadataProvider(
  private val isbnValidator: ISBNValidator,
) : BookMetadataProvider,
  SeriesMetadataFromBookProvider,
  SidecarBookConsumer {
  private val logger = KotlinLogging.logger {}

  private val relators =
    mapOf(
      "aut" to "writer",
      "clr" to "colorist",
      "cov" to "cover",
      "edt" to "editor",
      "art" to "penciller",
      "ill" to "penciller",
      "trl" to "translator",
    )

  override val supportsAppendVolume: Boolean = false

  override val capabilities =
    setOf(
      BookMetadataPatchCapability.TITLE,
      BookMetadataPatchCapability.SUMMARY,
      BookMetadataPatchCapability.RELEASE_DATE,
      BookMetadataPatchCapability.AUTHORS,
      BookMetadataPatchCapability.ISBN,
      BookMetadataPatchCapability.NUMBER,
      BookMetadataPatchCapability.NUMBER_SORT,
    )

  override fun getBookMetadataFromBook(book: BookWithMedia): BookMetadataPatch? {
    // Only handle PDF files with OPF metadata
    if (book.media.mediaType != MediaType.PDF.type) return null

    // First try Calibre-style metadata.opf in the same directory as the PDF
    val calibreOpfFile =
      book.book.path.parent
        .resolve("metadata.opf")
        .toFile()
    if (calibreOpfFile.exists() && calibreOpfFile.isFile) {
      logger.info { "Found Calibre metadata.opf file for ${book.book.path}: ${calibreOpfFile.absolutePath}" }
      return try {
        calibreOpfFile.reader().use { reader ->
          val opf = Jsoup.parse(reader, null, "")
          parseOpfMetadata(opf)
        }
      } catch (e: Exception) {
        logger.error(e) { "Failed to parse Calibre metadata.opf file: ${calibreOpfFile.absolutePath}" }
        null
      }
    }

    // Fall back to original behavior: OPF file with same name as PDF
    val opfFile =
      File(
        book.book.path.parent
          .toFile(),
        "${book.book.path.nameWithoutExtension}.opf",
      )
    if (!opfFile.exists() || !opfFile.isFile) return null

    logger.info { "Found OPF sidecar file for ${book.book.path}: ${opfFile.absolutePath}" }

    return try {
      opfFile.reader().use { reader ->
        val opf = Jsoup.parse(reader, null, "")
        parseOpfMetadata(opf)
      }
    } catch (e: Exception) {
      logger.error(e) { "Failed to parse OPF file: ${opfFile.absolutePath}" }
      null
    }
  }

  private fun parseOpfMetadata(opf: org.jsoup.nodes.Document): BookMetadataPatch {
    // Title handling - prefer dc:title, fall back to title tag
    val title =
      opf.selectFirst("metadata > dc|title")?.text()?.ifBlank { null }
        ?: opf.selectFirst("title")?.text()?.ifBlank { null }

    // Description/Summary
    val description =
      opf
        .selectFirst("metadata > dc|description")
        ?.text()
        ?.let { Jsoup.clean(it, Safelist.none()) }
        ?.ifBlank { null }

    // Date handling - try multiple date fields
    val date =
      opf.selectFirst("metadata > dc|date")?.text()?.let { parseDate(it) }
        ?: opf.selectFirst("meta[property=dcterms:modified]")?.attr("content")?.let { parseDate(it) }
        ?: opf.selectFirst("meta[property=dcterms:created]")?.attr("content")?.let { parseDate(it) }

    // Author and contributor handling
    val authorRoles =
      opf
        .select("metadata > *|meta[property=role][scheme=marc:relators], metadata > *|meta[property=role]")
        .associate { it.attr("refines").removePrefix("#") to it.text() }

    val creators =
      opf.select("metadata > dc|creator, metadata > creator").associate {
        it.attr("id").ifBlank { null } to it
      }

    val authors =
      creators
        .mapNotNull { (id, el) ->
          val name = el.text().trim()
          if (name.isBlank()) {
            null
          } else {
            val opfRole = el.attr("opf:role").ifBlank { null }
            val refineRole = id?.let { authorRoles[it] }?.ifBlank { null }
            val role = relators[opfRole ?: refineRole] ?: "writer"
            Author(name, role)
          }
        }.takeIf { it.isNotEmpty() }

    // Handle identifiers (ISBN, etc.)
    val isbn =
      opf
        .select("metadata > dc|identifier, metadata > identifier")
        .map { it.text().trim() }
        .firstNotNullOfOrNull {
          val cleanId = it.lowercase().removePrefix("isbn:")
          isbnValidator.validate(cleanId) ?: if (cleanId.matches(Regex("^\\d+[\\dX]$"))) cleanId else null
        }

    // Series and series index handling
    val series = opf.selectFirst("metadata > *|meta[property=calibre:series]")?.text()?.ifBlank { null }
    val seriesIndex =
      opf.selectFirst("metadata > *|meta[property=calibre:series_index]")?.text()?.toFloatOrNull()
        ?: opf
          .selectFirst("metadata > *|meta[property=belongs-to-collection]")
          ?.attr("id")
          ?.let { id ->
            opf.selectFirst("metadata > *|meta[refines=#$id][property=group-position]")
          }?.text()
          ?.toFloatOrNull()

    return BookMetadataPatch(
      title = title,
      summary = description,
      releaseDate = date,
      authors = authors,
      isbn = isbn,
      series = series,
      number = seriesIndex?.toString(),
      numberSort = seriesIndex,
      // Include additional metadata from Calibre if available
      publisher = opf.selectFirst("metadata > dc|publisher")?.text()?.ifBlank { null },
      language = opf.selectFirst("metadata > dc|language")?.text()?.ifBlank { null },
      tags =
        opf
          .select("metadata > dc|subject")
          .map { it.text().trim() }
          .filter { it.isNotBlank() }
          .toSet()
          .takeIf { it.isNotEmpty() },
    )
  }

  override fun getSeriesMetadataFromBook(
    book: BookWithMedia,
    appendVolumeToTitle: Boolean,
  ): SeriesMetadataPatch? {
    // OPF sidecar files typically don't contain series metadata
    return null
  }

  override fun shouldLibraryHandlePatch(
    library: Library,
    target: MetadataPatchTarget,
  ): Boolean =
    when (target) {
      // Only handle book metadata, not series metadata
      MetadataPatchTarget.BOOK -> library.importEpubBook
      else -> false
    }

  // SidecarBookConsumer implementation
  override fun getSidecarBookType(): Sidecar.Type = Sidecar.Type.METADATA

  override fun getSidecarBookPrefilter(): List<Regex> =
    listOf(
      ".*\\.opf$".toRegex(RegexOption.IGNORE_CASE),
      "metadata\\.opf$".toRegex(RegexOption.IGNORE_CASE),
    )

  override fun isSidecarBookMatch(
    basename: String,
    sidecar: String,
  ): Boolean =
    sidecar.equals("$basename.opf", ignoreCase = true) ||
      sidecar.equals("metadata.opf", ignoreCase = true)

  private fun parseDate(date: String): LocalDate? =
    try {
      LocalDate.parse(date, DateTimeFormatter.ISO_DATE)
    } catch (e: Exception) {
      try {
        LocalDate.parse(date, DateTimeFormatter.ISO_LOCAL_DATE)
      } catch (e: Exception) {
        try {
          LocalDate.parse(date, DateTimeFormatter.ISO_DATE_TIME)
        } catch (e: Exception) {
          null
        }
      }
    }
}
