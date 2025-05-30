export interface Book {
  id: string
  seriesId: string
  name: string
  url: string
  number: number
  created: string
  lastModified: string
  fileLastModified: string
  sizeBytes: number
  size: string
  media: {
    status: string
    mediaType: string
    pagesCount: number
    comment: string
  }
  metadata: {
    title: string
    titleSort: string
    summary: string
    number: string
    numberSort: number
    readingDirection: string
    publisher: string
    language: string
    isbn: string
    links: Array<{
      label: string
      url: string
    }>
    tags: string[]
  }
  status: string
}
