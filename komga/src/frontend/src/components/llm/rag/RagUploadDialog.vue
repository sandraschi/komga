<template>
  <v-dialog
    v-model="dialog"
    max-width="600"
    persistent
  >
    <v-card>
      <v-card-title>
        <v-icon left>mdi-upload</v-icon>
        {{ $t('llm.rag.upload_documents') }}
      </v-card-title>
      
      <v-card-text>
        <v-file-input
          v-model="files"
          :label="$t('llm.rag.select_files')"
          multiple
          prepend-icon="mdi-paperclip"
          :show-size="1000"
          :loading="isUploading"
          :disabled="isUploading"
          @change="onFilesSelected"
        />
        
        <v-select
          v-model="collectionId"
          :items="collections"
          item-text="name"
          item-value="id"
          :label="$t('llm.rag.select_collection')"
          :loading="isLoadingCollections"
          class="mt-4"
        />
        
        <v-checkbox
          v-model="chunkDocuments"
          :label="$t('llm.rag.chunk_documents')"
          class="mt-2"
        />
        
        <v-row v-if="chunkDocuments" class="mt-2">
          <v-col cols="6">
            <v-text-field
              v-model.number="chunkSize"
              :label="$t('llm.rag.chunk_size')"
              type="number"
              min="100"
              max="4000"
              suffix="chars"
              outlined
              dense
            />
          </v-col>
          <v-col cols="6">
            <v-text-field
              v-model.number="chunkOverlap"
              :label="$t('llm.rag.chunk_overlap')"
              type="number"
              min="0"
              max="1000"
              suffix="chars"
              outlined
              dense
            />
          </v-col>
        </v-row>
        
        <v-alert
          v-if="error"
          type="error"
          class="mt-4"
          dense
          text
        >
          {{ error }}
        </v-alert>
        
        <v-progress-linear
          v-if="uploadProgress > 0"
          v-model="uploadProgress"
          height="25"
          class="mt-4"
          color="light-blue"
        >
          <strong>{{ Math.ceil(uploadProgress) }}%</strong>
        </v-progress-linear>
      </v-card-text>
      
      <v-card-actions>
        <v-spacer />
        <v-btn
          text
          @click="close"
          :disabled="isUploading"
        >
          {{ $t('common.cancel') }}
        </v-btn>
        <v-btn
          color="primary"
          @click="upload"
          :loading="isUploading"
          :disabled="!canUpload"
        >
          {{ $t('common.upload') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: 'RagUploadDialog',
  
  props: {
    value: {
      type: Boolean,
      default: false
    },
    collections: {
      type: Array,
      default: () => []
    },
    isLoadingCollections: {
      type: Boolean,
      default: false
    }
  },
  
  data() {
    return {
      dialog: this.value,
      files: [],
      collectionId: null,
      chunkDocuments: true,
      chunkSize: 1000,
      chunkOverlap: 200,
      isUploading: false,
      uploadProgress: 0,
      error: null
    }
  },
  
  computed: {
    canUpload() {
      return this.files.length > 0 && this.collectionId
    }
  },
  
  watch: {
    value(val) {
      this.dialog = val
    },
    
    dialog(val) {
      this.$emit('input', val)
      if (!val) {
        this.reset()
      }
    }
  },
  
  methods: {
    onFilesSelected(files) {
      this.files = files || []
      this.error = null
    },
    
    async upload() {
      if (!this.canUpload) return
      
      this.isUploading = true
      this.uploadProgress = 0
      this.error = null
      
      try {
        const formData = new FormData()
        
        // Add files
        this.files.forEach(file => {
          formData.append('files', file)
        })
        
        // Add metadata
        formData.append('collectionId', this.collectionId)
        formData.append('chunkDocuments', this.chunkDocuments)
        if (this.chunkDocuments) {
          formData.append('chunkSize', this.chunkSize)
          formData.append('chunkOverlap', this.chunkOverlap)
        }
        
        // Upload with progress tracking
        await this.$http.post('/api/rag/documents/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            this.uploadProgress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            )
          }
        })
        
        this.$emit('uploaded')
        this.close()
      } catch (error) {
        console.error('Upload failed:', error)
        this.error = error.response?.data?.message || 'Upload failed. Please try again.'
      } finally {
        this.isUploading = false
      }
    },
    
    close() {
      this.dialog = false
    },
    
    reset() {
      this.files = []
      this.uploadProgress = 0
      this.error = null
      this.isUploading = false
    }
  }
}
</script>
