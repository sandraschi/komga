package org.gotson.komga.infrastructure.epub.omnibus

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

/**
 * Configuration for omnibus-related components.
 */
@Configuration
class OmnibusConfiguration {
    
    @Bean
    fun omnibusDetector(): OmnibusDetector = OmnibusDetectorImpl()
    
    @Bean
    fun omnibusService(
        omnibusDetector: OmnibusDetector,
        bookAnalyzer: org.gotson.komga.domain.service.BookAnalyzer,
        epubMetadataProvider: org.gotson.komga.infrastructure.metadata.epub.EpubMetadataProvider
    ) = OmnibusService(omnibusDetector, bookAnalyzer, epubMetadataProvider)
}
