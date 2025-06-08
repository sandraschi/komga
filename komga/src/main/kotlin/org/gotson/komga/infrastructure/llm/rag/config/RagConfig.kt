package org.gotson.komga.infrastructure.llm.rag.config

import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.Positive
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.boot.context.properties.NestedConfigurationProperty
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.validation.annotation.Validated

/**
 * Configuration for the RAG system.
 */
@Configuration
@EnableConfigurationProperties(RagProperties::class)
class RagConfiguration(
  private val properties: RagProperties,
) {
  @Bean
  fun ragConfig(): RagConfig =
    RagConfig(
      enabled = properties.enabled,
      chunking =
        RagChunkingConfig(
          strategy = properties.chunking.strategy,
          chunkSize = properties.chunking.chunkSize,
          chunkOverlap = properties.chunking.chunkOverlap,
          separators = properties.chunking.separators,
        ),
      embedding =
        RagEmbeddingConfig(
          model = properties.embedding.model,
          batchSize = properties.embedding.batchSize,
          maxRetries = properties.embedding.maxRetries,
          timeoutSeconds = properties.embedding.timeoutSeconds,
          cacheEnabled = properties.embedding.cacheEnabled,
          cacheSize = properties.embedding.cacheSize,
        ),
      search =
        RagSearchConfig(
          maxResults = properties.search.maxResults,
          minScore = properties.search.minScore,
          scoreThreshold = properties.search.scoreThreshold,
          useMmr = properties.search.useMmr,
          mmrLambda = properties.search.mmrLambda,
        ),
      storage =
        RagStorageConfig(
          type = properties.storage.type,
          basePath = properties.storage.basePath,
          cleanOnStart = properties.storage.cleanOnStart,
          cleanOnExit = properties.storage.cleanOnExit,
        ),
    )
}

/**
 * Configuration properties for the RAG system.
 */
@ConfigurationProperties(prefix = "komga.rag")
@Validated
data class RagProperties(
  /**
   * Whether the RAG system is enabled.
   */
  val enabled: Boolean = false,
  /**
   * Chunking configuration.
   */
  @NestedConfigurationProperty
  val chunking: ChunkingProperties = ChunkingProperties(),
  /**
   * Embedding configuration.
   */
  @NestedConfigurationProperty
  val embedding: EmbeddingProperties = EmbeddingProperties(),
  /**
   * Search configuration.
   */
  @NestedConfigurationProperty
  val search: SearchProperties = SearchProperties(),
  /**
   * Storage configuration.
   */
  @NestedConfigurationProperty
  val storage: StorageProperties = StorageProperties(),
)

/**
 * Chunking configuration properties.
 */
data class ChunkingProperties(
  /**
   * Chunking strategy to use ("recursive", "markdown", "html", etc.).
   */
  val strategy: String = "recursive",
  /**
   * Maximum number of characters per chunk.
   */
  @get:Positive(message = "Chunk size must be positive")
  val chunkSize: Int = 1000,
  /**
   * Number of characters to overlap between chunks.
   */
  @get:Min(value = 0, message = "Chunk overlap must be >= 0")
  val chunkOverlap: Int = 200,
  /**
   * List of separators to use for splitting text into chunks.
   * Used by the recursive chunking strategy.
   */
  val separators: List<String> = listOf("\n\n", "\n", " ", ""),
)

/**
 * Embedding configuration properties.
 */
data class EmbeddingProperties(
  /**
   * The embedding model to use.
   */
  val model: String = "text-embedding-3-small",
  /**
   * Batch size for embedding generation.
   */
  @get:Positive(message = "Batch size must be positive")
  val batchSize: Int = 32,
  /**
   * Maximum number of retries for failed embedding requests.
   */
  @get:Min(value = 0, message = "Max retries must be >= 0")
  val maxRetries: Int = 3,
  /**
   * Timeout in seconds for embedding requests.
   */
  @get:Positive(message = "Timeout must be positive")
  val timeoutSeconds: Int = 60,
  /**
   * Whether to enable caching of embeddings.
   */
  val cacheEnabled: Boolean = true,
  /**
   * Maximum number of embeddings to cache.
   */
  @get:Positive(message = "Cache size must be positive")
  val cacheSize: Int = 10_000,
)

/**
 * Search configuration properties.
 */
data class SearchProperties(
  /**
   * Maximum number of results to return from a search.
   */
  @get:Positive(message = "Max results must be positive")
  val maxResults: Int = 10,
  /**
   * Minimum similarity score (0-1) for search results.
   */
  @get:Min(value = 0, message = "Min score must be >= 0")
  @get:Max(value = 1, message = "Min score must be <= 1")
  val minScore: Double = 0.7,
  /**
   * Score threshold (0-1) for filtering search results.
   */
  @get:Min(value = 0, message = "Score threshold must be >= 0")
  @get:Max(value = 1, message = "Score threshold must be <= 1")
  val scoreThreshold: Double = 0.5,
  /**
   * Whether to use Maximal Marginal Relevance (MMR) for result diversification.
   */
  val useMmr: Boolean = true,
  /**
   * Lambda parameter for MMR (0-1). Higher values favor diversity.
   */
  @get:Min(value = 0, message = "MMR lambda must be >= 0")
  @get:Max(value = 1, message = "MMR lambda must be <= 1")
  val mmrLambda: Double = 0.5,
)

/**
 * Storage configuration properties.
 */
data class StorageProperties(
  /**
   * Storage type ("memory", "filesystem", "database", "s3").
   */
  val type: String = "memory",
  /**
   * Base path for filesystem storage.
   */
  val basePath: String = "data/rag",
  /**
   * Whether to clean up storage on application start.
   */
  val cleanOnStart: Boolean = false,
  /**
   * Whether to clean up storage on application exit.
   */
  val cleanOnExit: Boolean = false,
)

/**
 * Pinecone configuration properties.
 */
data class PineconeProperties(
  /**
   * Pinecone API key.
   */
  val apiKey: String = "",
  /**
   * Pinecone environment (e.g., "us-west1-gcp").
   */
  val environment: String = "us-west1-gcp",
  /**
   * Pinecone index name.
   */
  val index: String = "komga-rag",
  /**
   * Pinecone project name.
   */
  val project: String = "default",
  /**
   * Pinecone namespace.
   */
  val namespace: String = "default",
)

/**
 * ChromaDB configuration properties.
 */
data class ChromaProperties(
  /**
   * ChromaDB server URL.
   */
  val url: String = "http://localhost:8000",
  /**
   * ChromaDB collection name.
   */
  val collection: String = "komga_rag",
  /**
   * Whether to create the collection if it doesn't exist.
   */
  val createIfNotExists: Boolean = true,
  /**
   * Number of results to return from ChromaDB.
   */
  @get:Positive(message = "Result count must be positive")
  val resultCount: Int = 10,
  /**
   * Whether to include documents in the response.
   */
  val includeDocuments: Boolean = true,
)
