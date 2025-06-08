import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { v4 as uuidv4 } from 'uuid'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  isLoading?: boolean
  error?: string
}

export function useLlmChat() {
  const store = useStore()
  const { t } = useI18n()
  const route = useRoute()
  
  // State
  const messages = ref<ChatMessage[]>([])
  const inputMessage = ref('')
  const isLoading = ref(false)
  const isStreaming = ref(false)
  const selectedModel = ref('')
  const temperature = ref(0.7)
  const maxTokens = ref(1000)
  const conversationId = ref('')
  const error = ref('')
  
  // Refs for UI elements
  const messagesContainer = ref<HTMLElement | null>(null)
  const inputField = ref<HTMLTextAreaElement | null>(null)
  
  // Computed properties
  const models = computed(() => {
    return store.getters['llm/availableModels']
  })
  
  const activeProvider = computed(() => {
    return store.getters['llm/activeProvider']
  })
  
  const isConfigured = computed(() => {
    return store.getters['llm/isConfigured']
  })
  
  const canSendMessage = computed(() => {
    return inputMessage.value.trim() !== '' && !isLoading.value && isConfigured.value
  })
  
  // Initialize the chat
  const initialize = async () => {
    try {
      // Load providers and models if not already loaded
      if (!store.state.llm.providers.length) {
        await store.dispatch('llm/fetchProviders')
      }
      
      // Load conversation if ID is in route
      if (route.params.conversationId) {
        await loadConversation(route.params.conversationId as string)
      } else {
        // Start a new conversation
        conversationId.value = uuidv4()
        // Add a welcome message if this is a new conversation
        if (messages.value.length === 0) {
          addSystemMessage(t('llm.chat.welcome_message'))
        }
      }
      
      // Set focus to input field
      await nextTick()
      inputField.value?.focus()
    } catch (error) {
      console.error('Failed to initialize chat:', error)
      addSystemMessage(t('llm.errors.initialization_failed'), true)
    }
  }
  
  // Add a new message to the chat
  const addMessage = (role: 'user' | 'assistant' | 'system', content: string, isError = false) => {
    const message: ChatMessage = {
      id: uuidv4(),
      role,
      content,
      timestamp: Date.now(),
      error: isError ? content : undefined
    }
    
    messages.value.push(message)
    scrollToBottom()
    
    return message
  }
  
  // Add a system message
  const addSystemMessage = (content: string, isError = false) => {
    return addMessage('system', content, isError)
  }
  
  // Add a loading message that can be updated later
  const addLoadingMessage = (): ChatMessage => {
    const message: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isLoading: true
    }
    
    messages.value.push(message)
    scrollToBottom()
    
    return message
  }
  
  // Update an existing message
  const updateMessage = (id: string, updates: Partial<ChatMessage>) => {
    const messageIndex = messages.value.findIndex(m => m.id === id)
    if (messageIndex !== -1) {
      messages.value[messageIndex] = {
        ...messages.value[messageIndex],
        ...updates
      }
      
      // Force reactivity
      messages.value = [...messages.value]
    }
  }
  
  // Clear the conversation
  const clearConversation = () => {
    messages.value = []
    conversationId.value = uuidv4()
    error.value = ''
    addSystemMessage(t('llm.chat.conversation_cleared'))
  }
  
  // Load a conversation by ID
  const loadConversation = async (id: string) => {
    try {
      isLoading.value = true
      const conversation = await store.dispatch('llm/loadConversation', id)
      
      if (conversation) {
        messages.value = conversation.messages
        conversationId.value = conversation.id
        
        if (conversation.model) {
          selectedModel.value = conversation.model
        }
        
        if (conversation.temperature !== undefined) {
          temperature.value = conversation.temperature
        }
        
        if (conversation.maxTokens !== undefined) {
          maxTokens.value = conversation.maxTokens
        }
        
        scrollToBottom()
      } else {
        // If conversation doesn't exist, create a new one
        conversationId.value = uuidv4()
        addSystemMessage(t('llm.chat.welcome_message'))
      }
    } catch (error) {
      console.error('Failed to load conversation:', error)
      addSystemMessage(t('llm.errors.load_conversation_failed'), true)
      
      // Create a new conversation on error
      conversationId.value = uuidv4()
      addSystemMessage(t('llm.chat.welcome_message'))
    } finally {
      isLoading.value = false
    }
  }
  
  // Save the current conversation
  const saveConversation = async () => {
    if (!conversationId.value) return
    
    try {
      await store.dispatch('llm/saveConversation', {
        id: conversationId.value,
        messages: messages.value,
        model: selectedModel.value,
        temperature: temperature.value,
        maxTokens: maxTokens.value,
        updatedAt: Date.now()
      })
    } catch (error) {
      console.error('Failed to save conversation:', error)
      throw error
    }
  }
  
  // Send a message to the LLM
  const sendMessage = async () => {
    if (!canSendMessage.value) return
    
    const userMessage = inputMessage.value.trim()
    inputMessage.value = ''
    
    // Add user message to chat
    addMessage('user', userMessage)
    
    // Add loading message for assistant
    const loadingMessage = addLoadingMessage()
    
    // Set loading state
    isLoading.value = true
    isStreaming.value = true
    error.value = ''
    
    try {
      // Prepare the request payload
      const payload = {
        messages: getConversationHistory(),
        model: selectedModel.value,
        temperature: temperature.value,
        maxTokens: maxTokens.value
      }
      
      // Make the API call
      const response = await store.dispatch('llm/chat', payload)
      
      // Handle streaming response
      if (response.body) {
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let content = ''
        
        // Process the stream
        while (true) {
          const { done, value } = await reader.read()
          
          if (done) {
            break
          }
          
          // Decode the chunk and update the message
          const chunk = decoder.decode(value, { stream: true })
          content += chunk
          
          // Update the message with the latest content
          updateMessage(loadingMessage.id, {
            content,
            isLoading: false
          })
          
          // Auto-scroll to bottom
          scrollToBottom()
        }
      } else {
        // Handle non-streaming response
        updateMessage(loadingMessage.id, {
          content: response.content || t('llm.errors.no_response'),
          isLoading: false
        })
      }
      
      // Save the conversation
      await saveConversation()
    } catch (err) {
      console.error('Error sending message:', err)
      
      // Update the loading message with error
      updateMessage(loadingMessage.id, {
        content: err.message || t('llm.errors.send_message_failed'),
        isLoading: false,
        error: err.message || t('llm.errors.send_message_failed')
      })
      
      // Set the error state
      error.value = err.message || t('llm.errors.send_message_failed')
    } finally {
      isLoading.value = false
      isStreaming.value = false
      
      // Set focus back to input field
      await nextTick()
      inputField.value?.focus()
    }
  }
  
  // Get conversation history in the format expected by the API
  const getConversationHistory = () => {
    return messages.value
      .filter(m => !m.isLoading && !m.error)
      .map(m => ({
        role: m.role,
        content: m.content
      }))
  }
  
  // Scroll the messages container to the bottom
  const scrollToBottom = () => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  }
  
  // Handle keyboard events
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }
  
  // Switch to a different model
  const switchModel = (modelId: string) => {
    selectedModel.value = modelId
    addSystemMessage(t('llm.chat.model_changed', { model: modelId }))
  }
  
  // Lifecycle hooks
  onMounted(() => {
    initialize()
    
    // Save conversation before unload
    window.addEventListener('beforeunload', saveConversation)
  })
  
  // Watch for route changes to load conversations
  watch(() => route.params.conversationId, (newId) => {
    if (newId && newId !== conversationId.value) {
      loadConversation(newId as string)
    }
  })
  
  // Watch for model changes
  watch(selectedModel, (newModel) => {
    if (newModel) {
      store.dispatch('llm/setActiveModel', newModel)
    }
  })
  
  return {
    // State
    messages,
    inputMessage,
    isLoading,
    isStreaming,
    selectedModel,
    temperature,
    maxTokens,
    conversationId,
    error,
    
    // Refs
    messagesContainer,
    inputField,
    
    // Computed
    models,
    activeProvider,
    isConfigured,
    canSendMessage,
    
    // Methods
    initialize,
    sendMessage,
    clearConversation,
    switchModel,
    handleKeyDown,
    scrollToBottom
  }
}

export type { ChatMessage }
