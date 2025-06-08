package org.gotson.komga.infrastructure.llm.rag.service

import kotlinx.coroutines.Async
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.gotson.komga.infrastructure.llm.rag.exception.DocumentProcessingException
import org.gotson.komga.infrastructure.llm.rag.exception.EmbeddingGenerationException
import org.gotson.komga.infrastructure.llm.rag.exception.StorageException
import org.gotson.komga.infrastructure.llm.rag.model.RagConfig
import org.gotson.komga.infrastructure.llm.rag.model.RagDocument
import org.gotson.komga.infrastructure.llm.rag.model.RagDocumentChunk
import org.gotson.komga.infrastructure.llm.rag.vectorstore.VectorStoreFactory
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Service
import java.io.InputStream
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardCopyOption
import java.util.UUID
import kotlin.io.path.extension
import kotlin.io.path.name

/**
 * Service for processing documents in the RAG system.
 * Handles document ingestion, chunking, embedding, and storage.
 */
@Service
class RagDocumentProcessor(
  private val documentProcessor: DocumentProcessor,
  private val embeddingService: EmbeddingService,
  private val vectorStoreFactory: VectorStoreFactory,
  private val ragConfig: RagConfig,
) {
  private val logger = LoggerFactory.getLogger(javaClass)

  /**
   * Processes a document asynchronously and adds it to the vector store.
   *
   * @param inputStream The input stream of the document
   * @param fileName The original file name
   * @param contentType The MIME type of the document
   * @param collectionName The name of the collection to add the document to
   * @param metadata Optional metadata to associate with the document
   * @return The ID of the created document
   */
  @Async
  suspend fun processDocument(
    inputStream: InputStream,
    fileName: String,
    contentType: String,
    collectionName: String = "default",
    metadata: Map<String, String> = emptyMap(),
  ): String =
    withContext(Dispatchers.IO) {
      val documentId = UUID.randomUUID().toString()
      val tempFile = createTempFile(fileName)

      try {
        // Save the uploaded file to a temporary location
        Files.copy(inputStream, tempFile, StandardCopyOption.REPLACE_EXISTING)

        // Process the document into chunks
        logger.info("Processing document: $fileName (${tempFile.toFile().length()} bytes)")
        val documents = documentProcessor.process(tempFile, metadata)

        if (documents.isEmpty()) {
          throw DocumentProcessingException("No content could be extracted from the document")
        }

        // Generate embeddings for each chunk
        logger.info("Generating embeddings for ${documents.size} chunks")
        val chunks =
          documents.mapIndexed { index, doc ->
            val embedding = embeddingService.embedText(doc.text)
            RagDocumentChunk(
              documentId = documentId,
              text = doc.text,
              metadata = doc.metadata + mapOf("chunk_index" to index.toString()),
              embedding = embedding.toFloatArray(),
              index = index,
              startOffset = doc.startOffset,
              endOffset = doc.endOffset,
            )
          }

        // Store the document and its chunks in the vector store
        val vectorStore = vectorStoreFactory.getOrCreateStore(collectionName)
        val ragDocument =
          RagDocument(
            id = documentId,
            name = fileName,
            contentType = contentType,
            size = tempFile.toFile().length(),
            metadata = metadata,
            chunks = chunks,
          )

        vectorStore.addDocument(ragDocument, chunks)
        logger.info("Successfully processed document: $documentId with ${chunks.size} chunks")

        // Clean up the temporary file
        Files.deleteIfExists(tempFile)

        // Return the document ID
        documentId
      } catch (e: Exception) {
        // Clean up the temporary file in case of error
        Files.deleteIfExists(tempFile)

        // Log the error and rethrow with a more specific exception
        logger.error("Error processing document: ${e.message}", e)
        throw when (e) {
          is DocumentProcessingException -> e
          is EmbeddingGenerationException -> e
          is StorageException -> e
          else -> DocumentProcessingException("Failed to process document: ${e.message}", e)
        }
      }
    }

  /**
   * Creates a temporary file with the given name.
   *
   * @param originalName The original file name
   * @return The path to the created temporary file
   */
  private fun createTempFile(originalName: String): Path {
    val tempDir = Files.createTempDirectory("rag-upload-")
    val extension = originalName.substringAfterLast('.').takeIf { it != originalName } ?: "bin"
    val tempFileName = "${UUID.randomUUID()}.$extension"
    return tempDir.resolve(tempFileName)
  }

  /**
   * Deletes a document and its chunks from the vector store.
   *
   * @param documentId The ID of the document to delete
   * @param collectionName The name of the collection containing the document
   * @return true if the document was found and deleted, false otherwise
   */
  suspend fun deleteDocument(
    documentId: String,
    collectionName: String = "default",
  ): Boolean =
    try {
      val vectorStore = vectorStoreFactory.getOrCreateStore(collectionName)
      vectorStore.removeDocument(documentId)
    } catch (e: Exception) {
      logger.error("Error deleting document $documentId: ${e.message}", e)
      throw StorageException("Failed to delete document: ${e.message}", e)
    }

  /**
   * Gets a document by ID.
   *
   * @param documentId The ID of the document to retrieve
   * @param collectionName The name of the collection containing the document
   * @return The document, or null if not found
   */
  suspend fun getDocument(
    documentId: String,
    collectionName: String = "default",
  ): RagDocument? =
    try {
      val vectorStore = vectorStoreFactory.getOrCreateStore(collectionName)
      vectorStore.getDocument(documentId)
    } catch (e: Exception) {
      logger.error("Error retrieving document $documentId: ${e.message}", e)
      throw StorageException("Failed to retrieve document: ${e.message}", e)
    }

  /**
   * Lists all documents in a collection.
   *
   * @param collectionName The name of the collection to list documents from
   * @return List of documents in the collection
   */
  suspend fun listDocuments(collectionName: String = "default"): List<RagDocument> =
    try {
      val vectorStore = vectorStoreFactory.getOrCreateStore(collectionName)
      vectorStore.listDocuments()
    } catch (e: Exception) {
      logger.error("Error listing documents: ${e.message}", e)
      throw StorageException("Failed to list documents: ${e.message}", e)
    }

  /**
   * Searches for document chunks relevant to a query.
   *
   * @param query The search query
   * @param collectionName The name of the collection to search in
   * @param limit Maximum number of results to return
   * @param minScore Minimum similarity score (0-1) for results
   * @return List of search results with relevance scores
   */
  suspend fun search(
    query: String,
    collectionName: String = "default",
    limit: Int = 10,
    minScore: Double = 0.7,
  ): List<Pair<RagDocumentChunk, Double>> =
    try {
      // Generate embedding for the query
      val queryEmbedding = embeddingService.embedText(query)

      // Search for similar chunks in the vector store
      val vectorStore = vectorStoreFactory.getOrCreateStore(collectionName)
      val results =
        vectorStore.similaritySearch(
          embedding = queryEmbedding,
          limit = limit,
          minScore = minScore,
        )

      // Map results to include document chunks and scores
      results.map { (chunk, score) ->
        chunk to score
      }
    } catch (e: Exception) {
      logger.error("Error searching for '$query': ${e.message}", e)
      throw SearchException("Search failed: ${e.message}", e)
    }

  /**
   * Generates an answer to a question using the RAG system.
   *
   * @param question The question to answer
   * @param collectionName The name of the collection to search in
   * @param maxResults Maximum number of relevant chunks to consider
   * @param minScore Minimum similarity score for chunks
   * @return Generated answer with relevant context
   */
  suspend fun generateAnswer(
    question: String,
    collectionName: String = "default",
    maxResults: Int = 5,
    minScore: Double = 0.7,
  ): RagAnswer {
    // First, find relevant document chunks
    val relevantChunks = search(question, collectionName, maxResults, minScore)

    if (relevantChunks.isEmpty()) {
      return RagAnswer(
        answer = "I couldn't find any relevant information to answer your question.",
        sources = emptyList(),
      )
    }

    // For now, just concatenate the most relevant chunks as a simple answer
    // In a real implementation, you would use an LLM to generate a more coherent answer
    val answerText =
      relevantChunks.joinToString("\n\n") { (chunk, score) ->
        "[Relevance: ${String.format("%.2f", score * 100)}%]\n${chunk.text}"
      }

    return RagAnswer(
      answer = answerText,
      sources = relevantChunks.map { it.first },
      metadata =
        mapOf(
          "chunkCount" to relevantChunks.size,
          "avgScore" to relevantChunks.map { it.second }.average(),
        ),
    )
  }
}
