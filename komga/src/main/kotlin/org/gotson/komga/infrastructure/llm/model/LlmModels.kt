package org.gotson.komga.infrastructure.llm.model

import java.time.Instant

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
 * Represents a message role in a chat conversation.
 */
enum class MessageRole {
    SYSTEM,
    USER,
    ASSISTANT,
    FUNCTION
}

/**
 * Represents a chat message.
 */
data class ChatMessage(
    val role: MessageRole,
    val content: String,
    val name: String? = null,
    val functionCall: FunctionCall? = null
)

/**
 * Represents a function call made by the model.
 */
data class FunctionCall(
    val name: String,
    val arguments: String
)

/**
 * Represents a function definition that the model can call.
 */
data class FunctionDefinition(
    val name: String,
    val description: String,
    val parameters: Map<String, Any>
)

/**
 * Represents a chat completion response.
 */
data class ChatCompletion(
    val content: String,
    val role: MessageRole = MessageRole.ASSISTANT,
    val functionCall: FunctionCall? = null,
    val finishReason: String? = null
)

/**
 * Information about an LLM model.
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
