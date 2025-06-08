<template>
  <div class="column full-height">
    <div class="col-auto q-pa-md">
      <div class="text-h6">Book Summarization</div>
      <div class="text-caption text-grey-7 q-mb-md">
        Generate condensed versions of your books using AI
      </div>
      
      <q-tabs
        v-model="tab"
        dense
        class="text-grey-7"
        active-color="primary"
        indicator-color="primary"
        align="justify"
        narrow-indicator
      >
        <q-tab name="minibook" label="Minibook" />
        <q-tab name="microbook" label="Microbook" />
      </q-tabs>
    </div>
    
    <q-separator />
    
    <div class="col q-pa-md">
      <q-tab-panels v-model="tab" class="bg-transparent">
        <!-- Minibook Tab -->
        <q-tab-pane name="minibook" class="q-pa-none">
          <div class="column full-height">
            <div class="col-auto q-mb-md">
              <div class="text-subtitle2 q-mb-sm">Minibook Settings</div>
              <q-input
                v-model.number="pageCount"
                type="number"
                label="Number of Pages"
                filled
                dense
                :rules="[val => val > 0 && val <= 20 || 'Must be between 1 and 20']"
                class="q-mb-sm"
              />
              
              <q-slider
                v-model="temperature"
                :min="0"
                :max="1"
                :step="0.1"
                label
                label-always
                :label-value="`Creativity: ${temperature.toFixed(1)}`"
                class="q-mt-lg"
              />
              
              <div class="text-caption text-grey-7 q-mt-sm">
                Higher values make the output more random and creative, while lower values make it more focused and deterministic.
              </div>
            </div>
            
            <div class="col-auto">
              <q-btn
                color="primary"
                label="Generate Minibook"
                icon="auto_awesome"
                :loading="loading"
                :disable="!canGenerate || loading"
                @click="generateMinibook"
                class="full-width"
              />
            </div>
          </div>
        </q-tab-pane>
        
        <!-- Microbook Tab -->
        <q-tab-pane name="microbook" class="q-pa-none">
          <div class="column full-height">
            <div class="col-auto q-mb-md">
              <div class="text-subtitle2 q-mb-sm">Microbook Settings</div>
              <div class="text-body2 q-mb-md">
                Generate a funny, one-page summary of the book with a humorous twist.
              </div>
              
              <q-slider
                v-model="temperature"
                :min="0.5"
                :max="1"
                :step="0.1"
                label
                label-always
                :label-value="`Humor Level: ${((temperature - 0.5) * 2).toFixed(1)}`"
                class="q-mt-lg"
              />
              
              <div class="text-caption text-grey-7 q-mt-sm">
                Higher values make the summary more creative and humorous, while lower values keep it more factual.
              </div>
            </div>
            
            <div class="col-auto">
              <q-btn
                color="secondary"
                label="Generate Microbook"
                icon="sentiment_very_satisfied"
                :loading="loading"
                :disable="!canGenerate || loading"
                @click="generateMicrobook"
                class="full-width"
              />
            </div>
          </div>
        </q-tab-pane>
      </q-tab-panels>
    </div>
    
    <!-- Result Viewer -->
    <book-summary-viewer
      v-if="result"
      ref="viewer"
      :title="resultTitle"
      :result="result"
      :book-id="bookId"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Quasar } from 'quasar'
import BookSummaryViewer, { type BookSummaryViewerMethods } from './BookSummaryViewer.vue'
import * as bookSummarization from '@/services/bookSummarization'

type SummarizationResult = bookSummarization.SummarizationResult

const props = defineProps<{
  bookId: string
  bookTitle?: string
}>()

// Custom notification function
const notify = (options: { type: string; message: string; position: string }) => {
  console.log('Notification:', options.message)
}
const loading = ref(false)
const tab = ref('minibook')
const pageCount = ref(10)
const temperature = ref(0.7)
const result = ref<SummarizationResult | null>(null)
const viewer = ref<BookSummaryViewerMethods | null>(null)

const canGenerate = computed(() => {
  return props.bookId && props.bookId.length > 0
})

const resultTitle = computed(() => {
  if (!result.value) return ''
  return tab.value === 'minibook' 
    ? `Minibook: ${pageCount.value}-Page Summary` 
    : 'Microbook: One-Page Summary'
})

const showError = (message: string) => {
  notify({
    type: 'negative',
    message: message || 'An error occurred',
    position: 'top'
  })
}

const generateSummary = async (type: 'minibook' | 'microbook'): Promise<void> => {
  if (!props.bookId) {
    showError('No book selected')
    return
  }
  
  loading.value = true
  result.value = null
  
  try {
    if (type === 'minibook') {
      result.value = await bookSummarization.generateMinibook(
        props.bookId,
        pageCount.value,
        undefined, // Use default model
        temperature.value
      )
    } else {
      result.value = await bookSummarization.generateMicrobook(
        props.bookId,
        undefined, // Use default model
        temperature.value
      )
    }
    
    // Show the viewer with the results
    if (viewer.value) {
      viewer.value.show()
    }
  } catch (error) {
    console.error(`Failed to generate ${type}:`, error)
    showError(`Failed to generate ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`)
  } finally {
    loading.value = false
  }
}

const generateMinibook = () => generateSummary('minibook')
const generateMicrobook = () => generateSummary('microbook')

// Initialize with default values
onMounted(() => {
  // Any initialization logic can go here
})
</script>

<style scoped>
.full-height {
  height: 100%;
}
</style>
