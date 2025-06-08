<template>
  <div class="d-flex align-center">
    <!-- Provider Selector -->
    <v-menu offset-y :close-on-content-click="false">
      <template v-slot:activator="{ on, attrs }">
        <v-btn
          text
          small
          class="text-capitalize mr-2"
          v-bind="attrs"
          v-on="on"
        >
          <v-icon left>mdi-robot</v-icon>
          {{ selectedProvider || 'Select Provider' }}
          <v-icon right>mdi-chevron-down</v-icon>
        </v-btn>
      </template>
      <v-card min-width="200">
        <v-list dense>
          <v-list-item-group v-model="selectedProvider" color="primary">
            <v-list-item
              v-for="provider in availableProviders"
              :key="provider"
              :value="provider"
              @click="selectProvider(provider)"
            >
              <v-list-item-title>{{ provider }}</v-list-item-title>
            </v-list-item>
          </v-list-item-group>
        </v-list>
      </v-card>
    </v-menu>

    <!-- Model Selector -->
    <v-menu offset-y :close-on-content-click="false" :disabled="!selectedProvider">
      <template v-slot:activator="{ on, attrs }">
        <v-btn
          text
          small
          class="text-capitalize"
          :loading="loading"
          :disabled="!selectedProvider || !availableModels.length"
          v-bind="attrs"
          v-on="on"
        >
          <v-icon left>mdi-robot-outline</v-icon>
          {{ selectedModel?.name || 'Select Model' }}
          <v-icon right>mdi-chevron-down</v-icon>
          <template v-if="selectedModel?.status === 'LOADED'">
            <v-icon small color="success" class="ml-1">mdi-check-circle</v-icon>
          </template>
          <template v-else-if="selectedModel?.status === 'LOADING'">
            <v-progress-circular
              indeterminate
              size="16"
              width="2"
              class="ml-1"
            ></v-progress-circular>
          </template>
        </v-btn>
      </template>
      <v-card min-width="300">
        <v-list dense>
          <v-list-item-group v-model="selectedModelId" color="primary">
            <v-list-item
              v-for="model in availableModels"
              :key="model.id"
              :value="model.id"
              @click="selectModel(model)"
            >
              <v-list-item-avatar>
                <v-icon v-if="model.status === 'LOADED'" color="success">mdi-check-circle</v-icon>
                <v-progress-circular
                  v-else-if="model.status === 'LOADING'"
                  indeterminate
                  size="20"
                  width="2"
                ></v-progress-circircular>
                <v-icon v-else>mdi-robot-outline</v-icon>
              </v-list-item-avatar>
              <v-list-item-content>
                <v-list-item-title>{{ model.name }}</v-list-item-title>
                <v-list-item-subtitle class="text-caption">
                  {{ model.provider }} • {{ formatSize(model.size) }}
                </v-list-item-subtitle>
              </v-list-item-content>
              <v-list-item-action>
                <v-btn
                  v-if="model.loaded"
                  icon
                  small
                  @click.stop="unloadModel(model)"
                >
                  <v-icon small>mdi-close</v-icon>
                </v-btn>
                <v-btn
                  v-else
                  icon
                  small
                  :loading="model.status === 'LOADING'"
                  @click.stop="loadModel(model)"
                >
                  <v-icon small>mdi-download</v-icon>
                </v-btn>
              </v-list-item-action>
            </v-list-item>
          </v-list-item-group>
        </v-list>
      </v-card>
    </v-menu>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch } from 'vue'
import { useLlmStore } from '@/stores/llm'
import type { LlmModel } from '@/types/llm'

export default defineComponent({
  name: 'LlmSelector',
  
  setup() {
    const llmStore = useLlmStore()
    const selectedProvider = ref<string | null>(null)
    const selectedModelId = ref<string | null>(null)
    
    const availableProviders = computed(() => {
      const providers = new Set<string>()
      llmStore.models.forEach(model => providers.add(model.provider))
      return Array.from(providers).sort()
    })
    
    const availableModels = computed(() => {
      if (!selectedProvider.value) return []
      return llmStore.models
        .filter(model => model.provider === selectedProvider.value)
        .sort((a, b) => a.name.localeCompare(b.name))
    })
    
    const selectedModel = computed(() => {
      if (!selectedModelId.value) return null
      return llmStore.models.find(m => m.id === selectedModelId.value) || null
    })
    
    watch(availableModels, (models) => {
      if (models.length && !selectedModelId.value) {
        const loadedModel = models.find(m => m.loaded)
        selectedModelId.value = loadedModel ? loadedModel.id : models[0]?.id || null
      }
    }, { immediate: true })
    
    function formatSize(bytes?: number): string {
      if (!bytes) return 'Size unknown'
      const units = ['B', 'KB', 'MB', 'GB', 'TB']
      let size = bytes
      let unitIndex = 0
      while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024
        unitIndex++
      }
      return `${size.toFixed(1)} ${units[unitIndex]}`
    }
    
    async function selectProvider(provider: string) {
      selectedProvider.value = provider
      selectedModelId.value = null
      await llmStore.fetchModels()
    }
    
    function selectModel(model: LlmModel) {
      selectedModelId.value = model.id
      // Optionally trigger model loading here
    }
    
    async function loadModel(model: LlmModel) {
      try {
        await llmStore.loadModel(model.id)
      } catch (error) {
        console.error('Failed to load model:', error)
      }
    }
    
    async function unloadModel(model: LlmModel) {
      try {
        await llmStore.unloadModel(model.id)
      } catch (error) {
        console.error('Failed to unload model:', error)
      }
    }
    
    return {
      loading: computed(() => llmStore.loading),
      availableProviders,
      availableModels,
      selectedProvider,
      selectedModelId,
      selectedModel,
      selectProvider,
      selectModel,
      loadModel,
      unloadModel,
      formatSize
    }
  }
})
</script>

<style scoped>
.v-list-item {
  min-height: 40px;
}

.v-list-item__avatar {
  margin-right: 8px;
  min-width: 24px;
}

.v-list-item__action {
  margin: 0;
}

.v-btn {
  min-width: 0;
}
</style>
