<template>
  <div class="rag-page">
    <v-container fluid class="pa-4">
      <v-row>
        <v-col cols="12" md="8" offset-md="2">
          <v-card class="mb-4">
            <v-card-title class="headline">
              <v-icon left>mdi-robot</v-icon>
              RAG System
            </v-card-title>
            <v-card-subtitle>Retrieval-Augmented Generation for Komga</v-card-subtitle>
            
            <v-card-text>
              <v-form @submit.prevent="submitQuery">
                <v-textarea
                  v-model="query"
                  label="Ask a question..."
                  outlined
                  auto-grow
                  rows="2"
                  :loading="loading"
                  :disabled="!isRagEnabled"
                  :hint="!isRagEnabled ? 'RAG system is not enabled in the server configuration' : ''"
                  persistent-hint
                ></v-textarea>
                
                <v-row class="mt-2">
                  <v-col cols="12" sm="6">
                    <v-slider
                      v-model="topK"
                      label="Results to return"
                      min="1"
                      max="10"
                      step="1"
                      thumb-label
                      ticks
                      class="mt-4"
                      :disabled="!isRagEnabled"
                    ></v-slider>
                  </v-col>
                  <v-col cols="12" sm="6" class="d-flex align-center">
                    <v-switch
                      v-model="generateAnswer"
                      label="Generate answer"
                      class="mt-0"
                      :disabled="!isRagEnabled"
                    ></v-switch>
                  </v-col>
                </v-row>
                
                <div class="d-flex justify-end">
                  <v-btn
                    color="primary"
                    type="submit"
                    :loading="loading"
                    :disabled="!query.trim() || !isRagEnabled"
                  >
                    <v-icon left>mdi-send</v-icon>
                    Submit
                  </v-btn>
                </div>
              </v-form>
              
              <v-divider class="my-4"></v-divider>
              
              <div v-if="response && response.answer" class="answer-section mb-6">
                <div class="text-h6 mb-2">Answer:</div>
                <v-card outlined class="pa-4">
                  <div class="answer-content" v-html="formatAnswer(response.answer)"></div>
                </v-card>
              </div>
              
              <div v-if="response && response.results.length > 0">
                <div class="text-h6 mb-2">Relevant Results:</div>
                <v-expansion-panels>
                  <v-expansion-panel
                    v-for="(result, index) in response.results"
                    :key="index"
                    class="mb-2"
                  >
                    <v-expansion-panel-header>
                      <div class="d-flex align-center">
                        <v-avatar color="primary" size="24" class="mr-2">
                          <span class="white--text">{{ index + 1 }}</span>
                        </v-avatar>
                        <div class="text-truncate">
                          <div class="text-subtitle-2">
                            {{ result.document.metadata.title || 'Untitled Document' }}
                            <v-chip x-small color="primary" text-color="white" class="ml-2">
                              {{ result.score.toFixed(2) }}
                            </v-chip>
                          </div>
                          <div class="text-caption text--secondary">
                            {{ result.chunk.content | truncate(100) }}
                          </div>
                        </div>
                      </div>
                    </v-expansion-panel-header>
                    <v-expansion-panel-content>
                      <div class="pa-2">
                        <div class="text-caption text--secondary mb-2">
                          <v-icon x-small>mdi-file-document-outline</v-icon>
                          {{ result.document.metadata.source || 'Unknown source' }}
                        </div>
                        <div class="chunk-content">
                          {{ result.chunk.content }}
                        </div>
                      </div>
                    </v-expansion-panel-content>
                  </v-expansion-panel>
                </v-expansion-panels>
              </div>
              
              <div v-else-if="response" class="text-center py-4">
                <v-icon large color="grey lighten-1">mdi-information-outline</v-icon>
                <div class="text-subtitle-1 mt-2">No relevant results found</div>
              </div>
            </v-card-text>
          </v-card>
          
          <v-card v-if="isAdmin">
            <v-card-title>
              <v-icon left>mdi-cog</v-icon>
              RAG Administration
            </v-card-title>
            <v-card-text>
              <v-tabs v-model="adminTab">
                <v-tab>Add Documents</v-tab>
                <v-tab>Manage Documents</v-tab>
              </v-tabs>
              
              <v-tabs-items v-model="adminTab">
                <!-- Add Documents Tab -->
                <v-tab-item>
                  <v-card flat class="pa-4">
                    <v-form @submit.prevent="addDocuments">
                      <v-select
                        v-model="documentType"
                        :items="documentTypes"
                        label="Document Type"
                        outlined
                        dense
                        class="mb-4"
                      ></v-select>
                      
                      <v-text-field
                        v-if="documentType === 'text'"
                        v-model="documentTitle"
                        label="Document Title"
                        outlined
                        dense
                        required
                        class="mb-4"
                      ></v-text-field>
                      
                      <v-file-input
                        v-if="documentType === 'file'"
                        v-model="files"
                        label="Document Files"
                        multiple
                        show-size
                        outlined
                        dense
                        class="mb-4"
                        :loading="uploading"
                        :disabled="uploading"
                      ></v-file-input>
                      
                      <v-textarea
                        v-else
                        v-model="documentText"
                        label="Document Content"
                        outlined
                        rows="8"
                        class="mb-4"
                        :loading="uploading"
                        :disabled="uploading"
                      ></v-textarea>
                      
                      <div class="d-flex justify-end">
                        <v-btn
                          color="primary"
                          type="submit"
                          :loading="uploading"
                          :disabled="!isValidDocument"
                        >
                          <v-icon left>mdi-upload</v-icon>
                          Upload Document
                        </v-btn>
                      </div>
                    </v-form>
                  </v-card>
                </v-tab-item>
                
                <!-- Manage Documents Tab -->
                <v-tab-item>
                  <v-card flat class="pa-4">
                    <v-data-table
                      :headers="documentHeaders"
                      :items="documents"
                      :loading="loadingDocuments"
                      :items-per-page="10"
                      class="elevation-1"
                    >
                      <template v-slot:item.actions="{ item }">
                        <v-btn
                          icon
                          small
                          color="error"
                          @click="deleteDocument(item)"
                        >
                          <v-icon small>mdi-delete</v-icon>
                        </v-btn>
                      </template>
                    </v-data-table>
                  </v-card>
                </v-tab-item>
              </v-tabs-items>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script>
