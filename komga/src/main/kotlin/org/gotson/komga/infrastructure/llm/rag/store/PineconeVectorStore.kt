package org.gotson.komga.infrastructure.llm.rag.store

import com.pinecone.PineconeClient
import com.pinecone.PineconeClientConfig
import com.pinecone.PineconeConnection
import com.pinecone.PineconeConnectionConfig
import com.pinecone.dtos.UpsertRequest
import com.pinecone.dtos.Vector
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.gotson.komga.infrastructure.llm.rag.model.DocumentChunk
import org.gotson.komga.infrastructure.llm.rag.model.RagDocument
import org.gotson.komga.infrastructure.llm.rag.model.RagSearchResult
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.stereotype.Component
import java.util.*

/**
 * Pinecone implementation of VectorStore.
 */
@Component
@ConditionalOnProperty("komga.rag.vector-store", havingValue = "pinecone")
class PineconeVectorStore(
    @Value("\${pinecone.api-key}") private val apiKey: String,
    @Value("\${pinecone.environment:us-west1-gcp}") private val environment: String,
    @Value("\${pinecone.index:komga-rag}") private val indexName: String,
    @Value("\${pinecone.namespace:default}") private val namespace: String
) : VectorStore {

    private val logger = LoggerFactory.getLogger(javaClass)
    private val client: PineconeClient by lazy { createClient() }
    private val connection: PineconeConnection by lazy { createConnection() }

    private fun createClient(): PineconeClient {
        val config = PineconeClientConfig()
            .withApiKey(apiKey)
            .withEnvironment(environment)
        return PineconeClient(config)
    }

    private fun createConnection(): PineconeConnection {
        return client.connect(indexName)
    }

    override suspend fun addDocuments(documents: List<RagDocument>) {
        withContext(Dispatchers.IO) {
            val upsertRequests = documents.flatMap { doc ->
                doc.chunks.map { chunk ->
                    val id = "${doc.id}_${chunk.chunkIndex}"
                    val metadata = chunk.metadata.toMutableMap()
                    metadata["document_id"] = doc.id
                    metadata["content"] = chunk.content
                    
                    UpsertRequest(
                        id = id,
                        values = chunk.embedding.toFloatArray(),
                        metadata = metadata,
                        namespace = namespace
                    )
                }
            }
            
            connection.upsert(upsertRequests)
            logger.info("Upserted ${upsertRequests.size} vectors for ${documents.size} documents")
        }
    }

    override suspend fun removeDocuments(documentIds: List<String>) {
        withContext(Dispatchers.IO) {
            documentIds.forEach { docId ->
                val filter = mapOf("document_id" to docId)
                connection.delete(filter, namespace)
            }
            logger.info("Removed ${documentIds.size} documents")
        }
    }

    override suspend fun similaritySearch(
        query: String,
        k: Int,
        filter: Map<String, Any>?
    ): List<RagSearchResult> {
        // This would require getting the embedding for the query first
        // In a real implementation, you'd call the embedding service here
        throw UnsupportedOperationException("Use similaritySearchWithEmbedding with pre-computed embeddings")
    }

    override suspend fun similaritySearchWithEmbedding(
        queryEmbedding: List<Double>,
        k: Int,
        filter: Map<String, Any>?
    ): List<RagSearchResult> = withContext(Dispatchers.IO) {
        try {
            val queryResponse = connection.query(
                vector = queryEmbedding.map { it.toFloat() }.toFloatArray(),
                topK = k,
                filter = filter,
                namespace = namespace,
                includeMetadata = true,
                includeValues = false
            )

            // Group results by document ID
            val resultsByDoc = queryResponse.matches.groupBy { it.metadata["document_id"] as String }
            
            // Get full documents
            val documents = resultsByDoc.keys.mapNotNull { docId ->
                getDocument(docId)?.let { doc ->
                    doc to resultsByDoc[docId]!!.map { match ->
                        val chunkIndex = match.metadata["chunk_index"] as? Int ?: 0
                        val chunk = doc.chunks.find { it.chunkIndex == chunkIndex }
                        RagSearchResult(
                            chunk = chunk ?: DocumentChunk(
                                content = match.metadata["content"] as? String ?: "",
                                embedding = emptyList(),
                                documentId = docId,
                                chunkIndex = chunkIndex
                            ),
                            score = match.score.toDouble(),
                            document = doc
                        )
                    }
                }
            }
            
            // Flatten and sort by score
            documents.flatMap { it.second }.sortedByDescending { it.score }
        } catch (e: Exception) {
            logger.error("Error performing similarity search", e)
            emptyList()
        }
    }

    override suspend fun getDocument(documentId: String): RagDocument? = withContext(Dispatchers.IO) {
        try {
            val filter = mapOf("document_id" to documentId)
            val response = connection.query(
                vector = FloatArray(768), // Dummy vector, we only care about metadata
                topK = 1000, // Max chunks per document
                filter = filter,
                namespace = namespace,
                includeMetadata = true,
                includeValues = true
            )
            
            if (response.matches.isEmpty()) {
                return@withContext null
            }
            
            val chunks = response.matches.map { match ->
                DocumentChunk(
                    id = match.id,
                    content = match.metadata["content"] as? String ?: "",
                    embedding = match.values?.map { it.toDouble() } ?: emptyList(),
                    metadata = match.metadata.filterKeys { it != "content" },
                    documentId = documentId,
                    chunkIndex = (match.metadata["chunk_index"] as? Number)?.toInt() ?: 0
                )
            }.sortedBy { it.chunkIndex }
            
            // Get metadata from first chunk (assuming it's consistent across chunks)
            val firstChunk = chunks.firstOrNull()
            val metadata = firstChunk?.metadata?.filterKeys { it != "chunk_index" } ?: emptyMap()
            
            RagDocument(
                id = documentId,
                content = chunks.joinToString("\n\n") { it.content },
                metadata = metadata,
                chunks = chunks
            )
        } catch (e: Exception) {
            logger.error("Error retrieving document $documentId", e)
            null
        }
    }

    override suspend fun getDocumentChunks(documentId: String): List<DocumentChunk> {
        return getDocument(documentId)?.chunks ?: emptyList()
    }
    
    fun close() {
        try {
            client.shutdown()
        } catch (e: Exception) {
            logger.error("Error shutting down Pinecone client", e)
        }
    }
}
