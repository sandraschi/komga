<template>
  <div class="d-flex align-center">
    <!-- Provider Selector -->
    <v-menu offset-y :close-on-content-click="false">
      <template v-slot:activator="{ on, attrs }">
        <v-btn
          text
          small
          class="text-capitalize mr-1"
          v-bind="attrs"
          v-on="on"
          :loading="loading"
          :disabled="loading"
        >
          <v-icon left small>mdi-connection</v-icon>
          {{ activeProviderName || 'Select Provider' }}
          <v-icon right small>mdi-chevron-down</v-icon>
        </v-btn>
      </template>
      <v-card min-width="250">
        <v-toolbar dense flat>
          <v-toolbar-title class="text-subtitle-2">LLM Providers</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn icon small @click="fetchProviders" :loading="loading">
            <v-icon small>mdi-refresh</v-icon>
          </v-btn>
        </v-toolbar>
        <v-divider></v-divider>
        <v-list dense>
          <v-list-item-group v-model="selectedProvider" color="primary">
            <v-list-item
              v-for="provider in providers"
              :key="provider.id"
              :value="provider.id"
              @click="selectProvider(provider.id)"
            >
              <v-list-item-icon class="mr-2">
                <v-icon small>mdi-{{ getProviderIcon(provider.id) }}</v-icon>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title class="text-body-2">
                  {{ provider.name }}
                  <v-icon v-if="provider.id === activeProvider" small color="success" class="ml-1">
                    mdi-check-circle
                  </v-icon>
                </v-list-item-title>
                <v-list-item-subtitle class="text-caption">
                  {{ provider.description || 'No description' }}
                </v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
          </v-list-item-group>
        </v-list>
      </v-card>
    </v-menu>

    <!-- Model Selector -->
    <v-menu
      offset-y
      :close-on-content-click="false"
      :disabled="!activeProvider || !models.length"
      max-height="400"
    >
      <template v-slot:activator="{ on, attrs }">
        <v-btn
          text
          small
          class="text-capitalize mr-1"
          :loading="loadingModels"
          :disabled="!activeProvider || !models.length"
          v-bind="attrs"
          v-on="on"
        >
          <v-icon left small>mdi-robot-outline</v-icon>
          {{ selectedModelName || 'Select Model' }}
          <v-icon right small>mdi-chevron-down</v-icon>
          <v-icon v-if="isModelLoading" small class="ml-1" color="primary">
            mdi-loading mdi-spin
          </v-icon>
          <v-icon v-else-if="selectedModel" small class="ml-1" color="success">
            mdi-check-circle
          </v-icon>
        </v-btn>
      </template>
      <v-card min-width="300">
        <v-toolbar dense flat>
          <v-toolbar-title class="text-subtitle-2">
            {{ activeProviderName }} Models
          </v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn icon small @click="fetchModels" :loading="loadingModels">
            <v-icon small>mdi-refresh</v-icon>
          </v-btn>
        </v-toolbar>
        <v-divider></v-divider>
        <v-list dense>
          <v-list-item-group v-model="selectedModel" color="primary">
            <v-list-item
              v-for="model in models"
              :key="model.id"
              :value="model.id"
              @click="selectModel(model.id)"
            >
              <v-list-item-icon class="mr-2">
                <v-icon v-if="model.loaded" small color="success">mdi-check-circle</v-icon>
                <v-progress-circular
                  v-else-if="model.status === 'LOADING'"
                  indeterminate
                  size="16"
                  width="2"
                ></v-progress-circular>
                <v-icon v-else small>mdi-robot-outline</v-icon>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title class="text-body-2">
                  {{ model.name }}
                </v-list-item-title>
                <v-list-item-subtitle class="text-caption">
                  {{ formatModelDetails(model) }}
                </v-list-item-subtitle>
              </v-list-item-content>
              <v-list-item-action>
                <v-btn
                  v-if="model.loaded"
                  icon
                  x-small
                  @click.stop="unloadModel(model.id)"
                  :loading="model.status === 'UNLOADING'"
                >
                  <v-icon x-small>mdi-close</v-icon>
                </v-btn>
                <v-btn
                  v-else
                  icon
                  x-small
                  :loading="model.status === 'LOADING'"
                  @click.stop="loadModel(model.id)"
                >
                  <v-icon x-small>mdi-download</v-icon>
                </v-btn>
              </v-list-item-action>
            </v-list-item>
          </v-list-item-group>
        </v-list>
      </v-card>
    </v-menu>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex'

