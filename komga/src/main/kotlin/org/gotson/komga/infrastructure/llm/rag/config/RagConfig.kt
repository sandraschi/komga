package org.gotson.komga.infrastructure.llm.rag.config

import org.gotson.komga.infrastructure.llm.rag.model.RagConfig
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

/**
 * Configuration for the RAG system.
 */
@Configuration
@EnableConfigurationProperties(RagProperties::class)
class RagConfiguration(
    private val properties: RagProperties
) {
    
    @Bean
    fun ragConfig(): RagConfig {
        return RagConfig(
            chunkSize = properties.chunkSize,
            chunkOverlap = properties.chunkOverlap,
            topK = properties.topK,
            similarityThreshold = properties.similarityThreshold
        )
    }
}

/**
 * Configuration properties for the RAG system.
 */
@ConfigurationProperties(prefix = "komga.rag")
data class RagProperties(
    /**
     * Whether the RAG system is enabled.
     */
    val enabled: Boolean = false,
    
    /**
     * The vector store to use ("memory", "pinecone", or "chroma").
     */
    val vectorStore: String = "memory",
    
    /**
     * Maximum number of characters per chunk.
     */
    val chunkSize: Int = 1000,
    
    /**
     * Number of characters to overlap between chunks.
     */
    val chunkOverlap: Int = 100,
    
    /**
     * Number of results to return from similarity search.
     */
    val topK: Int = 5,
    
    /**
     * Minimum similarity score (0-1) for search results.
     */
    val similarityThreshold: Double = 0.7,
    
    /**
     * Configuration for the Pinecone vector store.
     */
    val pinecone: PineconeProperties = PineconeProperties(),
    
    /**
     * Configuration for the ChromaDB vector store.
     */
    val chroma: ChromaProperties = ChromaProperties()
)

/**
 * Configuration properties for Pinecone.
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
     * Pinecone namespace.
     */
    val namespace: String = "default"
)

/**
 * Configuration properties for ChromaDB.
 */
data class ChromaProperties(
    /**
     * ChromaDB server host.
     */
    val host: String = "localhost",
    
    /**
     * ChromaDB server port.
     */
    val port: Int = 8000,
    
    /**
     * Whether to use SSL for the connection.
     */
    val ssl: Boolean = false,
    
    /**
     * Name of the collection to use.
     */
    val collection: String = "komga_rag"
)
