import { Notify } from 'quasar'

interface ErrorWithResponse extends Error {
  response?: {
    data?: {
      message?: string
      error?: string
    }
    status?: number
  }
}

/**
 * Handles errors consistently across the application
 * @param error The error to handle
 * @param defaultMessage Default message if error doesn't have one
 */
export function handleError(error: unknown, defaultMessage = 'An error occurred'): void {
  const err = error as ErrorWithResponse
  let message = defaultMessage
  
  if (err.response?.data?.message) {
    message = err.response.data.message
  } else if (err.response?.data?.error) {
    message = err.response.data.error
  } else if (err.message) {
    message = err.message
  }
  
  console.error('Error:', error)
  
  // Show error notification
  Notify.create({
    type: 'negative',
    message,
    position: 'top',
    timeout: 5000,
    actions: [{ icon: 'close', color: 'white' }]
  })
}

/**
 * Creates a function that handles errors for async operations
 * @param defaultMessage Default error message
 * @returns A function that can be used as an error handler
 */
export function createErrorHandler(defaultMessage: string) {
  return (error: unknown) => {
    handleError(error, defaultMessage)
    throw error // Re-throw to allow for further error handling
  }
}
