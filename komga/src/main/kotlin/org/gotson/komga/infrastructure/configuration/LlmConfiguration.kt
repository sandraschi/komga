package org.gotson.komga.infrastructure.configuration

import org.gotson.komga.infrastructure.llm.LlmConfig
import org.gotson.komga.infrastructure.llm.LlmModelManager
import org.gotson.komga.infrastructure.llm.service.LlmService
import org.gotson.komga.infrastructure.llm.service.LlmServiceFactory
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.web.client.RestTemplate

@Configuration
@EnableConfigurationProperties
class LlmConfiguration {
  @Bean
  @ConfigurationProperties(prefix = "komga.llm")
  fun llmConfig(): LlmConfig = LlmConfig()

  @Bean
  fun llmModelManager(
    config: LlmConfig,
    restTemplate: RestTemplate,
  ): LlmModelManager = LlmModelManager(config, restTemplate)

  @Bean
  @ConditionalOnProperty("komga.llm.enabled", havingValue = "true")
  fun llmServiceFactory(
    config: LlmConfig,
    modelManager: LlmModelManager,
  ): LlmServiceFactory = LlmServiceFactory(config, modelManager)

  @Bean
  @ConditionalOnProperty("komga.llm.enabled", havingValue = "true")
  fun llmService(factory: LlmServiceFactory): LlmService = factory.llmService()

  @Bean
  fun llmRestTemplate(): RestTemplate = RestTemplate()
}
