package org.gotson.komga.infrastructure.llm.rag.store

import io.grpc.ManagedChannelBuilder
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.chromadb.api.ChromaClient
import org.chromadb.api.ChromaClientBuilder
import org.gotson.komga.infrastructure.llm.rag.model.DocumentChunk
import org.gotson.komga.infrastructure.llm.rag.model.RagDocument
import org.gotson.komga.infrastructure.llm.rag.model.RagSearchResult
import org.slf4j.LoggerFactory
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.stereotype.Component
import java.util.*

/**
 * ChromaDB implementation of VectorStore.
 */
@Component
@ConditionalOnProperty("komga.rag.vector-store", havingValue = "chroma")
class ChromaDBVectorStore(
    private val properties: RagProperties
) : VectorStore, AutoCloseable {

    private val logger = LoggerFactory.getLogger(javaClass)
    
    private val client: ChromaClient by lazy {
        ChromaClientBuilder
            .create(properties.chroma.host, properties.chroma.port)
            .useSsl(properties.chroma.ssl)
            .connect()
    }
    
    private val collection by lazy {
        try {
            client.getCollection(properties.chroma.collection)
        } catch (e: Exception) {
            logger.info("Creating new ChromaDB collection: ${properties.chroma.collection}")
            client.createCollection(properties.chroma.collection)
        }
    }

    override suspend fun addDocuments(documents: List<RagDocument>) = withContext(Dispatchers.IO) {
        try {
            documents.forEach { doc ->
                val ids = mutableListOf<String>()
                val embeddings = mutableListOf<List<Float>>()
                val metadatas = mutableListOf<Map<String, Any>>()
                
                doc.chunks.forEach { chunk ->
                    val id = "${doc.id}_${chunk.chunkIndex}"
                    ids.add(id)
                    embeddings.add(chunk.embedding.map { it.toFloat() })
                    
                    val metadata = chunk.metadata.toMutableMap()
                    metadata["document_id"] = doc.id
                    metadata["content"] = chunk.content
                    metadatas.add(metadata)
                }
                
                collection.upsert(
                    ids = ids,
                    embeddings = embeddings,
                    metadatas = metadatas
                )
                
                logger.info("Upserted ${ids.size} vectors for document ${doc.id}")
            }
        } catch (e: Exception) {
            logger.error("Error adding documents to ChromaDB", e)
            throw e
        }
    }

    override suspend fun removeDocuments(documentIds: List<String>) = withContext(Dispatchers.IO) {
        try {
            documentIds.forEach { docId ->
                collection.delete(where = mapOf("document_id" to docId))
                logger.info("Removed document $docId from ChromaDB")
            }
        } catch (e: Exception) {
            logger.error("Error removing documents from ChromaDB", e)
            throw e
        }
    }

    override suspend fun similaritySearch(
        query: String,
        k: Int,
        filter: Map<String, Any>?
    ): List<RagSearchResult> {
        // This would require getting the embedding for the query first
        throw UnsupportedOperationException("Use similaritySearchWithEmbedding with pre-computed embeddings")
    }

    override suspend fun similaritySearchWithEmbedding(
        queryEmbedding: List<Double>,
        k: Int,
        filter: Map<String, Any>?
    ): List<RagSearchResult> = withContext(Dispatchers.IO) {
        try {
            val results = collection.query(
                queryEmbeddings = listOf(queryEmbedding.map { it.toFloat() }),
                nResults = k,
                where = filter
            )
            
            // Process results
            results.idsList.firstOrNull()?.mapIndexedNotNull { index, id ->
                val metadata = results.metadatasList.firstOrNull()?.getOrNull(index)?.fieldsMap?.mapValues { it.value.stringValue } ?: emptyMap()
                val documentId = metadata["document_id"] ?: return@mapIndexedNotNull null
                val content = metadata["content"] ?: ""
                val score = results.distancesList.firstOrNull()?.getOrNull(index)?.toDouble() ?: 0.0
                
                val chunk = DocumentChunk(
                    id = id,
                    content = content,
                    embedding = results.embeddingsList.firstOrNull()?.getOrNull(index)?.map { it.toDouble() } ?: emptyList(),
                    metadata = metadata - "content",
                    documentId = documentId,
                    chunkIndex = (metadata["chunk_index"]?.toIntOrNull() ?: 0)
                )
                
                // We don't have the full document here, so we'll create a minimal one
                val document = RagDocument(
                    id = documentId,
                    content = content,
                    metadata = metadata - "content" - "chunk_index" - "document_id",
                    chunks = listOf(chunk)
                )
                
                RagSearchResult(chunk, score, document)
            } ?: emptyList()
        } catch (e: Exception) {
            logger.error("Error performing similarity search in ChromaDB", e)
            emptyList()
        }
    }

    override suspend fun getDocument(documentId: String): RagDocument? = withContext(Dispatchers.IO) {
        try {
            val results = collection.get(where = mapOf("document_id" to documentId))
            
            if (results.idsList.isEmpty()) {
                return@withContext null
            }
            
            val chunks = results.idsList.first().mapIndexed { index, id ->
                val metadata = results.metadatasList.first()[index].fieldsMap.mapValues { it.value.stringValue }
                DocumentChunk(
                    id = id,
                    content = metadata["content"] ?: "",
                    embedding = results.embeddingsList.first()[index].map { it.toDouble() },
                    metadata = metadata - "content",
                    documentId = documentId,
                    chunkIndex = (metadata["chunk_index"]?.toIntOrNull() ?: 0)
                )
            }.sortedBy { it.chunkIndex }
            
            val firstChunk = chunks.firstOrNull()
            if (firstChunk == null) {
                return@withContext null
            }
            
            RagDocument(
                id = documentId,
                content = chunks.joinToString("\n\n") { it.content },
                metadata = firstChunk.metadata - "chunk_index" - "document_id",
                chunks = chunks
            )
        } catch (e: Exception) {
            logger.error("Error retrieving document $documentId from ChromaDB", e)
            null
        }
    }

    override suspend fun getDocumentChunks(documentId: String): List<DocumentChunk> {
        return getDocument(documentId)?.chunks ?: emptyList()
    }
    
    override fun close() {
        try {
            client.close()
        } catch (e: Exception) {
            logger.error("Error closing ChromaDB client", e)
        }
    }
}
