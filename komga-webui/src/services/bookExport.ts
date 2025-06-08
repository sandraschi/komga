import axios from 'axios'
import { useAuthStore } from '@/stores/auth'

/**
 * Represents a page in the exported book
 */
export interface BookPage {
  /** Page number */
  pageNumber: number
  /** Page content */
  content: string
  /** Optional image prompt for the page */
  imagePrompt?: string
  /** Optional image URL */
  imageUrl?: string
}

/**
 * Options for exporting a book
 */
export interface BookExportOptions {
  /** ID of the book to export */
  bookId: string
  /** Title of the book */
  title: string
  /** Pages to include in the export */
  pages: BookPage[]
  /** Export format */
  format?: 'cbz' | 'pdf' | 'epub'
  /** Whether to include generated images */
  includeImages?: boolean
}

/**
 * Exports a book to CBZ format with optional AI-generated images
 * @param options Export options
 * @returns Promise that resolves when export is complete
 */
export const exportToCbz = async (options: Omit<BookExportOptions, 'format' | 'includeImages'>): Promise<void> => {
  try {
    const authStore = useAuthStore()
    
    const response = await axios.post(
      '/api/v1/books/export',
      {
        ...options,
        format: 'cbz',
        includeImages: true
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.accessToken}`
        },
        responseType: 'blob',
        timeout: 300000 // 5 minutes timeout
      }
    )

    // Create a download link for the exported file
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${options.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_summary.cbz`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    
    // Clean up
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Export failed:', error)
    throw new Error(error.response?.data?.message || 'Failed to export book')
  }
}
