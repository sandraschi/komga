package org.gotson.komga.infrastructure.llm.model

import java.time.Instant

/**
 * Information about an LLM model.
 *
 * @property id The unique identifier of the model
 * @property name The display name of the model
 * @property provider The provider of the model
 * @property loaded Whether the model is currently loaded
 * @property loadedAt When the model was loaded, if applicable
 * @property size The size of the model in bytes, if known
 * @property contextWindow The maximum context window size in tokens, if known
 * @property parameters Additional provider-specific parameters for the model
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
) {
    /**
     * Creates a copy of this model info with the loaded status updated.
     */
    fun withLoaded(loaded: Boolean, loadedAt: Instant? = null): ModelInfo {
        return copy(
            loaded = loaded,
            loadedAt = loadedAt ?: if (loaded) Instant.now() else null
        )
    }
}
