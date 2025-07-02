import { ref } from 'vue'
import { useNotifications } from './useNotifications.js'

export function useCsvHandler() {
  const { showNotification } = useNotifications()
  
  const csvFile = ref(null)
  const csvPreview = ref([])
  const csvHeaders = ref([])
  const csvData = ref([])

  const parseCsvLine = (line) => {
    const result = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const nextChar = line[i + 1]
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"'
          i++ 
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    
    result.push(current.trim())
    return result
  }

  const parseCSV = (csvText) => {
    const lines = csvText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)

    if (lines.length === 0) {
      throw new Error('CSV file is empty')
    }

    const headers = parseCsvLine(lines[0])
    const data = []

    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i])
      if (values.length > 0 && values[0] !== '') { 
        const row = {}
        headers.forEach((header, index) => {
          row[header] = values[index] || ''
        })
        data.push(row)
      }
    }

    return { headers, data }
  }

  const handleCsvUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.csv')) {
      showNotification('Please select a CSV file', 'error')
      return
    }

    if (file.size > 5 * 1024 * 1024) { 
      showNotification('File size too large. Please select a file smaller than 5MB', 'error')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const csvText = e.target.result
        const { headers, data } = parseCSV(csvText)
        
        csvHeaders.value = headers
        csvData.value = data
        csvPreview.value = data.slice(0, 5)
        
        showNotification(`CSV loaded successfully: ${headers.length} columns, ${data.length} rows`, 'success')
      } catch (error) {
        console.error('CSV parsing error:', error)
        showNotification(`Error parsing CSV: ${error.message}`, 'error')
      }
    }
    
    reader.onerror = () => {
      showNotification('Error reading file', 'error')
    }
    
    reader.readAsText(file)
  }

  const triggerCsvUpload = () => {
    if (csvFile.value) {
      csvFile.value.click()
    }
  }

  const clearCsvData = () => {
    csvHeaders.value = []
    csvData.value = []
    csvPreview.value = []
    if (csvFile.value) {
      csvFile.value.value = ''
    }
  }

  const determineColumnType = (header, sampleValues = []) => {
    const headerLower = header.toLowerCase()
    
    if (headerLower.includes('email') || headerLower.includes('mail')) {
      return { type: 'email', required: true }
    }
    
    if (headerLower.includes('age') || headerLower.includes('number') || headerLower.includes('count')) {
      return { type: 'number', required: false }
    }
    
    if (headerLower.includes('phone') || headerLower.includes('tel') || headerLower.includes('mobile')) {
      return { type: 'tel', required: false }
    }
    
    if (headerLower.includes('url') || headerLower.includes('website') || headerLower.includes('link')) {
      return { type: 'url', required: false }
    }
    
    if (headerLower.includes('date') || headerLower.includes('birth') || headerLower.includes('created')) {
      return { type: 'date', required: false }
    }
    
    if (headerLower.includes('name') || headerLower.includes('title') || headerLower.includes('first') || headerLower.includes('last')) {
      return { type: 'text', required: true }
    }
    
    if (sampleValues.length > 0) {
      const nonEmptyValues = sampleValues.filter(v => v && v.trim() !== '')
      if (nonEmptyValues.length > 0) {
        const allNumbers = nonEmptyValues.every(v => !isNaN(parseFloat(v)) && isFinite(v))
        if (allNumbers) {
          return { type: 'number', required: false }
        }
        
        // Check if values look like URLs
        const urlPattern = /^https?:\/\//
        const allUrls = nonEmptyValues.every(v => urlPattern.test(v))
        if (allUrls) {
          return { type: 'url', required: false }
        }
        
        // Check if values look like phone numbers
        const phonePattern = /^[\d\s\-\+\(\)]+$/
        const allPhones = nonEmptyValues.every(v => phonePattern.test(v) && v.length >= 10)
        if (allPhones) {
          return { type: 'tel', required: false }
        }
      }
    }
    
    return { type: 'text', required: false }
  }

  return {
    csvFile,
    csvPreview,
    csvHeaders,
    csvData,
    handleCsvUpload,
    triggerCsvUpload,
    clearCsvData,
    determineColumnType,
    parseCSV
  }
}
