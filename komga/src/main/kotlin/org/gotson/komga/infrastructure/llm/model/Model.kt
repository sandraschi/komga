package org.gotson.komga.infrastructure.llm.model

import com.fasterxml.jackson.annotation.JsonInclude
import java.time.Instant

/**
 * Represents an LLM model with its metadata and status.
 */
data class LlmModel(
  /** Unique identifier for the model */
  val id: String,
  /** Display name of the model */
  val name: String,
  /** The provider that serves this model */
  val provider: LlmProvider,
  /** Current status of the model */
  val status: ModelStatus,
  /** Whether the model is currently loaded in memory */
  val loaded: Boolean = false,
  /** Size of the model in bytes, if known */
  @JsonInclude(JsonInclude.Include.NON_NULL)
  val sizeBytes: Long? = null,
  /** When the model was last loaded, if applicable */
  @JsonInclude(JsonInclude.Include.NON_NULL)
  val lastLoaded: Instant? = null,
  /** Provider-specific parameters for this model */
  val parameters: Map<String, Any> = emptyMap(),
  /** Any error message if the model is in ERROR state */
  @JsonInclude(JsonInclude.Include.NON_EMPTY)
  val error: String = "",
)

/**
 * Status of an LLM model
 */
enum class ModelStatus {
  /** Model is currently being loaded */
  LOADING,

  /** Model is loaded and ready for inference */
  LOADED,

  /** Model is not loaded */
  UNLOADED,

  /** Error occurred with this model */
  ERROR,
}

/**
 * Request object for loading a model
 */
data class LoadModelRequest(
  /** ID of the model to load */
  val modelId: String,
  /** Whether to force load even if already loaded */
  val force: Boolean = false,
  /** Provider-specific parameters */
  val parameters: Map<String, Any> = emptyMap(),
)

/**
 * Request object for unloading a model
 */
data class UnloadModelRequest(
  /** ID of the model to unload */
  val modelId: String,
  /** Whether to force unload even if in use */
  val force: Boolean = false,
)

/**
 * Response object for model operations
 */
data class ModelOperationResponse(
  /** Whether the operation was successful */
  val success: Boolean,
  /** Optional message about the operation result */
  val message: String = "",
  /** The updated model state, if applicable */
  val model: LlmModel? = null,
)
