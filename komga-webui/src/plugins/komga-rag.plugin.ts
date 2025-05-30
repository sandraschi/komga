import { PluginFunction } from 'vue'
import { AxiosInstance } from 'axios'
import _Vue from 'vue'
import { RagService } from '@/services/rag.service'

const plugin: PluginFunction<{ http: AxiosInstance }> = (Vue: typeof _Vue, options?: { http: AxiosInstance }) => {
  if (!options || !options.http) {
    console.error('HTTP client is required for RAG plugin')
    return
  }
  const ragService = new RagService(options.http)
  Vue.prototype.$rag = ragService
}

export default plugin

declare module 'vue/types/vue' {
  interface Vue {
    $rag: any
  }
}
