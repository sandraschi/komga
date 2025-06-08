package org.gotson.komga.infrastructure.configuration

import org.gotson.komga.infrastructure.analysis.AnalysisService
import org.gotson.komga.infrastructure.llm.service.LlmService
import org.gotson.komga.infrastructure.storage.StorageManager
import org.gotson.komga.infrastructure.template.TemplateService
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

/**
 * Configuration class for the Meta Book feature
 */
@Configuration
@ConditionalOnProperty(
  prefix = "meta-book",
  name = ["enabled"],
  havingValue = "true",
  matchIfMissing = true,
)
class MetaBookFeatureConfiguration {
  @Bean
  fun metaBookGenerationService(
    llmService: LlmService,
    analysisService: AnalysisService,
    templateService: TemplateService,
    storageManager: StorageManager,
  ) = MetaBookGenerationService(
    llmService = llmService,
    analysisService = analysisService,
    templateService = templateService,
    storageManager = storageManager,
  )

  @Bean
  fun metaBookJobProcessor(
    metaBookRepository: MetaBookRepository,
    metaBookGenerationService: MetaBookGenerationService,
  ) = MetaBookJobProcessor(
    metaBookRepository = metaBookRepository,
    metaBookGenerationService = metaBookGenerationService,
  )
}
