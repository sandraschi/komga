package org.gotson.komga.infrastructure.llm.model

/**
 * Represents a message in a conversation with the LLM.
 *
 * @property role The role of the message sender (user, assistant, system)
 * @property content The content of the message
 */
data class LlmMessage(
  val role: String,
  val content: String,
) {
  companion object {
    const val ROLE_SYSTEM = "system"
    const val ROLE_USER = "user"
    const val ROLE_ASSISTANT = "assistant"
  }
}

/**
 * Represents a request to the LLM for completion.
 *
 * @property model The model to use for completion
 * @property messages The conversation messages
 * @property temperature Controls randomness (0.0 to 2.0)
 * @property maxTokens Maximum number of tokens to generate
 */
data class LlmCompletionRequest(
  val model: String,
  val messages: List<LlmMessage>,
  val temperature: Double = 0.7,
  val maxTokens: Int? = null,
)

/**
 * Represents a choice in the LLM's response.
 *
 * @property message The generated message
 * @property finishReason The reason the generation stopped
 */
data class LlmChoice(
  val message: LlmMessage,
  val finishReason: String,
)

/**
 * Represents a response from the LLM completion API.
 *
 * @property id The ID of the completion
 * @property `object` The object type (e.g., "chat.completion")
 * @property created The timestamp when the completion was created
 * @property model The model used for the completion
 * @property choices The list of completion choices
 * @property usage Token usage statistics
 */
data class LlmCompletionResponse(
  val id: String,
  val `object`: String,
  val created: Long,
  val model: String,
  val choices: List<LlmChoice>,
  val usage: LlmUsage,
)

/**
 * Represents token usage statistics.
 *
 * @property promptTokens Number of tokens in the prompt
 * @property completionTokens Number of tokens in the completion
 * @property totalTokens Total number of tokens used
 */
data class LlmUsage(
  val promptTokens: Int,
  val completionTokens: Int,
  val totalTokens: Int,
)
