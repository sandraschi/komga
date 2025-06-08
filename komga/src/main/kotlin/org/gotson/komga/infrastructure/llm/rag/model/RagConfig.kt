package org.gotson.komga.infrastructure.llm.rag.model

/**
 * Main configuration class for the RAG system.
 *
 * @property enabled Whether the RAG system is enabled.
 * @property chunking Configuration for text chunking.
 * @property embedding Configuration for text embedding.
 * @property search Configuration for search operations.
 * @property storage Configuration for document and vector storage.
 */
data class RagConfig(
  val enabled: Boolean = false,
  val chunking: RagChunkingConfig,
  val embedding: RagEmbeddingConfig,
  val search: RagSearchConfig,
  val storage: RagStorageConfig,
)

/**
 * Configuration for text chunking.
 *
 * @property strategy The chunking strategy to use (e.g., "recursive", "markdown", "html").
 * @property chunkSize Maximum number of characters per chunk.
 * @property chunkOverlap Number of characters to overlap between chunks.
 * @property separators List of separators to use for splitting text into chunks.
 */
data class RagChunkingConfig(
  val strategy: String = "recursive",
  val chunkSize: Int = 1000,
  val chunkOverlap: Int = 200,
  val separators: List<String> = listOf("\n\n", "\n", " ", ""),
)

/**
 * Configuration for text embedding.
 *
 * @property model The embedding model to use.
 * @property batchSize Number of text chunks to process in a single batch.
 * @property maxRetries Maximum number of retries for failed embedding requests.
 * @property timeoutSeconds Timeout in seconds for embedding requests.
 * @property cacheEnabled Whether to enable caching of embeddings.
 * @property cacheSize Maximum number of embeddings to cache.
 */
data class RagEmbeddingConfig(
  val model: String = "text-embedding-3-small",
  val batchSize: Int = 32,
  val maxRetries: Int = 3,
  val timeoutSeconds: Int = 60,
  val cacheEnabled: Boolean = true,
  val cacheSize: Int = 10_000,
)

/**
 * Configuration for search operations.
 *
 * @property maxResults Maximum number of search results to return.
 * @property minScore Minimum similarity score (0-1) for search results.
 * @property scoreThreshold Score threshold (0-1) for filtering search results.
 * @property useMmr Whether to use Maximal Marginal Relevance (MMR) for result diversification.
 * @property mmrLambda Lambda parameter for MMR (0-1). Higher values favor diversity.
 */
data class RagSearchConfig(
  val maxResults: Int = 10,
  val minScore: Double = 0.7,
  val scoreThreshold: Double = 0.5,
  val useMmr: Boolean = true,
  val mmrLambda: Double = 0.5,
)

/**
 * Configuration for document and vector storage.
 *
 * @property type Storage type ("memory", "filesystem", "database", "s3").
 * @property basePath Base path for filesystem storage.
 * @property cleanOnStart Whether to clean up storage on application start.
 * @property cleanOnExit Whether to clean up storage on application exit.
 */
data class RagStorageConfig(
  val type: String = "memory",
  val basePath: String = "data/rag",
  val cleanOnStart: Boolean = false,
  val cleanOnExit: Boolean = false,
)

/**
 * Configuration for Pinecone vector store.
 *
 * @property apiKey Pinecone API key.
 * @property environment Pinecone environment (e.g., "us-west1-gcp").
 * @property index Pinecone index name.
 * @property project Pinecone project name.
 * @property namespace Pinecone namespace.
 */
data class RagPineconeConfig(
  val apiKey: String = "",
  val environment: String = "us-west1-gcp",
  val index: String = "komga-rag",
  val project: String = "default",
  val namespace: String = "default",
)

/**
 * Configuration for ChromaDB vector store.
 *
 * @property url ChromaDB server URL.
 * @property collection ChromaDB collection name.
 * @property createIfNotExists Whether to create the collection if it doesn't exist.
 * @property resultCount Number of results to return from ChromaDB.
 * @property includeDocuments Whether to include documents in the response.
 */
data class RagChromaConfig(
  val url: String = "http://localhost:8000",
  val collection: String = "komga_rag",
  val createIfNotExists: Boolean = true,
  val resultCount: Int = 10,
  val includeDocuments: Boolean = true,
)
