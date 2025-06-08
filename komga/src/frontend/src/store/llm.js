import api from '@/api/llm'

export default {
  namespaced: true,
  
  state: {
    providers: [],
    activeProvider: null,
    models: [],
    isLoading: false,
    error: null,
    isConfiguring: false,
    configuration: {},
    isTesting: false,
    testResult: null
  },
  
  mutations: {
    SET_PROVIDERS(state, providers) {
      state.providers = providers
    },
    
    SET_ACTIVE_PROVIDER(state, provider) {
      state.activeProvider = provider
    },
    
    SET_MODELS(state, models) {
      state.models = models
    },
    
    SET_LOADING(state, isLoading) {
      state.isLoading = isLoading
    },
    
    SET_ERROR(state, error) {
      state.error = error
    },
    
    SET_CONFIGURING(state, isConfiguring) {
      state.isConfiguring = isConfiguring
    },
    
    SET_CONFIGURATION(state, configuration) {
      state.configuration = configuration
    },
    
    SET_TESTING(state, isTesting) {
      state.isTesting = isTesting
    },
    
    SET_TEST_RESULT(state, result) {
      state.testResult = result
    },
    
    UPDATE_PROVIDER_CONFIG(state, { providerId, config }) {
      const provider = state.providers.find(p => p.id === providerId)
      if (provider) {
        provider.config = { ...provider.config, ...config }
      }
    },
    
    RESET_TEST_RESULT(state) {
      state.testResult = null
    }
  },
  
  actions: {
    async fetchProviders({ commit }) {
      commit('SET_LOADING', true)
      commit('SET_ERROR', null)
      
      try {
        const providers = await api.getProviders()
        commit('SET_PROVIDERS', providers)
        return providers
      } catch (error) {
        commit('SET_ERROR', error)
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },
    
    async fetchActiveProvider({ commit }) {
      commit('SET_LOADING', true)
      commit('SET_ERROR', null)
      
      try {
        const provider = await api.getActiveProvider()
        commit('SET_ACTIVE_PROVIDER', provider)
        return provider
      } catch (error) {
        commit('SET_ERROR', error)
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },
    
    async fetchModels({ commit, state }) {
      if (!state.activeProvider) return
      
      commit('SET_LOADING', true)
      commit('SET_ERROR', null)
      
      try {
        const models = await api.getModels(state.activeProvider.id)
        commit('SET_MODELS', models)
        return models
      } catch (error) {
        commit('SET_ERROR', error)
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },
    
    async switchProvider({ commit, dispatch }, providerId) {
      commit('SET_LOADING', true)
      commit('SET_ERROR', null)
      
      try {
        await api.switchProvider(providerId)
        await dispatch('fetchActiveProvider')
        await dispatch('fetchModels')
      } catch (error) {
        commit('SET_ERROR', error)
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },
    
    async updateProviderConfig({ commit }, { providerId, config }) {
      commit('SET_LOADING', true)
      commit('SET_ERROR', null)
      
      try {
        await api.updateProviderConfig(providerId, config)
        commit('UPDATE_PROVIDER_CONFIG', { providerId, config })
      } catch (error) {
        commit('SET_ERROR', error)
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },
    
    async testProviderConnection({ commit }, providerId) {
      commit('SET_TESTING', true)
      commit('RESET_TEST_RESULT')
      
      try {
        const result = await api.testConnection(providerId)
        commit('SET_TEST_RESULT', { success: true, message: 'Connection successful' })
        return result
      } catch (error) {
        const message = error.response?.data?.message || error.message || 'Connection failed'
        commit('SET_TEST_RESULT', { success: false, message })
        throw error
      } finally {
        commit('SET_TESTING', false)
      }
    },
    
    async generateCompletion({ commit }, { prompt, maxTokens, temperature }) {
      commit('SET_LOADING', true)
      commit('SET_ERROR', null)
      
      try {
        return await api.generateCompletion(prompt, maxTokens, temperature)
      } catch (error) {
        commit('SET_ERROR', error)
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },
    
    async generateChatCompletion({ commit }, { messages, maxTokens, temperature }) {
      commit('SET_LOADING', true)
      commit('SET_ERROR', null)
      
      try {
        return await api.generateChatCompletion(messages, maxTokens, temperature)
      } catch (error) {
        commit('SET_ERROR', error)
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },
    
    async createEmbedding({ commit }, input) {
      commit('SET_LOADING', true)
      commit('SET_ERROR', null)
      
      try {
        return await api.createEmbedding(input)
      } catch (error) {
        commit('SET_ERROR', error)
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    }
  },
  
  getters: {
    isConfigured: state => {
      return state.activeProvider !== null
    },
    
    isProviderEnabled: state => providerId => {
      const provider = state.providers.find(p => p.id === providerId)
      return provider ? provider.enabled : false
    },
    
    providerConfig: state => providerId => {
      const provider = state.providers.find(p => p.id === providerId)
      return provider ? provider.config : {}
    },
    
    activeModels: state => {
      return state.models.filter(model => model.loaded)
    }
  }
}
