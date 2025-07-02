import { ref } from 'vue'
import { useNotifications } from './useNotifications.js'

export function useErrorHandler() {
  const { showNotification } = useNotifications()
  const errors = ref([])
  
  const handleError = (error, context = '') => {
    console.error(`Error in ${context}:`, error)
    
    let message = 'An unexpected error occurred'
    
    if (error.response) {
      // API errors
      const status = error.response.status
      if (status === 404) {
        message = 'Resource not found'
      } else if (status === 400) {
        message = error.response.data?.message || 'Invalid request'
      } else if (status === 500) {
        message = 'Server error occurred'
      } else if (status >= 500) {
        message = 'Server is unavailable'
      } else {
        message = error.response.data?.message || `HTTP Error ${status}`
      }
    } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
      message = 'Network connection failed'
    } else if (error.message) {
      message = error.message
    }
    
    const errorObj = {
      id: Date.now() + Math.random(),
      message,
      context,
      timestamp: new Date(),
      originalError: error
    }
    
    errors.value.push(errorObj)
    
    // Keep only last 10 errors
    if (errors.value.length > 10) {
      errors.value = errors.value.slice(-10)
    }
    
    showNotification(message, 'error')
    
    return errorObj
  }
  
  const clearErrors = () => {
    errors.value = []
  }
  
  const clearError = (id) => {
    errors.value = errors.value.filter(error => error.id !== id)
  }
  
  // Wrapper for async operations with error handling
  const withErrorHandling = async (operation, context = '') => {
    try {
      return await operation()
    } catch (error) {
      handleError(error, context)
      throw error
    }
  }
  
  return {
    errors,
    handleError,
    clearErrors,
    clearError,
    withErrorHandling
  }
}
