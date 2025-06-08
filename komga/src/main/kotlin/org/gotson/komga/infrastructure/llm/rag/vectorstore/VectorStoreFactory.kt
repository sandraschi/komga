package org.gotson.komga.infrastructure.llm.rag.vectorstore

import org.gotson.komga.infrastructure.llm.rag.model.RagConfig
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component

/**
 * Factory for creating and managing vector store instances.
 */
@Component
class VectorStoreFactory(
  private val ragConfig: RagConfig,
) {
  private val logger = LoggerFactory.getLogger(javaClass)
  private val stores = mutableMapOf<String, VectorStore>()

  /**
   * Gets or creates a vector store for the specified collection.
   *
   * @param collectionName The name of the collection to get or create a store for
   * @return The vector store instance
   */
  suspend fun getOrCreateStore(collectionName: String): VectorStore =
    stores.getOrPut(collectionName) {
      createStore(collectionName).also { store ->
        store.initialize()
        logger.info("Initialized vector store for collection: $collectionName")
      }
    }

  /**
   * Creates a new vector store instance based on configuration.
   *
   * @param collectionName The name of the collection to create a store for
   * @return A new vector store instance
   */
  private fun createStore(collectionName: String): VectorStore =
    when (val type = ragConfig.storage.type) {
      RagConfig.StorageType.MEMORY -> {
        logger.debug("Creating in-memory vector store for collection: $collectionName")
        InMemoryVectorStore()
      }

      RagConfig.StorageType.FILESYSTEM -> {
        throw UnsupportedOperationException("Filesystem vector store not yet implemented")
      }

      RagConfig.StorageType.DATABASE -> {
        throw UnsupportedOperationException("Database vector store not yet implemented")
      }

      RagConfig.StorageType.OBJECT_STORAGE -> {
        throw UnsupportedOperationException("Object storage vector store not yet implemented")
      }
    }.also { store ->
      logger.info("Created $type vector store for collection: $collectionName")
    }

  /**
   * Gets an existing vector store for the specified collection, if it exists.
   *
   * @param collectionName The name of the collection
   * @return The vector store instance, or null if not found
   */
  fun getStore(collectionName: String): VectorStore? = stores[collectionName]

  /**
   * Removes and cleans up a vector store for the specified collection.
   *
   * @param collectionName The name of the collection to remove
   * @return true if the store was found and removed, false otherwise
   */
  suspend fun removeStore(collectionName: String): Boolean =
    stores.remove(collectionName)?.let { store ->
      store.cleanup()
      logger.info("Removed and cleaned up vector store for collection: $collectionName")
      true
    } ?: false

  /**
   * Gets statistics for all vector stores.
   *
   * @return A map of collection names to their statistics
   */
  suspend fun getAllStats(): Map<String, Map<String, Any>> =
    stores.mapValues { (_, store) ->
      store.getStats()
    }

  /**
   * Cleans up all vector stores.
   */
  suspend fun cleanupAll() {
    stores.values.forEach { store ->
      try {
        store.cleanup()
      } catch (e: Exception) {
        logger.error("Error cleaning up vector store", e)
      }
    }
    stores.clear()
    logger.info("Cleaned up all vector stores")
  }
}
