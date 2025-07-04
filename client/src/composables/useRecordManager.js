import { ref, computed } from 'vue'
import { recordAPI, columnAPI } from '../services/api.js'
import { useNotifications } from './useNotifications.js'
import { useValidation } from './useValidation.js'

export function useRecordManager(tableManager) {
  const { showNotification } = useNotifications()
  const { validateFormData } = useValidation()
  
  const editingRecord = ref(null)
  const formData = ref({})

  const newColumn = ref({
    key: '',
    label: '',
    type: 'text',
    required: false,
    defaultValue: ''
  })

  const hasUnsavedChanges = computed(() => {
    if (!editingRecord.value) return false
    
    return tableManager.columns.value
      .filter(col => col.editable)
      .some(col => {
        const originalValue = editingRecord.value[col.key]?.toString() || ''
        const currentValue = formData.value[col.key]?.toString() || ''
        return originalValue !== currentValue
      })
  })

  const resetForm = () => {
    const newFormData = {}
    tableManager.columns.value.forEach(col => {
      if (col.editable) {
        if (col.type === 'number') {
          newFormData[col.key] = col.defaultValue || '0'
        } else {
          newFormData[col.key] = col.defaultValue || ''
        }
      }
    })
    formData.value = newFormData
    editingRecord.value = null
  }

  const clearAddForm = () => {
    const newFormData = {}
    tableManager.columns.value.forEach(col => {
      if (col.editable) {
        if (col.type === 'number') {
          newFormData[col.key] = col.defaultValue || '0'
        } else {
          newFormData[col.key] = col.defaultValue || ''
        }
      }
    })
    formData.value = newFormData
  }

  const createRecord = async () => {
    const validationErrors = validateFormData(formData.value, tableManager.columns.value)
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => showNotification(error, 'error'))
      return
    }

    tableManager.loading.value = true
    try {
      const recordData = {}
      tableManager.columns.value.forEach(col => {
        if (col.editable && formData.value[col.key] !== undefined) {
          recordData[col.key] = col.type === 'number' ? 
            parseInt(formData.value[col.key]) || 0 : 
            formData.value[col.key]
        }
      })
      
      if (tableManager.serverConnected.value) {
        // Server-side creation
        const newRecord = await recordAPI.createRecord(recordData, tableManager.currentTable.value)
        tableManager.records.value.push(newRecord)
        showNotification(`Record created successfully in table "${tableManager.currentTable.value}"!`, 'success')
      } else {
        // Local-only creation
        const newRecord = {
          id: Date.now() + Math.random(), // Generate temporary ID
          ...recordData
        }
        tableManager.records.value.push(newRecord)
        showNotification(`Record created locally in table "${tableManager.currentTable.value}" (server disconnected)!`, 'warning')
      }
      
      clearAddForm()
    } catch (error) {
      console.error('Error creating record:', error)
      if (error.response && error.response.status === 500 && error.response.data?.includes('validation failed')) {
        showNotification(`Server validation error: ${error.response.data}`, 'error')
      } else {
        showNotification('Error creating record. Please try again.', 'error')
      }
    } finally {
      tableManager.loading.value = false
    }
  }

  const updateRecord = async () => {
    if (!editingRecord.value) {
      showNotification('No record selected for editing', 'error')
      return false
    }
    
    const errors = validateFormData(formData.value, tableManager.columns.value)
    
    if (errors.length > 0) {
      errors.forEach(error => showNotification(error, 'error'))
      return false
    }

    tableManager.loading.value = true
    try {
      // Build recordData from all editable columns
      const recordData = {}
      tableManager.columns.value.forEach(col => {
        if (col.editable && formData.value[col.key] !== undefined) {
          recordData[col.key] = col.type === 'number' ? 
            parseInt(formData.value[col.key]) || 0 : 
            formData.value[col.key]
        }
      })
      
      console.log('Sending record update with data:', recordData)
      console.log('Record ID:', editingRecord.value.id)
      console.log('Table:', tableManager.currentTable.value)
      
      if (tableManager.serverConnected.value) {
        // Server-side update
        await recordAPI.updateRecord(editingRecord.value.id, recordData, tableManager.currentTable.value)
        showNotification('Record updated successfully!', 'success')
      } else {
        // Local-only update
        showNotification('Record updated locally (server disconnected)!', 'warning')
      }
      
      // Update local data in both cases
      const index = tableManager.records.value.findIndex(r => r.id === editingRecord.value.id)
      if (index !== -1) {
        tableManager.records.value[index] = {
          ...editingRecord.value,
          ...recordData
        }
      }
      
      resetForm()
      return true // Indicate success for modal closing
    } catch (error) {
      console.error('Error updating record:', error)
      // Check if the error is from server-side validation
      if (error.response && error.response.status === 500 && error.response.data?.includes('validation failed')) {
        showNotification(`Server validation error: ${error.response.data}`, 'error')
      } else {
        showNotification('Error updating record. Please try again.', 'error')
      }
      return false
    } finally {
      tableManager.loading.value = false
    }
  }

  const deleteRecord = async (id, showDeleteConfirm) => {
    const record = tableManager.records.value.find(r => r.id === id)
    const confirmMessage = tableManager.serverConnected.value 
      ? `Delete record "${record?.name || 'Unknown'}" from table "${tableManager.currentTable.value}"?`
      : `Delete record "${record?.name || 'Unknown'}" from table "${tableManager.currentTable.value}" (local data only)?`

    showDeleteConfirm(
      confirmMessage,
      async () => {
        tableManager.loading.value = true
        try {
          if (tableManager.serverConnected.value) {
            await recordAPI.deleteRecord(id, tableManager.currentTable.value)
            showNotification('Record deleted successfully!', 'success')
          } else {
            showNotification('Record deleted locally (server disconnected)!', 'warning')
          }
          
          // Remove from local data in both cases
          tableManager.records.value = tableManager.records.value.filter(record => record.id !== id)
        } catch (error) {
          console.error('Error deleting record:', error)
          showNotification('Error deleting record. Please try again.', 'error')
        } finally {
          tableManager.loading.value = false
        }
      }
    )
  }

  const editRecord = (record) => {
    editingRecord.value = record
    // Populate form with all editable column data
    const newFormData = {}
    tableManager.columns.value.forEach(col => {
      if (col.editable) {
        newFormData[col.key] = record[col.key]?.toString() || ''
      }
    })
    formData.value = newFormData
  }

  const addColumn = async () => {
    if (!newColumn.value.key || !newColumn.value.label) {
      showNotification('Please fill in column key and label', 'error')
      return false
    }

    if (tableManager.columns.value.some(col => col.key === newColumn.value.key)) {
      showNotification('Column key already exists', 'error')
      return false
    }

    if (!tableManager.serverConnected.value) {
      // Allow client-side only operation when server is disconnected
      const columnToAdd = {
        ...newColumn.value,
        editable: true
      }

      tableManager.columns.value.push(columnToAdd)
      
      // Add default value to all existing records in current table
      tableManager.records.value.forEach(record => {
        if (!(newColumn.value.key in record)) {
          const defaultValue = newColumn.value.type === 'number' ? 
            (newColumn.value.defaultValue || '0') : 
            (newColumn.value.defaultValue || '')
          record[newColumn.value.key] = defaultValue
        }
      })

      // Add to form data
      const defaultValue = newColumn.value.type === 'number' ? 
        (newColumn.value.defaultValue || '0') : 
        (newColumn.value.defaultValue || '')
      formData.value[newColumn.value.key] = defaultValue

      resetNewColumn()
      showNotification(`Column added to table "${tableManager.currentTable.value}" (client-side only)!`, 'warning')
      return true
    }

    // Server-side operation
    tableManager.loading.value = true
    try {
      const response = await columnAPI.addColumn(tableManager.currentTable.value, newColumn.value)
      // Use the actual column name returned by the server
      const actualColumnName = response.actualColumnName || newColumn.value.key
      // Fetch latest columns from server using shared function
      await tableManager.fetchAndSetColumns(tableManager.currentTable.value)
      // Add default value to all existing records in current table
      tableManager.records.value.forEach(record => {
        if (!(actualColumnName in record)) {
          const defaultValue = newColumn.value.type === 'number' ? 
            (newColumn.value.defaultValue || '0') : 
            (newColumn.value.defaultValue || '')
          record[actualColumnName] = defaultValue
        }
      })
      // Add to form data
      const defaultValue = newColumn.value.type === 'number' ? 
        (newColumn.value.defaultValue || '0') : 
        (newColumn.value.defaultValue || '')
      formData.value[actualColumnName] = defaultValue
      resetNewColumn()
      showNotification(`Column added to table "${tableManager.currentTable.value}" successfully!`, 'success')
      return true
    } catch (error) {
      console.error('Error adding column:', error)
      if (error.response && error.response.status === 409) {
        showNotification('Column already exists on server', 'error')
      } else {
        showNotification('Error adding column. Please try again.', 'error')
      }
      return false
    } finally {
      tableManager.loading.value = false
    }
  }

  const deleteColumn = async (columnKey, showDeleteConfirm) => {
    // For default 'users' table, only allow deletion of non-default columns
    if (tableManager.currentTable.value === 'users' && tableManager.defaultColumns.some(col => col.key === columnKey)) {
      showNotification('Cannot delete default columns from the users table', 'error')
      return
    }
    
    // For non-default tables, allow deletion of any column except 'id'
    if (tableManager.currentTable.value !== 'users' && columnKey === 'id') {
      showNotification('Cannot delete the ID column', 'error')
      return
    }
    
    showDeleteConfirm(
      `Delete column "${columnKey}" from table "${tableManager.currentTable.value}"? This will remove all data in this column.`,
      async () => {
        if (!tableManager.serverConnected.value) {
          // Client-side only operation
          tableManager.columns.value = tableManager.columns.value.filter(col => col.key !== columnKey)
          
          // Remove data from all records in current table
          tableManager.records.value.forEach(record => {
            delete record[columnKey]
          })

          // Remove from form data
          delete formData.value[columnKey]

          showNotification(`Column "${columnKey}" deleted from table "${tableManager.currentTable.value}" (client-side only)!`, 'warning')
          return
        }

        // Server-side operation
        tableManager.loading.value = true
        try {
          await columnAPI.removeColumn(tableManager.currentTable.value, columnKey)
          // Fetch latest columns from server using shared function
          await tableManager.fetchAndSetColumns(tableManager.currentTable.value)
          // Remove data from all records in current table
          tableManager.records.value.forEach(record => {
            delete record[columnKey]
          })
          // Remove from form data
          delete formData.value[columnKey]
          showNotification(`Column "${columnKey}" deleted from table "${tableManager.currentTable.value}"!`, 'success')
        } catch (error) {
          console.error('Error deleting column:', error)
          if (error.response && error.response.status === 404) {
            showNotification('Column not found on server', 'error')
          } else {
            showNotification('Error deleting column. Please try again.', 'error')
          }
        } finally {
          tableManager.loading.value = false
        }
      }
    )
  }

  const resetNewColumn = () => {
    newColumn.value = {
      key: '',
      label: '',
      type: 'text',
      required: false,
      defaultValue: ''
    }
  }

  return {
    editingRecord,
    formData,
    newColumn,
    hasUnsavedChanges,
    resetForm,
    clearAddForm,
    createRecord,
    updateRecord,
    deleteRecord,
    editRecord,
    addColumn,
    deleteColumn,
    resetNewColumn
  }
}
