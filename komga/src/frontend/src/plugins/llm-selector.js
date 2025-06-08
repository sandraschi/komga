import Vue from 'vue'
import LlmProviderSelector from '@/components/llm/LlmProviderSelector.vue'

const LlmSelectorPlugin = {
  install(Vue, options = {}) {
    // Register the component globally
    Vue.component('LlmProviderSelector', LlmProviderSelector)
    
    // Create a mount point for the selector
    const mountPoint = document.createElement('div')
    mountPoint.id = 'llm-provider-selector'
    mountPoint.className = 'd-flex align-center ml-2'
    
    // Add the selector to the app bar
    const addToAppBar = () => {
      // Check if we've already added the selector
      if (document.getElementById('llm-provider-selector-mounted')) {
        return
      }
      
      // Find the app bar
      const appBar = document.querySelector('.v-toolbar')
      if (!appBar) {
        // If app bar isn't ready, try again after a short delay
        setTimeout(addToAppBar, 100)
        return
      }
      
      // Find the toolbar content or actions section
      let target = appBar.querySelector('.v-toolbar__content')
      if (!target) target = appBar.querySelector('.v-toolbar-actions')
      if (!target) target = appBar
      
      // Try to find the right side of the toolbar
      const spacer = target.querySelector('.v-toolbar__items')
      if (spacer) {
        spacer.prepend(mountPoint)
      } else {
        target.appendChild(mountPoint)
      }
      
      // Create a new Vue instance for the selector
      new Vue({
        el: mountPoint,
        store: options.store,
        render: h => h(LlmProviderSelector)
      })
      
      mountPoint.id = 'llm-provider-selector-mounted'
    }
    
    // Try to add the selector immediately or wait for the app to be ready
    if (document.readyState === 'complete') {
      addToAppBar()
    } else {
      window.addEventListener('load', addToAppBar)
    }
    
    // Also try after a short delay in case the app bar is added dynamically
    setTimeout(addToAppBar, 1000)
    
    // Add a mutation observer to handle dynamic content
    const observer = new MutationObserver((mutations) => {
      if (!document.getElementById('llm-provider-selector-mounted')) {
        addToAppBar()
      }
    })
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    })
  }
}

export default LlmSelectorPlugin
