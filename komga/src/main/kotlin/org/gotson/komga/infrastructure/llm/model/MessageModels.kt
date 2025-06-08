package org.gotson.komga.infrastructure.llm.model

/**
 * Represents the role of a message sender in a chat conversation.
 */
enum class MessageRole {
  /** System message that sets the behavior of the assistant */
  SYSTEM,

  /** Message from the user */
  USER,

  /** Message from the assistant */
  ASSISTANT,

  /** Message representing a function call result */
  FUNCTION,
}

/**
 * Represents a message in a chat conversation.
 *
 * @property role The role of the message sender
 * @property content The content of the message
 * @property name Optional name of the message sender
 * @property functionCall Optional function call details if the message is a function call
 */
data class ChatMessage(
  val role: MessageRole,
  val content: String,
  val name: String? = null,
  val functionCall: FunctionCall? = null,
)

/**
 * Represents a function call made by the model.
 *
 * @property name The name of the function to call
 * @property arguments The arguments to call the function with, as a JSON string
 */
data class FunctionCall(
  val name: String,
  val arguments: String,
) {
  companion object {
    /**
     * Special value indicating the model can choose between calling a function or responding to the user.
     */
    val AUTO = FunctionCall("auto", "")
  }

  override fun equals(other: Any?): Boolean {
    if (this === other) return true
    if (javaClass != other?.javaClass) return false
    other as FunctionCall
    if (name != other.name) return false
    if (arguments != other.arguments) return false
    return true
  }

  override fun hashCode(): Int {
    var result = name.hashCode()
    result = 31 * result + arguments.hashCode()
    return result
  }

  override fun toString(): String = "FunctionCall(name='$name', arguments='$arguments')"
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
  val description: String? = null,
  val parameters: Map<String, Any> = emptyMap(),
)

/**
 * Represents a chat completion response.
 *
 * @property content The generated message content
 * @property role The role of the message sender
 * @property functionCall Optional function call that the model made
 * @property finishReason The reason the model stopped generating tokens
 */
data class ChatCompletion(
  val content: String,
  val role: MessageRole = MessageRole.ASSISTANT,
  val functionCall: FunctionCall? = null,
  val finishReason: String? = null,
)