export default {
  name: 'RagPage',
  
  data() {
    return {
      // Query state
      query: '',
      topK: 5,
      generateAnswer: true,
      loading: false,
      response: null,
      
      // Admin state
      isRagEnabled: false,
      isAdmin: false,
      adminTab: 0,
      
      // Document upload state
      documentType: 'text',
      documentTypes: [
        { text: 'Text', value: 'text' },
        { text: 'File Upload', value: 'file' },
      ],
      documentTitle: '',
      documentText: '',
      files: [],
      uploading: false,
      
      // Document management
      documents: [],
      loadingDocuments: false,
      documentHeaders: [
        { text: 'Title', value: 'metadata.title' },
        { text: 'Source', value: 'metadata.source' },
        { text: 'Chunks', value: 'chunks.length' },
        { text: 'Actions', value: 'actions', sortable: false },
      ],
    };
  },
  
  computed: {
    isValidDocument() {
      if (this.documentType === 'file') {
        return this.files.length > 0;
      } else {
        return this.documentTitle && this.documentText.trim();
      }
    },
  },
  
  async created() {
    await this.checkRagStatus();
    if (this.isRagEnabled && this.isAdmin) {
      await this.loadDocuments();
    }
  },
  
  methods: {
    async checkRagStatus() {
      try {
        const response = await this.$http.get('/api/v1/rag/status');
        this.isRagEnabled = response.data.enabled;
        this.isAdmin = response.data.isAdmin;
      } catch (error) {
        console.error('Failed to check RAG status:', error);
        this.$toast.error('Failed to check RAG system status');
      }
    },
    
    async submitQuery() {
      if (!this.query.trim() || !this.isRagEnabled) return;
      
      this.loading = true;
      this.response = null;
      
      try {
        const response = await this.$http.post('/api/v1/rag/query', {
          query: this.query,
          topK: this.topK,
          generateAnswer: this.generateAnswer,
        });
        
        this.response = response.data;
      } catch (error) {
        console.error('Failed to submit query:', error);
        this.$toast.error('Failed to process your query');
      } finally {
        this.loading = false;
      }
    },
    
    formatAnswer(text) {
      // Simple markdown-like formatting for the answer
      return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
        .replace(/`(.*?)`/g, '<code>$1</code>') // Code
        .replace(/\n/g, '<br>'); // New lines
    },
    
    async loadDocuments() {
      this.loadingDocuments = true;
      try {
        const response = await this.$http.get('/api/v1/rag/documents');
        this.documents = response.data;
      } catch (error) {
        console.error('Failed to load documents:', error);
        this.$toast.error('Failed to load documents');
      } finally {
        this.loadingDocuments = false;
      }
    },
    
    async addDocuments() {
      if (!this.isValidDocument) return;
      
      this.uploading = true;
      
      try {
        let formData = new FormData();
        
        if (this.documentType === 'file') {
          // Handle file uploads
          for (const file of this.files) {
            formData.append('files', file);
          }
          formData.append('metadata', JSON.stringify({
            source: 'file_upload',
            uploadedAt: new Date().toISOString(),
          }));
        } else {
          // Handle text input
          formData.append('text', this.documentText);
          formData.append('metadata', JSON.stringify({
            title: this.documentTitle,
            source: 'manual_input',
            uploadedAt: new Date().toISOString(),
          }));
        }
        
        await this.$http.post('/api/v1/rag/documents', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
        this.$toast.success('Documents added successfully');
        this.documentText = '';
        this.documentTitle = '';
        this.files = [];
        
        // Reload documents
        await this.loadDocuments();
      } catch (error) {
        console.error('Failed to add documents:', error);
        this.$toast.error('Failed to add documents');
      } finally {
        this.uploading = false;
      }
    },
    
    async deleteDocument(document) {
      if (!confirm(`Are you sure you want to delete "${document.metadata.title || 'this document'}"?`)) {
        return;
      }
      
      try {
        await this.$http.delete(`/api/v1/rag/documents/${document.id}`);
        this.$toast.success('Document deleted successfully');
        await this.loadDocuments();
      } catch (error) {
        console.error('Failed to delete document:', error);
        this.$toast.error('Failed to delete document');
      }
    },
  },
  
  filters: {
    truncate(text, length) {
      if (!text) return '';
      return text.length > length ? text.substring(0, length) + '...' : text;
    },
  },
};
</script>

<style scoped>
.rag-page {
  max-width: 1200px;
  margin: 0 auto;
}

.answer-section {
  background-color: #f5f5f5;
  border-radius: 4px;
  padding: 16px;
}

.answer-content {
  line-height: 1.6;
}

.chunk-content {
  white-space: pre-wrap;
  font-family: monospace;
  background-color: #f8f9fa;
  padding: 8px;
  border-radius: 4px;
  font-size: 0.9em;
}
</style>
