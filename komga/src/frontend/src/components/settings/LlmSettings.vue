<template>
  <v-container fluid class="pa-4">
    <v-card class="mb-4">
      <v-card-title>LLM Configuration</v-card-title>
      <v-card-text>
        <v-switch
          v-model="enabled"
          label="Enable LLM Features"
          color="primary"
          hide-details
          class="mb-4"
        />

        <v-select
          v-model="selectedProvider"
          :items="availableProviders"
          label="Default Provider"
          :disabled="!enabled"
          item-title="text"
          item-value="value"
          class="mb-4"
        />

        <v-tabs v-model="activeTab" class="mb-4">
          <v-tab v-for="tab in tabs" :key="tab.value" :value="tab.value">
            {{ tab.text }}
          </v-tab>
        </v-tabs>
        
        <v-window v-model="activeTab">
          <v-window-item value="settings">
            <provider-settings
              :provider="selectedProvider"
              :config="providerConfig"
              :disabled="!enabled"
              @update:config="updateProviderConfig"
            />
          </v-window-item>
          <v-window-item value="models">
            <model-management
              :provider="selectedProvider"
              :disabled="!enabled"
            />
          </v-window-item>
        </v-window>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          color="primary"
          :loading="saving"
          :disabled="!enabled"
          @click="saveSettings"
        >
          Save Settings
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useLlmStore } from '@/stores/llm'
import { storeToRefs } from 'pinia'
import ProviderSettings from './llm/ProviderSettings.vue'
import ModelManagement from './llm/ModelManagement.vue'

const llmStore = useLlmStore()
const { config, loading, saving } = storeToRefs(llmStore)

const enabled = ref(false)
const selectedProvider = ref('')
const activeTab = ref('settings')

const tabs = [
  { text: 'Provider Settings', value: 'settings' },
  { text: 'Model Management', value: 'models' }
]

const availableProviders = computed(() => [
  { text: 'OpenAI', value: 'openai' },
  { text: 'Ollama', value: 'ollama' },
  { text: 'LM Studio', value: 'lmstudio' },
  { text: 'vLLM', value: 'vllm' }
])

const providerConfig = computed(() => ({
  ...config.value[selectedProvider.value] || {}
}))

onMounted(async () => {
  await llmStore.loadConfig()
  enabled.value = config.value.enabled
  selectedProvider.value = config.value.defaultProvider || 'openai'
})

async function saveSettings() {
  await llmStore.updateConfig({
    enabled: enabled.value,
    defaultProvider: selectedProvider.value,
    [selectedProvider.value]: providerConfig.value
  })
}

function updateProviderConfig(updatedConfig: any) {
  config.value = {
    ...config.value,
    [selectedProvider.value]: updatedConfig
  }
}
</script>
