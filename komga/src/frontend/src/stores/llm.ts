import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAxios } from '@/composables/useAxios'
import type { LlmModel, ModelOperationResponse } from '@/types/llm'

export const useLlmStore = defineStore('llm', () => {
  const { axios } = useAxios()
  
  // State
  const models = ref<LlmModel[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const activeModel = ref<string | null>(null)
  
  // Getters
  const loadedModels = computed(() => 
    models.value.filter(m => m.loaded)
  )
  
  const availableModels = computed(() =>
    models.value.filter(m => !m.loaded)
  )
  
  // Actions
  async function fetchModels() {
    try {
      loading.value = true
      error.value = null
      const response = await axios.get('/api/v1/llm/models')
      models.value = response.data
    } catch (e: any) {
      error.value = e.response?.data?.message || e.message
      throw e
    } finally {
      loading.value = false
    }
  }
  
  async function loadModel(modelId: string, force = false): Promise<ModelOperationResponse> {
    try {
      loading.value = true
      error.value = null
      const response = await axios.post(`/api/v1/llm/models/${modelId}/load?force=${force}`)
      await fetchModels()
      return response.data
    } catch (e: any) {
      error.value = e.response?.data?.message || e.message
      throw e
    } finally {
      loading.value = false
    }
  }
  
  async function unloadModel(modelId: string, force = false): Promise<ModelOperationResponse> {
    try {
      loading.value = true
      error.value = null
      const response = await axios.post(`/api/v1/llm/models/${modelId}/unload?force=${force}`)
      await fetchModels()
      return response.data
    } catch (e: any) {
      error.value = e.response?.data?.message || e.message
      throw e
    } finally {
      loading.value = false
    }
  }
  
  async function refreshModelStatuses() {
    try {
      loading.value = true
      error.value = null
      const response = await axios.get('/api/v1/llm/models/status')
      models.value = response.data
    } catch (e: any) {
      error.value = e.response?.data?.message || e.message
      throw e
    } finally {
      loading.value = false
    }
  }
  
  function setActiveModel(modelId: string | null) {
    activeModel.value = modelId
  }
  
  // Initialize
  fetchModels()
  
  return {
    // State
    models,
    loading,
    error,
    activeModel,
    
    // Getters
    loadedModels,
    availableModels,
    
    // Actions
    fetchModels,
    loadModel,
    unloadModel,
    refreshModelStatuses,
    setActiveModel
  }
})
