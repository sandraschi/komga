package org.gotson.komga.infrastructure.llm.service

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import mu.KotlinLogging
import org.gotson.komga.infrastructure.llm.LlmServiceFactory
import org.gotson.komga.infrastructure.llm.model.LlmModel
import org.gotson.komga.infrastructure.llm.model.LoadModelRequest
import org.gotson.komga.infrastructure.llm.model.ModelOperationResponse
import org.gotson.komga.infrastructure.llm.model.UnloadModelRequest
import org.springframework.scheduling.support.PeriodicTrigger
import java.time.Duration
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.locks.ReentrantLock
import kotlin.concurrent.withLock

private val logger = KotlinLogging.logger {}

/**
 * Manages the lifecycle of LLM models across different providers.
 * Handles loading, unloading, and status tracking of models.
 */
class ModelManager(
  private val llmServiceFactory: LlmServiceFactory,
  private val scheduledExecutor: ScheduledExecutorService,
  private val refreshInterval: Duration = Duration.ofMinutes(5),
  private val autoLoad: Boolean = false,
  private val autoLoadModels: Set<String> = emptySet(),
  private val maxLoadedModels: Int = 3,
) {
  private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
  private val modelStates = ConcurrentHashMap<String, ModelState>()
  private val modelLocks = ConcurrentHashMap<String, Mutex>()
  private val refreshLock = ReentrantLock()
  private val isRefreshing = AtomicBoolean(false)
  private val refreshTrigger = PeriodicTrigger(refreshInterval.toMillis())

  private data class ModelState(
    val model: LlmModel,
    val lastAccessed: Instant = Instant.now(),
    val error: String? = null,
  )

  init {
    // Schedule periodic refresh
    scheduleNextRefresh()

    // Auto-load models if configured
    if (autoLoad && autoLoadModels.isNotEmpty()) {
      scope.launch {
        autoLoadModels.forEach { modelId ->
          try {
            loadModel(LoadModelRequest(modelId))
          } catch (e: Exception) {
            logger.error(e) { "Failed to auto-load model: $modelId" }
          }
        }
      }
    }
  }

  /**
   * List all available models
   */
  suspend fun listModels(): List<LlmModel> =
    withContext(Dispatchers.IO) {
      val service = llmServiceFactory.getActiveService()
      service.listModels()
    }

  /**
   * Get model details
   */
  suspend fun getModel(modelId: String): LlmModel? =
    withContext(Dispatchers.IO) {
      val service = llmServiceFactory.getActiveService()
      service.getModel(modelId)?.let { model ->
        updateModelState(model)
        model
      }
    }

  /**
   * Load a model
   */
  suspend fun loadModel(request: LoadModelRequest): ModelOperationResponse =
    withContext(Dispatchers.IO) {
      val modelId = request.modelId
      val lock = modelLocks.computeIfAbsent(modelId) { Mutex() }

      lock.withLock {
        val currentState = modelStates[modelId]
        if (currentState?.model.loaded == true && !request.force) {
          return@withLock ModelOperationResponse(
            success = true,
            message = "Model $modelId is already loaded",
          )
        }

        try {
          // Enforce max loaded models
          enforceMaxLoadedModels()

          val service = llmServiceFactory.getActiveService()
          val response = service.loadModel(request)

          if (response.success) {
            response.model?.let { updateModelState(it) }
          }

          response
        } catch (e: Exception) {
          val errorMsg = "Failed to load model $modelId: ${e.message}"
          logger.error(e) { errorMsg }
          ModelOperationResponse(
            success = false,
            message = errorMsg,
            model =
              currentState?.model?.copy(
                status = LlmModel.Status.ERROR,
                error = e.message,
              ),
          )
        }
      }
    }

  /**
   * Unload a model
   */
  suspend fun unloadModel(request: UnloadModelRequest): ModelOperationResponse =
    withContext(Dispatchers.IO) {
      val modelId = request.modelId
      val lock = modelLocks.computeIfAbsent(modelId) { Mutex() }

      lock.withLock {
        val currentState = modelStates[modelId]
        if (currentState == null || !currentState.model.loaded) {
          return@withLock ModelOperationResponse(
            success = true,
            message = "Model $modelId is not loaded",
          )
        }

        try {
          val service = llmServiceFactory.getActiveService()
          val response = service.unloadModel(request)

          if (response.success) {
            modelStates.remove(modelId)
          } else if (response.model != null) {
            updateModelState(response.model)
          }

          response
        } catch (e: Exception) {
          val errorMsg = "Failed to unload model $modelId: ${e.message}"
          logger.error(e) { errorMsg }
          ModelOperationResponse(
            success = false,
            message = errorMsg,
            model =
              currentState.model.copy(
                status = LlmModel.Status.ERROR,
                error = e.message,
              ),
          )
        }
      }
    }

  /**
   * Get status of all models
   */
  suspend fun getModelStatuses(): List<LlmModel> =
    withContext(Dispatchers.IO) {
      val service = llmServiceFactory.getActiveService()
      service.getModelStatuses().map { model ->
        updateModelState(model)
        model
      }
    }

  /**
   * Get status of a specific model
   */
  suspend fun getModelStatus(modelId: String): LlmModel? =
    withContext(Dispatchers.IO) {
      val service = llmServiceFactory.getActiveService()
      service.getModelStatus(modelId)?.let { model ->
        updateModelState(model)
        model
      }
    }

  /**
   * Refresh model statuses
   */
  suspend fun refreshModelStatuses(): Unit =
    withContext(Dispatchers.IO) {
      if (!isRefreshing.compareAndSet(false, true)) {
        logger.debug { "Refresh already in progress" }
        return@withContext
      }

      try {
        logger.debug { "Refreshing model statuses" }
        getModelStatuses()
      } catch (e: Exception) {
        logger.error(e) { "Failed to refresh model statuses" }
      } finally {
        isRefreshing.set(false)
        scheduleNextRefresh()
      }
    }

  private fun updateModelState(model: LlmModel) {
    modelStates.compute(model.id) { _, current ->
      current?.copy(
        model = model,
        lastAccessed = Instant.now(),
        error = null,
      ) ?: ModelState(model)
    }
  }

  private suspend fun enforceMaxLoadedModels() {
    if (modelStates.size < maxLoadedModels) return

    // Find the least recently used model that's not in autoLoadModels
    val modelToUnload =
      modelStates.values
        .filter { it.model.id !in autoLoadModels }
        .minByOrNull { it.lastAccessed }
        ?: return

    logger.info { "Reached max loaded models ($maxLoadedModels), unloading least recently used: ${modelToUnload.model.id}" }
    unloadModel(UnloadModelRequest(modelToUnload.model.id, force = true))
  }

  private fun scheduleNextRefresh() {
    val delay = refreshTrigger.nextExecutionTime(System.currentTimeMillis()) - System.currentTimeMillis()
    scheduledExecutor.schedule(
      { scope.launch { refreshModelStatuses() } },
      delay,
      TimeUnit.MILLISECONDS,
    )
  }

  /**
   * Shutdown the model manager
   */
  fun shutdown() {
    scope.cancel("ModelManager shutdown")
    scheduledExecutor.shutdown()
  }
}
