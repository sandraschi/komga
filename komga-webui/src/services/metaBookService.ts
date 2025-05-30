import { MetaBook, MetaBookCreate, MetaBookUpdate } from '@/types/metabook'
import { api } from '@/services/api'

export const MetaBookService = {
  create(metabook: MetaBookCreate) {
    return api.post<MetaBook>('/api/v1/metabooks', metabook)
  },
  
  update(id: string, metabook: MetaBookUpdate) {
    return api.put<MetaBook>(`/api/v1/metabooks/${id}`, metabook)
  },
  
  delete(id: string) {
    return api.delete(`/api/v1/metabooks/${id}`)
  },
  
  get(id: string) {
    return api.get<MetaBook>(`/api/v1/metabooks/${id}`)
  },
  
  getAll() {
    return api.get<MetaBook[]>('/api/v1/metabooks')
  }
}
