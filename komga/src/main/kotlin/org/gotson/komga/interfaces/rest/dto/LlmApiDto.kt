package org.gotson.komga.interfaces.rest.dto

import com.fasterxml.jackson.annotation.JsonInclude
import org.gotson.komga.infrastructure.llm.model.ChatMessage
import org.gotson.komga.infrastructure.llm.model.FunctionCall
import org.gotson.komga.infrastructure.llm.model.FunctionDefinition

/**
 * Data Transfer Objects for the LLM API.
 */
object LlmApiDto {

    /**
     * Request DTO for generating a completion.
     */
    data class CompletionRequest(
        val prompt: String,
        val maxTokens: Int? = null,
        val temperature: Double? = null,
        val stop: List<String>? = null
    )

    /**
     * Response DTO for a completion.
     */
    data class CompletionResponse(
        val id: String,
        val content: String,
        val model: String
    )

    /**
     * Request DTO for generating a chat completion.
     */
    data class ChatCompletionRequest(
        val messages: List<MessageDto>,
        val maxTokens: Int? = null,
        val temperature: Double? = null,
        val functions: List<FunctionDefinitionDto>? = null,
        val functionCall: FunctionCallDto? = null
    )

    /**
     * Response DTO for a chat completion.
     */
    data class ChatCompletionResponse(
        val id: String,
        val content: String,
        val role: String,
        val functionCall: FunctionCallDto? = null,
        val finishReason: String? = null,
        val model: String
    )

    /**
     * Request DTO for creating an embedding.
     */
    data class EmbeddingRequest(
        val input: String
    )

    /**
     * Response DTO for an embedding.
     */
    data class EmbeddingResponse(
        val id: String,
        val embedding: List<Double>,
        val model: String
    )

    /**
     * DTO for a chat message.
     */
    data class MessageDto(
        val role: String,
        val content: String,
        val name: String? = null,
        val functionCall: FunctionCallDto? = null
    ) {
        fun toModel(): ChatMessage {
            return ChatMessage(
                role = ChatMessage.Role.valueOf(role.uppercase()),
                content = content,
                name = name,
                functionCall = functionCall?.toModel()
            )
        }
    }

    /**
     * DTO for a function call.
     */
    data class FunctionCallDto(
        val name: String,
        val arguments: String
    ) {
        fun toModel(): FunctionCall {
            return FunctionCall(
                name = name,
                arguments = arguments
            )
        }
    }

    /**
     * DTO for a function definition.
     */
    data class FunctionDefinitionDto(
        val name: String,
        val description: String,
        val parameters: Map<String, Any>
    ) {
        fun toModel(): FunctionDefinition {
            return FunctionDefinition(
                name = name,
                description = description,
                parameters = parameters
            )
        }
    }

    /**
     * DTO for LLM provider information.
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    data class LlmProviderDto(
        val id: String,
        val name: String,
        val enabled: Boolean,
        val isActive: Boolean,
        val config: Map<String, Any>? = null
    )

    /**
     * DTO for LLM model information.
     */
    data class LlmModelDto(
        val id: String,
        val name: String,
        val provider: String,
        val loaded: Boolean,
        val loadedAt: String?,
        val size: Long?,
        val contextWindow: Int?,
        val parameters: Map<String, Any>?
    )

    /**
     * Extension function to convert a model to DTO.
     */
    fun org.gotson.komga.infrastructure.llm.model.ModelInfo.toDto(): LlmModelDto {
        return LlmModelDto(
            id = this.id,
            name = this.name,
            provider = this.provider.name,
            loaded = this.loaded,
            loadedAt = this.loadedAt?.toString(),
            size = this.size,
            contextWindow = this.contextWindow,
            parameters = this.parameters.ifEmpty { null }
        )
    }
}
