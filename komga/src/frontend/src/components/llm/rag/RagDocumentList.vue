<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <v-icon left>mdi-file-document-multiple</v-icon>
      {{ $t('llm.rag.documents') }}
      <v-spacer />
      <v-btn 
        color="primary" 
        small 
        @click="$emit('add')"
      >
        <v-icon left>mdi-plus</v-icon>
        {{ $t('common.add') }}
      </v-btn>
    </v-card-title>
    
    <v-divider />
    
    <v-card-text class="pa-0">
      <v-text-field
        v-model="search"
        :label="$t('common.search')"
        prepend-inner-icon="mdi-magnify"
        outlined
        dense
        hide-details
        class="mx-4 my-2"
      />
      
      <v-divider />
      
      <v-list>
        <v-list-item
          v-for="doc in filteredDocuments"
          :key="doc.id"
          @click="$emit('select', doc)"
          :class="{ 'blue lighten-5': isSelected(doc) }"
        >
          <v-list-item-avatar>
            <v-icon>{{ getDocumentIcon(doc) }}</v-icon>
          </v-list-item-avatar>
          
          <v-list-item-content>
            <v-list-item-title>{{ doc.name || 'Untitled' }}</v-list-item-title>
            <v-list-item-subtitle>
              {{ formatFileSize(doc.size) }} • {{ formatDate(doc.createdAt) }}
            </v-list-item-subtitle>
          </v-list-item-content>
          
          <v-list-item-action>
            <v-btn icon @click.stop="$emit('delete', doc)">
              <v-icon color="error">mdi-delete</v-icon>
            </v-btn>
          </v-list-item-action>
        </v-list-item>
        
        <v-list-item v-if="!documents.length">
          <v-list-item-content class="text-center py-4">
            <v-icon size="48" class="mb-2">mdi-folder-open-outline</v-icon>
            <div class="subtitle-1">No documents</div>
            <div class="text-caption">Upload your first document to get started</div>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-card-text>
  </v-card>
</template>

<script>
export default {
  name: 'RagDocumentList',
  
  props: {
    documents: {
      type: Array,
      default: () => []
    },
    selectedDocument: {
      type: Object,
      default: null
    }
  },
  
  data() {
    return {
      search: ''
    }
  },
  
  computed: {
    filteredDocuments() {
      if (!this.search) return this.documents
      const query = this.search.toLowerCase()
      return this.documents.filter(doc => 
        (doc.name && doc.name.toLowerCase().includes(query)) ||
        (doc.type && doc.type.toLowerCase().includes(query))
      )
    }
  },
  
  methods: {
    isSelected(doc) {
      return this.selectedDocument && this.selectedDocument.id === doc.id
    },
    
    getDocumentIcon(doc) {
      const type = doc.type ? doc.type.toLowerCase() : ''
      if (type.includes('pdf')) return 'mdi-file-pdf'
      if (type.includes('word')) return 'mdi-file-word'
      if (type.includes('excel')) return 'mdi-file-excel'
      if (type.includes('text')) return 'mdi-text'
      return 'mdi-file-document'
    },
    
    formatFileSize(bytes) {
      if (!bytes) return '0 B'
      const units = ['B', 'KB', 'MB', 'GB']
      let size = bytes
      let unit = 0
      while (size >= 1024 && unit < units.length - 1) {
        size /= 1024
        unit++
      }
      return `${size.toFixed(1)} ${units[unit]}`
    },
    
    formatDate(dateString) {
      if (!dateString) return ''
      return new Date(dateString).toLocaleDateString()
    }
  }
}
</script>
