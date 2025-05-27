/**
 * # LLM Service Module
 * 
 * This module provides integration with various Large Language Model (LLM) providers.
 * It supports multiple backends including OpenAI, Ollama, vLLM, LM Studio, and Google NoteLM.
 * 
 * ## Features
 * - Unified interface for different LLM providers
 * - Automatic provider selection based on configuration
 * - Model management (load/unload)
 * - Connection testing and health checks
 * - Configurable parameters (temperature, max tokens, etc.)
 * - Comprehensive error handling and logging
 * 
 * ## Configuration
 * The service is configured via `application.yml` under the `komga.llm` prefix.
 * Each provider has its own configuration section.
 * 
 * @see LlmConfig for configuration properties
 * @see LlmModelManager for model management
 */
package org.gotson.komga.infrastructure.llm

import mu.KotlinLogging
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Primary
import org.springframework.context.annotation.Profile
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpMethod
import org.springframework.http.MediaType
import org.springframework.retry.annotation.Backoff
import org.springframework.retry.annotation.Retryable
import org.springframework.retry.support.RetryTemplate
import org.springframework.stereotype.Service
import org.springframework.web.client.HttpClientErrorException
import org.springframework.web.client.HttpServerErrorException
import org.springframework.web.client.RestClientException
import org.springframework.web.client.RestTemplate
import org.springframework.web.client.exchange
import java.net.URI
import java.time.Duration
import java.time.Instant
import java.util.concurrent.TimeUnit
import javax.annotation.PreDestroy

private val logger = KotlinLogging.logger {}

/**
 * Configuration class for the LLM service.
 * 
 * @property enabled Whether the LLM service is enabled
 * @property defaultProvider The default LLM provider to use (e.g., "openai", "ollama", "vllm")
 * @property openai Configuration for OpenAI
 * @property ollama Configuration for Ollama
 * @property lmStudio Configuration for LM Studio
 * @property vllm Configuration for vLLM
 * @property googleNoteLm Configuration for Google NoteLM
 */
@ConfigurationProperties(prefix = "komga.llm")
data class LlmConfig(
    var enabled: Boolean = false,
    var defaultProvider: String = "openai",
    val openai: OpenAIConfig = OpenAIConfig(),
    val ollama: OllamaConfig = OllamaConfig(),
    val lmStudio: LmStudioConfig = LmStudioConfig(),
    val vllm: VllmConfig = VllmConfig(),
    val googleNoteLm: GoogleNoteLmConfig = GoogleNoteLmConfig()
) {
    /**
     * Configuration for OpenAI API.
     * 
     * @property enabled Whether the OpenAI provider is enabled
     * @property apiKey The API key for authentication
     * @property organizationId Optional organization ID
     * @property apiUrl The base URL for the API (default: "https://api.openai.com/v1")
     * @property model The default model to use (default: "gpt-4")
     * @property embeddingModel The model to use for embeddings (default: "text-embedding-ada-002")
     * @property temperature The temperature for generation (0.0 to 2.0)
     * @property maxTokens The default maximum number of tokens to generate
     * @property timeoutSeconds Request timeout in seconds
     * @property maxRetries Maximum number of retries for failed requests
     * @property rateLimitRequestsPerMinute Maximum requests per minute (for rate limiting)
     */
    data class OpenAIConfig(
        var enabled: Boolean = false,
        var apiKey: String = "",
        var organizationId: String? = null,
        var apiUrl: String = "https://api.openai.com/v1",
        var model: String = "gpt-4",
        var embeddingModel: String = "text-embedding-ada-002",
        var temperature: Double = 0.7,
        var maxTokens: Int = 1000,
        var timeoutSeconds: Long = 30,
        var maxRetries: Int = 3,
        var rateLimitRequestsPerMinute: Int = 60
    )
    
    /**
     * Configuration for Ollama.
     * 
     * @property enabled Whether the Ollama provider is enabled
     * @property apiUrl The base URL for the Ollama API (default: "http://localhost:11434")
     * @property model The default model to use (default: "llama2")
     * @property temperature The temperature for generation (0.0 to 2.0)
     * @property maxTokens The default maximum number of tokens to generate
     * @property timeoutSeconds Request timeout in seconds
     * @property contextWindow The context window size in tokens
     */
    data class OllamaConfig(
        var enabled: Boolean = false,
        var apiUrl: String = "http://localhost:11434",
        var model: String = "llama2",
        var temperature: Double = 0.7,
        var maxTokens: Int = 2000,
        var timeoutSeconds: Long = 120,
        var contextWindow: Int = 4096
    )
    
    /**
     * Configuration for LM Studio.
     * 
     * @property enabled Whether the LM Studio provider is enabled
     * @property apiUrl The base URL for the LM Studio API (default: "http://localhost:1234/v1")
     * @property model The model to use (LM Studio loads models automatically)
     * @property temperature The temperature for generation (0.0 to 2.0)
     * @property maxTokens The default maximum number of tokens to generate
     * @property timeoutSeconds Request timeout in seconds
     */
    data class LmStudioConfig(
        var enabled: Boolean = false,
        var apiUrl: String = "http://localhost:1234/v1",
        var model: String = "local-model",
        var temperature: Double = 0.7,
        var maxTokens: Int = 2000,
        var timeoutSeconds: Long = 120
    )
    
    /**
     * Configuration for vLLM.
     * 
     * @property enabled Whether the vLLM provider is enabled
     * @property apiUrl The base URL for the vLLM API (default: "http://localhost:8000/v1")
     * @property model The model to use (must be loaded in vLLM)
     * @property temperature The temperature for generation (0.0 to 2.0)
     * @property maxTokens The default maximum number of tokens to generate
     * @property timeoutSeconds Request timeout in seconds
     */
    data class VllmConfig(
        var enabled: Boolean = false,
        var apiUrl: String = "http://localhost:8000/v1",
        var model: String = "gpt2",
        var temperature: Double = 0.7,
        var maxTokens: Int = 2000,
        var timeoutSeconds: Long = 120
    )
    
    /**
     * Configuration for Google NoteLM.
     * 
     * @property enabled Whether the Google NoteLM provider is enabled
     * @property apiKey The API key for authentication
     * @property projectId The Google Cloud project ID
     * @property location The location/region of the NoteLM service
     * @property model The model to use (e.g., "note-lm")
     * @property temperature The temperature for generation (0.0 to 1.0)
     * @property maxTokens The default maximum number of tokens to generate
     * @property timeoutSeconds Request timeout in seconds
     */
    data class GoogleNoteLmConfig(
        var enabled: Boolean = false,
        var apiKey: String = "",
        var projectId: String = "",
        var location: String = "us-central1",
        var model: String = "note-lm",
        var temperature: Double = 0.7,
        var maxTokens: Int = 1024,
        var timeoutSeconds: Long = 60
    )
}

