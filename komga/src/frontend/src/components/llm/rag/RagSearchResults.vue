<template>
  <div class="rag-search-results">
    <v-card v-if="results.length > 0" class="mb-4">
      <v-card-title class="d-flex align-center">
        <v-icon left>mdi-magnify</v-icon>
        {{ $t('llm.rag.search_results') }}
        <v-spacer />
        <span class="text-caption text--secondary">
          {{ results.length }} {{ $t('common.results') }}
        </span>
      </v-card-title>
      
      <v-divider />
      
      <v-list>
        <template v-for="(result, index) in results">
          <v-list-item :key="result.id" class="result-item">
            <v-list-item-avatar>
              <v-icon>{{ getDocumentIcon(result.document) }}</v-icon>
            </v-list-item-avatar>
            
            <v-list-item-content>
              <v-list-item-title class="d-flex align-center">
                {{ result.document.name || 'Untitled' }}
                <v-chip
                  v-if="result.score"
                  x-small
                  color="primary"
                  text-color="white"
                  class="ml-2"
                >
                  {{ (result.score * 100).toFixed(1) }}%
                </v-chip>
              </v-list-item-title>
              
              <v-list-item-subtitle>
                {{ formatSnippet(result.text) }}
              </v-list-item-subtitle>
              
              <div class="text-caption text--secondary mt-1">
                <v-tooltip bottom>
                  <template v-slot:activator="{ on, attrs }">
                    <span v-bind="attrs" v-on="on">
                      <v-icon x-small>mdi-file-document</v-icon>
                      {{ result.document.type || 'Document' }}
                    </span>
                  </template>
                  <span>{{ result.document.id }}</span>
                </v-tooltip>
                
                <span class="mx-2">•</span>
                
                <v-tooltip bottom>
                  <template v-slot:activator="{ on, attrs }">
                    <span v-bind="attrs" v-on="on">
                      <v-icon x-small>mdi-database</v-icon>
                      {{ result.collection.name }}
                    </span>
                  </template>
                  <span>{{ result.collection.id }}</span>
                </v-tooltip>
                
                <span class="mx-2">•</span>
                
                <v-tooltip bottom>
                  <template v-slot:activator="{ on, attrs }">
                    <span v-bind="attrs" v-on="on">
                      <v-icon x-small>mdi-clock</v-icon>
                      {{ formatDate(result.timestamp) }}
                    </span>
                  </template>
                  <span>Last updated: {{ new Date(result.timestamp).toLocaleString() }}</span>
                </v-tooltip>
              </div>
            </v-list-item-content>
            
            <v-list-item-action>
              <v-btn
                icon
                @click="$emit('select', result)"
              >
                <v-icon>mdi-open-in-new</v-icon>
              </v-btn>
            </v-list-item-action>
          </v-list-item>
          
          <v-divider v-if="index < results.length - 1" :key="`divider-${index}`" />
        </template>
      </v-list>
    </v-card>
    
    <v-alert
      v-else-if="!isLoading"
      type="info"
      class="mb-4"
    >
      {{ $t('llm.rag.no_results') }}
    </v-alert>
    
    <v-skeleton-loader
      v-else
      type="list-item-avatar-three-line@3"
      class="mb-4"
    />
  </div>
</template>

<script>
export default {
  name: 'RagSearchResults',
  
  props: {
    results: {
      type: Array,
      default: () => []
    },
    isLoading: {
      type: Boolean,
      default: false
    }
  },
  
  methods: {
    getDocumentIcon(doc) {
      const type = doc?.type?.toLowerCase() || ''
      if (type.includes('pdf')) return 'mdi-file-pdf'
      if (type.includes('word')) return 'mdi-file-word'
      if (type.includes('excel')) return 'mdi-file-excel'
      if (type.includes('text')) return 'mdi-text'
      return 'mdi-file-document'
    },
    
    formatSnippet(text) {
      if (!text) return ''
      // Simple snippet formatter - could be enhanced with highlighting
      return text.length > 200 ? `${text.substring(0, 200)}...` : text
    },
    
    formatDate(dateString) {
      if (!dateString) return ''
      const date = new Date(dateString)
      return date.toLocaleDateString()
    }
  }
}
</script>

<style scoped>
.rag-search-results {
  max-width: 100%;
  overflow-x: hidden;
}

.result-item {
  transition: background-color 0.2s;
}

.result-item:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.v-list-item__title,
.v-list-item__subtitle {
  white-space: normal;
  word-break: break-word;
}

.v-list-item__subtitle {
  margin-top: 4px;
}

::v-deep .v-skeleton-loader__list-item-avatar-three-line {
  height: 88px;
}
</style>
