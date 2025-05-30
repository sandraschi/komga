package org.gotson.komga.infrastructure.llm.service

import org.gotson.komga.infrastructure.llm.exception.LlmException
import org.gotson.komga.infrastructure.llm.model.*

/**
 * Core interface for interacting with various Language Model (LLM) providers.
 *
 * This interface defines the contract that all LLM service implementations must follow,
 * allowing for easy swapping of different LLM providers while maintaining a consistent API.
 *
 * Implementations should handle their own authentication, request formatting, and response parsing
 * specific to their respective LLM provider.
 */
interface LlmService {
    
    /**
     * The LLM provider this service connects to.
     */
    val provider: LlmProvider
    
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
    
    /**
     * Cleans up any resources used by the service.
     * This method should be called when the service is no longer needed.
     */
    fun cleanup() {}
}
