import http from '@/api/http'

/**
 * Fetch all RAG collections
 * @returns {Promise<Array>} List of collections
 */
export const fetchRagCollections = async () => {
  const response = await http.get('/api/v1/rag/collections')
  return response.data
}

/**
 * Fetch documents in a collection
 * @param {string} collectionId - ID of the collection
 * @returns {Promise<Array>} List of documents
 */
export const fetchRagDocuments = async (collectionId) => {
  const response = await http.get(`/api/v1/rag/collections/${collectionId}/documents`)
  return response.data
}

/**
 * Search across all collections or a specific collection
 * @param {string} query - Search query
 * @param {string|null} collectionId - Optional collection ID to search within
 * @returns {Promise<Array>} Search results
 */
export const searchRag = async (query, collectionId = null) => {
  const params = { q: query }
  if (collectionId) {
    params.collectionId = collectionId
  }
  
  const response = await http.get('/api/v1/rag/search', { params })
  return response.data
}

/**
 * Upload documents to a collection
 * @param {string} collectionId - ID of the collection
 * @param {Array<File>} files - Array of File objects
 * @param {Object} options - Upload options
 * @param {boolean} options.chunk - Whether to chunk the documents
 * @param {number} options.chunkSize - Size of each chunk in characters
 * @param {number} options.chunkOverlap - Overlap between chunks in characters
 * @returns {Promise<Object>} Upload result
 */
export const uploadDocuments = async (collectionId, files, options = {}) => {
  const formData = new FormData()
  
  // Add files
  files.forEach(file => {
    formData.append('files', file)
  })
  
  // Add options
  Object.entries(options).forEach(([key, value]) => {
    formData.append(key, value)
  })
  
  const response = await http.post(
    `/api/v1/rag/collections/${collectionId}/documents`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        // Progress callback can be handled here if needed
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        console.log(`Upload progress: ${percentCompleted}%`)
      }
    }
  )
  
  return response.data
}

/**
 * Delete a document
 * @param {string} documentId - ID of the document to delete
 * @returns {Promise<Object>} Deletion result
 */
export const deleteDocument = async (documentId) => {
  const response = await http.delete(`/api/v1/rag/documents/${documentId}`)
  return response.data
}

/**
 * Create a new collection
 * @param {Object} collectionData - Collection data
 * @param {string} collectionData.name - Collection name
 * @param {string} [collectionData.description] - Optional description
 * @returns {Promise<Object>} Created collection
 */
export const createCollection = async (collectionData) => {
  const response = await http.post('/api/v1/rag/collections', collectionData)
  return response.data
}

/**
 * Delete a collection
 * @param {string} collectionId - ID of the collection to delete
 * @param {boolean} [deleteDocuments=false] - Whether to delete all documents in the collection
 * @returns {Promise<Object>} Deletion result
 */
export const deleteCollection = async (collectionId, deleteDocuments = false) => {
  const response = await http.delete(`/api/v1/rag/collections/${collectionId}`, {
    params: { deleteDocuments }
  })
  return response.data
}

/**
 * Get document content
 * @param {string} documentId - ID of the document
 * @returns {Promise<string>} Document content
 */
export const getDocumentContent = async (documentId) => {
  const response = await http.get(`/api/v1/rag/documents/${documentId}/content`)
  return response.data
}

/**
 * Get document chunks
 * @param {string} documentId - ID of the document
 * @returns {Promise<Array>} Document chunks
 */
export const getDocumentChunks = async (documentId) => {
  const response = await http.get(`/api/v1/rag/documents/${documentId}/chunks`)
  return response.data
}

export default {
  fetchRagCollections,
  fetchRagDocuments,
  searchRag,
  uploadDocuments,
  deleteDocument,
  createCollection,
  deleteCollection,
  getDocumentContent,
  getDocumentChunks
}
