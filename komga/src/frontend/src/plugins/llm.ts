import { App } from 'vue'
import LlmSelector from '@/components/llm/LlmSelector.vue'

export default {
  install: (app: App) => {
    // Register global components
    app.component('LlmSelector', LlmSelector)
    
    // Add LLM selector to app bar
    app.mixin({
      mounted() {
        // Wait for the app to be fully mounted
        this.$nextTick(() => {
          // Find the app bar
          const appBar = document.querySelector('.v-app-bar')
          if (appBar) {
            // Create a container for the LLM selector
            const llmContainer = document.createElement('div')
            llmContainer.className = 'd-flex align-center mr-4'
            
            // Add the LLM selector component
            const llmSelector = document.createElement('llm-selector')
            llmContainer.appendChild(llmSelector)
            
            // Add it to the right side of the app bar
            const toolbar = appBar.querySelector('.v-toolbar__content') || appBar
            const spacer = toolbar.querySelector('.v-toolbar-title')
            
            if (spacer) {
              toolbar.insertBefore(llmContainer, spacer.nextSibling)
            } else {
              toolbar.appendChild(llmContainer)
            }
          }
        })
      }
    })
  }
}
