import { Book } from '@/types/book'

export interface Series {
  id: string
  libraryId: string
  name: string
  url: string
  created: string
  lastModified: string
  booksCount: number
  booksReadCount: number
  booksUnreadCount: number
  booksInProgressCount: number
  metadata: {
    status: string
    statusLock: boolean
    created: string
    lastModified: string
    title: string
    titleSort: string
    summary: string
    summaryLock: boolean
    readingDirection: string
    readingDirectionLock: boolean
    publisher: string
    publisherLock: boolean
    ageRating: number
    ageRatingLock: boolean
    language: string
    languageLock: boolean
    genres: string[]
    genresLock: boolean
    tags: string[]
    tagsLock: boolean
    totalBookCount: number
    totalBookCountLock: boolean
    sharingLabels: string[]
    sharingLabelsLock: boolean
    alternateTitles: Array<{
      label: string
      title: string
    }>
    alternateTitlesLock: boolean
  }
  books: Book[]
}
