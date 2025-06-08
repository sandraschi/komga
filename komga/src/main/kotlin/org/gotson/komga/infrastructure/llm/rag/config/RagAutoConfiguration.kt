package org.gotson.komga.infrastructure.llm.rag.config

import org.gotson.komga.infrastructure.llm.rag.RagService
import org.gotson.komga.infrastructure.llm.rag.service.EmbeddingService
import org.gotson.komga.infrastructure.llm.rag.store.InMemoryVectorStore
import org.gotson.komga.infrastructure.llm.rag.store.PineconeVectorStore
import org.gotson.komga.infrastructure.llm.rag.store.VectorStore
import org.gotson.komga.infrastructure.llm.rag.util.TextSplitter
import org.gotson.komga.infrastructure.llm.service.LlmService
import org.slf4j.LoggerFactory
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

/**
 * Auto-configuration for the RAG system.
 */
@Configuration
@ConditionalOnProperty("komga.rag.enabled", havingValue = "true")
class RagAutoConfiguration {
  private val logger = LoggerFactory.getLogger(javaClass)

  @Bean
  fun textSplitter() = TextSplitter()

  @Bean
  fun embeddingService(llmService: LlmService) = EmbeddingService(llmService)

  @Bean
  @ConditionalOnProperty("komga.rag.vector-store", havingValue = "pinecone")
  fun pineconeVectorStore(properties: RagProperties): VectorStore {
    logger.info("Using Pinecone vector store with index: ${properties.pinecone.index}")
    return PineconeVectorStore(
      apiKey = properties.pinecone.apiKey,
      environment = properties.pinecone.environment,
      indexName = properties.pinecone.index,
      namespace = properties.pinecone.namespace,
    )
  }

  @Bean
  @ConditionalOnProperty("komga.rag.vector-store", havingValue = "chroma")
  fun chromaVectorStore(properties: RagProperties): VectorStore {
    logger.info("Using ChromaDB vector store with collection: ${properties.chroma.collection}")
    return ChromaDBVectorStore(properties)
  }

  @Bean
  @ConditionalOnMissingBean(VectorStore::class)
  fun inMemoryVectorStore(): VectorStore {
    logger.info("Using in-memory vector store (not suitable for production)")
    return InMemoryVectorStore()
  }

  @Bean
  fun ragService(
    embeddingService: EmbeddingService,
    vectorStore: VectorStore,
    llmService: LlmService,
    ragProperties: RagProperties,
  ): RagService =
    RagService(
      embeddingService = embeddingService,
      vectorStore = vectorStore,
      llmService = llmService,
      ragConfig =
        RagConfig(
          chunkSize = ragProperties.chunkSize,
          chunkOverlap = ragProperties.chunkOverlap,
          topK = ragProperties.topK,
          similarityThreshold = ragProperties.similarityThreshold,
        ),
    )
}