/**
 * Exception thrown when an error occurs in the LLM service.
 * 
 * @property message The detail message
 * @property cause The cause of the exception
 * @property retryable Whether the operation can be retried
 * @property errorType The type of error that occurred
 */
class LlmException(
    override val message: String,
    override val cause: Throwable? = null,
    val retryable: Boolean = true,
    val errorType: ErrorType = ErrorType.UNKNOWN
) : RuntimeException(message, cause) {
    /**
     * Types of errors that can occur in the LLM service.
     */
    enum class ErrorType {
        /** An unknown error occurred */
        UNKNOWN,
        
        /** The request was invalid */
        INVALID_REQUEST,
        
        /** Authentication failed */
        AUTHENTICATION,
        
        /** The request was rate limited */
        RATE_LIMIT,
        
        /** The server is currently unavailable */
        UNAVAILABLE,
        
        /** The model was not found */
        MODEL_NOT_FOUND,
        
        /** The request was cancelled */
        CANCELLED,
        
        /** The response was incomplete */
        INCOMPLETE_RESPONSE,
        
        /** The request timed out */
        TIMEOUT,
        
        /** The server returned an error */
        SERVER_ERROR,
        
        /** The operation is not supported by this provider */
        UNSUPPORTED_OPERATION
    }
    
    companion object {
        /**
         * Creates a new LlmException from an HTTP status code.
         * 
         * @param statusCode The HTTP status code
         * @param message The error message
         * @param cause The cause of the exception
         * @return A new LlmException
         */
        fun fromStatusCode(
            statusCode: Int,
            message: String,
            cause: Throwable? = null
        ): LlmException {
            val (errorType, retryable) = when (statusCode) {
                400 -> ErrorType.INVALID_REQUEST to false
                401, 403 -> ErrorType.AUTHENTICATION to false
                404 -> ErrorType.MODEL_NOT_FOUND to false
                408, 499 -> ErrorType.TIMEOUT to true
                429 -> ErrorType.RATE_LIMIT to true
                500, 502, 503, 504 -> ErrorType.UNAVAILABLE to true
                else -> ErrorType.UNKNOWN to true
            }
            
            return LlmException(
                message = message,
                cause = cause,
                retryable = retryable,
                errorType = errorType
            )
        }
        
        /**
         * Creates a new LlmException from an exception.
         */
        fun fromException(e: Exception): LlmException {
            return when (e) {
                is LlmException -> e
                is HttpClientErrorException -> fromStatusCode(
                    e.statusCode.value(),
                    e.responseBodyAsString ?: e.message ?: "HTTP error: ${e.statusCode}",
                    e
                )
                is HttpServerErrorException -> fromStatusCode(
                    e.statusCode.value(),
                    e.responseBodyAsString ?: e.message ?: "Server error: ${e.statusCode}",
                    e
                )
                is RestClientException -> LlmException(
                    message = "Network error: ${e.message}",
                    cause = e,
                    retryable = true,
                    errorType = ErrorType.UNAVAILABLE
                )
                else -> LlmException(
                    message = e.message ?: "Unknown error",
                    cause = e,
                    retryable = false,
                    errorType = ErrorType.UNKNOWN
                )
            }
        }
    }
}

