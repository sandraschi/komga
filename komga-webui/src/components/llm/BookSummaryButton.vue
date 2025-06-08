<template>
  <q-btn
    :label="label"
    :icon="icon"
    :color="color"
    :loading="loading"
    :disable="disabled || loading"
    @click="generateSummary"
    v-bind="$attrs"
  >
    <template v-slot:loading>
      <q-spinner class="on-left" />
      {{ loadingLabel || 'Generating...' }}
    </template>
  </q-btn>
  
  <book-summary-viewer
    v-if="result"
    ref="viewer"
    :title="title"
    :result="result"
    :book-id="bookId"
  />
</template>

<script lang="ts">
import { defineComponent, ref, computed, nextTick } from 'vue'
import { useQuasar } from 'quasar'
import BookSummaryViewer from './BookSummaryViewer.vue'
import { generateMinibook, generateMicrobook } from '@/services/bookSummarization'

export default defineComponent({
  name: 'BookSummaryButton',
  
  components: {
    BookSummaryViewer
  },
  
  props: {
    bookId: {
      type: String,
      required: true
    },
    type: {
      type: String,
      default: 'minibook', // 'minibook' or 'microbook'
      validator: (value: string) => ['minibook', 'microbook'].includes(value)
    },
    label: {
      type: String,
      default: 'Generate Summary'
    },
    loadingLabel: String,
    icon: {
      type: String,
      default: 'auto_awesome'
    },
    color: {
      type: String,
      default: 'primary'
    },
    disabled: Boolean,
    // Minibook specific
    pageCount: {
      type: Number,
      default: 10,
      validator: (value: number) => value > 0 && value <= 20
    },
    // Model selection
    model: String,
    temperature: {
      type: Number,
      default: 0.7,
      validator: (value: number) => value >= 0 && value <= 2
    }
  },
  
  setup(props) {
    const $q = useQuasar()
    const loading = ref(false)
    const result = ref<{
      summary: string
      pages: Array<{
        pageNumber: number
        content: string
        imagePrompt?: string
      }>
      modelUsed: string
      warnings: string[]
      errors: string[]
    } | null>(null)
    const viewer = ref()
    
    const title = computed(() => 
      props.type === 'minibook' 
        ? `Minibook: ${props.pageCount}-Page Summary` 
        : 'Microbook: One-Page Summary'
    )
    
    const generateSummary = async () => {
      loading.value = true
      
      try {
        if (props.type === 'minibook') {
          result.value = await generateMinibook(
            props.bookId,
            props.pageCount,
            props.model,
            props.temperature
          )
        } else {
          result.value = await generateMicrobook(
            props.bookId,
            props.model,
            props.temperature
          )
        }
        
        // Show the viewer with the results
        nextTick(() => {
          if (viewer.value) {
            viewer.value.show()
          }
        })
      } catch (error) {
        console.error(`Failed to generate ${props.type}:`, error)
        $q.notify({
          type: 'negative',
          message: `Failed to generate ${props.type}`,
          position: 'top'
        })
      } finally {
        loading.value = false
      }
    }
    
    return {
      loading,
      result,
      viewer,
      title,
      generateSummary
    }
  }
})
</script>
