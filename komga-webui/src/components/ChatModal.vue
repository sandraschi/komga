<template>
  <div v-if="visible" class="chat-modal-overlay" @click.self="closeModal">
    <div class="chat-modal-container">
      <div class="chat-modal-header">
        <h2>Komga AI Chat</h2>
        <button class="close-button" @click="closeModal">&times;</button>
      </div>
      <div class="chat-modal-messages" ref="messageContainer">
        <div v-for="(msg, index) in messages" :key="index" :class="['message', msg.sender]">
          <div class="message-bubble">
            <p v-html="formatMessage(msg.text)"></p>
          </div>
        </div>
        <div v-if="isLoading" class="message assistant">
            <div class="message-bubble typing-indicator">
                <span></span><span></span><span></span>
            </div>
        </div>
      </div>
      <div class="chat-modal-input">
        <textarea
          v-model="userInput"
          placeholder="Ask Komga AI... (e.g., 'Summarize this book', 'Tell me about characters in Batman Year One')"
          @keydown.enter.prevent="sendMessage"
        ></textarea>
        <button @click="sendMessage" :disabled="isLoading || !userInput.trim()">
          Send
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios' // Assuming axios is available
import { marked } from 'marked' // For rendering markdown from AI

/**
 * ChatModal.vue - A modal for interacting with the Komga AI assistant.
 */
export default {
  name: 'ChatModal',
  props: {
    /**
     * Controls the visibility of the modal.
     * @type {Boolean}
     */
    visible: {
      type: Boolean,
      required: true,
    },
  },
  data() {
    return {
      /**
       * User's current input text.
       * @type {String}
       */
      userInput: '',
      /**
       * Array of chat messages.
       * Each message: { sender: 'user' | 'assistant', text: String }
       * @type {Array<Object>}
       */
      messages: [
        { sender: 'assistant', text: 'Hello! How can I help you with your library today?' },
      ],
      /**
       * Loading state for AI responses.
       * @type {Boolean}
       */
      isLoading: false,
    }
  },
  watch: {
    messages() {
      this.$nextTick(() => {
        this.scrollToBottom()
      })
    },
  },
  methods: {
    /**
     * Emits an event to close the modal.
     */
    closeModal() {
      this.$emit('close-chat')
    },
    /**
     * Formats message text, rendering Markdown for assistant messages.
     * @param {String} text - The message text.
     * @returns {String} - HTML formatted string.
     */
    formatMessage(text) {
        // Basic sanitization to prevent XSS if markdown is complex
        // For more robust sanitization, consider DOMPurify
        return marked.parse(text || '', { breaks: true, gfm: true })
    },
    /**
     * Sends the user's message to the backend and handles the response.
     */
    async sendMessage() {
      if (!this.userInput.trim()) return

      const userMessage = {
        sender: 'user',
        text: this.userInput,
      }
      this.messages.push(userMessage)
      const currentInput = this.userInput
      this.userInput = ''
      this.isLoading = true

      try {
        // Construct the payload for the backend
        // The API expects a list of messages. We'll send the current conversation history.
        const payloadMessages = this.messages.slice(-10).map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text,
        }))

        // Add the new user message to the payload if it wasn't the one just pushed
        if (payloadMessages[payloadMessages.length-1].content !== currentInput) {
            payloadMessages.push({ role: 'user', content: currentInput })
        }

        const response = await axios.post('/api/v1/llm/chat/completions', {
          messages: payloadMessages,
          // You might want to add other parameters like 'model', 'temperature' if the backend supports them
          // and you want to control them from the frontend.
        })

        let assistantMessageText = 'Sorry, I encountered an error.'
        if (response.data && response.data.choices && response.data.choices[0] && response.data.choices[0].message) {
          assistantMessageText = response.data.choices[0].message.content
        }
        
        this.messages.push({
          sender: 'assistant',
          text: assistantMessageText,
        })

      } catch (error) {
        this.messages.push({
          sender: 'assistant',
          text: 'Sorry, I could not connect to the AI service.',
        })
      }
      this.isLoading = false
    },
    /**
     * Scrolls the message container to the bottom.
     */
    scrollToBottom() {
      const container = this.$refs.messageContainer
      if (container) {
        container.scrollTop = container.scrollHeight
      }
    },
  },
  mounted() {
    this.scrollToBottom()
  },
}
</script>

<style scoped>
.chat-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1050; /* Ensure it's above other content like navbars */
}

.chat-modal-container {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 600px;
  height: 80%;
  max-height: 700px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background-color: #f8f9fa; /* Light grey header */
  border-bottom: 1px solid #dee2e6;
}

.chat-modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: #343a40;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.75rem;
  cursor: pointer;
  color: #6c757d;
}

.chat-modal-messages {
  flex-grow: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background-color: #e9ecef; /* Slightly different background for message area */
}

.message {
  display: flex;
  margin-bottom: 10px;
}

.message.user {
  justify-content: flex-end;
}

.message.assistant {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 80%;
  padding: 10px 15px;
  border-radius: 18px;
  word-wrap: break-word;
  line-height: 1.4;
}

.message.user .message-bubble {
  background-color: #007bff; /* User message color */
  color: white;
  border-bottom-right-radius: 4px;
}

.message.assistant .message-bubble {
  background-color: #ffffff; /* Assistant message color */
  color: #343a40;
  border: 1px solid #dee2e6;
  border-bottom-left-radius: 4px;
}

.message-bubble p {
    margin: 0;
}
.message-bubble p:not(:last-child) {
    margin-bottom: 0.5em;
}

.chat-modal-input {
  display: flex;
  padding: 15px;
  border-top: 1px solid #dee2e6;
  background-color: #f8f9fa;
}

.chat-modal-input textarea {
  flex-grow: 1;
  padding: 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  resize: none;
  min-height: 40px; /* Start with a smaller height */
  max-height: 120px; /* Allow expansion up to a certain limit */
  overflow-y: auto; /* Add scroll if content exceeds max-height */
  font-family: inherit;
  font-size: 1rem;
  margin-right: 10px;
}

.chat-modal-input button {
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.chat-modal-input button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.chat-modal-input button:hover:not(:disabled) {
  background-color: #0056b3;
}

/* Typing indicator */
.typing-indicator span {
  height: 8px;
  width: 8px;
  float: left;
  margin: 0 1px;
  background-color: #888;
  display: block;
  border-radius: 50%;
  opacity: 0.4;
}

.typing-indicator span:nth-of-type(1) {
  animation: 1s blink infinite 0.3333s;
}
.typing-indicator span:nth-of-type(2) {
  animation: 1s blink infinite 0.6666s;
}
.typing-indicator span:nth-of-type(3) {
  animation: 1s blink infinite 0.9999s;
}

@keyframes blink {
  50% {
    opacity: 1;
  }
}
</style>
