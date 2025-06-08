<template>
  <q-dialog v-model="showDialog" persistent>
    <q-card style="width: 800px; max-width: 90vw;">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Generate Metadata</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-tabs
          v-model="tab"
          dense
          class="text-grey"
          active-color="primary"
          indicator-color="primary"
          align="left"
          narrow-indicator
        >
          <q-tab name="options" icon="tune" label="Options" />
          <q-tab name="preview" icon="preview" label="Preview" :disable="!result" />
        </q-tabs>

        <q-separator />

        <q-tab-panels v-model="tab" animated>
          <!-- Options Tab -->
          <q-tab-panel name="options">
            <div class="text-subtitle2 q-mb-md">Select metadata to generate:</div>
            
            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-6">
                <q-toggle v-model="options.generateTitle" label="Title" />
                <q-toggle v-model="options.generateSummary" label="Summary" />
                <q-toggle v-model="options.generateTags" label="Tags" />
                <q-toggle v-model="options.generateGenres" label="Genres" />
              </div>
              <div class="col-12 col-sm-6">
                <q-toggle v-model="options.generateAgeRating" label="Age Rating" />
                <q-toggle v-model="options.generateReadingDirection" label="Reading Direction" />
                <q-toggle v-model="options.generatePublisher" label="Publisher" />
                <q-toggle v-model="options.generateLanguage" label="Language" />
                <q-toggle v-model="options.generateReleaseDate" label="Release Date" />
              </div>
            </div>

            <q-separator class="q-my-md" />

            <div class="text-subtitle2 q-mb-md">Advanced Options</div>
            
            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-6">
                <q-select
                  v-model="options.model"
                  :options="availableModels"
                  label="Model"
                  emit-value
                  map-options
                  options-dense
                  dense
                  outlined
                  clearable
                />
                
                <q-slider
                  v-model="options.confidenceThreshold"
                  :min="0"
                  :max="1"
                  :step="0.1"
                  label
                  label-always
                  color="primary"
                  class="q-mt-lg"
                >
                  <template v-slot:label>
                    <div>Confidence Threshold: {{ options.confidenceThreshold?.toFixed(1) }}</div>
                  </template>
                </q-slider>
              </div>
              
              <div class="col-12 col-sm-6">
                <q-slider
                  v-model="options.temperature"
                  :min="0"
                  :max="1"
                  :step="0.1"
                  label
                  label-always
                  color="primary"
                >
                  <template v-slot:label>
                    <div>Creativity: {{ options.temperature?.toFixed(1) }}</div>
                  </template>
                </q-slider>
                
                <q-input
                  v-model.number="options.maxTokens"
                  type="number"
                  label="Max Tokens"
                  min="100"
                  max="4000"
                  step="100"
                  dense
                  outlined
                  class="q-mt-md"
                />
              </div>
            </div>
          </q-tab-panel>

          <!-- Preview Tab -->
          <q-tab-panel name="preview" v-if="result">
            <div class="column q-gutter-y-md">
              <div v-if="result.title">
                <div class="text-subtitle2">Title:</div>
                <div class="text-body1">{{ result.title }}</div>
              </div>
              
              <div v-if="result.summary">
                <div class="text-subtitle2 q-mt-sm">Summary:</div>
                <div class="text-body1">{{ result.summary }}</div>
              </div>
              
              <div v-if="result.tags?.length">
                <div class="text-subtitle2 q-mt-sm">Tags:</div>
                <div class="q-gutter-sm">
                  <q-chip
                    v-for="(tag, index) in result.tags"
                    :key="index"
                    color="primary"
                    text-color="white"
                    size="sm"
                  >
                    {{ tag }}
                  </q-chip>
                </div>
              </div>
              
              <div v-if="result.genres?.length">
                <div class="text-subtitle2 q-mt-sm">Genres:</div>
                <div class="q-gutter-sm">
                  <q-chip
                    v-for="(genre, index) in result.genres"
                    :key="index"
                    color="secondary"
                    text-color="white"
                    size="sm"
                  >
                    {{ genre }}
                  </q-chip>
                </div>
              </div>
              
              <div class="row q-gutter-x-md">
                <div v-if="result.ageRating" class="col-auto">
                  <div class="text-subtitle2">Age Rating:</div>
                  <div class="text-body1">{{ result.ageRating }}+</div>
                </div>
                
                <div v-if="result.readingDirection" class="col-auto">
                  <div class="text-subtitle2">Reading Direction:</div>
                  <div class="text-body1">{{ formatReadingDirection(result.readingDirection) }}</div>
                </div>
                
                <div v-if="result.publisher" class="col-auto">
                  <div class="text-subtitle2">Publisher:</div>
                  <div class="text-body1">{{ result.publisher }}</div>
                </div>
                
                <div v-if="result.language" class="col-auto">
                  <div class="text-subtitle2">Language:</div>
                  <div class="text-body1">{{ result.language }}</div>
                </div>
                
                <div v-if="result.releaseDate" class="col-auto">
                  <div class="text-subtitle2">Release Date:</div>
                  <div class="text-body1">{{ formatDate(result.releaseDate) }}</div>
                </div>
              </div>
              
              <div v-if="result.confidence < 0.7" class="q-mt-sm text-italic text-orange">
                <q-icon name="warning" class="q-mr-xs" />
                Low confidence in results ({{ (result.confidence * 100).toFixed(0) }}%)
              </div>
              
              <div v-if="result.warnings?.length" class="q-mt-sm">
                <q-banner rounded class="bg-yellow-2 text-yellow-9 q-pa-sm">
                  <template v-slot:avatar>
                    <q-icon name="warning" color="yellow-9" />
                  </template>
                  <div v-for="(warning, index) in result.warnings" :key="'warn-' + index">
                    {{ warning }}
                  </div>
                </q-banner>
              </div>
              
              <div v-if="result.errors?.length" class="q-mt-sm">
                <q-banner rounded class="bg-red-2 text-red-9 q-pa-sm">
                  <template v-slot:avatar>
                    <q-icon name="error" color="red" />
                  </template>
                  <div v-for="(error, index) in result.errors" :key="'error-' + index">
                    {{ error }}
                  </div>
                </q-banner>
              </div>
            </div>
          </q-tab-panel>
        </q-tab-panels>
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md">
        <q-btn flat label="Cancel" color="primary" v-close-popup :disable="isGenerating" />
        <q-btn 
          v-if="tab === 'options'" 
          label="Generate" 
          color="primary" 
          @click="generateMetadata" 
          :loading="isGenerating"
          :disable="isGenerating"
        />
        <template v-else>
          <q-btn 
            flat 
            label="Back" 
            color="primary" 
            @click="tab = 'options'" 
            :disable="isGenerating" 
            class="q-mr-sm"
          />
          <q-btn 
            label="Apply" 
            color="positive" 
            @click="applyMetadata" 
            :loading="isApplying"
            :disable="isApplying || !result"
          />
        </template>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useMetabookService } from 'src/services/metabookService'
