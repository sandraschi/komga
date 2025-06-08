import Vue from 'vue'

export interface SummarizedPage {
  pageNumber: number
  content: string
  imagePrompt?: string
}

export interface SummarizationResult {
  summary: string
  pages: SummarizedPage[]
  modelUsed: string
  warnings: string[]
  errors: string[]
}

export const generateMinibook = async (
  bookId: string,
  pageCount: number = 10,
  model?: string,
  temperature: number = 0.7
): Promise<SummarizationResult> => {
  try {
    const response = await Vue.prototype.$http.post(
      `/api/v1/books/${bookId}/summarize/minibook`,
      null,
      {
        params: {
          pageCount,
          ...(model && { model }),
          temperature
        }
      }
    )
    return response.data
  } catch (error) {
    console.error('Failed to generate Minibook:', error)
    throw error
  }
}

export const generateMicrobook = async (
  bookId: string,
  model?: string,
  temperature: number = 0.8
): Promise<SummarizationResult> => {
  try {
    const response = await Vue.prototype.$http.post(
      `/api/v1/books/${bookId}/summarize/microbook`,
      null,
      {
        params: {
          ...(model && { model }),
          temperature
        }
      }
    )
    return response.data
  } catch (error) {
    console.error('Failed to generate Microbook:', error)
    throw error
  }
}