/**
 * Core interface for interacting with various Language Model (LLM) providers.
 * 
 * This interface defines the contract that all LLM service implementations must follow,
 * allowing for easy swapping of different LLM providers while maintaining a consistent API.
 * 
 * Implementations should handle their own authentication, request formatting, and response parsing
 * specific to their respective LLM provider.
 * 
 * @property provider The LLM provider this service connects to (e.g., OpenAI, Ollama, etc.)
 */
interface LlmService {
    val provider: LlmModelManager.LlmProvider
    
    /**
     * Checks if the LLM service is currently available and accessible.
     * 
     * This should verify that:
     * 1. The service is properly configured
     * 2. Network connectivity to the service is available
     * 3. Authentication credentials are valid (if applicable)
     * 
     * @return `true` if the service is available, `false` otherwise
     */
    suspend fun isAvailable(): Boolean
    
    /**
     * Generates text completion based on the provided prompt.
     * 
     * @param prompt The input text to generate a completion for
     * @param maxTokens The maximum number of tokens to generate in the response
     * @param temperature Controls randomness in the generation (0.0 to 1.0)
     * @param stopSequences Optional list of strings where the API will stop generating further tokens
     * @return The generated text completion
     * @throws LlmException if there's an error during generation
     */
    @Throws(LlmException::class)
    suspend fun generateCompletion(
        prompt: String,
        maxTokens: Int = 1000,
        temperature: Double = 0.7,
        stopSequences: List<String> = emptyList()
    ): String
    
    /**
     * Generates a chat completion using a conversation-style format.
     * 
     * @param messages List of message objects forming the conversation
     * @param maxTokens The maximum number of tokens to generate in the response
     * @param temperature Controls randomness in the generation (0.0 to 1.0)
     * @param functions Optional list of function definitions the model may call
     * @param functionCall Controls how the model responds to function calls
     * @return The generated chat completion
     * @throws LlmException if there's an error during generation
     */
    @Throws(LlmException::class)
    suspend fun generateChatCompletion(
        messages: List<ChatMessage>,
        maxTokens: Int = 1000,
        temperature: Double = 0.7,
        functions: List<FunctionDefinition> = emptyList(),
        functionCall: FunctionCall? = null
    ): ChatCompletion
    
    /**
     * Embeds the input text into a vector representation.
     * 
     * @param input The text to embed
     * @return A list of floating-point numbers representing the embedding
     * @throws LlmException if embedding generation fails
     */
    @Throws(LlmException::class)
    suspend fun createEmbedding(input: String): List<Double>
}

/**
 * Represents a message in a chat conversation.
 * 
 * @property role The role of the message sender (system, user, assistant, or function)
 * @property content The content of the message
 * @property name Optional name of the message sender
 * @property functionCall Optional function call details if the message is a function call
 */
data class ChatMessage(
    val role: MessageRole,
    val content: String,
    val name: String? = null,
    val functionCall: FunctionCall? = null
)

/**
 * Represents the role of a message sender in a chat conversation.
 */
enum class MessageRole {
    SYSTEM,    // System message that sets the behavior of the assistant
    USER,      // Message from the user
    ASSISTANT, // Message from the assistant
    FUNCTION   // Message representing a function call result
}

/**
 * Represents a function call made by the model.
 * 
 * @property name The name of the function to call
 * @property arguments The arguments to call the function with, as JSON string
 */
data class FunctionCall(
    val name: String,
    val arguments: String
) {
    /**
     * Creates a function call that forces the model to call a specific function.
     */
    data class Name(val name: String) : FunctionCall(name, "")
    
    /**
     * The model can choose between calling a function or responding to the user.
     */
    object Auto : FunctionCall("auto", "")
    
    /**
     * The model will not call any function and will instead respond to the user.
     */
    object None : FunctionCall("none", "")
}

