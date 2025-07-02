import { ref } from 'vue'
import { useCsvHandler } from './useCsvHandler.js'
import { useNotifications } from './useNotifications.js'
import { useValidation } from './useValidation.js'
import { userAPI } from '../services/api.js'

export function useCsvImporter(tableManager) {
  const { showNotification } = useNotifications()
  const { validateCsvRow } = useValidation()
  const csvHandler = useCsvHandler()

  const importFromCsv = async (showDeleteConfirm) => {
    if (csvHandler.csvHeaders.value.length === 0 || csvHandler.csvData.value.length === 0) {
      showNotification('No CSV data to import', 'error')
      return
    }

    showDeleteConfirm(
      `Import ${csvHandler.csvData.value.length} rows into table "${tableManager.currentTable.value}"? 
      
This will:
• Add ${csvHandler.csvHeaders.value.length} columns: ${csvHandler.csvHeaders.value.join(', ')}
• Import ${csvHandler.csvData.value.length} new users
• Auto-detect column types and validation rules

Continue with import?`,
      async () => {
        await performCsvImport()
      }
    )
  }

  const performCsvImport = async () => {
    const validationErrors = []
    const validUsers = []
    const maxRows = 1000

    try {
      if (csvHandler.csvData.value.length > maxRows) {
        showNotification(`Large CSV detected (${csvHandler.csvData.value.length} rows). Only importing first ${maxRows} rows for performance.`, 'warning')
      }

      const rowsToProcess = csvHandler.csvData.value.slice(0, maxRows)
      // Add new columns from CSV headers to current table
      csvHandler.csvHeaders.value.forEach(header => {
        const sanitizedKey = header.toLowerCase().replace(/[^a-z0-9]/g, '_')
        if (!tableManager.columns.value.some(col => col.key === sanitizedKey)) {
          // Get sample values for type detection
          const sampleValues = rowsToProcess
            .slice(0, 10)
            .map(row => row[header])
            .filter(v => v && v.trim() !== '')

          const { type, required } = csvHandler.determineColumnType(header, sampleValues)
          
          tableManager.columns.value.push({
            key: sanitizedKey,
            label: header,
            type: type,
            required: required,
            editable: true
          })
        }
      })

      // Process CSV data with validation
      let tempIdCounter = Date.now()
      rowsToProcess.forEach((row, index) => {
        const user = { 
          id: tempIdCounter + index // Ensure unique temporary IDs
        }
        
        // Validate the row
        const rowValues = csvHandler.csvHeaders.value.map(header => row[header] || '')
        const rowErrors = validateCsvRow(rowValues, csvHandler.csvHeaders.value, index)
        
        if (rowErrors.length > 0) {
          validationErrors.push(...rowErrors)
        } else {
          // Convert row data to match table columns
          csvHandler.csvHeaders.value.forEach(header => {
            const key = header.toLowerCase().replace(/[^a-z0-9]/g, '_')
            let value = row[header] || ''
            
            // Convert values based on column type
            const column = tableManager.columns.value.find(col => col.key === key)
            if (column && column.type === 'number' && value.trim() !== '') {
              const numValue = parseFloat(value.trim())
              if (!isNaN(numValue)) {
                value = numValue
              }
            }
            
            user[key] = value
          })
          
          validUsers.push(user)
        }
      })

      // Add valid users to table
      if (validUsers.length > 0) {
        try {
          // Create users in database if server is connected
          if (tableManager.serverConnected.value) {
            const createdUsers = await userAPI.bulkCreateUsers(validUsers, tableManager.currentTable.value)
            // Add created users (with IDs from database) to frontend
            tableManager.users.value.push(...createdUsers)
          } else {
            // If offline, just add to frontend with temporary IDs
            tableManager.users.value.push(...validUsers)
          }
        } catch (error) {
          console.error('Error creating users in database:', error)
          showNotification('Some users may not have been saved to the database', 'warning')
          // Still add to frontend for offline functionality
          tableManager.users.value.push(...validUsers)
        }
      }

      // Clear CSV data
      csvHandler.clearCsvData()

      // Show results
      if (validationErrors.length > 0) {
        const maxErrorsToShow = 5
        const errorMessage = validationErrors.length <= maxErrorsToShow 
          ? validationErrors.join('\n')
          : validationErrors.slice(0, maxErrorsToShow).join('\n') + `\n... and ${validationErrors.length - maxErrorsToShow} more errors`
        
        console.warn('CSV validation errors:', validationErrors)
        showNotification(
          `Import completed with ${validationErrors.length} validation errors. ${validUsers.length} valid users imported.`, 
          'warning'
        )
      } else {
        showNotification(
          `Successfully imported ${validUsers.length} users to table "${tableManager.currentTable.value}"`, 
          'success'
        )
      }
      
      return true // Success
      
    } catch (error) {
      console.error('CSV import error:', error)
      showNotification(`Error during CSV import: ${error.message}`, 'error')
      return false
    }
  }

  const handleCsvUploadAndPreview = (event) => {
    csvHandler.handleCsvUpload(event)
  }

  return {
    ...csvHandler,
    importFromCsv,
    handleCsvUploadAndPreview
  }
}
