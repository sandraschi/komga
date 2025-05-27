<template>
  <v-dialog
    v-model="dialog"
    :max-width="maxWidth"
    :fullscreen="fullscreen"
    :persistent="persistent"
    scrollable
    v-bind="$attrs"
  >
    <v-card class="d-flex flex-column" :style="{ minHeight: minHeight }" :max-height="maxHeight">
      <v-card-title class="d-flex align-center">
        <v-icon left>mdi-robot</v-icon>
        {{ title }}
        
        <v-spacer />
        
        <v-tooltip bottom>
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              icon
              v-bind="attrs"
              v-on="on"
              @click="toggleFullscreen"
              class="mr-2"
            >
              <v-icon>mdi-{{ fullscreen ? 'fullscreen-exit' : 'fullscreen' }}</v-icon>
            </v-btn>
          </template>
          <span>{{ fullscreen ? $t('common.exit_fullscreen') : $t('common.fullscreen') }}</span>
        </v-tooltip>
        
        <v-tooltip bottom>
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              icon
              v-bind="attrs"
              v-on="on"
              @click="dialog = false"
            >
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </template>
          <span>{{ $t('common.close') }}</span>
        </v-tooltip>
      </v-card-title>
      
      <v-divider />
      
      <v-card-text class="flex-grow-1 pa-0" :style="{ overflow: 'hidden' }">
        <llm-chat
          ref="chat"
          :system-prompt="systemPrompt"
          :initial-messages="initialMessages"
          :auto-focus="autoFocus"
          :max-messages="maxMessages"
          class="fill-height"
        />
      </v-card-text>
      
      <v-divider />
      
      <v-card-actions class="px-4 py-2">
        <v-spacer />
        <v-btn
          text
          @click="dialog = false"
        >
          {{ $t('common.close') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import LlmChat from './LlmChat.vue'

export default {
  name: 'LlmChatDialog',
  
  components: {
    LlmChat
  },
  
  props: {
    value: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default() {
        return this.$t('llm.chat.title')
      }
    },
    systemPrompt: {
      type: String,
      default: 'You are a helpful assistant.'
    },
    initialMessages: {
      type: Array,
      default: () => []
    },
    autoFocus: {
      type: Boolean,
      default: true
    },
    maxMessages: {
      type: Number,
      default: 50
    },
    maxWidth: {
      type: [String, Number],
      default: 800
    },
    minHeight: {
      type: String,
      default: '500px'
    },
    maxHeight: {
      type: String,
      default: '80vh'
    },
    persistent: {
      type: Boolean,
      default: false
    },
    fullscreen: {
      type: Boolean,
      default: false
    },
    closeOnEscape: {
      type: Boolean,
      default: true
    },
    closeOnClickOutside: {
      type: Boolean,
      default: true
    }
  },
  
  data() {
    return {
      dialog: this.value,
      internalFullscreen: this.fullscreen
    }
  },
  
  watch: {
    value(val) {
      this.dialog = val
    },
    
    dialog(val) {
      this.$emit('input', val)
      
      if (val) {
        this.$nextTick(() => {
          this.$refs.chat?.focus()
        })
      }
    },
    
    fullscreen(val) {
      this.internalFullscreen = val
    }
  },
  
  methods: {
    open() {
      this.dialog = true
    },
    
    close() {
      this.dialog = false
    },
    
    toggleFullscreen() {
      this.internalFullscreen = !this.internalFullscreen
      this.$emit('update:fullscreen', this.internalFullscreen)
    },
    
    handleKeydown(e) {
      if (e.key === 'Escape' && this.closeOnEscape) {
        this.close()
      }
    },
    
    handleClickOutside() {
      if (this.closeOnClickOutside) {
        this.close()
      }
    },
    
    sendMessage(message) {
      this.$refs.chat?.sendMessage(message)
    },
    
    clearMessages() {
      this.$refs.chat?.clearMessages()
    }
  },
  
  mounted() {
    if (this.closeOnEscape) {
      window.addEventListener('keydown', this.handleKeydown)
    }
  },
  
  beforeDestroy() {
    window.removeEventListener('keydown', this.handleKeydown)
  }
}
</script>

<style scoped>
.v-dialog {
  overflow: hidden;
}

.v-card {
  display: flex;
  flex-direction: column;
}

.v-card__text {
  flex: 1 1 auto;
  overflow: hidden;
}
</style>
