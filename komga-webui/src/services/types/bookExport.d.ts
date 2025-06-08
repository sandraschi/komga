export interface BookPage {
  content: string
  imagePrompt: string
}

export interface BookExportOptions {
  bookId: string
  title: string
  pages: BookPage[]
  format?: 'cbz' | 'pdf' | 'epub'
  includeImages?: boolean
}

export declare function exportToCbz(options: Omit<BookExportOptions, 'format' | 'includeImages'>): Promise<void>
