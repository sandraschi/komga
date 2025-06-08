import { AxiosInstance, AxiosResponse } from 'axios'

export interface RagDocument {
  id: string
  content: string
  metadata: Record<string, any>
  chunks: Array<{
    id: string
    content: string
    metadata: Record<string, any>
    chunkIndex: number
  }>
}

export interface RagSearchResult {
  chunk: {
    id: string
    content: string
    metadata: Record<string, any>
    chunkIndex: number
  }
  score: number
  document: RagDocument
}

export interface RagResponse {
  results: RagSearchResult[]
  answer?: string
}

export interface RagQueryParams {
  query: string
  topK?: number
  generateAnswer?: boolean
  maxTokens?: number
  temperature?: number
  filters?: Record<string, any>
}

export default class RagService {
  private http: AxiosInstance

  constructor(http: AxiosInstance) {
    this.http = http
  }
  async query(params: RagQueryParams): Promise<RagResponse> {
    const response = await this.http.post<RagResponse>('/api/v1/rag/query', {
      query: params.query,
      topK: params.topK || 5,
      generateAnswer: params.generateAnswer !== false, // Default to true if not specified
      maxTokens: params.maxTokens,
      temperature: params.temperature,
      filters: params.filters,
    })
    return response.data
  }

  async addDocument(content: string, metadata: Record<string, any> = {}): Promise<string[]> {
    const response = await this.http.post<string[]>('/api/v1/rag/documents', {
      content,
      metadata,
    })
    return response.data
  }

  async addDocuments(contents: string[], metadata: Record<string, any> = {}): Promise<string[]> {
    const response = await this.http.post<string[]>(
      '/api/v1/rag/documents/batch',
      contents.map(content => ({
        content,
        metadata: {
          ...metadata,
          uploadedAt: new Date().toISOString(),
        },
      }))
    )
    return response.data
  }

  async uploadFiles(files: File[], metadata: Record<string, any> = {}): Promise<string[]> {
    const formData = new FormData()
    
    files.forEach(file => {
      formData.append('files', file)
    })
    
    formData.append('metadata', JSON.stringify({
      ...metadata,
      uploadedAt: new Date().toISOString(),
    }))
    
    const response = await this.http.post<string[]>(
      '/api/v1/rag/documents/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  }

  async getDocument(id: string): Promise<RagDocument> {
    const response = await this.http.get<RagDocument>(`/api/v1/rag/documents/${id}`)
    return response.data
  }

  async listDocuments(
    page: number = 0,
    size: number = 20,
    sort: string = 'uploadedAt,desc'
  ): Promise<{ content: RagDocument[], totalElements: number }> {
    const response = await this.http.get('/api/v1/rag/documents', {
      params: {
        page,
        size,
        sort,
      },
    })
    return response.data
  }

  async deleteDocument(id: string): Promise<void> {
    await this.http.delete(`/api/v1/rag/documents/${id}`)
  }

  async deleteDocuments(ids: string[]): Promise<void> {
    await this.http.delete('/api/v1/rag/documents', {
      data: ids,
    })
  }

  async clearAllDocuments(): Promise<void> {
    await this.http.delete('/api/v1/rag/documents')
  }

  async getRagStatus(): Promise<{ enabled: boolean }> {
    const response = await this.http.get('/api/v1/rag/status')
    return response.data
  }
}

export { RagService }
