package org.gotson.komga.infrastructure.configuration

import org.gotson.komga.infrastructure.llm.LlmConfig
import org.gotson.komga.infrastructure.llm.LlmModelManager
import org.gotson.komga.infrastructure.llm.LlmService
import org.gotson.komga.infrastructure.llm.LlmServiceFactory
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
    fun llmConfig(): LlmConfig {
        return LlmConfig()
    }
    
    @Bean
    fun llmModelManager(
        config: LlmConfig,
        restTemplate: RestTemplate
    ): LlmModelManager {
        return LlmModelManager(config, restTemplate)
    }
    
    @Bean
    @ConditionalOnProperty("komga.llm.enabled", havingValue = "true")
    fun llmServiceFactory(
        config: LlmConfig,
        modelManager: LlmModelManager
    ): LlmServiceFactory {
        return LlmServiceFactory(config, modelManager)
    }
    
    @Bean
    @ConditionalOnProperty("komga.llm.enabled", havingValue = "true")
    fun llmService(factory: LlmServiceFactory): LlmService {
        return factory.llmService()
    }
    
    @Bean
    fun llmRestTemplate(): RestTemplate {
        return RestTemplate()
    }
}
