/**
 * Utility functions for handling images
 */

interface ImageDimensions {
  width: number
  height: number
}

/**
 * Gets the dimensions of an image file
 * @param file The image file
 * @returns A promise that resolves with the image dimensions
 */
export function getImageDimensions(file: File): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height
      })
      URL.revokeObjectURL(objectUrl)
    }
    
    img.onerror = () => {
      reject(new Error('Failed to load image'))
      URL.revokeObjectURL(objectUrl)
    }
    
    img.src = objectUrl
  })
}

/**
 * Resizes an image to fit within specified dimensions while maintaining aspect ratio
 * @param file The image file to resize
 * @param maxWidth Maximum width
 * @param maxHeight Maximum height
 * @param quality Image quality (0-1)
 * @returns A promise that resolves with the resized image as a Blob
 */
export async function resizeImage(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality = 0.9
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }
      
      // Calculate new dimensions
      let { width, height } = img
      
      if (width > maxWidth) {
        height *= maxWidth / width
        width = maxWidth
      }
      
      if (height > maxHeight) {
        width *= maxHeight / height
        height = maxHeight
      }
      
      // Set canvas dimensions
      canvas.width = Math.floor(width)
      canvas.height = Math.floor(height)
      
      // Draw and resize image
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      
      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'))
            return
          }
          resolve(blob)
        },
        file.type || 'image/jpeg',
        quality
      )
      
      // Clean up
      URL.revokeObjectURL(objectUrl)
    }
    
    img.onerror = () => {
      reject(new Error('Failed to load image'))
      URL.revokeObjectURL(objectUrl)
    }
    
    img.src = objectUrl
  })
}

/**
 * Converts a File/Blob to a base64 string
 * @param file The file to convert
 * @returns A promise that resolves with the base64 string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1]) // Remove the data URL prefix
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    
    reader.readAsDataURL(file)
  })
}
