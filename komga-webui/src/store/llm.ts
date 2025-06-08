import { ActionTree, GetterTree, Module, MutationTree } from 'vuex'
import { generateMetabook, applyMetabook, MetabookGenerationOptions, MetabookGenerationResult } from '@/services/metabook'

// Types
export interface LlmState {
  providers: any[]
  activeProvider: string | null
  models: any[]
  isLoading: boolean
  error: string | null
  isGeneratingMetabook: boolean
  metabookError: string | null
}

// State
const state: LlmState = {
  providers: [],
  activeProvider: null,
  models: [],
  isLoading: false,
  error: null,
  isGeneratingMetabook: false,
  metabookError: null
}

// Getters
const getters: GetterTree<LlmState, any> = {
  isConfigured: (state) => state.activeProvider !== null,
  getProvider: (state) => (id: string) => 
    state.providers.find(p => p.id === id),
  getModel: (state) => (id: string) => 
    state.models.find(m => m.id === id),
  isModelLoaded: (state) => (id: string) => {
    const model = state.models.find(m => m.id === id)
    return model ? model.loaded : false
  }
}

// Mutations
const mutations: MutationTree<LlmState> = {
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
  
  SET_GENERATING_METABOOK(state, isGenerating) {
    state.isGeneratingMetabook = isGenerating
  },
  
  SET_METABOOK_ERROR(state, error) {
    state.metabookError = error
  },
  
  UPDATE_PROVIDER_CONFIG(state, { providerId, config }) {
    const provider = state.providers.find(p => p.id === providerId)
    if (provider) {
      provider.config = { ...provider.config, ...config }
    }
  }
}

// Actions
const actions: ActionTree<LlmState, any> = {
  async fetchProviders({ commit }) {
    try {
      commit('SET_LOADING', true)
      const response = await this.$http.get('/api/v1/llm/providers')
      commit('SET_PROVIDERS', response.data)
      return response.data
    } catch (error) {
      commit('SET_ERROR', error.message)
      throw error
    } finally {
      commit('SET_LOADING', false)
    }
  },
  
  async fetchActiveProvider({ commit }) {
    try {
      commit('SET_LOADING', true)
      const response = await this.$http.get('/api/v1/llm/provider/active')
      if (response.data) {
        commit('SET_ACTIVE_PROVIDER', response.data.id)
      }
      return response.data
    } catch (error) {
      commit('SET_ERROR', error.message)
      throw error
    } finally {
      commit('SET_LOADING', false)
    }
  },
  
  async fetchModels({ commit, state }) {
    if (!state.activeProvider) return []
    
    try {
      commit('SET_LOADING', true)
      const response = await this.$http.get(`/api/v1/llm/provider/${state.activeProvider}/models`)
      commit('SET_MODELS', response.data)
      return response.data
    } catch (error) {
      commit('SET_ERROR', error.message)
      throw error
    } finally {
      commit('SET_LOADING', false)
    }
  },
  
  async switchProvider({ commit, dispatch }, providerId) {
    try {
      commit('SET_LOADING', true)
      await this.$http.post(`/api/v1/llm/provider/${providerId}/switch`)
      commit('SET_ACTIVE_PROVIDER', providerId)
      await dispatch('fetchModels')
    } catch (error) {
      commit('SET_ERROR', error.message)
      throw error
    } finally {
      commit('SET_LOADING', false)
    }
  },
  
  async loadModel({ commit, state }, modelId) {
    if (!state.activeProvider) return
    
    try {
      commit('SET_LOADING', true)
      await this.$http.post(`/api/v1/llm/provider/${state.activeProvider}/models/${modelId}/load`)
      // Refresh models to update status
      await this.dispatch('llm/fetchModels', null, { root: true })
    } catch (error) {
      commit('SET_ERROR', error.message)
      throw error
    } finally {
      commit('SET_LOADING', false)
    }
  },
  
  async unloadModel({ commit, state }, modelId) {
    if (!state.activeProvider) return
    
    try {
      commit('SET_LOADING', true)
      await this.$http.post(`/api/v1/llm/provider/${state.activeProvider}/models/${modelId}/unload`)
      // Refresh models to update status
      await this.dispatch('llm/fetchModels', null, { root: true })
    } catch (error) {
      commit('SET_ERROR', error.message)
      throw error
    } finally {
      commit('SET_LOADING', false)
    }
  }
}

// Module
export const llmModule = {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}

export default llmModule
