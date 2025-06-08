<template>
  <div 
    :class="[
      'chat-message', 
      `chat-message--${message.role}`,
      { 'chat-message--error': message.error }
    ]"
  >
    <!-- Avatar -->
    <div class="chat-message__avatar">
      <v-avatar size="36" :color="avatarColor">
        <v-icon v-if="message.role === 'user'" dark>mdi-account</v-icon>
        <v-icon v-else-if="message.role === 'assistant'" dark>mdi-robot</v-icon>
        <v-icon v-else dark>mdi-help-circle</v-icon>
      </v-avatar>
    </div>
    
    <!-- Message Content -->
    <div class="chat-message__content">
      <!-- Message Header -->
      <div class="chat-message__header">
        <span class="chat-message__role">{{ roleLabel }}</span>
        <span class="chat-message__time">{{ formattedTime }}</span>
      </div>
      
      <!-- Message Body -->
      <div class="chat-message__body">
        <!-- Loading state -->
        <div v-if="message.isLoading" class="chat-message__loading">
          <v-progress-circular
            indeterminate
            size="16"
            width="2"
            color="primary"
            class="mr-2"
          />
          <span>{{ $t('llm.chat.thinking') }}</span>
        </div>
        
        <!-- Error message -->
        <div v-else-if="message.error" class="chat-message__error">
          <v-icon color="error" class="mr-1">mdi-alert-circle</v-icon>
          <span>{{ message.error }}</span>
        </div>
        
        <!-- Message content with markdown -->
        <div v-else-if="message.content" class="chat-message__text" v-html="formattedContent"></div>
        
        <!-- Empty state -->
        <div v-else class="chat-message__empty">
          {{ $t('llm.chat.no_content') }}
        </div>
      </div>
      
      <!-- Message Actions -->
      <div v-if="!message.isLoading" class="chat-message__actions">
        <v-tooltip bottom>
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              icon
              small
              v-bind="attrs"
              v-on="on"
              @click="copyToClipboard"
              :disabled="!message.content"
            >
              <v-icon small>mdi-content-copy</v-icon>
            </v-btn>
          </template>
          <span>{{ $t('common.actions.copy') }}</span>
        </v-tooltip>
        
        <v-tooltip bottom v-if="message.role === 'assistant'">
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              icon
              small
              v-bind="attrs"
              v-on="on"
              @click="regenerate"
              :loading="isRegenerating"
            >
              <v-icon small>mdi-refresh</v-icon>
            </v-btn>
          </template>
          <span>{{ $t('llm.chat.regenerate') }}</span>
        </v-tooltip>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'

export default defineComponent({
  name: 'ChatMessage',
  
  props: {
    message: {
      type: Object,
      required: true,
      validator: (value) => {
        return ['user', 'assistant', 'system'].includes(value.role)
      }
    },
    isLast: {
      type: Boolean,
      default: false
    },
    isRegenerating: {
      type: Boolean,
      default: false
    }
  },
  
  emits: ['copy', 'regenerate'],
  
  setup(props, { emit }) {
    const { t } = useI18n()
    const isHovered = ref(false)
    
    // Configure marked with syntax highlighting
    marked.setOptions({
      highlight: function(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(code, { language: lang }).value
          } catch (e) {
            console.warn(`Error highlighting code with language '${lang}':`, e)
          }
        }
        return hljs.highlightAuto(code).value
      },
      breaks: true,
      gfm: true,
      smartLists: true,
      smartypants: true
    })
    
    // Computed properties
    const formattedContent = computed(() => {
      if (!props.message.content) return ''
      
      try {
        // Convert markdown to HTML
        const html = marked(props.message.content)
        // Sanitize HTML to prevent XSS
        return DOMPurify.sanitize(html, {
          ALLOWED_TAGS: [
            'p', 'br', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
            'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img', 'del'
          ],
          ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'src', 'alt']
        })
      } catch (error) {
        console.error('Error formatting message content:', error)
        return props.message.content
      }
    })
    
    const roleLabel = computed(() => {
      const roles = {
        'user': t('llm.chat.you'),
        'assistant': t('llm.chat.assistant'),
        'system': t('llm.chat.system')
      }
      return roles[props.message.role] || props.message.role
    })
    
    const avatarColor = computed(() => {
      return props.message.role === 'user' ? 'primary' : 'secondary'
    })
    
    const formattedTime = computed(() => {
      if (!props.message.timestamp) return ''
      
      try {
        const date = new Date(props.message.timestamp)
        return date.toLocaleTimeString()
      } catch (e) {
        console.warn('Invalid timestamp:', props.message.timestamp)
        return ''
      }
    })
    
    // Methods
    const copyToClipboard = () => {
      if (!props.message.content) return
      
      try {
        navigator.clipboard.writeText(props.message.content)
        emit('copy', props.message.content)
      } catch (error) {
        console.error('Failed to copy text:', error)
      }
    }
    
    const regenerate = () => {
      emit('regenerate', props.message)
    }
    
    return {
      // Computed
      formattedContent,
      roleLabel,
      avatarColor,
      formattedTime,
      isHovered,
      
      // Methods
      copyToClipboard,
      regenerate
    }
  }
})
</script>

