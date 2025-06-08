<template>
  <v-card class="fill-height d-flex flex-column">
    <!-- Header -->
    <v-card-title class="d-flex align-center">
      <v-icon left>mdi-robot</v-icon>
      {{ $t('llm.chat.title') }}
      
      <v-spacer />
      
      <v-tabs v-model="activeTab" grow class="mx-4">
        <v-tab>
          <v-icon left>mdi-forum</v-icon>
          Chat
        </v-tab>
        <v-tab>
          <v-icon left>mdi-book-open-variant</v-icon>
          Summarize
        </v-tab>
      </v-tabs>
      
      <v-spacer />
      
      <v-menu offset-y left v-if="activeTab === 0">
        <template v-slot:activator="{ on, attrs }">
          <v-btn
            color="primary"
            text
            v-bind="attrs"
            v-on="on"
            :disabled="isLoading"
            class="mr-2"
          >
            <v-icon left>mdi-tune</v-icon>
            {{ $t('llm.chat.settings') }}
          </v-btn>
        </template>
        
        <v-card width="300">
          <v-card-text>
            <v-select
              v-model="selectedModel"
              :items="models"
              item-text="name"
              item-value="id"
              :label="$t('llm.settings.model')"
              :loading="isLoading"
              :disabled="isLoading"
              dense
              outlined
              hide-details
              class="mb-4"
            />
            
            <div class="d-flex align-center mb-2">
              <span class="text-caption mr-2">{{ $t('llm.settings.temperature') }}: {{ temperature.toFixed(1) }}</span>
              <v-spacer />
              <v-btn-toggle
                v-model="temperature"
                mandatory
                dense
                class="elevation-0"
              >
                <v-btn :value="0.2" small>Low</v-btn>
                <v-btn :value="0.7" small>Med</v-btn>
                <v-btn :value="1.2" small>High</v-btn>
              </v-btn-toggle>
            </div>
            
            <v-slider
              v-model="temperature"
              :min="0"
              :max="2"
              :step="0.1"
              hide-details
              class="mb-4"
            />
            
            <v-text-field
              v-model.number="maxTokens"
              type="number"
              :min="100"
              :max="4000"
              :step="100"
              :label="$t('llm.settings.max_tokens')"
              outlined
              dense
              hide-details
            />
          </v-card-text>
        </v-card>
      </v-menu>
      
      <v-btn
        color="primary"
        text
        @click="showProviderSettings = true"
        :disabled="isLoading"
      >
        <v-icon left>mdi-cog</v-icon>
        {{ $t('llm.chat.providers') }}
      </v-btn>
    </v-card-title>
    
    <v-divider />
    
    <!-- Messages -->
    <v-card-text 
      class="flex-grow-1 overflow-y-auto messages-container" 
      ref="messagesContainer"
    >
      <div v-if="messages.length === 0" class="text-center pa-8">
        <v-icon size="64" class="mb-4">mdi-robot-happy-outline</v-icon>
        <div class="headline">{{ $t('llm.chat.welcome') }}</div>
        <div class="subtitle-1 mt-2">{{ $t('llm.chat.welcome_subtitle') }}</div>
        
        <v-btn
          v-if="!isConfigured"
          color="primary"
          class="mt-4"
          @click="showProviderSettings = true"
        >
          <v-icon left>mdi-cog</v-icon>
          {{ $t('llm.chat.configure_provider') }}
        </v-btn>
      </div>
      
      <template v-else>
        <chat-message
          v-for="message in messages"
          :key="message.id"
          :message="message"
          class="mb-2"
        />
        
        <div v-if="isLoading && !isStreaming" class="text-center pa-4">
          <v-progress-circular indeterminate color="primary" />
        </div>
      </template>
    </v-card-text>
    
    <!-- Input -->
    <v-divider />
    
    <v-card-actions class="pa-4">
      <v-textarea
        v-model="inputMessage"
        :label="$t('llm.chat.input_placeholder')"
        :disabled="isLoading || !isConfigured"
        :loading="isLoading"
        :no-resize="true"
        rows="1"
        auto-grow
        outlined
        hide-details
        class="flex-grow-1 mr-2"
        @keydown.enter.exact.prevent="sendMessage"
      >
        <template v-slot:append>
          <v-fade-transition>
            <v-icon
              v-if="inputMessage"
              color="primary"
              @click="sendMessage"
              :disabled="!canSendMessage"
              class="cursor-pointer"
            >
              mdi-send
            </v-icon>
          </v-fade-transition>
        </template>
      </v-textarea>
      
      <v-btn
        icon
        :disabled="isLoading"
        @click="clearChat"
        :title="$t('llm.chat.clear_chat')"
      >
        <v-icon>mdi-delete</v-icon>
      </v-btn>
    </v-card-actions>
    
    <!-- Provider Settings Dialog -->
    <v-dialog v-model="showProviderSettings" max-width="800" scrollable>
      <v-card>
        <v-card-title>{{ $t('llm.settings.title') }}</v-card-title>
        <v-divider />
        <v-card-text>
          <llm-provider-selector @close="showProviderSettings = false" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="primary"
            text
            @click="showProviderSettings = false"
          >
            {{ $t('common.actions.close') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script>
import { defineComponent, ref, computed, onMounted, watch, nextTick } from 'vue'
import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { useLlmChat } from '@/composables/useLlmChat'
import ChatMessage from './ChatMessage.vue'
import LlmProviderSelector from './LlmProviderSelector.vue'

export default defineComponent({
  name: 'LlmChat',
  
  components: {
    ChatMessage,
    LlmProviderSelector
  },
  
  setup() {
    const store = useStore()
    const { t } = useI18n()
    
    // Use the LLM chat composable
    const {
      // State
      messages,
      inputMessage,
      isLoading,
      isStreaming,
      selectedModel,
      temperature,
      maxTokens,
      
      // Computed
      models,
      activeProvider,
      isConfigured,
      canSendMessage,
      
      // Methods
      initialize,
      sendMessage,
      clearChat,
      switchModel
    } = useLlmChat()
    
    // Local state
    const showProviderSettings = ref(false)
    const messagesContainer = ref(null)
    
    // Initialize on component mount
    onMounted(() => {
      initialize()
    })
    
    // Watch for model changes
    watch(selectedModel, (newModelId) => {
      if (newModelId) {
        switchModel(newModelId)
      }
    })
    
    // Auto-scroll to bottom when messages change
    const scrollToBottom = () => {
      if (messagesContainer.value) {
        nextTick(() => {
          messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
        })
      }
    }
    
    watch(messages, () => {
      scrollToBottom()
    }, { deep: true })
    
    return {
      // State
      messages,
      inputMessage,
      isLoading,
      isStreaming,
      selectedModel,
      temperature,
      maxTokens,
      showProviderSettings,
      
      // Refs
      messagesContainer,
      
      // Computed
      models,
      activeProvider,
      isConfigured,
      canSendMessage,
      
      // Methods
      sendMessage,
      clearChat,
      scrollToBottom
    }
  }
})
</script>

<style scoped>
.v-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.v-card__text {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 16px;
}

.cursor-pointer {
  cursor: pointer;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 20px;
}

/* Smooth scrolling */
.messages-container {
  scroll-behavior: smooth;
}

/* Message transitions */
.message-enter-active,
.message-leave-active {
  transition: all 0.3s ease;
  max-height: 500px;
  overflow: hidden;
}

.message-enter-from,
.message-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(10px);
}
</style>
