package org.gotson.komga.infrastructure.configuration

import org.gotson.komga.infrastructure.ai.OpenAIService
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
@EnableConfigurationProperties(AIConfiguration.AISettings::class)
class AIConfiguration(
  private val settings: AISettings,
) {
  @Bean
  fun openAIService(
    bookService: org.gotson.komga.domain.service.BookService,
    bookContentService: org.gotson.komga.domain.service.BookContentService,
    bookExportService: org.gotson.komga.domain.service.BookExportService,
    languageDetector: org.gotson.komga.language.LanguageDetector,
    settingsProvider: org.gotson.komga.infrastructure.configuration.KomgaSettingsProvider,
    objectMapper: com.fasterxml.jackson.databind.ObjectMapper,
  ): AIService? =
    if (settings.openai.apiKey.isNotBlank()) {
      OpenAIService(
        bookService = bookService,
        bookContentService = bookContentService,
        bookExportService = bookExportService,
        languageDetector = languageDetector,
        settingsProvider = settingsProvider,
        objectMapper = objectMapper,
      )
    } else {
      null
    }

  @ConfigurationProperties("komga.ai")
  data class AISettings(
    val openai: OpenAISettings = OpenAISettings(),
  )

  data class OpenAISettings(
    /**
     * OpenAI API key
     */
    val apiKey: String = "",
    /**
     * OpenAI API base URL (default: https://api.openai.com/v1)
     */
    val apiBaseUrl: String = "https://api.openai.com/v1",
  )
}
