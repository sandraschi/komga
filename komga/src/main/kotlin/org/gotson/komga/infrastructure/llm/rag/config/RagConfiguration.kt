package org.gotson.komga.infrastructure.llm.rag.config

import org.gotson.komga.infrastructure.llm.rag.model.RagConfig
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.validation.annotation.Validated
import javax.annotation.PreDestroy

/**
 * Configuration properties for the RAG system.
 */
@Configuration
@EnableConfigurationProperties(RagProperties::class)
class RagConfiguration(
  private val ragProperties: RagProperties,
) {
  /**
   * Creates a RagConfig instance from the application properties.
   */
  @Bean
  fun ragConfig(): RagConfig =
    RagConfig(
      chunking =
        RagConfig.ChunkingConfig(
          chunkSize = ragProperties.chunking.chunkSize,
          chunkOverlap = ragProperties.chunking.chunkOverlap,
          strategy = ragProperties.chunking.strategy,
        ),
      embedding =
        RagConfig.EmbeddingConfig(
          model = ragProperties.embedding.model,
          dimensions = ragProperties.embedding.dimensions,
          batchSize = ragProperties.embedding.batchSize,
        ),
      search =
        RagConfig.SearchConfig(
          topK = ragProperties.search.topK,
          similarityThreshold = ragProperties.search.similarityThreshold,
          useHybridSearch = ragProperties.search.useHybridSearch,
        ),
      storage =
        RagConfig.StorageConfig(
          type = ragProperties.storage.type,
          path = ragProperties.storage.path,
          maxDocumentSize = ragProperties.storage.maxDocumentSize,
        ),
      cleanOnStart = ragProperties.cleanOnStart,
      cleanOnExit = ragProperties.cleanOnExit,
    )

  @PreDestroy
  fun onDestroy() {
    // Cleanup logic if needed when application shuts down
  }
}

/**
 * Properties for configuring the RAG system.
 */
@ConfigurationProperties(prefix = "komga.rag")
@Validated
data class RagProperties(
  /** Whether the RAG system is enabled */
  val enabled: Boolean = true,
  /** Clean temporary files on startup */
  val cleanOnStart: Boolean = true,
  /** Clean temporary files on shutdown */
  val cleanOnExit: Boolean = true,
  /** Chunking configuration */
  val chunking: Chunking = Chunking(),
  /** Embedding configuration */
  val embedding: Embedding = Embedding(),
  /** Search configuration */
  val search: Search = Search(),
  /** Storage configuration */
  val storage: Storage = Storage(),
) {
  data class Chunking(
    /** Maximum number of characters per chunk */
    val chunkSize: Int = 1000,
    /** Number of characters to overlap between chunks */
    val chunkOverlap: Int = 200,
    /** Chunking strategy to use */
    val strategy: RagConfig.ChunkingStrategy = RagConfig.ChunkingStrategy.RECURSIVE,
  )

  data class Embedding(
    /** Name of the embedding model to use */
    val model: String = "text-embedding-3-small",
    /** Number of dimensions in the embedding vectors */
    val dimensions: Int = 1536,
    /** Number of texts to embed in a single batch */
    val batchSize: Int = 32,
  )

  data class Search(
    /** Number of results to return from similarity search */
    val topK: Int = 5,
    /** Minimum similarity score (0-1) for results */
    val similarityThreshold: Double = 0.7,
    /** Whether to use hybrid search (keyword + vector) */
    val useHybridSearch: Boolean = true,
  )

  data class Storage(
    /** Type of storage to use */
    val type: RagConfig.StorageType = RagConfig.StorageType.MEMORY,
    /** Path for filesystem storage */
    val path: String = "data/rag/documents",
    /** Maximum size of a single document in bytes */
    val maxDocumentSize: Long = 10 * 1024 * 1024, // 10MB
  )
}
