import { ref } from 'vue'
import { handleError } from '@/utils/errorHandler'

export interface DownloadOptions {
  /** The data to download */
  data: Blob | string
  /** The filename to use for the download */
  filename: string
  /** The MIME type of the data */
  mimeType?: string
}

/**
 * Composable for handling file downloads
 */
export function useFileDownload() {
  const isDownloading = ref(false)

  /**
   * Triggers a file download
   */
  const downloadFile = async (options: DownloadOptions) => {
    try {
      isDownloading.value = true
      
      let blob: Blob
      
      if (typeof options.data === 'string') {
        // If it's a URL, fetch the data
        const response = await fetch(options.data)
        if (!response.ok) {
          throw new Error(`Failed to download file: ${response.statusText}`)
        }
        blob = await response.blob()
      } else {
        // If it's already a Blob, use it directly
        blob = options.data
      }
      
      // Create a download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = options.filename
      
      // Trigger the download
      document.body.appendChild(link)
      link.click()
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      }, 100)
      
      return true
    } catch (error) {
      handleError(error, 'Failed to download file')
      return false
    } finally {
      isDownloading.value = false
    }
  }

  return {
    isDownloading,
    downloadFile
  }
}
