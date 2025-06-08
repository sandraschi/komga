package org.gotson.komga.infrastructure.llm.service

import mu.KotlinLogging
import org.gotson.komga.infrastructure.llm.LlmConfig
import org.gotson.komga.infrastructure.llm.exception.LlmException
import org.gotson.komga.infrastructure.llm.model.LlmProvider
import org.gotson.komga.infrastructure.llm.util.RateLimiter
import org.springframework.beans.factory.DisposableBean
import org.springframework.context.ApplicationContext
import org.springframework.retry.annotation.Backoff
import org.springframework.retry.annotation.Retryable
import org.springframework.stereotype.Component
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicReference
import kotlin.time.Duration.Companion.seconds

/**
 * Factory for creating and managing LLM service instances with the following features:
 * - Service instance management with lifecycle control
 * - Automatic service discovery based on configuration
 * - Provider-specific rate limiting
 * - Thread-safe operations
 * - Graceful shutdown
 */
@Component
class LlmServiceFactory(
  private val config: LlmConfig,
  private val applicationContext: ApplicationContext,
  private val openAIService: OpenAIService?,
  private val ollamaService: OllamaService?,
  private val lmStudioService: LmStudioService?,
  private val vllmService: VllmService?,
  private val googleNoteLmService: GoogleNoteLmService?,
) : DisposableBean {
  private val logger = KotlinLogging.logger {}

  private val activeService = AtomicReference<LlmService?>(null)
  private val serviceCache = ConcurrentHashMap<LlmProvider, LlmService>()
  private val rateLimiters = ConcurrentHashMap<LlmProvider, RateLimiter>()
  private val lock = Any()

  init {
    initializeRateLimiters()
    initializeActiveService()
  }

  private fun initializeRateLimiters() {
    // Initialize rate limiters for each provider
    LlmProvider.values().forEach { provider ->
      rateLimiters[provider] = createRateLimiterForProvider(provider)
    }
  }

  private fun createRateLimiterForProvider(provider: LlmProvider): RateLimiter {
    val requestsPerMinute =
      when (provider) {
        LlmProvider.OPENAI -> config.rateLimit.requestsPerMinute
        LlmProvider.OLLAMA -> config.rateLimit.requestsPerMinute * 2 // Ollama can handle more requests
        LlmProvider.LM_STUDIO -> config.rateLimit.requestsPerMinute * 2
        LlmProvider.VLLM -> config.rateLimit.requestsPerMinute
        LlmProvider.GOOGLE_NOTE_LM -> (config.rateLimit.requestsPerMinute * 0.5).toInt() // More restrictive
      }.coerceAtLeast(1)

    return RateLimiter(
      maxRequests = requestsPerMinute,
      timeWindow = 60.seconds,
      maxConcurrent = config.rateLimit.maxConcurrent,
    )
  }

  /**
   * Gets the currently active LLM service.
   *
   * @throws IllegalStateException if no service is available
   */
  fun getActiveService(): LlmService =
    activeService.get() ?: throw IllegalStateException(
      "No LLM service is currently active. Check configuration and ensure at least one provider is enabled.",
    )

  /**
   * Gets the provider of the currently active LLM service.
   */
  fun getActiveProvider(): LlmProvider? = activeService.get()?.provider

  /**
   * Checks if a specific provider is enabled in the configuration.
   */
  fun isProviderEnabled(provider: LlmProvider): Boolean =
    when (provider) {
      LlmProvider.OPENAI -> config.openai.enabled && openAIService != null
      LlmProvider.OLLAMA -> config.ollama.enabled && ollamaService != null
      LlmProvider.LM_STUDIO -> config.lmStudio.enabled && lmStudioService != null
      LlmProvider.VLLM -> config.vllm.enabled && vllmService != null
      LlmProvider.GOOGLE_NOTE_LM -> config.googleNoteLm.enabled && googleNoteLmService != null
    }

  /**
   * Gets the service for a specific provider with caching.
   *
   * @throws IllegalArgumentException if the provider is not supported or not enabled
   * @throws LlmException if the service fails to initialize
   */
  @Synchronized
  fun getService(provider: LlmProvider): LlmService {
    // Return cached instance if available
    serviceCache[provider]?.let { return it }

    // Create and cache new instance
    return when (provider) {
      LlmProvider.OPENAI -> openAIService ?: throwIllegalState(provider)
      LlmProvider.OLLAMA -> ollamaService ?: throwIllegalState(provider)
      LlmProvider.LM_STUDIO -> lmStudioService ?: throwIllegalState(provider)
      LlmProvider.VLLM -> vllmService ?: throwIllegalState(provider)
      LlmProvider.GOOGLE_NOTE_LM -> googleNoteLmService ?: throwIllegalState(provider)
    }.also { service ->
      if (!isProviderEnabled(provider)) {
        throw IllegalArgumentException("Provider $provider is not enabled in the configuration")
      }
      serviceCache[provider] = service
      logger.info { "Initialized LLM service for provider: $provider" }
    }
  }

  /**
   * Switches the active service to the specified provider with retry on failure.
   *
   * @param provider The provider to switch to
   * @param maxAttempts Maximum number of attempts (default: 3)
   * @param initialBackoffMs Initial backoff in milliseconds (default: 1000)
   * @return The newly activated service
   * @throws IllegalArgumentException if the provider is not supported or not enabled
   * @throws LlmException if the service fails to initialize after all retries
   */
  @Retryable(
    value = [LlmException::class],
    maxAttempts = 3,
    backoff = Backoff(delay = 1000, multiplier = 2.0),
  )
  suspend fun switchProvider(
    provider: LlmProvider,
    maxAttempts: Int = 3,
    initialBackoffMs: Long = 1000,
  ): LlmService =
    synchronized(lock) {
      logger.info { "Switching to LLM provider: $provider" }

      try {
        val service = getService(provider)

        // Verify the service is available
        if (!service.isAvailable()) {
          throw LlmException.ServiceUnavailableException(
            "Service for provider $provider is not available",
          )
        }

        // Clean up the previous service if it's different
        activeService.getAndSet(service)?.takeIf { it.provider != provider }?.cleanup()

        logger.info { "Successfully switched to LLM provider: $provider" }
        service
      } catch (e: Exception) {
        logger.error(e) { "Failed to switch to provider $provider" }
        throw e
      }
      return service
    }

  /**
   * Initializes the active service based on configuration.
   */
  private suspend fun initializeActiveService() {
    if (!config.enabled) {
      logger.info { "LLM service is disabled in configuration" }
      return
    }

    // Try to initialize the default provider first
    val defaultProvider =
      try {
        LlmProvider.valueOf(config.defaultProvider.uppercase())
      } catch (e: IllegalArgumentException) {
        logger.error(e) { "Invalid default LLM provider: ${config.defaultProvider}" }
        return
      }

    logger.info { "Initializing LLM service with default provider: $defaultProvider" }

    // Try to switch to the default provider
    try {
      switchProvider(defaultProvider)
    } catch (e: Exception) {
      logger.error(e) { "Failed to initialize default LLM provider $defaultProvider" }

      // Fall back to any available provider
      val fallbackProvider =
        LlmProvider.values().firstOrNull { provider ->
          provider != defaultProvider &&
            isProviderEnabled(provider) &&
            runCatching { getService(provider).isAvailable() }.getOrElse { false }
        }

      if (fallbackProvider != null) {
        logger.warn { "Falling back to $fallbackProvider as the active LLM provider" }
        switchProvider(fallbackProvider)
      } else {
        logger.warn { "No LLM providers are available" }
      }
    }
  }

  private fun throwIllegalState(provider: LlmProvider): Nothing = throw IllegalStateException("Service for provider $provider is not available in the application context")

  /**
   * Cleans up all LLM services when the application shuts down.
   */
  override fun destroy() {
    logger.info("Shutting down LLM services...")

    // Clean up the active service
    activeService.get()?.let { service ->
      try {
        logger.info { "Cleaning up active LLM service: ${service.provider}" }
        service.cleanup()
      } catch (e: Exception) {
        logger.error(e) { "Error cleaning up LLM service: ${service.provider}" }
      }
    }

    // Clean up all cached services
    serviceCache.values.forEach { service ->
      try {
        if (service !== activeService.get()) {
          logger.info { "Cleaning up LLM service: ${service.provider}" }
          service.cleanup()
        }
      } catch (e: Exception) {
        logger.error(e) { "Error cleaning up LLM service: ${service.provider}" }
      }
    }

    // Clear caches
    serviceCache.clear()
    rateLimiters.clear()
    activeService.set(null)

    logger.info("LLM services shutdown complete")
  }
}
