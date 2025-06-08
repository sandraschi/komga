import { ref, computed, watch } from 'vue'
import { useStore } from 'vuex'
import llmService from '@/services/llmService'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  isGenerating?: boolean
  error?: string
}

export function useLlmChat() {
  const store = useStore()
  
  // State
  const messages = ref<ChatMessage[]>([])
  const inputMessage = ref('')
  const isLoading = ref(false)
  const isStreaming = ref(false)
  const selectedModel = ref('')
  const temperature = ref(0.7)
  const maxTokens = ref(1000)
  
  // Computed
  const models = computed(() => store.state.llm.models)
  const activeProvider = computed(() => store.state.llm.activeProvider)
  const isConfigured = computed(() => activeProvider.value !== null)
  const canSendMessage = computed(() => 
    !isLoading.value && 
    inputMessage.value.trim() !== '' && 
    selectedModel.value !== ''
  )
  
  // Load initial data
  const initialize = async () => {
    try {
      isLoading.value = true
      await Promise.all([
        store.dispatch('llm/fetchProviders'),
        store.dispatch('llm/fetchActiveProvider'),
      ])
      
      if (isConfigured.value) {
        await store.dispatch('llm/fetchModels')
        if (models.value.length > 0) {
          selectedModel.value = models.value[0].id
        }
      }
    } catch (error) {
      console.error('Failed to initialize LLM chat:', error)
    } finally {
      isLoading.value = false
    }
  }
  
  // Send a message to the LLM
  const sendMessage = async () => {
    if (!canSendMessage.value) return
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.value,
      timestamp: Date.now(),
    }
    
    // Add user message to the chat
    messages.value = [...messages.value, userMessage]
    inputMessage.value = ''
    
    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isGenerating: true,
    }
    
    // Add empty assistant message that will be streamed into
    messages.value = [...messages.value, assistantMessage]
    
    try {
      isStreaming.value = true
      
      // Get the conversation history for context
      const conversationHistory = messages.value
        .filter(m => !m.isGenerating && !m.error)
        .map(({ role, content }) => ({ role, content }))
      
      // Stream the response
      const stream = llmService.streamCompletion(
        conversationHistory,
        selectedModel.value,
        {
          temperature: temperature.value,
          maxTokens: maxTokens.value,
        }
      )
      
      // Process the stream
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content
        if (content) {
          // Update the last message with the new content
          const lastMessage = messages.value[messages.value.length - 1]
          if (lastMessage) {
            lastMessage.content += content
            // Trigger reactivity
            messages.value = [...messages.value]
          }
        }
      }
    } catch (error) {
      console.error('Error in chat completion:', error)
      
      // Update the last message with the error
      const lastMessage = messages.value[messages.value.length - 1]
      if (lastMessage) {
        lastMessage.error = error instanceof Error ? error.message : 'Failed to generate response'
        lastMessage.isGenerating = false
        messages.value = [...messages.value]
      }
    } finally {
      isStreaming.value = false
      
      // Update the last message to mark generation as complete
      const lastMessage = messages.value[messages.value.length - 1]
      if (lastMessage?.isGenerating) {
        lastMessage.isGenerating = false
        lastMessage.timestamp = Date.now()
        messages.value = [...messages.value]
      }
    }
  }
  
  // Clear the chat history
  const clearChat = () => {
    messages.value = []
  }
  
  // Switch the active model
  const switchModel = async (modelId: string) => {
    selectedModel.value = modelId
  }
  
  // Watch for model changes and load if needed
  watch(selectedModel, async (newModelId, oldModelId) => {
    if (newModelId && newModelId !== oldModelId) {
      try {
        isLoading.value = true
        await store.dispatch('llm/loadModel', newModelId)
      } catch (error) {
        console.error(`Failed to load model ${newModelId}:`, error)
      } finally {
        isLoading.value = false
      }
    }
  })
  
  return {
    // State
    messages,
    inputMessage,
    isLoading: computed(() => isLoading.value || isStreaming.value),
    isStreaming,
    selectedModel,
    temperature,
    maxTokens,
    
    // Computed
    models,
    activeProvider,
    isConfigured,
    canSendMessage,
    
    // Methods
    initialize,
    sendMessage,
    clearChat,
    switchModel,
  }
}

export type { ChatMessage }