/**
 * Represents a function definition that the model can call.
 * 
 * @property name The name of the function
 * @property description A description of what the function does
 * @property parameters The parameters the function accepts, described as a JSON Schema object
 */
data class FunctionDefinition(
    val name: String,
    val description: String,
    val parameters: Map<String, Any>  // JSON Schema
)

/**
 * Represents a chat completion response.
 * 
 * @property content The generated message content
 * @property role The role of the message (typically "assistant")
 * @property functionCall Optional function call that the model wants to make
 * @property finishReason The reason the model stopped generating tokens
 */
data class ChatCompletion(
    val content: String,
    val role: MessageRole = MessageRole.ASSISTANT,
    val functionCall: FunctionCall? = null,
    val finishReason: String? = null
)

/**
 * Implementation of [LlmService] for OpenAI's API.
 * 
 * This service provides access to OpenAI's language models like GPT-4 and GPT-3.5.
 * It supports both chat completions and text embeddings.
 * 
 * @property config Configuration for the OpenAI service
 * @property restTemplate The HTTP client for making requests
 */
@Service
@Profile("openai")
class OpenAIService(
    private val config: LlmConfig.OpenAIConfig,
    private val restTemplate: RestTemplate = RestTemplate()
) : LlmService {
    
    override val provider = LlmModelManager.LlmProvider.OPENAI
    
    private val objectMapper = jacksonObjectMapper()
    
    init {
        // Add authentication and common headers to all requests
        restTemplate.interceptors.add { request, body, execution ->
            // Add API key
            request.headers.set("Authorization", "Bearer ${config.apiKey}")
            
            // Add organization ID if configured
            config.organizationId?.takeIf { it.isNotBlank() }?.let { orgId ->
                request.headers.set("OpenAI-Organization", orgId)
            }
            
            // Add request ID for tracing
            request.headers.set("OpenAI-Request-ID", UUID.randomUUID().toString())
            request.headers.contentType = MediaType.APPLICATION_JSON
            request.headers.accept = listOf(MediaType.APPLICATION_JSON)
            
            execution.execute(request, body)
        }
        
        // Configure request factory with timeouts
        val requestFactory = HttpComponentsClientHttpRequestFactory().apply {
            connectTimeout = config.timeoutSeconds * 1000
            readTimeout = config.timeoutSeconds * 1000
        }
        restTemplate.requestFactory = requestFactory
    }
    
    @PreDestroy
    fun cleanup() {
        // Clean up any resources if needed
    }
    
    override suspend fun isAvailable(): Boolean {
        return try {
            val response = restTemplate.exchange<Map<String, Any>>(
                "${config.apiUrl}/models",
                HttpMethod.GET,
                null
            )
            response.statusCode.is2xx
        } catch (e: Exception) {
            logger.error(e) { "OpenAI API is not available" }
            false
        }
    }
    
    @Retryable(
        value = [LlmException::class],
        maxAttempts = 3,
        backoff = Backoff(delay = 1000, multiplier = 2.0),
        exclude = [LlmException::class]
    )
    override suspend fun generateCompletion(
        prompt: String,
        maxTokens: Int,
        temperature: Double,
        stopSequences: List<String>
    ): String {
        logger.debug { "Generating completion with model: ${config.model}" }
        
        val request = buildMap<String, Any> {
            put("model", config.model)
            put("prompt", prompt)
            put("max_tokens", maxTokens)
            put("temperature", temperature.coerceIn(0.0, 2.0))
            if (stopSequences.isNotEmpty()) {
                put("stop", stopSequences)
            }
        }
        
        return try {
            val response = restTemplate.postForObject<Map<String, Any>>(
                URI("${config.apiUrl}/v1/completions"),
                request
            )
            
            (response?.get("choices") as? List<*>)?.firstOrNull()
                ?.let { (it as? Map<*, *>)?.get("text") as? String }
                ?.trim()
                ?: throw LlmException("No completion in response", errorType = LlmException.ErrorType.INCOMPLETE_RESPONSE)
                
        } catch (e: Exception) {
            throw LlmException.fromException(e)
        }
    }
    
    @Retryable(
        value = [LlmException::class],
        maxAttempts = 3,
        backoff = Backoff(delay = 1000, multiplier = 2.0),
        exclude = [LlmException::class]
    )
    override suspend fun generateChatCompletion(
        messages: List<ChatMessage>,
        maxTokens: Int,
        temperature: Double,
        functions: List<FunctionDefinition>,
        functionCall: FunctionCall?
    ): ChatCompletion {
        logger.debug { "Generating chat completion with model: ${config.model}" }
        
        val request = buildMap<String, Any> {
            put("model", config.model)
            put("messages", messages.map { message ->
                buildMap<String, Any?> {
                    put("role", message.role.toString().lowercase())
                    put("content", message.content)
                    message.name?.let { put("name", it) }
                    message.functionCall?.let { fc ->
                        put("function_call", mapOf(
                            "name" to fc.name,
                            "arguments" to fc.arguments
                        ))
                    }
                }
            })
            put("max_tokens", maxTokens)
            put("temperature", temperature.coerceIn(0.0, 2.0))
            
            if (functions.isNotEmpty()) {
                put("functions", functions.map { func ->
                    mapOf(
                        "name" to func.name,
                        "description" to func.description,
                        "parameters" to func.parameters
                    )
                })
            }
            
            functionCall?.let { fc ->
                put("function_call", when (fc) {
                    is FunctionCall.Name -> mapOf("name" to fc.name)
                    is FunctionCall.Auto -> "auto"
                    is FunctionCall.None -> "none"
                    else -> "auto"
                })
            }
        }
        
        return try {
            val response = restTemplate.postForObject<Map<String, Any>>(
                URI("${config.apiUrl}/v1/chat/completions"),
                request
            )
            
            val choice = (response?.get("choices") as? List<*>)?.firstOrNull() as? Map<*, *>
                ?: throw LlmException("No choices in response", errorType = LlmException.ErrorType.INCOMPLETE_RESPONSE)
                
            val message = (choice["message"] as? Map<*, *>)
                ?: throw LlmException("No message in choice", errorType = LlmException.ErrorType.INCOMPLETE_RESPONSE)
                
            val content = message["content"] as? String ?: ""
            val role = MessageRole.valueOf((message["role"] as String).uppercase())
            
            val functionCall = (message["function_call"] as? Map<*, *>)?.let { fc ->
                FunctionCall(
                    name = fc["name"] as String,
                    arguments = fc["arguments"] as String
                )
            }
            
            ChatCompletion(
                content = content,
                role = role,
                functionCall = functionCall,
                finishReason = choice["finish_reason"] as? String
            )
            
        } catch (e: Exception) {
            throw LlmException.fromException(e)
        }
    }
    
    @Retryable(
        value = [LlmException::class],
        maxAttempts = 3,
        backoff = Backoff(delay = 1000, multiplier = 2.0),
        exclude = [LlmException::class]
    )
    override suspend fun createEmbedding(input: String): List<Double> {
        logger.debug { "Creating embedding with model: ${config.embeddingModel}" }
        
        val request = mapOf(
            "model" to config.embeddingModel,
            "input" to input
        )
        
        return try {
            val response = restTemplate.postForObject<Map<String, Any>>(
                URI("${config.apiUrl}/v1/embeddings"),
                request
            )
            
            ((response?.get("data") as? List<*>)?.firstOrNull() as? Map<*, *>)
                ?.get("embedding") as? List<Double>
                ?: throw LlmException("No embedding in response", errorType = LlmException.ErrorType.INCOMPLETE_RESPONSE)
                
        } catch (e: Exception) {
            throw LlmException.fromException(e)
        }
    }
    
    companion object {
        private val logger = KotlinLogging.logger {}
    }
}

