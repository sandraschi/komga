<template>
  <v-card>
    <v-card-title>{{ $t('llm.settings.title') }}</v-card-title>
    <v-card-text>
      <v-alert
        v-if="error"
        type="error"
        class="mb-4"
        dismissible
        @input="clearError"
      >
        {{ error }}
      </v-alert>

      <v-alert
        v-if="testResult"
        :type="testResult.success ? 'success' : 'error'"
        class="mb-4"
        dismissible
        @input="clearTestResult"
      >
        {{ testResult.message }}
      </v-alert>

      <v-tabs v-model="activeTab" grow>
        <v-tab>{{ $t('llm.settings.providers') }}</v-tab>
        <v-tab>{{ $t('llm.settings.chat') }}</v-tab>
        <v-tab>{{ $t('llm.settings.embeddings') }}</v-tab>
      </v-tabs>

      <v-tabs-items v-model="activeTab" class="mt-4">
        <!-- Providers Tab -->
        <v-tab-item>
          <v-card flat>
            <v-card-text>
              <v-select
                v-model="selectedProviderId"
                :items="availableProviders"
                item-text="name"
                item-value="id"
                :label="$t('llm.settings.select_provider')"
                :loading="isLoading"
                :disabled="isLoading"
                @change="onProviderChange"
              />

              
              <v-divider class="my-4" />
              
              <!-- Provider Configuration -->
              <div v-if="selectedProvider">
                <h3 class="headline mb-3">{{ selectedProvider.name }} {{ $t('llm.settings.configuration') }}</h3>
                
                <!-- OpenAI Configuration -->
                <div v-if="selectedProvider.id === 'OPENAI'">
                  <v-text-field
                    v-model="providerConfig.apiKey"
                    :label="$t('llm.settings.openai.api_key')"
                    :type="showApiKey ? 'text' : 'password'"
                    :append-icon="showApiKey ? 'mdi-eye-off' : 'mdi-eye'"
                    @click:append="showApiKey = !showApiKey"
                    :disabled="isLoading"
                  />
                  
                  <v-text-field
                    v-model="providerConfig.apiUrl"
                    :label="$t('llm.settings.openai.api_url')"
                    :disabled="isLoading"
                  />
                  
                  <v-text-field
                    v-model="providerConfig.model"
                    :label="$t('llm.settings.openai.model')"
                    :disabled="isLoading"
                  />
                  
                  <v-text-field
                    v-model.number="providerConfig.maxTokens"
                    type="number"
                    :label="$t('llm.settings.openai.max_tokens')"
                    :disabled="isLoading"
                  />
                  
                  <v-slider
                    v-model="providerConfig.temperature"
                    :label="$t('llm.settings.openai.temperature')"
                    min="0"
                    max="2"
                    step="0.1"
                    thumb-label
                    :disabled="isLoading"
                  />
                </div>
                
                <!-- Ollama Configuration -->
                <div v-else-if="selectedProvider.id === 'OLLAMA'">
                  <v-text-field
                    v-model="providerConfig.apiUrl"
                    :label="$t('llm.settings.ollama.api_url')"
                    :disabled="isLoading"
                  />
                  
                  <v-text-field
                    v-model="providerConfig.model"
                    :label="$t('llm.settings.ollama.model')"
                    :disabled="isLoading"
                  />
                  
                  <v-text-field
                    v-model.number="providerConfig.contextWindow"
                    type="number"
                    :label="$t('llm.settings.ollama.context_window')"
                    :disabled="isLoading"
                  />
                </div>
                
                <!-- Generic Configuration -->
                <div v-else>
                  <v-text-field
                    v-model="providerConfig.apiUrl"
                    :label="$t('llm.settings.generic.api_url')"
                    :disabled="isLoading"
                  />
                  
                  <v-text-field
                    v-model="providerConfig.model"
                    :label="$t('llm.settings.generic.model')"
                    :disabled="isLoading"
                  />
                </div>
                
                <v-btn
                  color="primary"
                  :loading="isTesting"
                  :disabled="isLoading"
                  @click="testConnection"
                  class="mr-2"
                >
                  {{ $t('common.test') }}
                </v-btn>
                
                <v-btn
                  color="primary"
                  :loading="isSaving"
                  :disabled="isLoading || isTesting"
                  @click="saveConfiguration"
                >
                  {{ $t('common.save') }}
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </v-tab-item>
        
        <!-- Chat Tab -->
        <v-tab-item>
          <v-card flat>
            <v-card-text>
              <v-alert
                v-if="!isConfigured"
                type="info"
                class="mb-4"
              >
                {{ $t('llm.settings.configure_provider_first') }}
              </v-alert>
              
              <v-textarea
                v-model="chatPrompt"
                :label="$t('llm.settings.chat.prompt')"
                :disabled="!isConfigured || isLoading"
                rows="3"
                class="mb-4"
              />
              
              <v-slider
                v-model="chatMaxTokens"
                :label="$t('llm.settings.chat.max_tokens')"
                min="1"
                max="4000"
                step="1"
                thumb-label
                :disabled="!isConfigured || isLoading"
                class="mb-4"
              />
              
              <v-slider
                v-model="chatTemperature"
                :label="$t('llm.settings.chat.temperature')"
                min="0"
                max="2"
                step="0.1"
                thumb-label
                :disabled="!isConfigured || isLoading"
                class="mb-4"
              />
              
              <v-btn
                color="primary"
                :loading="isGenerating"
                :disabled="!isConfigured || isLoading || !chatPrompt"
                @click="generateChat"
              >
                {{ $t('llm.settings.chat.generate') }}
              </v-btn>
              
              <v-divider class="my-4" />
              
              <div v-if="chatResponse">
                <h4 class="subtitle-1 mb-2">{{ $t('llm.settings.chat.response') }}:</h4>
                <v-sheet
                  outlined
                  rounded
                  class="pa-4"
                >
                  <pre class="response-text">{{ chatResponse }}</pre>
                </v-sheet>
              </div>
            </v-card-text>
          </v-card>
        </v-tab-item>
        
        <!-- Embeddings Tab -->
        <v-tab-item>
          <v-card flat>
            <v-card-text>
              <v-alert
                v-if="!isConfigured"
                type="info"
                class="mb-4"
              >
                {{ $t('llm.settings.configure_provider_first') }}
              </v-alert>
              
              <v-textarea
                v-model="embeddingText"
                :label="$t('llm.settings.embeddings.text')"
                :disabled="!isConfigured || isLoading"
                rows="3"
                class="mb-4"
              />
              
              <v-btn
                color="primary"
                :loading="isGeneratingEmbedding"
                :disabled="!isConfigured || isLoading || !embeddingText"
                @click="generateEmbedding"
                class="mb-4"
              >
                {{ $t('llm.settings.embeddings.generate') }}
              </v-btn>
              
              <div v-if="embeddingResult">
                <h4 class="subtitle-1 mb-2">{{ $t('llm.settings.embeddings.result') }} ({{ embeddingResult.length }} {{ $t('llm.settings.embeddings.dimensions') }}):</h4>
                <v-sheet
                  outlined
                  rounded
                  class="pa-4"
                >
                  <pre class="response-text">{{ formatEmbedding(embeddingResult) }}</pre>
                </v-sheet>
              </div>
            </v-card-text>
          </v-card>
        </v-tab-item>
      </v-tabs-items>
    </v-card-text>
  </v-card>
