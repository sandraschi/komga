import axios from 'axios'
import { useAuthStore } from '@/stores/auth'

export interface ImageGenerationOptions {
  prompt: string
  model?: string
  size?: '256x256' | '512x512' | '1024x1024'
  quality?: 'standard' | 'hd'
  style?: 'vivid' | 'natural'
}

/**
 * Generates an image from a text prompt using the AI service
 * @param prompt The text prompt to generate an image from
 * @param options Additional generation options
 * @returns URL of the generated image
 */
export const generateImageFromPrompt = async (
  prompt: string,
  options: Omit<ImageGenerationOptions, 'prompt'> = {}
): Promise<string> => {
  try {
    const authStore = useAuthStore()
    const response = await axios.post(
      '/api/v1/ai/generate-image',
      {
        prompt,
        model: options.model || 'dall-e-3',
        size: options.size || '1024x1024',
        quality: options.quality || 'standard',
        style: options.style || 'vivid'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.accessToken}`
        },
        timeout: 60000 // 60 seconds timeout
      }
    )
    
    if (!response.data?.url) {
      throw new Error('Invalid response from image generation service')
    }
    
    return response.data.url
  } catch (error) {
    console.error('Image generation failed:', error)
    throw new Error(error.response?.data?.message || 'Failed to generate image')
  }
}