/**
 * Manages LLM models across different providers.
 * 
 * This class is responsible for:
 * - Discovering available models from each provider
 * - Loading and unloading models
 * - Tracking active models
 * - Providing model information and statistics
 * 
 * @property config The LLM configuration
 * @property restTemplate The HTTP client for making requests to model APIs
 * @property activeModels Thread-safe map of active model IDs to their information
 */
@Service
class LlmModelManager(
    private val config: LlmConfig,
    private val restTemplate: RestTemplate
) {
    private val activeModels = ConcurrentHashMap<String, ModelInfo>()
    
    /**
     * List all available models from the specified provider.
     * 
     * @param provider The provider to list models from
     * @return List of available models
     */
    suspend fun listAvailableModels(provider: LlmProvider): List<ModelInfo> {
        return when (provider) {
            LlmProvider.OPENAI -> listOpenAIModels()
            LlmProvider.OLLAMA -> listOllamaModels()
            LlmProvider.LM_STUDIO -> listLmStudioModels()
            LlmProvider.VLLM -> listVllmModels()
            LlmProvider.GOOGLE_NOTE_LM -> listGoogleNoteLmModels()
        }
    }
    
    /**
     * Load a model from the specified provider.
     * 
     * @param provider The provider to load the model from
     * @param modelName The name of the model to load
     * @return The model ID if successful
     * @throws LlmException if the model cannot be loaded
     */
    @Throws(LlmException::class)
    suspend fun loadModel(provider: LlmProvider, modelName: String): String {
        return when (provider) {
            LlmProvider.OPENAI -> loadOpenAIModel(modelName)
            LlmProvider.OLLAMA -> loadOllamaModel(modelName)
            LlmProvider.LM_STUDIO -> loadLmStudioModel(modelName)
            LlmProvider.VLLM -> loadVllmModel(modelName)
            LlmProvider.GOOGLE_NOTE_LM -> loadGoogleNoteLmModel(modelName)
        }
    }
    
    /**
     * Unload a model.
     * 
     * @param modelId The ID of the model to unload
     * @return `true` if the model was unloaded, `false` if it wasn't found
     */
    suspend fun unloadModel(modelId: String): Boolean {
        return activeModels.remove(modelId) != null
    }
    
    /**
     * Get information about a loaded model.
     * 
     * @param modelId The ID of the model
     * @return The model information, or `null` if not found
     */
    fun getModelInfo(modelId: String): ModelInfo? {
        return activeModels[modelId]
    }
    
    /**
     * Get all active models.
     * 
     * @return Map of model IDs to their information
     */
    fun getActiveModels(): Map<String, ModelInfo> {
        return activeModels.toMap()
    }
    
    // Implementation for each provider
    
    private suspend fun listOpenAIModels(): List<ModelInfo> {
        if (!config.openai.enabled) return emptyList()
        
        return try {
            val response = restTemplate.exchange<Map<String, Any>>(
                "${config.openai.apiUrl}/models",
                HttpMethod.GET,
                HttpEntity<Any>(createOpenAIHeaders())
            )
            
            (response.body?.get("data") as? List<*>)?.mapNotNull { model ->
                val modelObj = model as? Map<*, *> ?: return@mapNotNull null
                ModelInfo(
                    id = "openai:${modelObj["id"]}",
                    name = modelObj["id"] as? String ?: "unknown",
                    provider = LlmProvider.OPENAI,
                    loaded = true,
                    createdAt = (modelObj["created"] as? Number)?.toLong()?.let { Instant.ofEpochSecond(it) },
                    contextWindow = (modelObj["context_window"] as? Number)?.toInt()
                )
            } ?: emptyList()
        } catch (e: Exception) {
            logger.error(e) { "Failed to list OpenAI models" }
            emptyList()
        }
    }
    
    private suspend fun loadOpenAIModel(modelName: String): String {
        val modelId = "openai:$modelName"
        
        // For OpenAI, we just verify the model exists and add it to active models
        val models = listOpenAIModels()
        val modelInfo = models.find { it.name == modelName }
            ?: throw LlmException("Model $modelName not found in OpenAI", errorType = LlmException.ErrorType.MODEL_NOT_FOUND)
        
        activeModels[modelId] = modelInfo.copy(loaded = true, loadedAt = Instant.now())
        return modelId
    }
    
    private suspend fun listOllamaModels(): List<ModelInfo> {
        if (!config.ollama.enabled) return emptyList()
        
        return try {
            val response = restTemplate.exchange<Map<String, Any>>(
                "${config.ollama.apiUrl}/api/tags",
                HttpMethod.GET,
                null
            )
            
            (response.body?.get("models") as? List<*>)?.mapNotNull { model ->
                val modelObj = model as? Map<*, *> ?: return@mapNotNull null
                ModelInfo(
                    id = "ollama:${modelObj["name"]}",
                    name = modelObj["name"] as? String ?: "unknown",
                    provider = LlmProvider.OLLAMA,
                    loaded = true, // Ollama models are always loaded
                    size = (modelObj["size"] as? Number)?.toLong(),
                    parameters = mapOf(
                        "family" to modelObj["family"],
                        "parameter_size" to modelObj["parameter_size"],
                        "quantization_level" to modelObj["quantization_level"]
                    ).filterValues { it != null } as Map<String, Any>
                )
            } ?: emptyList()
        } catch (e: Exception) {
            logger.error(e) { "Failed to list Ollama models" }
            emptyList()
        }
    }
    
    private suspend fun loadOllamaModel(modelName: String): String {
        val modelId = "ollama:$modelName"
        
        try {
            // Pull the model if it doesn't exist
            restTemplate.postForObject<Map<String, Any>>(
                "${config.ollama.apiUrl}/api/pull",
                mapOf("name" to modelName),
                Map::class.java
            )
            
            // Get model info
            val models = listOllamaModels()
            val modelInfo = models.find { it.name == modelName }
                ?: throw LlmException("Failed to load model $modelName")
            
            activeModels[modelId] = modelInfo.copy(loaded = true, loadedAt = Instant.now())
            return modelId
        } catch (e: Exception) {
            throw LlmException("Failed to load Ollama model: ${e.message}", e)
        }
    }
    
    // Similar implementations for other providers...
    
    private fun createOpenAIHeaders(): HttpHeaders {
        return HttpHeaders().apply {
            set("Authorization", "Bearer ${config.openai.apiKey}")
            config.openai.organizationId?.takeIf { it.isNotBlank() }?.let {
                set("OpenAI-Organization", it)
            }
            contentType = MediaType.APPLICATION_JSON
        }
    }
    
    /**
     * Represents an LLM provider.
     */
    enum class LlmProvider {
        OPENAI,
        OLLAMA,
        LM_STUDIO,
        VLLM,
        GOOGLE_NOTE_LM
    }
    
    /**
     * Information about an LLM model.
     * 
     * @property id Unique identifier for the model (format: "provider:modelName")
     * @property name The name of the model
     * @property provider The provider of the model
     * @property loaded Whether the model is currently loaded
     * @property loadedAt When the model was loaded (if loaded)
     * @property size The size of the model in bytes (if known)
     * @property contextWindow The context window size in tokens (if known)
     * @property parameters Additional model parameters (provider-specific)
     */
    data class ModelInfo(
        val id: String,
        val name: String,
        val provider: LlmProvider,
        val loaded: Boolean = false,
        val loadedAt: Instant? = null,
        val size: Long? = null,
        val contextWindow: Int? = null,
        val parameters: Map<String, Any> = emptyMap()
    )
    
    companion object {
        private val logger = KotlinLogging.logger {}
    }
}

