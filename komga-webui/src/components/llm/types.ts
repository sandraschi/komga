/**
 * Types for the LLM-related components
 */

export interface SummarizationResult {
  /** The generated summary */
  summary: string
  /** List of pages with their content and image prompts */
  pages: SummarizedPage[]
  /** The model used for generation */
  modelUsed: string
  /** Any warnings that occurred during generation */
  warnings: string[]
  /** Any errors that occurred during generation */
  errors: string[]
  /** Generation metadata */
  metadata: {
    /** Total tokens used */
    totalTokens: number
    /** Generation time in milliseconds */
    generationTime: number
    /** Timestamp of generation */
    timestamp: string
  }
}

export interface SummarizedPage {
  /** Page number (1-based) */
  pageNumber: number
  /** The content of the page */
  content: string
  /** Optional image prompt for the page */
  imagePrompt?: string
  /** Optional image URL if an image was generated */
  imageUrl?: string
}

export interface BookSummaryViewerMethods {
  /** Shows the summary viewer dialog */
  show: () => void
  /** Hides the summary viewer dialog */
  hide: () => void
}

export interface BookSummarizationTabMethods {
  /** Generates a minibook summary */
  generateMinibook: () => Promise<void>
  /** Generates a microbook summary */
  generateMicrobook: () => Promise<void>
  /** Resets the form */
  reset: () => void
}

/**
 * Props for the BookSummaryViewer component
 */
export interface BookSummaryViewerProps {
  /** The title to display in the header */
  title: string
  /** The summarization result to display */
  result: SummarizationResult
  /** The ID of the book being summarized */
  bookId: string
}

/**
 * Props for the BookSummarizationTab component
 */
export interface BookSummarizationTabProps {
  /** The ID of the book to summarize */
  bookId: string
  /** Optional title of the book */
  bookTitle?: string
  /** Whether to show the tab as active */
  active?: boolean
}