export default {
  name: 'LlmProviderSelector',
  
  data() {
    return {
      loading: false,
      loadingModels: false,
      selectedProvider: null,
      selectedModel: null,
      isModelLoading: false
    }
  },
  
  computed: {
    ...mapState('llm', {
      providers: state => state.providers,
      activeProvider: state => state.activeProvider,
      models: state => state.models,
      isLoading: state => state.isLoading
    }),
    
    activeProviderName() {
      if (!this.activeProvider) return null
      const provider = this.providers.find(p => p.id === this.activeProvider)
      return provider ? provider.name : null
    },
    
    selectedModelName() {
      if (!this.selectedModel) return null
      const model = this.models.find(m => m.id === this.selectedModel)
      return model ? model.name : null
    }
  },
  
  watch: {
    activeProvider: {
      immediate: true,
      handler(provider) {
        if (provider) {
          this.selectedProvider = provider
          this.fetchModels()
        }
      }
    },
    
    models: {
      immediate: true,
      handler(models) {
        // Auto-select the first loaded model or the first model in the list
        if (models && models.length) {
          const loadedModel = models.find(m => m.loaded)
          this.selectedModel = loadedModel ? loadedModel.id : models[0].id
        } else {
          this.selectedModel = null
        }
      }
    }
  },
  
  mounted() {
    this.initialize()
  },
  
  methods: {
    ...mapActions('llm', [
      'fetchProviders',
      'fetchActiveProvider',
      'fetchModels',
      'switchProvider',
      'loadModel',
      'unloadModel'
    ]),
    
    async initialize() {
      this.loading = true
      try {
        await Promise.all([
          this.fetchProviders(),
          this.fetchActiveProvider()
        ])
      } catch (error) {
        console.error('Failed to initialize LLM provider selector:', error)
      } finally {
        this.loading = false
      }
    },
    
    getProviderIcon(providerId) {
      const icons = {
        openai: 'openai',
        ollama: 'docker',
        lmstudio: 'laptop',
        vllm: 'server-network',
        default: 'connection'
      }
      return icons[providerId] || icons.default
    },
    
    formatModelDetails(model) {
      const details = []
      if (model.parameters) {
        if (model.parameters.size) {
          details.push(this.formatSize(model.parameters.size))
        }
        if (model.parameters.format) {
          details.push(model.parameters.format.toUpperCase())
        }
      }
      return details.join(' • ') || 'No details available'
    },
    
    formatSize(bytes) {
      if (!bytes) return ''
      const units = ['B', 'KB', 'MB', 'GB', 'TB']
      let size = bytes
      let unitIndex = 0
      while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024
        unitIndex++
      }
      return `${size.toFixed(1)} ${units[unitIndex]}`
    },
    
    async selectProvider(providerId) {
      if (providerId === this.activeProvider) return
      
      this.loading = true
      try {
        await this.switchProvider(providerId)
        await this.fetchModels()
      } catch (error) {
        console.error('Failed to switch provider:', error)
      } finally {
        this.loading = false
      }
    },
    
    selectModel(modelId) {
      this.selectedModel = modelId
      this.$emit('model-selected', modelId)
    },
    
    async loadModel(modelId) {
      try {
        this.isModelLoading = true
        await this.loadModel({
          providerId: this.activeProvider,
          modelId
        })
        // Refresh models to update status
        await this.fetchModels()
      } catch (error) {
        console.error('Failed to load model:', error)
      } finally {
        this.isModelLoading = false
      }
    },
    
    async unloadModel(modelId) {
      try {
        this.isModelLoading = true
        await this.unloadModel({
          providerId: this.activeProvider,
          modelId
        })
        // Refresh models to update status
        await this.fetchModels()
      } catch (error) {
        console.error('Failed to unload model:', error)
      } finally {
        this.isModelLoading = false
      }
    }
  }
}
</script>

<style scoped>
.v-list-item {
  min-height: 48px;
}

.v-list-item__icon {
  margin: 0 8px 0 0;
}

.v-list-item__action {
  margin: 0;
}

.v-btn {
  min-width: 0;
}

/* Loading animation */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.mdi-spin {
  animation: spin 1s linear infinite;
}
</style>
