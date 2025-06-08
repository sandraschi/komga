# RAG (Retrieval-Augmented Generation) Components

This directory contains Vue components for implementing RAG (Retrieval-Augmented Generation) functionality in the Komga interface.

## Components

### 1. RagDocumentList

A component to display a list of documents in a RAG collection.

**Props:**
- `documents` (Array): List of document objects to display
- `selectedDocument` (Object): Currently selected document
- `isLoading` (Boolean): Whether data is loading

**Events:**
- `add`: Emitted when the add document button is clicked
- `select`: Emitted when a document is selected
- `delete`: Emitted when a document delete is requested

### 2. RagUploadDialog

A dialog component for uploading documents to a RAG collection.

**Props:**
- `value` (Boolean): Controls the visibility of the dialog
- `collections` (Array): List of available collections
- `isLoadingCollections` (Boolean): Whether collections are loading

**Events:**
- `input`: Emitted when dialog visibility changes
- `uploaded`: Emitted when documents are successfully uploaded

### 3. RagSearchResults

Displays search results from the RAG system.

**Props:**
- `results` (Array): Search results to display
- `isLoading` (Boolean): Whether search is in progress

**Events:**
- `select`: Emitted when a search result is selected

## Store Module

The RAG store module (`store/modules/rag.js`) manages the state for RAG functionality.

### State
- `collections`: Array of RAG collections
- `currentCollection`: ID of the currently selected collection
- `documents`: Documents in the current collection
- `searchResults`: Results from the most recent search
- `isLoading`: Whether an operation is in progress
- `error`: Any error that occurred

### Actions
- `fetchCollections`: Fetches all RAG collections
- `selectCollection`: Selects a collection and fetches its documents
- `fetchDocuments`: Fetches documents in the current collection
- `search`: Performs a search across collections
- `clearSearchResults`: Clears the search results

## API

The `api/rag.js` module provides methods for interacting with the RAG API:

- `fetchRagCollections()`: Get all collections
- `fetchRagDocuments(collectionId)`: Get documents in a collection
- `searchRag(query, collectionId)`: Search documents
- `uploadDocuments(collectionId, files, options)`: Upload files to a collection
- `deleteDocument(documentId)`: Delete a document
- `createCollection(collectionData)`: Create a new collection
- `deleteCollection(collectionId, deleteDocuments)`: Delete a collection
- `getDocumentContent(documentId)`: Get document content
- `getDocumentChunks(documentId)`: Get document chunks

## Usage Example

```vue
<template>
  <div>
    <rag-document-list
      :documents="documents"
      :selected-document="selectedDocument"
      @add="showUpload = true"
      @select="selectDocument"
    />
    
    <rag-upload-dialog
      v-model="showUpload"
      :collections="collections"
      @uploaded="refreshDocuments"
    />
    
    <rag-search-results
      :results="searchResults"
      :is-loading="isSearching"
      @select="viewResult"
    />
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex'

export default {
  data() {
    return {
      showUpload: false,
      selectedDocument: null
    }
  },
  
  computed: {
    ...mapState('rag', [
      'collections',
      'documents',
      'searchResults',
      'isLoading',
      'error'
    ]),
    
    isSearching() {
      return this.isLoading && this.searchQuery
    }
  },
  
  async created() {
    await this.fetchCollections()
    if (this.collections.length > 0) {
      await this.selectCollection(this.collections[0].id)
    }
  },
  
  methods: {
    ...mapActions('rag', [
      'fetchCollections',
      'selectCollection',
      'search'
    ]),
    
    async refreshDocuments() {
      if (this.currentCollection) {
        await this.selectCollection(this.currentCollection.id)
      }
    },
    
    selectDocument(doc) {
      this.selectedDocument = doc
      // Handle document selection
    },
    
    viewResult(result) {
      // Handle search result selection
    },
    
    async performSearch(query) {
      await this.search({ query })
    }
  }
}
</script>
```

## Plugin

The RAG plugin (`plugins/rag.js`) provides a global `$rag` helper with convenience methods:

```javascript
// In a Vue component
this.$rag.search('query').then(results => {
  console.log('Search results:', results)
})

const collections = await this.$rag.getCollections()
const currentCollection = this.$rag.currentCollection
const documents = this.$rag.documents
```

## Integration

To use the RAG components and store in your application:

1. Register the plugin in your main application file:

```javascript
import Vue from 'vue'
import ragPlugin from './plugins/rag'

Vue.use(ragPlugin, { store })
```

2. Use the components in your templates:

```vue
<rag-document-list />
<rag-upload-dialog />
<rag-search-results />
```

3. Access the store in your components:

```javascript
export default {
  computed: {
    ...mapState('rag', ['collections', 'documents', 'searchResults'])
  },
  methods: {
    ...mapActions('rag', ['fetchCollections', 'selectCollection', 'search'])
  }
}
```

## Styling

The components use Vuetify's default styling. You can customize the appearance by overriding the following CSS classes:

- `.rag-document-list`: Document list container
- `.rag-upload-dialog`: Upload dialog container
- `.rag-search-results`: Search results container
- `.document-item`: Individual document item
- `.search-result`: Individual search result item

## Dependencies

- Vue.js
- Vuetify
- Vuex
- Axios (for API calls)

## Browser Support

The components are designed to work with modern browsers that support ES6+ JavaScript and the latest web standards.
