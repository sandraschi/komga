package org.gotson.komga.infrastructure.llm.rag.config

import org.gotson.komga.infrastructure.llm.rag.RagService
import org.gotson.komga.interfaces.api.rest.RagController
import org.gotson.komga.interfaces.api.rest.mapper.RagMapper
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

/**
 * WebMVC configuration for the RAG system.
 */
@Configuration
@ConditionalOnProperty("komga.rag.enabled", havingValue = "true")
class RagWebMvcConfiguration {
  @Bean
  fun ragController(
    ragService: RagService,
    ragMapper: RagMapper,
  ): RagController = RagController(ragService, ragMapper)

  @Bean
  fun ragMapper(): RagMapper = RagMapper.INSTANCE
}
