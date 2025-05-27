import RagComponents from '@/components/llm/rag'
import ragStore from '@/store/modules/rag'

export default {
  install(Vue, { store }) {
    // Register RAG components
    Vue.use(RagComponents)
    
    // Register RAG store module if it doesn't exist
    if (!store.hasModule('rag')) {
      store.registerModule('rag', ragStore)
    }
    
    // Add $rag helper to Vue prototype
    Vue.prototype.$rag = {
      // Search for documents
      async search(query, collectionId = null) {
        return store.dispatch('rag/search', { query, collectionId })
      },
      
      // Get collections
      async getCollections() {
        return store.dispatch('rag/fetchCollections')
      },
      
      // Get documents in a collection
      async getDocuments(collectionId) {
        return store.dispatch('rag/selectCollection', collectionId)
      },
      
      // Get the current collection
      get currentCollection() {
        const id = store.state.rag.currentCollection
        return id ? store.getters['rag/getCollectionById'](id) : null
      },
      
      // Get the current documents
      get documents() {
        return store.state.rag.documents
      },
      
      // Get search results
      get searchResults() {
        return store.state.rag.searchResults
      },
      
      // Check if loading
      get isLoading() {
        return store.state.rag.isLoading
      },
      
      // Get error
      get error() {
        return store.state.rag.error
      },
      
      // Clear error
      clearError() {
        store.commit('rag/setError', null)
      },
      
      // Clear search results
      clearSearchResults() {
        store.commit('rag/clearSearchResults')
      }
    }
  }
}
