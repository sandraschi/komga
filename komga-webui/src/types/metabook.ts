import { Book } from '@/types/book'
import { Series } from '@/types/series'

export type MetaBookStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export type MetaBookFormat = 'EPUB' | 'PDF' | 'MARKDOWN' | 'WEB'

export interface MetaBook {
  id: string
  name: string
  description?: string
  status: MetaBookStatus
  format: MetaBookFormat
  books: Book[]
  bookIds: string[]
  series: Series[]
  seriesIds: string[]
  collections: string[]
  collectionIds: string[]
  readListIds: string[]
  tags: string[]
  createdDate: string
  lastModifiedDate: string
  generatedFiles?: string[]
  errorMessage?: string
  options: {
    includeCovers: boolean
    includeMetadata: boolean
    tableOfContents: boolean
    customCss: string
  }
}

export interface MetaBookCreate {
  name: string
  description?: string
  format: MetaBookFormat
  bookIds?: string[]
  seriesIds?: string[]
  collectionIds?: string[]
  readListIds?: string[]
  tags?: string[]
  options?: {
    includeCovers?: boolean
    includeMetadata?: boolean
    tableOfContents?: boolean
    customCss?: string
  }
}

export interface MetaBookUpdate extends Partial<MetaBookCreate> {
  status?: MetaBookStatus
  generatedFiles?: string[]
  errorMessage?: string
}

export interface MetaBookGenerationRequest {
  format: MetaBookFormat
  options?: {
    includeCovers?: boolean
    includeMetadata?: boolean
    tableOfContents?: boolean
    customCss?: string
  }
}
