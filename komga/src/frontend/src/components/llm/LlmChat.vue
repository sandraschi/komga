<template>
  <v-card class="fill-height d-flex flex-column">
    <!-- Header -->
    <v-card-title class="d-flex align-center">
      <v-icon left>mdi-robot</v-icon>
      {{ $t('llm.chat.title') }}
      
      <v-spacer />
      
      <v-btn
        color="primary"
        text
        @click="showSettings = true"
        :disabled="isLoading"
      >
        <v-icon left>mdi-cog</v-icon>
        {{ $t('llm.chat.settings') }}
      </v-btn>
    </v-card-title>
    
    <v-divider />
    
    <!-- Messages -->
    <v-card-text class="flex-grow-1 overflow-y-auto" ref="messagesContainer">
      <div v-if="messages.length === 0" class="text-center pa-8">
        <v-icon size="64" class="mb-4">mdi-robot-happy-outline</v-icon>
        <div class="headline">{{ $t('llm.chat.welcome') }}</div>
        <div class="subtitle-1 mt-2">{{ $t('llm.chat.welcome_subtitle') }}</div>
      </div>
      
      <template v-else>
        <div
          v-for="(message, index) in messages"
          :key="index"
          class="pa-4"
          :class="{ 'grey lighten-4': index % 2 === 0 }"
        >
          <div class="d-flex">
            <v-avatar
              size="36"
              :color="message.role === 'user' ? 'primary' : 'secondary'"
              class="mr-3"
            >
              <v-icon v-if="message.role === 'user'" dark>mdi-account</v-icon>
              <v-icon v-else dark>mdi-robot</v-icon>
            </v-avatar>
            
            <div class="flex-grow-1">
              <div class="d-flex align-center mb-1">
                <strong class="mr-2">
                  {{ message.role === 'user' ? $t('llm.chat.you') : $t('llm.chat.assistant') }}
                </strong>
                <span class="text-caption text--secondary">
                  {{ formatTime(message.timestamp) }}
                </span>
                
                <v-spacer />
                
                <v-btn
                  icon
                  small
                  @click="copyToClipboard(message.content)"
                >
                  <v-icon small>mdi-content-copy</v-icon>
                </v-btn>
              </div>
              
              <div v-html="formatMessage(message.content)" class="message-content"></div>
              
              <div v-if="message.isGenerating" class="d-flex align-center mt-2">
                <v-progress-circular
                  indeterminate
                  size="16"
                  width="2"
                  class="mr-2"
                />
                <span class="text-caption">{{ $t('llm.chat.thinking') }}...</span>
              </div>
              
              <v-alert
                v-if="message.error"
                dense
                type="error"
                class="mt-2 mb-0"
              >
                {{ message.error }}
              </v-alert>
            </div>
          </div>
        </div>
      </template>
    </v-card-text>
    
    <!-- Input Area -->
    <v-divider />
    
    <v-card-actions class="pa-4">
      <v-textarea
        v-model="userInput"
        :label="$t('llm.chat.input_placeholder')"
        :disabled="isLoading || !isConfigured"
        :loading="isLoading"
        rows="1"
        auto-grow
        outlined
        hide-details
        class="flex-grow-1 mr-2"
        @keydown.enter.exact.prevent="sendMessage"
      />
      
      <v-btn
        color="primary"
        :disabled="!canSendMessage || isLoading"
        :loading="isLoading"
        @click="sendMessage"
        large
        icon
      >
        <v-icon>mdi-send</v-icon>
      </v-btn>
    </v-card-actions>
    
    <!-- Settings Dialog -->
    <v-dialog v-model="showSettings" max-width="800" scrollable>
      <v-card>
        <v-card-title>{{ $t('llm.settings.title') }}</v-card-title>
        <v-divider />
        <v-card-text>
          <v-alert
            v-if="!isConfigured"
            type="warning"
            class="mb-4"
          >
            {{ $t('llm.chat.not_configured') }}
          </v-alert>
          
          <v-select
            v-model="selectedProvider"
            :items="availableProviders"
            item-text="name"
            item-value="id"
            :label="$t('llm.settings.select_provider')"
            :disabled="isLoading"
            class="mb-4"
          />
          
          <v-select
            v-if="availableModels.length > 0"
            v-model="selectedModel"
            :items="availableModels"
            :label="$t('llm.settings.select_model')"
            :disabled="isLoading"
            class="mb-4"
          />
          
          <v-slider
            v-model="temperature"
            :label="$t('llm.settings.temperature')"
            min="0"
            max="2"
            step="0.1"
            thumb-label
            :disabled="isLoading"
            class="mb-4"
          />
          
          <v-slider
            v-model="maxTokens"
            :label="$t('llm.settings.max_tokens')"
            min="1"
            max="4000"
            step="1"
            thumb-label
            :disabled="isLoading"
            class="mb-4"
          />
        </v-card-text>
        
        <v-divider />
        
        <v-card-actions>
          <v-spacer />
          <v-btn
            text
            @click="showSettings = false"
          >
            {{ $t('common.close') }}
          </v-btn>
          <v-btn
            color="primary"
            @click="saveSettings"
            :loading="isSaving"
          >
            {{ $t('common.save') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script>
export default {
  name: 'LlmChat',
  
  data() {
    return {
      // UI State
      isLoading: false,
      isSaving: false,
      showSettings: false,
      userInput: '',
      
      // Chat State
      messages: [],
      
      // Settings
      selectedProvider: null,
      selectedModel: null,
      temperature: 0.7,
      maxTokens: 1000,
      
      // Available options
      availableProviders: [],
      availableModels: []
    }
  },
  
  computed: {
    isConfigured() {
      return this.availableProviders.some(p => p.enabled)
    },
    
    canSendMessage() {
      return this.userInput.trim().length > 0 && this.isConfigured
    }
  },
  
  watch: {
    messages: {
      handler() {
        this.$nextTick(() => {
          this.scrollToBottom()
        })
      },
      deep: true
    },
    
    selectedProvider: {
      handler(newVal) {
        if (newVal) {
          this.fetchModels()
        } else {
          this.availableModels = []
        }
      },
      immediate: true
    }
  },
  
  created() {
    this.initialize()
  },
  
  methods: {
    async initialize() {
      this.isLoading = true
      
      try {
        await this.fetchProviders()
        await this.loadSettings()
      } catch (error) {
        console.error('Failed to initialize chat:', error)
        this.showError(this.$t('llm.errors.initialization_failed'))
      } finally {
        this.isLoading = false
      }
    },
    
    async fetchProviders() {
      try {
        this.availableProviders = await this.$store.dispatch('llm/fetchProviders')
      } catch (error) {
        console.error('Failed to fetch providers:', error)
        throw error
      }
    },
    
    async fetchModels() {
      if (!this.selectedProvider) return
      
      try {
        this.availableModels = await this.$store.dispatch('llm/fetchModels', this.selectedProvider)
      } catch (error) {
        console.error('Failed to fetch models:', error)
        this.showError(this.$t('llm.errors.failed_to_load_models'))
      }
    },
    
    async loadSettings() {
      try {
        const settings = await this.$store.dispatch('llm/loadSettings')
        if (settings) {
          this.selectedProvider = settings.provider
          this.selectedModel = settings.model
          this.temperature = settings.temperature
          this.maxTokens = settings.maxTokens
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
      }
    },
    
    async saveSettings() {
      this.isSaving = true
      
      try {
        await this.$store.dispatch('llm/saveSettings', {
          provider: this.selectedProvider,
          model: this.selectedModel,
          temperature: this.temperature,
          maxTokens: this.maxTokens
        })
        
        this.showSettings = false
        this.showSuccess(this.$t('llm.settings.saved'))
      } catch (error) {
        console.error('Failed to save settings:', error)
        this.showError(this.$t('llm.errors.failed_to_save_settings'))
      } finally {
        this.isSaving = false
      }
    },
    
    async sendMessage() {
      if (!this.canSendMessage || this.isLoading) return
      
      const message = this.userInput.trim()
      this.userInput = ''
      
      // Add user message
      this.messages.push({
        role: 'user',
        content: message,
        timestamp: new Date()
      })
      
      // Add temporary assistant message
      const assistantMessage = {
        role: 'assistant',
        content: '',
        isGenerating: true,
        timestamp: new Date()
      }
      
      this.messages.push(assistantMessage)
      
      try {
        this.isLoading = true
        
        const response = await this.$store.dispatch('llm/generateChatCompletion', {
          messages: this.messages
            .filter(m => m.role !== 'assistant' || !m.isGenerating)
            .map(m => ({
              role: m.role,
              content: m.content
            })),
          temperature: this.temperature,
          maxTokens: this.maxTokens
        })
        
        // Update the assistant message with the response
        const index = this.messages.findIndex(m => m.isGenerating)
        if (index !== -1) {
          this.messages.splice(index, 1, {
            role: 'assistant',
            content: response.content,
            timestamp: new Date()
          })
        }
      } catch (error) {
        console.error('Failed to generate response:', error)
        
        // Show error in the assistant message
        const index = this.messages.findIndex(m => m.isGenerating)
        if (index !== -1) {
          this.messages.splice(index, 1, {
            role: 'assistant',
            content: '',
            error: this.$t('llm.errors.failed_to_generate'),
            timestamp: new Date()
          })
        }
      } finally {
        this.isLoading = false
      }
    },
    
    formatMessage(content) {
      if (!content) return ''
      
      // Simple markdown-like formatting
      return content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>')
    },
    
    formatTime(timestamp) {
      if (!timestamp) return ''
      
      const date = new Date(timestamp)
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
    
    async copyToClipboard(text) {
      try {
        await navigator.clipboard.writeText(text)
        this.showSuccess(this.$t('common.copied_to_clipboard'))
      } catch (error) {
        console.error('Failed to copy text:', error)
        this.showError(this.$t('errors.copy_failed'))
      }
    },
    
    scrollToBottom() {
      const container = this.$refs.messagesContainer
      if (container) {
        container.scrollTop = container.scrollHeight
      }
    },
    
    showError(message) {
      this.$store.dispatch('showSnackbar', {
        message,
        color: 'error'
      })
    },
    
    showSuccess(message) {
      this.$store.dispatch('showSnackbar', {
        message,
        color: 'success'
      })
    }
  }
}
</script>

<style scoped>
.chat-messages {
  min-height: 400px;
  max-height: 70vh;
  overflow-y: auto;
}

.message-content {
  line-height: 1.6;
  word-break: break-word;
}

.message-content :deep(code) {
  background-color: rgba(0, 0, 0, 0.1);
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: monospace;
  font-size: 0.9em;
}

.message-content :deep(pre) {
  background-color: rgba(0, 0, 0, 0.1);
  padding: 0.8em;
  border-radius: 4px;
  overflow-x: auto;
}

.message-content :deep(pre) code {
  background-color: transparent;
  padding: 0;
  border-radius: 0;
}

.v-application--is-ltr .v-messages {
  min-height: 0;
}
</style>
