import axios from 'axios'
import { useSnackbar } from 'src/composables/useSnackbar'

export interface MetabookGenerationOptions {
  generateTitle: boolean
  generateSummary: boolean
  generateTags: boolean
  generateGenres: boolean
  generateAgeRating: boolean
  generateReadingDirection: boolean
  generatePublisher: boolean
  generateLanguage: boolean
  generateReleaseDate: boolean
  confidenceThreshold?: number
  model?: string
  temperature?: number
  maxTokens?: number
}

export interface MetabookGenerationResult {
  title: string | null
  summary: string | null
  tags: string[]
  genres: string[]
  ageRating: number | null
  readingDirection: string | null
  publisher: string | null
  language: string | null
  releaseDate: string | null
  confidence: number
  warnings: string[]
  errors: string[]
}

export const useMetabookService = () => {
  const { showSnackbar } = useSnackbar()

  const generateMetabook = async (
    bookId: string,
    options: MetabookGenerationOptions
  ): Promise<MetabookGenerationResult | null> => {
    try {
      const response = await axios.post<MetabookGenerationResult>(
        `/api/v1/books/${bookId}/metabook/generate`,
        options
      )
      return response.data
    } catch (error) {
      console.error('Failed to generate metabook:', error)
      showSnackbar({
        message: 'Failed to generate metadata',
        color: 'negative',
        icon: 'error'
      })
      return null
    }
  }

  const applyMetabook = async (
    bookId: string,
    result: MetabookGenerationResult
  ): Promise<boolean> => {
    try {
      await axios.post(
        `/api/v1/books/${bookId}/metabook/apply`,
        result
      )
      showSnackbar({
        message: 'Metadata applied successfully',
        color: 'positive',
        icon: 'check_circle'
      })
      return true
    } catch (error) {
      console.error('Failed to apply metabook:', error)
      showSnackbar({
        message: 'Failed to apply metadata',
        color: 'negative',
        icon: 'error'
      })
      return false
    }
  }

  return {
    generateMetabook,
    applyMetabook
  }
}
