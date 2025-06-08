package org.gotson.komga.infrastructure.llm.model

/**
 * Request to load a model
 *
 * @property modelId The ID of the model to load
 * @property force Whether to force reload the model if already loaded
 */
data class LoadModelRequest(
  val modelId: String,
  val force: Boolean = false,
)

/**
 * Request to unload a model
 *
 * @property modelId The ID of the model to unload
 * @property force Whether to force unload the model even if in use
 */
data class UnloadModelRequest(
  val modelId: String,
  val force: Boolean = false,
)

/**
 * Response from a model operation
 *
 * @property success Whether the operation was successful
 * @property message A human-readable message about the result
 * @property model The updated model state, if applicable
 */
data class ModelOperationResponse(
  val success: Boolean,
  val message: String,
  val model: LlmModel? = null,
) {
  companion object {
    fun success(
      message: String,
      model: LlmModel? = null,
    ) = ModelOperationResponse(true, message, model)

    fun error(
      message: String,
      model: LlmModel? = null,
    ) = ModelOperationResponse(false, message, model)
  }
}
