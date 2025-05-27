import axios from 'axios'

const API_BASE = '/api/v1/llm'

/**
 * LLM API client for interacting with the backend LLM service.
 */
export default {
  /**
   * Fetches all available LLM providers.
   * @returns {Promise<Array>} List of LLM providers
   */
  async getProviders() {
    const response = await axios.get(`${API_BASE}/providers`)
    return response.data
  },

  /**
   * Fetches the currently active LLM provider.
   * @returns {Promise<Object>} The active provider
   */
  async getActiveProvider() {
    const response = await axios.get(`${API_BASE}/provider/active`)
    return response.data
  },

  /**
   * Switches the active LLM provider.
   * @param {string} providerId - The ID of the provider to switch to
   * @returns {Promise<void>}
   */
  async switchProvider(providerId) {
    await axios.post(`${API_BASE}/provider/${encodeURIComponent(providerId)}/switch`)
  },

  /**
   * Updates the configuration for a provider.
   * @param {string} providerId - The ID of the provider
   * @param {Object} config - The new configuration
   * @returns {Promise<void>}
   */
  async updateProviderConfig(providerId, config) {
    await axios.put(`${API_BASE}/provider/${encodeURIComponent(providerId)}/config`, config)
  },

  /**
   * Tests the connection to a provider.
   * @param {string} providerId - The ID of the provider to test
   * @returns {Promise<Object>} Test result
   */
  async testConnection(providerId) {
    const response = await axios.post(`${API_BASE}/provider/${encodeURIComponent(providerId)}/test`)
    return response.data
  },

  /**
   * Fetches the available models for a provider.
   * @param {string} providerId - The ID of the provider
   * @returns {Promise<Array>} List of models
   */
  async getModels(providerId) {
    const response = await axios.get(`${API_BASE}/provider/${encodeURIComponent(providerId)}/models`)
    return response.data
  },

  /**
   * Generates a completion using the active LLM provider.
   * @param {string} prompt - The prompt to complete
   * @param {number} [maxTokens=1000] - Maximum number of tokens to generate
   * @param {number} [temperature=0.7] - Sampling temperature (0.0 to 2.0)
   * @returns {Promise<string>} The generated completion
   */
  async generateCompletion(prompt, maxTokens = 1000, temperature = 0.7) {
    const response = await axios.post(`${API_BASE}/completions`, {
      prompt,
      maxTokens,
      temperature
    })
    return response.data.content
  },

  /**
   * Generates a chat completion using the active LLM provider.
   * @param {Array<Object>} messages - Array of message objects with 'role' and 'content'
   * @param {number} [maxTokens=1000] - Maximum number of tokens to generate
   * @param {number} [temperature=0.7] - Sampling temperature (0.0 to 2.0)
   * @returns {Promise<Object>} The chat completion response
   */
  async generateChatCompletion(messages, maxTokens = 1000, temperature = 0.7) {
    const response = await axios.post(`${API_BASE}/chat/completions`, {
      messages,
      maxTokens,
      temperature
    })
    return response.data
  },

  /**
   * Creates an embedding for the input text.
   * @param {string} input - The input text to create an embedding for
   * @returns {Promise<Array<number>>} The embedding vector
   */
  async createEmbedding(input) {
    const response = await axios.post(`${API_BASE}/embeddings`, { input })
    return response.data.embedding
  },

  /**
   * Loads a model for a provider.
   * @param {string} providerId - The ID of the provider
   * @param {string} modelId - The ID of the model to load
   * @returns {Promise<void>}
   */
  async loadModel(providerId, modelId) {
    await axios.post(`${API_BASE}/provider/${encodeURIComponent(providerId)}/models/${encodeURIComponent(modelId)}/load`)
  },

  /**
   * Unloads a model from a provider.
   * @param {string} providerId - The ID of the provider
   * @param {string} modelId - The ID of the model to unload
   * @returns {Promise<void>}
   */
  async unloadModel(providerId, modelId) {
    await axios.delete(`${API_BASE}/provider/${encodeURIComponent(providerId)}/models/${encodeURIComponent(modelId)}`)
  }
}
