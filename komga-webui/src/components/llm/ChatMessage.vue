<template>
  <div 
    class="chat-message pa-4"
    :class="{ 
      'user-message': message.role === 'user',
      'assistant-message': message.role === 'assistant',
      'system-message': message.role === 'system',
      'error-message': message.error,
      'is-generating': message.isGenerating
    }"
  >
    <div class="d-flex align-start">
      <!-- Avatar -->
      <v-avatar
        size="36"
        :color="message.role === 'user' ? 'primary' : message.role === 'assistant' ? 'secondary' : 'grey'"
        class="mr-3 flex-shrink-0"
      >
        <v-icon v-if="message.role === 'user'" dark>mdi-account</v-icon>
        <v-icon v-else-if="message.role === 'assistant'" dark>mdi-robot</v-icon>
        <v-icon v-else dark>mdi-information</v-icon>
      </v-avatar>

      <!-- Message Content -->
      <div class="message-content flex-grow-1">
        <div class="d-flex align-center mb-1">
          <strong class="mr-2">
            {{ message.role === 'user' ? $t('llm.chat.you') : 
               message.role === 'assistant' ? $t('llm.chat.assistant') : 
               $t('llm.chat.system') }}
          </strong>
          <span class="text-caption text--disabled">
            {{ formatTime(message.timestamp) }}
          </span>
          
          <v-spacer />
          
          <v-btn
            v-if="message.content && !message.isGenerating"
            icon
            small
            @click="copyToClipboard(message.content)"
            :title="$t('common.actions.copy_to_clipboard')"
            class="ml-2"
          >
            <v-icon small>mdi-content-copy</v-icon>
          </v-btn>
        </div>
        
        <!-- Error message -->
        <div v-if="message.error" class="error--text">
          <v-icon color="error" small class="mr-1">mdi-alert-circle</v-icon>
          {{ message.error }}
        </div>
        
        <!-- Message text with markdown support -->
        <div v-else class="message-text" v-html="formatMarkdown(message.content)"></div>
        
        <!-- Loading indicator -->
        <v-progress-linear
          v-if="message.isGenerating"
          indeterminate
          color="primary"
          class="mt-2"
        ></v-progress-linear>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { ChatMessage } from '@/composables/useLlmChat'
import { marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'

// Configure marked with syntax highlighting
marked.use(
  markedHighlight({
    highlight: (code, lang) => {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext'
      return hljs.highlight(code, { language }).value
    },
    langPrefix: 'hljs language-',
  })
)

export default defineComponent({
  name: 'ChatMessage',
  
  props: {
    message: {
      type: Object as PropType<ChatMessage>,
      required: true
    }
  },
  
  methods: {
    formatTime(timestamp: number): string {
      return new Date(timestamp).toLocaleTimeString()
    },
    
    async copyToClipboard(text: string) {
      try {
        await navigator.clipboard.writeText(text)
        this.$store.dispatch('showSnackBar', {
          text: this.$t('common.messages.copied_to_clipboard'),
          color: 'success'
        })
      } catch (error) {
        console.error('Failed to copy text:', error)
        this.$store.dispatch('showSnackBar', {
          text: this.$t('common.errors.failed_to_copy'),
          color: 'error'
        })
      }
    },
    
    formatMarkdown(text: string): string {
      if (!text) return ''
      
      try {
        // Basic markdown to HTML conversion with syntax highlighting
        return marked.parse(text, { breaks: true })
      } catch (error) {
        console.error('Error parsing markdown:', error)
        return text // Fallback to plain text
      }
    }
  }
})
</script>

<style scoped>
.chat-message {
  border-radius: 8px;
  margin-bottom: 8px;
  transition: background-color 0.2s;
}

.user-message {
  background-color: rgba(var(--v-primary-base), 0.1);
  margin-left: 20%;
  border-top-left-radius: 16px;
  border-bottom-left-radius: 16px;
  border-top-right-radius: 4px;
  border-bottom-right-radius: 4px;
}

.assistant-message {
  background-color: rgba(var(--v-secondary-base), 0.1);
  margin-right: 20%;
  border-top-right-radius: 16px;
  border-bottom-right-radius: 16px;
  border-top-left-radius: 4px;
  border-bottom-left-radius: 4px;
}

.system-message {
  background-color: rgba(0, 0, 0, 0.05);
  font-style: italic;
  margin: 0 25%;
  border-radius: 8px;
  font-size: 0.9em;
}

.error-message {
  border-left: 3px solid var(--v-error-base);
  padding-left: 12px;
}

.is-generating {
  opacity: 0.8;
}

.message-content {
  overflow-wrap: break-word;
  word-wrap: break-word;
  word-break: break-word;
  hyphens: auto;
}

/* Markdown styling */
:deep(.message-text) {
  line-height: 1.6;
}

:deep(.message-text p) {
  margin-bottom: 0.5em;
}

:deep(.message-text pre) {
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  padding: 12px;
  overflow-x: auto;
  margin: 8px 0;
}

:deep(.message-text code) {
  font-family: 'Roboto Mono', monospace;
  font-size: 0.9em;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  background-color: rgba(0, 0, 0, 0.05);
}

:deep(.message-text pre code) {
  padding: 0;
  background-color: transparent;
}

:deep(.message-text h1),
:deep(.message-text h2),
:deep(.message-text h3) {
  margin: 1em 0 0.5em 0;
  line-height: 1.2;
}

:deep(.message-text h1) { font-size: 1.5em; }
:deep(.message-text h2) { font-size: 1.3em; }
:deep(.message-text h3) { font-size: 1.1em; }

:deep(.message-text ul),
:deep(.message-text ol) {
  padding-left: 1.5em;
  margin: 0.5em 0;
}

:deep(.message-text li) {
  margin-bottom: 0.25em;
}

:deep(.message-text blockquote) {
  border-left: 3px solid rgba(0, 0, 0, 0.1);
  margin: 0.5em 0;
  padding-left: 1em;
  color: rgba(0, 0, 0, 0.7);
  font-style: italic;
}

:deep(.message-text a) {
  color: var(--v-primary-base);
  text-decoration: none;
}

:deep(.message-text a:hover) {
  text-decoration: underline;
}
</style>
