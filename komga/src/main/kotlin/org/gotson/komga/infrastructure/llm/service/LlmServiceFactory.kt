package org.gotson.komga.infrastructure.llm.service

import mu.KotlinLogging
import org.gotson.komga.infrastructure.llm.model.LlmProvider
import org.gotson.komga.infrastructure.llm.config.*
import org.gotson.komga.infrastructure.llm.exception.LlmException
import org.springframework.context.ApplicationContext
import org.springframework.stereotype.Component

/**
 * Factory for creating and managing LLM service instances.
 *
 * This factory is responsible for:
 * 1. Creating the appropriate service instance based on configuration
 * 2. Managing the lifecycle of service instances
 * 3. Providing a way to get the active service
 */
@Component
class LlmServiceFactory(
    private val config: LlmConfig,
    private val applicationContext: ApplicationContext,
    private val openAIService: OpenAIService?,
    private val ollamaService: OllamaService?,
    private val lmStudioService: LmStudioService?,
    private val vllmService: VllmService?,
    private val googleNoteLmService: GoogleNoteLmService?
) {
    private val logger = KotlinLogging.logger {}
    
    private var activeService: LlmService? = null
    
    init {
        initializeActiveService()
    }
    
    /**
     * Gets the currently active LLM service.
     *
     * @throws IllegalStateException if no service is available
     */
    fun getActiveService(): LlmService {
        return activeService ?: throw IllegalStateException("No LLM service is currently active")
    }
    
    /**
     * Gets the provider of the currently active LLM service.
     */
    fun getActiveProvider(): LlmProvider? = activeService?.provider
    
    /**
     * Checks if a specific provider is enabled in the configuration.
     */
    fun isProviderEnabled(provider: LlmProvider): Boolean {
        return when (provider) {
            LlmProvider.OPENAI -> config.openai.enabled
            LlmProvider.OLLAMA -> config.ollama.enabled
            LlmProvider.LM_STUDIO -> config.lmStudio.enabled
            LlmProvider.VLLM -> config.vllm.enabled
            LlmProvider.GOOGLE_NOTE_LM -> config.googleNoteLm.enabled
        }
    }
    
    /**
     * Gets the service for a specific provider.
     *
     * @throws IllegalArgumentException if the provider is not supported or not enabled
     */
    fun getService(provider: LlmProvider): LlmService {
        return when (provider) {
            LlmProvider.OPENAI -> openAIService ?: throwIllegalState(provider)
            LlmProvider.OLLAMA -> ollamaService ?: throwIllegalState(provider)
            LlmProvider.LM_STUDIO -> lmStudioService ?: throwIllegalState(provider)
            LlmProvider.VLLM -> vllmService ?: throwIllegalState(provider)
            LlmProvider.GOOGLE_NOTE_LM -> googleNoteLmService ?: throwIllegalState(provider)
        }.also {
            if (!isProviderEnabled(provider)) {
                throw IllegalArgumentException("Provider $provider is not enabled in the configuration")
            }
        }
    }
    
    /**
     * Switches the active service to the specified provider.
     *
     * @param provider The provider to switch to
     * @return The newly activated service
     * @throws IllegalArgumentException if the provider is not supported or not enabled
     * @throws LlmException if the service is not available
     */
    suspend fun switchProvider(provider: LlmProvider): LlmService {
        val service = getService(provider)
        
        // Verify the service is available
        if (!service.isAvailable()) {
            throw LlmException("Service for provider $provider is not available")
        }
        
        // Clean up the previous service if it's different
        activeService?.takeIf { it.provider != provider }?.cleanup()
        
        // Set the new active service
        activeService = service
        logger.info { "Switched active LLM service to $provider" }
        
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
        val defaultProvider = try {
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
            val fallbackProvider = LlmProvider.values().firstOrNull { provider ->
                provider != defaultProvider && isProviderEnabled(provider) && 
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
    
    private fun throwIllegalState(provider: LlmProvider): Nothing {
        throw IllegalStateException("Service for provider $provider is not available in the application context")
    }
}
