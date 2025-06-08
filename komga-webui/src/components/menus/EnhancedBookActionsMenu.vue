<template>
  <div class="d-flex align-center">
    <!-- Metabook Generation Button -->
    <metabook-generation-button
      v-if="isAdmin"
      :book-id="book.id"
      :available-models="availableModels"
      @applied="$emit('applied')"
      label=""
      icon="mdi-auto-fix"
      color="primary"
      flat
      dense
      class="mr-1"
    />
    
    <!-- Original Menu -->
    <book-actions-menu v-bind="$attrs" v-on="$listeners" />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue'
import { useLlmStore } from '@/stores/llm'
import BookActionsMenu from './BookActionsMenu.vue'
import MetabookGenerationButton from '@/components/llm/MetabookGenerationButton.vue'

export default defineComponent({
  name: 'EnhancedBookActionsMenu',
  
  components: {
    BookActionsMenu,
    MetabookGenerationButton
  },
  
  props: {
    book: {
      type: Object,
      required: true
    }
  },
  
  emits: ['applied'],
  
  setup(props, { emit }) {
    const llmStore = useLlmStore()
    const availableModels = ref<Array<{ label: string; value: string }>>([])
    
    // Load available models
    onMounted(async () => {
      try {
        await llmStore.loadModels()
        availableModels.value = llmStore.models.map(model => ({
          label: model.name,
          value: model.id
        }))
      } catch (error) {
        console.error('Failed to load LLM models:', error)
      }
    })
    
    const isAdmin = true // This should come from your auth store
    
    return {
      availableModels,
      isAdmin
    }
  }
})
</script>
