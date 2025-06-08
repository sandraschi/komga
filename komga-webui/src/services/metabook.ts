import Vue from 'vue'

export interface MetabookGenerationOptions {
  generateTitle?: boolean
  generateSummary?: boolean
  generateTags?: boolean
  generateGenres?: boolean
  generateAgeRating?: boolean
  generateReadingDirection?: boolean
  generatePublisher?: boolean
  generateLanguage?: boolean
  generateReleaseDate?: boolean
  confidenceThreshold?: number
  temperature?: number
  maxTokens?: number
  model?: string
}

export interface MetabookGenerationResult {
  title?: string
  summary?: string
  tags: string[]
  genres: string[]
  ageRating?: number
  readingDirection?: string
  publisher?: string
  language?: string
  releaseDate?: string
  confidence: number
  warnings: string[]
  errors: string[]
}

export const generateMetabook = async (
  bookId: string,
  options: MetabookGenerationOptions
): Promise<MetabookGenerationResult> => {
  const response = await Vue.prototype.$http.post(`/api/v1/books/${bookId}/metabook/generate`, options)
  return response.data
}

export const applyMetabook = async (
  bookId: string,
  result: MetabookGenerationResult
): Promise<boolean> => {
  try {
    await Vue.prototype.$http.post(`/api/v1/books/${bookId}/metabook/apply`, result)
    return true
  } catch (error) {
    console.error('Failed to apply metabook:', error)
    return false
  }
}
