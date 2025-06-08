<template>
  <v-fab-transition>
    <v-btn
      v-show="!hidden"
      v-bind="$attrs"
      :color="color"
      :dark="dark"
      :light="light"
      :fab="fab"
      :icon="icon"
      :small="small"
      :large="large"
      :x-large="xLarge"
      :bottom="bottom"
      :top="top"
      :left="left"
      :right="right"
      :fixed="fixed"
      :absolute="absolute"
      :loading="loading"
      :disabled="disabled"
      class="llm-chat-fab"
      @click="openChat"
    >
      <v-icon v-if="!loading">{{ iconName }}</v-icon>
      <span v-if="!icon && !loading" class="ml-2">{{ label }}</span>
    </v-btn>
  </v-fab-transition>
  
  <llm-chat-dialog
    v-if="mounted"
    v-model="dialog"
    :title="dialogTitle"
    :system-prompt="systemPrompt"
    :initial-messages="initialMessages"
    :max-width="dialogWidth"
    :min-height="dialogMinHeight"
    :max-height="dialogMaxHeight"
    :fullscreen.sync="isFullscreen"
    :persistent="persistent"
    v-bind="dialogProps"
    @input="onDialogChange"
  />
</template>

<script>
import LlmChatDialog from './LlmChatDialog.vue'

export default {
  name: 'LlmChatFab',
  
  components: {
    LlmChatDialog
  },
  
  inheritAttrs: false,
  
  props: {
    // Button props
    color: {
      type: String,
      default: 'primary'
    },
    dark: Boolean,
    light: Boolean,
    fab: {
      type: Boolean,
      default: true
    },
    icon: Boolean,
    small: Boolean,
    large: Boolean,
    xLarge: Boolean,
    bottom: {
      type: Boolean,
      default: true
    },
    top: Boolean,
    left: Boolean,
    right: {
      type: Boolean,
      default: true
    },
    fixed: {
      type: Boolean,
      default: true
    },
    absolute: Boolean,
    loading: Boolean,
    disabled: Boolean,
    hidden: Boolean,
    
    // Icon and label
    iconName: {
      type: String,
      default: 'mdi-robot'
    },
    label: {
      type: String,
      default() {
        return this.$t('llm.chat.title')
      }
    },
    
    // Dialog props
    dialogTitle: {
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
    dialogWidth: {
      type: [String, Number],
      default: 800
    },
    dialogMinHeight: {
      type: String,
      default: '500px'
    },
    dialogMaxHeight: {
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
    dialogProps: {
      type: Object,
      default: () => ({})
    }
  },
  
  data() {
    return {
      mounted: false,
      dialog: false,
      isFullscreen: this.fullscreen
    }
  },
  
  watch: {
    fullscreen(val) {
      this.isFullscreen = val
    }
  },
  
  mounted() {
    this.mounted = true
  },
  
  methods: {
    openChat() {
      this.dialog = true
      this.$emit('open')
    },
    
    closeChat() {
      this.dialog = false
      this.$emit('close')
    },
    
    onDialogChange(val) {
      if (!val) {
        this.$emit('close')
      }
    },
    
    // Public methods
    show() {
      this.openChat()
    },
    
    hide() {
      this.closeChat()
    },
    
    toggle() {
      if (this.dialog) {
        this.closeChat()
      } else {
        this.openChat()
      }
    },
    
    // Method to send a message programmatically
    sendMessage(message) {
      this.openChat()
      this.$nextTick(() => {
        const chat = this.$refs.chat?.$refs.chat
        if (chat) {
          chat.sendMessage(message)
        }
      })
    },
    
    // Method to clear the chat
    clearChat() {
      const chat = this.$refs.chat?.$refs.chat
      if (chat) {
        chat.clearMessages()
      }
    }
  }
}
</script>

<style scoped>
.llm-chat-fab {
  z-index: 6; /* Above v-navigation-drawer (5) */
}

.v-btn--fab.v-size--default {
  height: 56px;
  width: 56px;
}

.v-btn--fab.v-size--small {
  height: 40px;
  width: 40px;
}

.v-btn--fab.v-size--large {
  height: 64px;
  width: 64px;
}

.v-btn--fab.v-size--x-large {
  height: 72px;
  width: 72px;
}
</style>