/**
 * Implementation for Ollama
 */
@Service
@Profile("ollama")
class OllamaService(
    private val config: LlmConfig.OllamaConfig,
    private val restTemplate: RestTemplate = RestTemplate()
) : LlmService {
    
    override val provider = LlmModelManager.LlmProvider.OLLAMA
    
    override suspend fun isAvailable(): Boolean {
        return try {
            restTemplate.getForEntity(
                "${config.apiUrl}/api/tags",
                Map::class.java
            ).statusCode.is2xx
        } catch (e: Exception) {
            logger.error(e) { "Ollama API is not available" }
            false
        }
    }
    
    override suspend fun generateAnalysis(prompt: String, maxTokens: Int): String {
        logger.debug { "Sending request to Ollama API (model: ${config.model})" }
        
        val request = mapOf(
            "model" to config.model,
            "prompt" to prompt,
            "stream" to false,
            "options" to mapOf(
                "num_predict" to maxTokens,
                "temperature" to config.temperature
            )
        )
        
        return try {
            val response = restTemplate.postForObject<Map<String, Any>>(
                URI("${config.apiUrl}/api/generate"),
                request
            )
            
            response?.get("response") as? String
                ?: throw LlmException("No content in Ollama response")
                
        } catch (e: Exception) {
            logger.error(e) { "Ollama API request failed" }
            throw LlmException("Failed to generate analysis: ${e.message}", e)
        }
    }
}

