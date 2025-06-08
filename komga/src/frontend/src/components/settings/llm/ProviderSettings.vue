<template>
  <v-form>
    <v-text-field
      v-if="provider === 'openai'"
      v-model="localConfig.apiKey"
      label="API Key"
      :disabled="disabled"
      type="password"
      class="mb-4"
    />

    <v-text-field
      v-if="provider === 'openai'"
      v-model="localConfig.organization"
      label="Organization ID (Optional)"
      :disabled="disabled"
      class="mb-4"
    />

    <v-text-field
      v-model="localConfig.apiUrl"
      :label="`${provider} API URL`"
      :disabled="disabled"
      class="mb-4"
    />

    <v-text-field
      v-model="localConfig.model"
      label="Default Model"
      :disabled="disabled"
      class="mb-4"
    />

    <v-expansion-panels v-if="provider === 'ollama'">
      <v-expansion-panel>
        <v-expansion-panel-title>Advanced</v-expansion-panel-title>
        <v-expansion-panel-text>
          <v-text-field
            v-model.number="localConfig.keepAlive"
            label="Keep Alive (minutes)"
            type="number"
            min="1"
            :disabled="disabled"
            class="mb-4"
          />
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </v-form>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps({
  provider: {
    type: String,
    required: true,
    validator: (value: string) => ['openai', 'ollama', 'lmstudio', 'vllm'].includes(value)
  },
  config: {
    type: Object,
    default: () => ({
      enabled: false,
      model: '',
      apiUrl: ''
    })
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:config'])

const localConfig = ref({ ...props.config })

// Default values based on provider
const defaultConfigs = {
  openai: {
    apiUrl: 'https://api.openai.com/v1',
    model: 'gpt-3.5-turbo',
    apiKey: '',
    organization: ''
  },
  ollama: {
    apiUrl: 'http://localhost:11434',
    model: 'llama2',
    keepAlive: 30
  },
  lmstudio: {
    apiUrl: 'http://localhost:1234/v1',
    model: 'local-model'
  },
  vllm: {
    apiUrl: 'http://localhost:8000/v1',
    model: 'TheBloke/Llama-2-7b-Chat-AWQ'
  }
}

// Initialize with defaults if not set
watch(() => props.provider, (newProvider) => {
  localConfig.value = {
    ...defaultConfigs[newProvider as keyof typeof defaultConfigs],
    ...(props.config || {})
  }
  emit('update:config', localConfig.value)
}, { immediate: true })

// Emit updates when config changes
watch(localConfig, (newConfig) => {
  emit('update:config', { ...newConfig })
}, { deep: true })
</script>
