package org.gotson.komga.infrastructure.configuration

import org.gotson.komga.infrastructure.llm.service.LlmService
import org.gotson.komga.infrastructure.storage.StorageManager
import org.gotson.komga.infrastructure.template.TemplateService
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
@EnableConfigurationProperties(MetaBookProperties::class)
class MetaBookConfiguration(
  private val properties: MetaBookProperties,
) {
  @Bean
  fun metaBookService(
    llmService: LlmService,
    templateService: TemplateService,
    storageManager: StorageManager,
  ) = MetaBookService(
    llmService = llmService,
    templateService = templateService,
    storageManager = storageManager,
    defaultOptions = properties.defaultOptions.toDomain(),
  )
}

@ConfigurationProperties(prefix = "komga.meta-book")
data class MetaBookProperties(
  /**
   * Default options for meta book generation
   */
  val defaultOptions: GenerationOptionsDto = GenerationOptionsDto(),
) {
  data class GenerationOptionsDto(
    val depth: String = "STANDARD",
    val includeSpoilers: Boolean = false,
    val sections: Set<String> = setOf("SUMMARY", "CHARACTERS", "THEMES", "STYLE"),
    val language: String = "en",
    val theme: String? = null,
    val style: String = "ANALYTICAL",
  ) {
    fun toDomain(): MetaBook.GenerationOptions =
      MetaBook.GenerationOptions(
        depth = MetaBook.AnalysisDepth.valueOf(depth),
        includeSpoilers = includeSpoilers,
        sections = sections.map { MetaBook.AnalysisSection.valueOf(it) }.toSet(),
        language = language,
        theme = theme,
        style = MetaBook.AnalysisStyle.valueOf(style),
      )
  }
}
