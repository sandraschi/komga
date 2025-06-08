// Export all RAG components
export { default as RagDocumentList } from './RagDocumentList.vue'
export { default as RagUploadDialog } from './RagUploadDialog.vue'
export { default as RagSearchResults } from './RagSearchResults.vue'

// Plugin installation
const RagComponents = {
  install(Vue) {
    Vue.component('rag-document-list', () => import('./RagDocumentList.vue'))
    Vue.component('rag-upload-dialog', () => import('./RagUploadDialog.vue'))
    Vue.component('rag-search-results', () => import('./RagSearchResults.vue'))
  }
}

export default RagComponents
