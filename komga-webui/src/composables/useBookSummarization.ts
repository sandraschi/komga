import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { handleError } from '@/utils/errorHandler'
import { ENDPOINTS } from '@/config/api'
import axios from 'axios'

interface SummarizationOptions {
  bookId: string
  pageCount?: number
  temperature?: number
  model?: string
}

export function useBookSummarization() {
  const authStore = useAuthStore()
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  const result = ref<any>(null)

  /**
   * Generates a minibook summary
   */
  const generateMinibook = async (options: SummarizationOptions) => {
    return generateSummary('minibook', options)
  }

  /**
   * Generates a microbook summary
   */
  const generateMicrobook = async (options: Omit<SummarizationOptions, 'pageCount'>) => {
    return generateSummary('microbook', options)
  }

  /**
   * Generates a summary of the specified type
   */
  const generateSummary = async (
    type: 'minibook' | 'microbook',
    options: SummarizationOptions
  ) => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await axios.post(
        ENDPOINTS.GENERATE_SUMMARY,
        {
          type,
          bookId: options.bookId,
          pageCount: options.pageCount,
          temperature: options.temperature ?? 0.7,
          model: options.model
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authStore.accessToken}`
          },
          timeout: 300000 // 5 minutes
        }
      )
      
      result.value = response.data
      return response.data
    } catch (err) {
      error.value = err as Error
      handleError(err, 'Failed to generate summary')
      throw err
    } finally {
      isLoading.value = false
    }
  }

  return {
    // State
    isLoading,
    error,
    result,
    
    // Methods
    generateMinibook,
    generateMicrobook
  }
}

// Export types
export type { SummarizationOptions }
