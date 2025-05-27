import { fetchRagCollections, fetchRagDocuments, searchRag } from '@/api/rag'

const state = {
  collections: [],
  currentCollection: null,
  documents: [],
  searchResults: [],
  isLoading: false,
  error: null
}

const getters = {
  getCollectionById: state => id => state.collections.find(c => c.id === id),
  getDocumentById: state => id => state.documents.find(d => d.id === id),
  hasCollections: state => state.collections.length > 0,
  hasDocuments: state => state.documents.length > 0,
  hasSearchResults: state => state.searchResults.length > 0
}

const actions = {
  async fetchCollections({ commit }) {
    commit('setLoading', true)
    try {
      const collections = await fetchRagCollections()
      commit('setCollections', collections)
      return collections
    } catch (error) {
      commit('setError', error.message)
      throw error
    } finally {
      commit('setLoading', false)
    }
  },
  
  async selectCollection({ commit, dispatch }, collectionId) {
    commit('setCurrentCollection', collectionId)
    return dispatch('fetchDocuments', collectionId)
  },
  
  async fetchDocuments({ commit, state }) {
    if (!state.currentCollection) return
    
    commit('setLoading', true)
    try {
      const documents = await fetchRagDocuments(state.currentCollection)
      commit('setDocuments', documents)
      return documents
    } catch (error) {
      commit('setError', error.message)
      throw error
    } finally {
      commit('setLoading', false)
    }
  },
  
  async search({ commit }, { query, collectionId = null }) {
    commit('setLoading', true)
    try {
      const results = await searchRag(query, collectionId)
      commit('setSearchResults', results)
      return results
    } catch (error) {
      commit('setError', error.message)
      throw error
    } finally {
      commit('setLoading', false)
    }
  },
  
  clearSearchResults({ commit }) {
    commit('clearSearchResults')
  },
  
  clearError({ commit }) {
    commit('setError', null)
  }
}

const mutations = {
  setCollections(state, collections) {
    state.collections = collections
  },
  
  setCurrentCollection(state, collectionId) {
    state.currentCollection = collectionId
  },
  
  setDocuments(state, documents) {
    state.documents = documents
  },
  
  setSearchResults(state, results) {
    state.searchResults = results
  },
  
  clearSearchResults(state) {
    state.searchResults = []
  },
  
  setLoading(state, isLoading) {
    state.isLoading = isLoading
  },
  
  setError(state, error) {
    state.error = error
  }
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
}
