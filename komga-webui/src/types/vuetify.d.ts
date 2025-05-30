import Vue from 'vue'

declare module 'vue/types/vue' {
  interface Vue {
    $t: (key: string, values?: any) => string
    $toast: {
      error: (message: string) => void
      success: (message: string) => void
      info: (message: string) => void
    }
  }
}

// Vuetify form type
export interface VForm extends Vue {
  validate: () => boolean
  reset: () => void
  resetValidation: () => void
}
