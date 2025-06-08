import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(localStorage.getItem('accessToken'))
  const isAuthenticated = ref(!!accessToken.value)

  const setAccessToken = (token: string) => {
    accessToken.value = token
    localStorage.setItem('accessToken', token)
    isAuthenticated.value = true
  }

  const clearAuth = () => {
    accessToken.value = null
    localStorage.removeItem('accessToken')
    isAuthenticated.value = false
  }

  return {
    accessToken,
    isAuthenticated,
    setAccessToken,
    clearAuth
  }
})
