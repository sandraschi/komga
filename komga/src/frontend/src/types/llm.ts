/**
 * LLM Model Status
 */
export type LlmModelStatus = 'LOADING' | 'LOADED' | 'UNLOADED' | 'ERROR'

/**
 * LLM Provider Type
 */
export type LlmProvider = 'openai' | 'ollama' | 'lmstudio' | 'vllm'

/**
 * Represents an LLM Model
 */
export interface LlmModel {
  /** Unique identifier for the model */
  id: string
  
  /** Display name of the model */
  name: string
  
  /** Provider of the model */
  provider: LlmProvider
  
  /** Current status of the model */
  status: LlmModelStatus
  
  /** Whether the model is currently loaded */
  loaded: boolean
  
  /** Size of the model in bytes, if known */
  size?: number
  
  /** Model parameters and capabilities */
  parameters?: Record<string, any>
  
  /** Error message if the model is in an error state */
  error?: string
  
  /** When the model was last loaded */
  lastLoaded?: string
}

/**
 * Response from model operations
 */
export interface ModelOperationResponse {
  /** Whether the operation was successful */
  success: boolean
  
  /** Human-readable message about the result */
  message: string
  
  /** The updated model state, if applicable */
  model?: LlmModel
}

/**
 * Request for generating text
 */
export interface GenerateTextRequest {
  /** ID of the model to use */
  modelId: string
  
  /** The prompt to generate text from */
  prompt: string
  
  /** Maximum number of tokens to generate */
  maxTokens?: number
  
  /** Sampling temperature (0-2) */
  temperature?: number
  
  /** Stop sequences to end generation */
  stop?: string[]
}

/**
 * Response from text generation
 */
export interface GenerateTextResponse {
  /** The generated text */
  text: string
  
  /** The model used for generation */
  model: string
  
  /** Number of tokens used */
  tokensUsed: number
  
  /** Why the generation stopped */
  finishReason: string
}

/**
 * Request for analyzing content
 */
export interface AnalyzeContentRequest {
  /** ID of the model to use */
  modelId: string
  
  /** The content to analyze */
  content: string
  
  /** Type of analysis to perform */
  analysisType: AnalysisType
  
  /** Additional options */
  options?: Record<string, any>
}

/**
 * Response from content analysis
 */
export interface AnalyzeContentResponse {
  /** Analysis results */
  results: Record<string, any>
  
  /** The model used for analysis */
  model: string
  
  /** Type of analysis performed */
  analysisType: AnalysisType
}

/**
 * Types of analysis that can be performed
 */
export enum AnalysisType {
  /** Sentiment analysis */
  SENTIMENT = 'SENTIMENT',
  
  /** Keyword extraction */
  KEYWORDS = 'KEYWORDS',
  
  /** Content summarization */
  SUMMARY = 'SUMMARY',
  
  /** Named entity recognition */
  ENTITIES = 'ENTITIES',
  
  /** Topic modeling */
  TOPICS = 'TOPICS'
}
