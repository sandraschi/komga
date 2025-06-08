export interface ImageGenerationOptions {
  prompt: string
  model?: string
  size?: '256x256' | '512x512' | '1024x1024'
  quality?: 'standard' | 'hd'
  style?: 'vivid' | 'natural'
}

export declare function generateImageFromPrompt(
  prompt: string,
  options?: Omit<ImageGenerationOptions, 'prompt'>
): Promise<string>
