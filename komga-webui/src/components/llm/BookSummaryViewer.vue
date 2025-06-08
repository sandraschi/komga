<template>
  <q-dialog v-model="showDialog" maximized>
    <q-card class="full-height">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">{{ title }}</div>
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
          align="justify"
          narrow-indicator
        >
          <q-tab name="summary" label="Summary" />
          <q-tab
            v-for="page in result.pages"
            :key="page.pageNumber"
            :name="`page-${page.pageNumber}`"
            :label="`Page ${page.pageNumber}`"
          />
        </q-tabs>

        <q-separator />

        <q-tab-panels v-model="tab" animated class="bg-grey-1">
          <q-tab-pane name="summary" class="q-pa-md">
            <div class="text-h6 q-mb-md">Summary</div>
            <div class="text-body1">{{ result.summary }}</div>
          </q-tab-pane>

          <q-tab-pane
            v-for="page in result.pages"
            :key="page.pageNumber"
            :name="`page-${page.pageNumber}`"
            class="q-pa-md"
          >
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-8">
                <div class="text-h6 q-mb-md">Page {{ page.pageNumber }}</div>
                <div class="text-body1 q-mb-md">{{ page.content }}</div>
                
                <q-card v-if="page.imagePrompt" class="q-mt-md">
                  <q-card-section>
                    <div class="text-subtitle2">Image Prompt</div>
                    <div class="text-caption text-grey-7 q-mb-sm">
                      {{ page.imagePrompt }}
                    </div>
                    <q-btn
                      color="primary"
                      label="Generate Image"
                      :loading="generatingImage"
                      @click="generateImage(page)"
                    />
                  </q-card-section>
                </q-card>
              </div>
              
              <div class="col-12 col-md-4">
                <q-card v-if="imageUrl" class="q-mb-md">
                  <q-img :src="imageUrl" />
                  <q-card-actions>
                    <q-btn
                      flat
                      color="primary"
                      label="Download"
                      @click="downloadImage"
                    />
                  </q-card-actions>
                </q-card>
              </div>
            </div>
          </q-tab-pane>
        </q-tab-panels>
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md">
        <q-btn
          label="Export as CBZ"
          color="primary"
          :loading="exporting"
          @click="exportAsCbz"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, defineProps, defineExpose } from 'vue'
import { Quasar } from 'quasar'
import type { SummarizationResult, SummarizedPage } from '@/services/bookSummarization'

// Mock implementations for services
const generateImageFromPrompt = async (prompt: string): Promise<string> => {
  console.log('Generating image with prompt:', prompt)
  return 'https://example.com/generated-image.png'
}

const exportToCbz = async (options: { bookId: string; title: string; pages: any[] }): Promise<void> => {
  console.log('Exporting to CBZ:', options)
  return Promise.resolve()
}

// Mock Quasar notifications
const notify = (options: { type: string; message: string; position: string }) => {
  console.log('Notification:', options.message)
}

const props = defineProps<{
  title: string
  result: SummarizationResult
  bookId: string
}>()

const showDialog = ref(false)
const tab = ref('summary')
const generatingImage = ref(false)
const imageUrl = ref('')
const exporting = ref(false)

const show = () => {
  showDialog.value = true
  tab.value = 'summary'
}

const generateImage = async (page: SummarizedPage) => {
  if (!page.imagePrompt) return
  
  generatingImage.value = true
  imageUrl.value = ''
  
  try {
    const url = await generateImageFromPrompt(page.imagePrompt)
    imageUrl.value = url
  } catch (error) {
    notify({
      type: 'negative',
      message: 'Failed to generate image',
      position: 'top'
    })
  } finally {
    generatingImage.value = false
  }
}

const downloadImage = () => {
  if (!imageUrl.value) return
  
  const link = document.createElement('a')
  link.href = imageUrl.value
  link.download = `generated-image-${Date.now()}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const exportAsCbz = async () => {
  exporting.value = true
  
  try {
    await exportToCbz({
      bookId: props.bookId,
      title: props.title,
      pages: props.result.pages
    })
    
    notify({
      type: 'positive',
      message: 'Exported successfully',
      position: 'top'
    })
  } catch (error) {
    notify({
      type: 'negative',
      message: 'Export failed',
      position: 'top'
    })
  } finally {
    exporting.value = false
  }
}

// Expose the show method to parent components
defineExpose({
  show
})

// Type for the exposed methods
export interface BookSummaryViewerMethods {
  show: () => void
}
</script>

<template>
  <q-dialog v-model="showDialog" maximized>
    <q-card class="full-height">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">{{ title }}</div>
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
          align="justify"
          narrow-indicator
        >
          <q-tab name="summary" label="Summary" />
          <q-tab
            v-for="page in result.pages"
            :key="page.pageNumber"
            :name="`page-${page.pageNumber}`"
            :label="`Page ${page.pageNumber}`"
          />
        </q-tabs>

        <q-separator />

        <q-tab-panels v-model="tab" animated class="bg-grey-1">
          <q-tab-pane name="summary" class="q-pa-md">
            <div class="text-h6 q-mb-md">Summary</div>
            <div class="text-body1">{{ result.summary }}</div>
          </q-tab-pane>

          <q-tab-pane
            v-for="page in result.pages"
            :key="page.pageNumber"
            :name="`page-${page.pageNumber}`"
            class="q-pa-md"
          >
            <div class="row q-mb-md">
              <div class="col">
                <div class="text-h6">Page {{ page.pageNumber }}</div>
              </div>
              <div class="col-auto">
                <q-btn
                  v-if="page.imagePrompt"
                  :loading="generatingImage"
                  color="primary"
                  label="Generate Image"
                  @click="generateImage(page)"
                />
                <q-btn
                  v-if="imageUrl"
                  class="q-ml-sm"
                  color="secondary"
                  label="Download Image"
                  @click="downloadImage"
                />
              </div>
            </div>

            <div class="q-mb-md">
              <div class="text-subtitle2 q-mb-xs">Content:</div>
              <div class="text-body1">{{ page.content }}</div>
            </div>

            <div v-if="page.imagePrompt" class="q-mb-md">
              <div class="text-subtitle2 q-mb-xs">Image Prompt:</div>
              <div class="text-body2 text-italic">{{ page.imagePrompt }}</div>
            </div>

            <div v-if="imageUrl" class="q-mt-md">
              <img :src="imageUrl" alt="Generated image" style="max-width: 100%; max-height: 400px;" />
            </div>
          </q-tab-pane>
        </q-tab-panels>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
          :loading="exporting"
          color="primary"
          label="Export as CBZ"
          @click="exportAsCbz"
        />
        <q-btn flat label="Close" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<style scoped>
.full-height {
  height: 100%;
}
</style>
