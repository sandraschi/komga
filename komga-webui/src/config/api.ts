/**
 * API configuration and endpoints
 */

const API_PREFIX = '/api/v1'

export const ENDPOINTS = {
  // AI Services
  GENERATE_IMAGE: `${API_PREFIX}/ai/generate-image`,
  GENERATE_SUMMARY: `${API_PREFIX}/ai/generate-summary`,
  
  // Book Services
  BOOKS: `${API_PREFIX}/books`,
  BOOK_EXPORT: (bookId: string) => `${API_PREFIX}/books/${bookId}/export`,
  
  // Authentication
  LOGIN: `${API_PREFIX}/auth/login`,
  REFRESH_TOKEN: `${API_PREFIX}/auth/refresh`,
  LOGOUT: `${API_PREFIX}/auth/logout`,
  
  // User
  PROFILE: `${API_PREFIX}/users/me`
} as const

/**
 * Default request timeout in milliseconds
 */
export const DEFAULT_TIMEOUT = 30000 // 30 seconds

/**
 * Default error message for API requests
 */
export const DEFAULT_ERROR_MESSAGE = 'An error occurred while processing your request'
