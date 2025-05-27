package org.gotson.komga.infrastructure.epub.omnibus

import org.gotson.komga.application.service.VirtualBookLifecycle
import org.gotson.komga.domain.service.BookAnalyzer
import org.gotson.komga.infrastructure.epub.EpubContentExtractor
import org.gotson.komga.infrastructure.metadata.epub.EpubMetadataProvider
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

/**
 * Configuration for omnibus-related components.
 */
@Configuration
class OmnibusConfiguration {
  @Bean
  fun omnibusDetector(
    epubContentExtractor: EpubContentExtractor,
    metadataService: OmnibusMetadataService
  ): OmnibusDetector = OmnibusDetectorImpl(epubContentExtractor, metadataService)

  @Bean
  fun omnibusMetadataService(): OmnibusMetadataService = OmnibusMetadataService()

  @Bean
  fun epubTocParser(epubContentExtractor: EpubContentExtractor): EpubTocParser {
    return EpubTocParser(epubContentExtractor)
  }

  @Bean
  fun omnibusProcessor(
    epubTocParser: EpubTocParser,
    virtualBookService: VirtualBookLifecycle,
    metadataService: OmnibusMetadataService,
  ): OmnibusProcessor = OmnibusProcessor(epubTocParser, virtualBookService, metadataService)

  @Bean
  fun omnibusService(
    omnibusDetector: OmnibusDetector,
    bookAnalyzer: BookAnalyzer,
    epubMetadataProvider: EpubMetadataProvider,
    omnibusProcessor: OmnibusProcessor,
    virtualBookService: VirtualBookLifecycle,
  ) = OmnibusService(
    omnibusDetector = omnibusDetector,
    bookAnalyzer = bookAnalyzer,
    epubMetadataProvider = epubMetadataProvider,
    omnibusProcessor = omnibusProcessor,
    virtualBookService = virtualBookService,
  )
}
