import { api, ApiResponse } from '@/api/axios'
import { MetaBook, MetaBookCreate, MetaBookUpdate, MetaBookFormat } from '@/types/metabook'

export const MetaBookService = {
  async getAll(): Promise<ApiResponse<MetaBook[]>> {
    return api.get('/api/v1/metabooks')
  },

  async getById(id: string): Promise<ApiResponse<MetaBook>> {
    return api.get(`/api/v1/metabooks/${id}`)
  },

  async create(metabook: MetaBookCreate): Promise<ApiResponse<MetaBook>> {
    return api.post('/api/v1/metabooks', metabook)
  },

  async update(id: string, update: MetaBookUpdate): Promise<ApiResponse<MetaBook>> {
    return api.put(`/api/v1/metabooks/${id}`, update)
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    return api.delete(`/api/v1/metabooks/${id}`)
  },

  async generate(id: string, format: MetaBookFormat): Promise<ApiResponse<{ downloadUrl: string }>> {
    return api.post(`/api/v1/metabooks/${id}/generate`, { format })
  },

  async getDownloadUrl(id: string, fileName: string): string {
    return `/api/v1/metabooks/${id}/files/${fileName}`
  }
}

export default MetaBookService