<style scoped>
.chat-message {
  display: flex;
  padding: 12px 16px;
  transition: background-color 0.2s ease;
  position: relative;
}

.chat-message:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.chat-message--assistant {
  background-color: rgba(0, 0, 0, 0.01);
}

.chat-message--error {
  border-left: 3px solid #ff5252;
  background-color: #fff5f5;
}

.chat-message__avatar {
  margin-right: 12px;
  flex-shrink: 0;
}

.chat-message__content {
  flex: 1;
  min-width: 0;
}

.chat-message__header {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

.chat-message__role {
  font-weight: 600;
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.87);
}

.chat-message__time {
  margin-left: 8px;
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.54);
}

.chat-message__body {
  line-height: 1.5;
  word-break: break-word;
}

.chat-message__loading {
  display: flex;
  align-items: center;
  color: rgba(0, 0, 0, 0.54);
  font-size: 0.875rem;
}

.chat-message__error {
  display: flex;
  align-items: center;
  color: #ff5252;
  font-size: 0.875rem;
}

.chat-message__empty {
  color: rgba(0, 0, 0, 0.38);
  font-style: italic;
}

.chat-message__text {
  font-size: 0.9375rem;
  white-space: pre-wrap;
}

.chat-message__text :deep(p) {
  margin: 0 0 1em 0;
}

.chat-message__text :deep(p:last-child) {
  margin-bottom: 0;
}

.chat-message__text :deep(ul),
.chat-message__text :deep(ol) {
  margin: 0.5em 0;
  padding-left: 1.5em;
}

.chat-message__text :deep(li) {
  margin: 0.25em 0;
}

.chat-message__text :deep(code) {
  font-family: 'Roboto Mono', monospace;
  font-size: 0.875em;
  padding: 0.2em 0.4em;
  margin: 0;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 3px;
}

.chat-message__text :deep(pre) {
  margin: 0.75em 0;
  padding: 1em;
  border-radius: 4px;
  background-color: #f6f8fa;
  overflow-x: auto;
}

.chat-message__text :deep(pre code) {
  padding: 0;
  background: none;
  font-size: 0.9em;
  line-height: 1.45;
}

.chat-message__text :deep(blockquote) {
  margin: 0.75em 0;
  padding: 0 1em;
  color: #6a737d;
  border-left: 0.25em solid #dfe2e5;
}

.chat-message__text :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 0.75em 0;
  font-size: 0.9em;
}

.chat-message__text :deep(th),
.chat-message__text :deep(td) {
  border: 1px solid #dfe2e5;
  padding: 6px 13px;
}

.chat-message__text :deep(thead th) {
  background-color: #f6f8fa;
  font-weight: 600;
}

.chat-message__text :deep(img) {
  max-width: 100%;
  height: auto;
}

.chat-message__actions {
  display: flex;
  margin-top: 8px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.chat-message:hover .chat-message__actions {
  opacity: 1;
}

/* Dark theme support */
.theme--dark .chat-message {
  background-color: transparent;
}

.theme--dark .chat-message:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.theme--dark .chat-message--assistant {
  background-color: rgba(255, 255, 255, 0.03);
}

.theme--dark .chat-message--error {
  background-color: rgba(255, 82, 82, 0.1);
}

.theme--dark .chat-message__text :pre {
  background-color: #2d2d2d;
}

.theme--dark .chat-message__text :code {
  background-color: rgba(255, 255, 255, 0.1);
}
</style>
