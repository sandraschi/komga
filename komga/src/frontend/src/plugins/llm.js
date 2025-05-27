import LlmComponents from '@/components/llm'
import llmStore from '@/store/llm'

export default {
  install(Vue, { store }) {
    // Register LLM components
    Vue.use(LlmComponents)
    
    // Register LLM store module if it doesn't exist
    if (!store.hasModule('llm')) {
      store.registerModule('llm', llmStore)
    }
    
    // Add $llm helper to Vue prototype
    Vue.prototype.$llm = {
      // Open chat dialog
      openChat(options = {}) {
        return new Promise((resolve) => {
          const instance = new Vue({
            render: (h) =>
              h('llm-chat-dialog', {
                ref: 'dialog',
                props: {
                  value: true,
                  ...options,
                  // Close the dialog when it's hidden
                  '@input': (val) => {
                    if (!val) {
                      // Wait for the dialog to close before destroying the instance
                      setTimeout(() => {
                        instance.$destroy()
                        instance.$el.remove()
                        resolve()
                      }, 300)
                    }
                  }
                }
              })
          })
          
          // Mount the instance and append to body
          const component = instance.$mount()
          document.body.appendChild(component.$el)
          
          // Focus the input when the dialog is shown
          instance.$nextTick(() => {
            const dialog = instance.$refs.dialog
            if (dialog) {
              dialog.$refs.chat?.focus()
            }
          })
        })
      },
      
      // Show a quick message in the chat
      async showMessage(message, options = {}) {
        await this.openChat({
          initialMessages: [
            {
              role: 'assistant',
              content: message,
              timestamp: new Date().toISOString()
            }
          ],
          ...options
        })
      },
      
      // Get the LLM store
      get store() {
        return store.state.llm
      },
      
      // Dispatch a store action
      dispatch(action, payload) {
        return store.dispatch(`llm/${action}`, payload)
      },
      
      // Commit a store mutation
      commit(mutation, payload) {
        return store.commit(`llm/${mutation}`, payload)
      },
      
      // Get a store getter
      getter(getter) {
        return store.getters[`llm/${getter}`]
      }
    }
    
    // Add a global method to open the chat
    Vue.prototype.$openChat = Vue.prototype.$llm.openChat.bind(Vue.prototype.$llm)
  }
}
