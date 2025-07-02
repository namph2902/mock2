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

  const validateCsvRow = (row, headers, rowIndex) => {
    const errors = []
    
    headers.forEach((header, headerIndex) => {
      const value = row[headerIndex] || ''
      
      // Validate email fields during import
      if ((header.toLowerCase().includes('email') || header.toLowerCase().includes('mail')) && value.trim()) {
        if (!emailRegex.test(value.trim())) {
          errors.push(`Row ${rowIndex + 2}: Invalid email format "${value}" in column "${header}"`)
        }
      }
      
      // Add more validation rules as needed
      if (header.toLowerCase().includes('age') && value.trim()) {
        const age = parseInt(value.trim())
        if (isNaN(age) || age < 0 || age > 150) {
          errors.push(`Row ${rowIndex + 2}: Invalid age "${value}" in column "${header}"`)
        }
      }
    })
    
    return errors
  }

  return {
    validationErrors,
    emailRegex,
    validateEmail,
    validateFormData,
    validateCsvRow
  }
}
