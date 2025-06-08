import axios from 'axios'
import { API_ROUTES } from '@/types/api-routes'

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
}

interface ChatCompletionRequest {
  model: string
  messages: ChatMessage[]
  temperature?: number
  max_tokens?: number
  stream?: boolean
}

interface ChatCompletionResponse {
  id: string
  object: string
  created: number
  model: string
  choices: {
    index: number
    message: ChatMessage
    finish_reason: string
  }[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export default {
  /**
   * Sends a chat message to the LLM and returns the response
   */
  async sendMessage(messages: ChatMessage[], model: string, options: {
    temperature?: number
    maxTokens?: number
    stream?: boolean
  } = {}): Promise<ChatCompletionResponse> {
    const { data } = await axios.post<ChatCompletionResponse>(
      API_ROUTES.LLM.CHAT_COMPLETIONS,
      {
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens,
        stream: options.stream ?? false,
      } as ChatCompletionRequest
    )
    return data
  },

  /**
   * Streams a chat completion response
   */
  async *streamCompletion(messages: ChatMessage[], model: string, options: {
    temperature?: number
    maxTokens?: number
  } = {}) {
    const response = await fetch(API_ROUTES.LLM.CHAT_COMPLETIONS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens,
        stream: true,
      } as ChatCompletionRequest),
    })

    if (!response.body) {
      throw new Error('No response body')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      
      // Process complete SSE messages
      const lines = buffer.split('\n\n')
      buffer = lines.pop() || '' // Keep the last incomplete message in the buffer
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim()
          if (data === '[DONE]') {
            return
          }
          
          try {
            const parsed = JSON.parse(data)
            yield parsed
          } catch (e) {
            console.error('Error parsing SSE data:', e)
          }
        }
      }
    }
  },

  /**
   * Fetches available LLM models
   */
  async getModels() {
    const { data } = await axios.get(API_ROUTES.LLM.MODELS)
    return data
  },

  /**
   * Fetches the active LLM provider
   */
  async getActiveProvider() {
    const { data } = await axios.get(API_ROUTES.LLM.PROVIDER_ACTIVE)
    return data
  },

  /**
   * Fetches available LLM providers
   */
  async getProviders() {
    const { data } = await axios.get(API_ROUTES.LLM.PROVIDERS)
    return data
  },

  /**
   * Switches the active LLM provider
   */
  async switchProvider(providerId: string) {
    const { data } = await axios.post(API_ROUTES.LLM.PROVIDER_SWITCH, { providerId })
    return data
  },

  /**
   * Loads a model into memory
   */
  async loadModel(modelId: string) {
    const { data } = await axios.post(API_ROUTES.LLM.MODEL_LOAD, { modelId })
    return data
  },

  /**
   * Unloads a model from memory
   */
  async unloadModel(modelId: string) {
    const { data } = await axios.post(API_ROUTES.LLM.MODEL_UNLOAD, { modelId })
    return data
  },
}