</template>

<script>
export default {
  name: 'LlmSettings',
  
  data() {
    return {
      activeTab: 0,
      selectedProviderId: null,
      showApiKey: false,
      providerConfig: {},
      isSaving: false,
      isTesting: false,
      isGenerating: false,
      isGeneratingEmbedding: false,
      error: null,
      testResult: null,
      chatPrompt: '',
      chatResponse: null,
      chatMaxTokens: 1000,
      chatTemperature: 0.7,
      embeddingText: '',
      embeddingResult: null
    }
  },
  
  computed: {
    isLoading() {
      return this.$store.state.llm.isLoading
    },
    
    availableProviders() {
      return this.$store.state.llm.providers || []
    },
    
    selectedProvider() {
      return this.availableProviders.find(p => p.id === this.selectedProviderId)
    },
    
    isConfigured() {
      return this.$store.getters['llm/isConfigured']
    }
  },
  
  watch: {
    availableProviders: {
      immediate: true,
      handler(providers) {
        if (providers.length > 0 && !this.selectedProviderId) {
          this.selectedProviderId = this.$store.state.llm.activeProvider?.id || providers[0]?.id
        }
      }
    },
    
    selectedProvider: {
      immediate: true,
      handler(provider) {
        if (provider) {
          this.providerConfig = { ...provider.config }
        } else {
          this.providerConfig = {}
        }
      }
    }
  },
  
  created() {
    this.initialize()
  },
  
  methods: {
    async initialize() {
      try {
        await this.$store.dispatch('llm/fetchProviders')
        if (this.isConfigured) {
          await this.$store.dispatch('llm/fetchActiveProvider')
          await this.$store.dispatch('llm/fetchModels')
        }
      } catch (error) {
        this.error = this.$t('llm.errors.failed_to_load')
        console.error('Failed to initialize LLM settings:', error)
      }
    },
    
    async onProviderChange() {
      if (!this.selectedProviderId) return
      
      try {
        await this.$store.dispatch('llm/switchProvider', this.selectedProviderId)
      } catch (error) {
        this.error = this.$t('llm.errors.failed_to_switch_provider')
        console.error('Failed to switch provider:', error)
      }
    },
    
    async testConnection() {
      if (!this.selectedProviderId) return
      
      try {
        this.testResult = null
        await this.$store.dispatch('llm/testProviderConnection', this.selectedProviderId)
      } catch (error) {
        this.testResult = {
          success: false,
          message: this.$t('llm.errors.connection_failed')
        }
        console.error('Connection test failed:', error)
      }
    },
    
    async saveConfiguration() {
      if (!this.selectedProviderId) return
      
      try {
        this.isSaving = true
        this.error = null
        
        await this.$store.dispatch('llm/updateProviderConfig', {
          providerId: this.selectedProviderId,
          config: this.providerConfig
        })
        
        this.testResult = {
          success: true,
          message: this.$t('llm.settings.configuration_saved')
        }
      } catch (error) {
        this.error = this.$t('llm.errors.failed_to_save_configuration')
        console.error('Failed to save configuration:', error)
      } finally {
        this.isSaving = false
      }
    },
    
    async generateChat() {
      if (!this.chatPrompt) return
      
      try {
        this.isGenerating = true
        this.chatResponse = null
        this.error = null
        
        const messages = [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: this.chatPrompt }
        ]
        
        const response = await this.$store.dispatch('llm/generateChatCompletion', {
          messages,
          maxTokens: this.chatMaxTokens,
          temperature: this.chatTemperature
        })
        
        this.chatResponse = response.content
      } catch (error) {
        this.error = this.$t('llm.errors.failed_to_generate')
        console.error('Failed to generate chat completion:', error)
      } finally {
        this.isGenerating = false
      }
    },
    
    async generateEmbedding() {
      if (!this.embeddingText) return
      
      try {
        this.isGeneratingEmbedding = true
        this.embeddingResult = null
        this.error = null
        
        const embedding = await this.$store.dispatch('llm/createEmbedding', this.embeddingText)
        this.embeddingResult = embedding
      } catch (error) {
        this.error = this.$t('llm.errors.failed_to_generate_embedding')
        console.error('Failed to generate embedding:', error)
      } finally {
        this.isGeneratingEmbedding = false
      }
    },
    
    formatEmbedding(embedding) {
      if (!embedding || !Array.isArray(embedding)) return ''
      
      // Show first 10 dimensions for preview
      const preview = embedding.slice(0, 10)
      const remaining = embedding.length - 10
      
      let result = `[${preview.join(', ')}`
      if (remaining > 0) {
        result += `, ... +${remaining} more]`
      } else {
        result += ']'
      }
      
      return result
    },
    
    clearError() {
      this.error = null
    },
    
    clearTestResult() {
      this.testResult = null
    }
  }
}
</script>

<style scoped>
.response-text {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: monospace;
  margin: 0;
}
</style>
