import { ref } from 'vue'

// Email validation regex (matches server-side pattern)
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

export function useValidation() {
  const validationErrors = ref([])

  const validateEmail = (email) => {
    if (!email || email.trim() === '') return true // Empty is valid (unless required)
    return emailRegex.test(email.trim())
  }

  const validateFormData = (formData, tableColumns) => {
    const errors = []
    
    // Check for email fields and validate them
    tableColumns.forEach(col => {
      if (col.key.toLowerCase().includes('email') || col.type === 'email') {
        const emailValue = formData[col.key]
        if (emailValue && emailValue.trim() !== '') {
          if (!emailRegex.test(emailValue.trim())) {
            errors.push(`Please enter a valid email address for ${col.label}`)
          }
        }
      }
    })
    
    // Check required fields
    const requiredFields = tableColumns.filter(col => col.required && col.editable)
    const missingFields = requiredFields.filter(field => !formData[field.key] || formData[field.key].trim() === '')
    
    if (missingFields.length > 0) {
      errors.push(`Please fill in all required fields: ${missingFields.map(f => f.label).join(', ')}`)
    }
    
    return errors
  }

  return {
    validationErrors,
    emailRegex,
    validateEmail,
    validateFormData
  }
}