/**
 * Implementation for vLLM
 */
@Service
@Profile("vllm")
class VllmService(
    private val config: LlmConfig.VllmConfig,
    private val restTemplate: RestTemplate = RestTemplate()
) : LlmService {
    
    override val provider = LlmModelManager.LlmProvider.VLLM
    
    override suspend fun isAvailable(): Boolean {
        return try {
            restTemplate.getForEntity(
                "${config.apiUrl}/v1/models",
                Map::class.java
            ).statusCode.is2xx
        } catch (e: Exception) {
            logger.error(e) { "vLLM API is not available" }
            false
        }
    }
    
    override suspend fun generateAnalysis(prompt: String, maxTokens: Int): String {
        logger.debug { "Sending request to vLLM API (model: ${config.model})" }
        
        val request = mapOf(
            "model" to config.model,
            "messages" to listOf(
                mapOf(
                    "role" to "user",
                    "content" to prompt
                )
            ),
            "max_tokens" to maxTokens,
            "temperature" to config.temperature
        )
        
        return try {
            val response = restTemplate.postForObject<Map<String, Any>>(
                URI("${config.apiUrl}/v1/chat/completions"),
                request
            )
            
            (response?.get("choices") as? List<*>)?.firstOrNull()
                ?.let { (it as? Map<*, *>)?.get("message") as? Map<*, *> }
                ?.get("content") as? String
                ?: throw LlmException("No content in vLLM response")
                
        } catch (e: Exception) {
            logger.error(e) { "vLLM API request failed" }
            throw LlmException("Failed to generate analysis: ${e.message}", e)
        }
    }
}

