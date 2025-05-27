package org.gotson.komga.interfaces.rest.dto

import com.fasterxml.jackson.annotation.JsonInclude

/**
 * DTO for LLM provider information.
 *
 * @property id The unique identifier of the provider (e.g., "OPENAI", "OLLAMA")
 * @property name The display name of the provider
 * @property enabled Whether the provider is enabled in the configuration
 * @property isActive Whether this is the currently active provider
 * @property config Provider-specific configuration (if available and not sensitive)
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
 *
 * @property id The unique identifier of the model
 * @property name The display name of the model
 * @property provider The provider of the model (e.g., "OPENAI", "OLLAMA")
 * @property loaded Whether the model is currently loaded
 * @property loadedAt When the model was loaded (ISO-8601 timestamp)
 * @property size The size of the model in bytes (if available)
 * @property contextWindow The context window size in tokens (if available)
 * @property parameters Additional model parameters (if available)
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
 * DTO for a request to switch the active LLM provider.
 *
 * @property providerId The ID of the provider to switch to
 */
data class SwitchProviderRequest(
    val providerId: String
)

/**
 * DTO for a request to load a model.
 *
 * @property modelId The ID of the model to load
 */
data class LoadModelRequest(
    val modelId: String
)

/**
 * DTO for a response containing the result of an operation.
 *
 * @property success Whether the operation was successful
 * @property message A message describing the result of the operation
 */
data class OperationResultDto(
    val success: Boolean,
    val message: String
) {
    companion object {
        fun success(message: String = "Operation completed successfully") = OperationResultDto(true, message)
        fun error(message: String) = OperationResultDto(false, message)
    }
}
