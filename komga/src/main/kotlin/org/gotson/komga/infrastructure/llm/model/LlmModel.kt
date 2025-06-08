package org.gotson.komga.infrastructure.llm.model

import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonValue
import java.time.Instant

/**
 * Represents an LLM model in the system.
 *
 * @property id Unique identifier for the model (e.g., "gpt-4", "llama2")
 * @property name Display name of the model
 * @property provider The provider of the model (e.g., "openai", "ollama")
 * @property status Current status of the model
 * @property loaded Whether the model is currently loaded in memory
 * @property size Size of the model in bytes, if known
 * @property parameters Additional model parameters and capabilities
 * @property error Error message if the model is in an error state
 * @property lastLoaded When the model was last loaded, if ever
 */
data class LlmModel(
  val id: String,
  val name: String,
  val provider: String,
  val status: Status,
  val loaded: Boolean,
  val size: Long? = null,
  val parameters: Map<String, Any> = emptyMap(),
  val error: String? = null,
  val lastLoaded: Instant? = null,
) {
  /**
   * Model status values
   */
  enum class Status {
    /** Model is currently loading */
    LOADING,

    /** Model is loaded and ready for use */
    LOADED,

    /** Model is not loaded */
    UNLOADED,

    /** Model is in an error state */
    ERROR,

    ;

    companion object {
      @JvmStatic
      @JsonCreator
      fun fromString(value: String): Status = valueOf(value.uppercase())
    }

    @JsonValue
    fun toJson(): String = name.lowercase()
  }

  /**
   * Create a copy of this model with updated fields
   */
  fun copyWith(
    status: Status? = null,
    loaded: Boolean? = null,
    error: String? = this.error,
    lastLoaded: Instant? = this.lastLoaded,
  ): LlmModel =
    copy(
      status = status ?: this.status,
      loaded = loaded ?: this.loaded,
      error = error,
      lastLoaded = lastLoaded,
    )
}