/**
 * Implementation for Google's NoteLM
 */
@Service
@Profile("google-note-lm")
class GoogleNoteLmService(
    private val config: LlmConfig.GoogleNoteLmConfig
) : LlmService {
    
    override val provider = LlmModelManager.LlmProvider.GOOGLE_NOTE_LM
    
    private val client by lazy {
        // Initialize Google Cloud client
        // Note: This requires the Google Cloud client library
        TODO("Implement Google Cloud client initialization")
    }
    
    override suspend fun isAvailable(): Boolean {
        return try {
            // Check if we can authenticate and access the API
            client != null
        } catch (e: Exception) {
            logger.error(e) { "Google NoteLM API is not available" }
            false
        }
    }
    
    override suspend fun generateAnalysis(prompt: String, maxTokens: Int): String {
        logger.debug { "Sending request to Google NoteLM API (model: ${config.model})" }
        
        return try {
            // Implementation for Google NoteLM API
            // Note: This is a placeholder - actual implementation would use the Google Cloud client
            TODO("Implement Google NoteLM API call")
        } catch (e: Exception) {
            logger.error(e) { "Google NoteLM API request failed" }
            throw LlmException("Failed to generate analysis: ${e.message}", e)
        }
    }
}

/**
 * Factory for creating LLM services
 */
@Configuration
class LlmServiceFactory(
    private val config: LlmConfig,
    private val modelManager: LlmModelManager
) {
    @Bean
    @Primary
    fun llmService(): LlmService {
        return when (config.defaultProvider) {
            "openai" -> {
                if (config.openai.enabled) {
                    OpenAIService(config.openai)
                } else {
                    throw IllegalStateException("OpenAI is not enabled in configuration")
                }
            }
            "ollama" -> {
                if (config.ollama.enabled) {
                    OllamaService(config.ollama)
                } else {
                    throw IllegalStateException("Ollama is not enabled in configuration")
                }
            }
            "vllm" -> {
                if (config.vllm.enabled) {
                    VllmService(config.vllm)
                } else {
                    throw IllegalStateException("vLLM is not enabled in configuration")
                }
            }
            "lmstudio" -> {
                if (config.lmStudio.enabled) {
                    LmStudioService(config.lmStudio)
                } else {
                    throw IllegalStateException("LM Studio is not enabled in configuration")
                }
            }
            "google-note-lm" -> {
                if (config.googleNoteLm.enabled) {
                    GoogleNoteLmService(config.googleNoteLm)
                } else {
                    throw IllegalStateException("Google NoteLM is not enabled in configuration")
                }
            }
            else -> throw IllegalArgumentException("Unsupported LLM provider: ${config.defaultProvider}")
        }.also { service ->
            // Verify the service is available
            if (!service.isAvailable()) {
                throw IllegalStateException("${service.provider} service is not available")
            }
        }
    }
}

/**
 * Exception for LLM-related errors
 */
class LlmException(
    message: String,
    cause: Throwable? = null
) : RuntimeException(message, cause)

/**
 * Configuration for LLM services
 */
@Configuration
@EnableConfigurationProperties(OpenAIConfig::class, LocalLlmConfig::class)
class LlmConfig {
    
    @Bean
    @Primary
    fun llmService(
        openAIConfig: OpenAIConfig,
        localLlmConfig: LocalLlmConfig
    ): LlmService {
        return when {
            localLlmConfig.enabled -> {
                logger.info { "Using local LLM service with model: ${localLlmConfig.model}" }
                LocalLlmService(localLlmConfig)
            }
            !openAIConfig.apiKey.isNullOrBlank() -> {
                logger.info { "Using OpenAI service with model: ${openAIConfig.model}" }
                OpenAIService(openAIConfig)
            }
            else -> throw IllegalStateException("No LLM service configured. Please configure either local or OpenAI LLM.")
        }
    }
}

/**
 * Configuration for OpenAI API
 */
@ConfigurationProperties(prefix = "komga.llm.openai")
data class OpenAIConfig(
    /**
     * OpenAI API key
     */
    val apiKey: String? = null,
    
    /**
     * Model to use for generation (e.g., gpt-4, gpt-3.5-turbo)
     */
    val model: String = "gpt-4",
    
    /**
     * Base URL for the OpenAI API
     */
    val apiUrl: String = "https://api.openai.com"
)
