export { default as LlmChat } from './LlmChat.vue'
export { default as LlmChatDialog } from './LlmChatDialog.vue'
export { default as LlmChatFab } from './LlmChatFab.vue'

// Plugin installation
const LlmComponents = {
  install(Vue) {
    Vue.component('llm-chat', () => import('./LlmChat.vue'))
    Vue.component('llm-chat-dialog', () => import('./LlmChatDialog.vue'))
    Vue.component('llm-chat-fab', () => import('./LlmChatFab.vue'))
  }
}

export default LlmComponents
