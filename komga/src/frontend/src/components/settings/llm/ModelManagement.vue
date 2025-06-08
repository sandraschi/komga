<template>
  <div>
    <v-card v-if="!disabled" class="mb-4">
      <v-card-text>
        <div class="d-flex align-center">
          <v-text-field
            v-model="search"
            label="Search models"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            hide-details
            density="comfortable"
            class="mr-4"
          />
          <v-btn
            color="primary"
            :loading="refreshing"
            @click="refreshModels"
          >
            <v-icon start>mdi-refresh</v-icon>
            Refresh
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <v-card>
      <v-card-text>
        <v-data-table
          :headers="headers"
          :items="filteredModels"
          :loading="loading"
          :search="search"
          :items-per-page="10"
          class="elevation-1"
        >
          <template v-slot:item.status="{ item }">
            <v-chip :color="getStatusColor(item.status)" size="small">
              {{ item.status }}
            </v-chip>
          </template>

          <template v-slot:item.actions="{ item }">
            <v-btn
              v-if="item.status === 'UNLOADED'"
              size="small"
              color="primary"
              variant="text"
              :loading="loadingStates[item.id] === 'loading'"
              @click="loadModel(item.id)"
            >
              Load
            </v-btn>
            <v-btn
              v-else
              size="small"
              color="error"
              variant="text"
              :loading="loadingStates[item.id] === 'unloading'"
              @click="unloadModel(item.id)"
            >
              Unload
            </v-btn>
          </template>


          <template v-slot:item.details="{ item }">
            <v-btn
              size="small"
              variant="text"
              icon="mdi-information"
              @click="showDetails(item)"
            />
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Model Details Dialog -->
    <v-dialog v-model="detailsDialog" max-width="600">
      <v-card v-if="selectedModel">
        <v-card-title>Model Details</v-card-title>
        <v-card-text>
          <v-list>
            <v-list-item v-for="(value, key) in selectedModel" :key="key">
              <template v-slot:prepend>
                <span class="font-weight-bold">{{ formatKey(key) }}:</span>
              </template>
              <span class="ml-4">{{ formatValue(value) }}</span>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" @click="detailsDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useLlmStore } from '@/stores/llm'
import { storeToRefs } from 'pinia'
import type { LlmModel } from '@/types/llm'

const props = defineProps({
  provider: {
    type: String,
    required: true
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const llmStore = useLlmStore()
const { models, loading } = storeToRefs(llmStore)

const search = ref('')
const loadingStates = ref<Record<string, string>>({})
const refreshing = ref(false)
const detailsDialog = ref(false)
const selectedModel = ref<LlmModel | null>(null)

const headers = [
  { title: 'Name', key: 'name' },
  { title: 'ID', key: 'id' },
  { title: 'Status', key: 'status' },
  { title: 'Size', key: 'size', value: (item: any) => formatFileSize(item.size) },
  { title: 'Actions', key: 'actions', sortable: false },
  { title: '', key: 'details', sortable: false, width: '50px' }
]

const filteredModels = computed(() => {
  if (!search.value) return models.value
  const searchTerm = search.value.toLowerCase()
  return models.value.filter(model => 
    model.id.toLowerCase().includes(searchTerm) ||
    model.name.toLowerCase().includes(searchTerm) ||
    model.status.toLowerCase().includes(searchTerm)
  )
})

function getStatusColor(status: string) {
  switch (status) {
    case 'LOADED': return 'success'
    case 'LOADING': return 'warning'
    case 'ERROR': return 'error'
    default: return 'default'
  }
}

async function loadModel(modelId: string) {
  loadingStates.value[modelId] = 'loading'
  try {
    await llmStore.loadModel(modelId)
    await refreshModels()
  } finally {
    delete loadingStates.value[modelId]
  }
}

async function unloadModel(modelId: string) {
  loadingStates.value[modelId] = 'unloading'
  try {
    await llmStore.unloadModel(modelId)
    await refreshModels()
  } finally {
    delete loadingStates.value[modelId]
  }
}

async function refreshModels() {
  refreshing.value = true
  try {
    await llmStore.fetchModels()
  } finally {
    refreshing.value = false
  }
}

function showDetails(model: LlmModel) {
  selectedModel.value = model
  detailsDialog.value = true
}

function formatKey(key: string) {
  return key.split(/(?=[A-Z])/).map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
}

function formatValue(value: any) {
  if (value === null || value === undefined) return 'N/A'
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return value.toString()
}

function formatFileSize(bytes: number): string {
  if (!bytes) return 'N/A'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`
}

onMounted(() => {
  if (!props.disabled) {
    refreshModels()
  }
})
</script>
