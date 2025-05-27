package org.gotson.komga.infrastructure.configuration

import org.gotson.komga.application.service.VirtualBookLifecycle
import org.gotson.komga.application.task.CacheCleanupTask
import org.gotson.komga.application.task.OmnibusProcessingTask
import org.gotson.komga.domain.persistence.BookRepository
import org.gotson.komga.domain.persistence.VirtualBookRepository
import org.gotson.komga.domain.service.BookAnalyzer
import org.gotson.komga.domain.service.EpubExtractionService
import org.gotson.komga.domain.service.VirtualBookContentService
import org.gotson.komga.domain.service.VirtualBookService
import org.gotson.komga.infrastructure.epub.EpubContentExtractor
import org.gotson.komga.infrastructure.epub.omnibus.EpubTocParser
import org.gotson.komga.infrastructure.epub.omnibus.OmnibusDetector
import org.gotson.komga.infrastructure.epub.omnibus.OmnibusDetectorImpl
import org.gotson.komga.infrastructure.epub.omnibus.OmnibusService
import org.gotson.komga.infrastructure.metadata.epub.EpubMetadataProvider
import org.gotson.komga.infrastructure.persistence.jpa.JpaVirtualBookRepository
import org.gotson.komga.interfaces.rest.OmnibusController
import org.gotson.komga.interfaces.rest.OmnibusTaskController
import org.gotson.komga.interfaces.rest.VirtualBookContentController
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class OmnibusConfiguration {
  @Bean
  fun omnibusDetector(
    epubContentExtractor: EpubContentExtractor,
    metadataService: org.gotson.komga.infrastructure.epub.omnibus.OmnibusMetadataService
  ): OmnibusDetector = OmnibusDetectorImpl(epubContentExtractor, metadataService)

  @Bean
  fun epubTocParser(epubContentExtractor: EpubContentExtractor): EpubTocParser = EpubTocParser(epubContentExtractor)

  @Bean
  fun epubExtractionService(epubContentExtractor: EpubContentExtractor): EpubExtractionService = EpubExtractionService(epubContentExtractor)

  @Bean
  fun omnibusMetadataService(): org.gotson.komga.infrastructure.epub.omnibus.OmnibusMetadataService =
    org.gotson.komga.infrastructure.epub.omnibus.OmnibusMetadataService()

  @Bean
  fun omnibusService(
    omnibusDetector: OmnibusDetector,
    bookAnalyzer: BookAnalyzer,
    epubMetadataProvider: EpubMetadataProvider,
    epubTocParser: EpubTocParser,
    virtualBookService: VirtualBookService,
    virtualBookContentService: VirtualBookContentService,
    epubContentExtractor: EpubContentExtractor,
    virtualBookRepository: VirtualBookRepository
  ): org.gotson.komga.infrastructure.epub.omnibus.OmnibusService =
    org.gotson.komga.infrastructure.epub.omnibus.OmnibusService(
      omnibusDetector = omnibusDetector,
      bookAnalyzer = bookAnalyzer,
      epubMetadataProvider = epubMetadataProvider,
      epubTocParser = epubTocParser,
      virtualBookService = virtualBookService,
      virtualBookContentService = virtualBookContentService,
      epubContentExtractor = epubContentExtractor,
      virtualBookRepository = virtualBookRepository
    )

  @Bean
  fun virtualBookService(
    virtualBookRepository: VirtualBookRepository,
    bookRepository: BookRepository,
  ): VirtualBookService =
    VirtualBookLifecycle(
      virtualBookRepository = virtualBookRepository,
      bookRepository = bookRepository,
    )

  @Bean
  fun virtualBookContentService(
    virtualBookService: VirtualBookService,
    epubExtractionService: EpubExtractionService,
  ): VirtualBookContentService =
    VirtualBookContentService(
      virtualBookService = virtualBookService,
      epubExtractionService = epubExtractionService,
    )

  @Bean
  fun virtualBookRepository(jpaVirtualBookRepository: JpaVirtualBookRepository): VirtualBookRepository = jpaVirtualBookRepository

  @Bean
  fun omnibusProcessingTask(
    omnibusService: OmnibusService,
    bookAnalyzer: BookAnalyzer,
    virtualBookService: VirtualBookService,
  ): OmnibusProcessingTask =
    OmnibusProcessingTask(
      omnibusService = omnibusService,
      bookAnalyzer = bookAnalyzer,
      virtualBookService = virtualBookService,
    )

  @Bean
  fun cacheCleanupTask(
    virtualBookContentService: VirtualBookContentService,
  ): CacheCleanupTask = CacheCleanupTask(virtualBookContentService)

  @Bean
  fun omnibusController(
    virtualBookService: VirtualBookService,
    omnibusService: OmnibusService,
  ): OmnibusController = OmnibusController(virtualBookService, omnibusService)

  @Bean
  fun virtualBookContentController(
    virtualBookContentService: VirtualBookContentService,
    virtualBookService: VirtualBookService,
  ): VirtualBookContentController = VirtualBookContentController(virtualBookContentService, virtualBookService)

  @Bean
  fun omnibusTaskController(
    omnibusProcessingTask: OmnibusProcessingTask,
  ): OmnibusTaskController = OmnibusTaskController(omnibusProcessingTask)
}
