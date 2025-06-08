import { LlmState } from '@/store/llm'

declare module 'vue/types/vue' {
  interface Vue {
    $llm: {
      state: LlmState
      dispatch: (action: string, payload?: any) => Promise<any>
      commit: (mutation: string, payload?: any) => void
    }
  }
}

declare module 'vuex/types/index' {
  interface Store<S> {
    $http: any // Axios instance
  }
}