import { MetabookGenerationOptions, MetabookGenerationResult } from 'src/services/metabookService'

export default defineComponent({
  name: 'MetabookGenerationDialog',
  
  props: {
    bookId: {
      type: String,
      required: true
    },
    modelValue: {
      type: Boolean,
      default: false
    },
    availableModels: {
      type: Array as () => Array<{ label: string; value: string }>,
      default: () => []
    },
    initialOptions: {
      type: Object as () => Partial<MetabookGenerationOptions>,
      default: () => ({
        generateTitle: true,
        generateSummary: true,
        generateTags: true,
        generateGenres: true,
        generateAgeRating: true,
        generateReadingDirection: true,
        generatePublisher: true,
        generateLanguage: true,
        generateReleaseDate: true,
        confidenceThreshold: 0.7,
        temperature: 0.3,
        maxTokens: 1000
      })
    }
  },
  
  emits: ['update:modelValue', 'applied'],
  
  setup(props, { emit }) {
    const $q = useQuasar()
    const { generateMetabook, applyMetabook } = useMetabookService()
    
    const showDialog = ref(false)
    const tab = ref('options')
    const isGenerating = ref(false)
    const isApplying = ref(false)
    const result = ref<MetabookGenerationResult | null>(null)
    
    // Initialize options with defaults and any provided initial values
    const options = ref<MetabookGenerationOptions>({
      generateTitle: true,
      generateSummary: true,
      generateTags: true,
      generateGenres: true,
      generateAgeRating: true,
      generateReadingDirection: true,
      generatePublisher: true,
      generateLanguage: true,
      generateReleaseDate: true,
      confidenceThreshold: 0.7,
      temperature: 0.3,
      maxTokens: 1000,
      ...props.initialOptions
    })
    
    // Watch for dialog open/close
    watch(() => props.modelValue, (newVal) => {
      showDialog.value = newVal
      if (newVal) {
        // Reset state when dialog opens
        tab.value = 'options'
        result.value = null
      }
    })
    
    watch(showDialog, (newVal) => {
      if (newVal !== props.modelValue) {
        emit('update:modelValue', newVal)
      }
    })
    
    const formatReadingDirection = (direction: string): string => {
      const directions: Record<string, string> = {
        'LEFT_TO_RIGHT': 'Left to Right',
        'RIGHT_TO_LEFT': 'Right to Left',
        'VERTICAL': 'Vertical',
        'WEBTOON': 'Webtoon'
      }
      return directions[direction] || direction
    }
    
    const formatDate = (dateString: string): string => {
      try {
        return new Date(dateString).toLocaleDateString()
      } catch {
        return dateString
      }
    }
    
    const generateMetadata = async () => {
      isGenerating.value = true
      
      try {
        const response = await generateMetabook(props.bookId, options.value)
        if (response) {
          result.value = response
          tab.value = 'preview'
        }
      } finally {
        isGenerating.value = false
      }
    }
    
    const applyMetadata = async () => {
      if (!result.value) return
      
      isApplying.value = true
      
      try {
        const success = await applyMetabook(props.bookId, result.value)
        if (success) {
          emit('applied')
          showDialog.value = false
        }
      } finally {
        isApplying.value = false
      }
    }
    
    return {
      showDialog,
      tab,
      options,
      result,
      isGenerating,
      isApplying,
      formatReadingDirection,
      formatDate,
      generateMetadata,
      applyMetadata
    }
  }
})
</script>

<style scoped>
/* Add any custom styles here */
</style>
