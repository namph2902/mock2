import { ref, computed } from 'vue'
import { userAPI } from '../services/api.js'
import { useNotifications } from './useNotifications.js'
import { useValidation } from './useValidation.js'

export function useUserManager(tableManager) {
  const { showNotification } = useNotifications()
  const { validateFormData } = useValidation()
  
  const editingUser = ref(null)
  const formData = ref({})

  const newColumn = ref({
    key: '',
    label: '',
    type: 'text',
    required: false,
    defaultValue: ''
  })

  const hasUnsavedChanges = computed(() => {
    if (!editingUser.value) return false
    
    return tableManager.columns.value
      .filter(col => col.editable)
      .some(col => {
        const originalValue = editingUser.value[col.key]?.toString() || ''
        const currentValue = formData.value[col.key]?.toString() || ''
        return originalValue !== currentValue
      })
  })

  const resetForm = () => {
    const newFormData = {}
    tableManager.columns.value.forEach(col => {
      if (col.editable) {
        newFormData[col.key] = col.defaultValue || ''
      }
    })
    formData.value = newFormData
    editingUser.value = null
  }

  const clearAddForm = () => {
    const newFormData = {}
    tableManager.columns.value.forEach(col => {
      if (col.editable) {
        newFormData[col.key] = col.defaultValue || ''
      }
    })
    formData.value = newFormData
  }

  const createUser = async () => {
    const validationErrors = validateFormData(formData.value, tableManager.columns.value)
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => showNotification(error, 'error'))
      return
    }

    if (!tableManager.serverConnected.value) {
      showNotification('Cannot create user: Server not available', 'error')
      return
    }
    
    tableManager.loading.value = true
    try {
      const userData = {}
      tableManager.columns.value.forEach(col => {
        if (col.editable && formData.value[col.key] !== undefined) {
          userData[col.key] = col.type === 'number' ? 
            parseInt(formData.value[col.key]) || 0 : 
            formData.value[col.key]
        }
      })
      
      const newUser = await userAPI.createUser(userData, tableManager.currentTable.value)
      tableManager.users.value.push(newUser)
      
      clearAddForm()
      showNotification(`User created successfully in table "${tableManager.currentTable.value}"!`, 'success')
    } catch (error) {
      console.error('Error creating user:', error)
      if (error.response && error.response.status === 500 && error.response.data?.includes('validation failed')) {
        showNotification(`Server validation error: ${error.response.data}`, 'error')
      } else {
        showNotification('Error creating user. Please try again.', 'error')
      }
    } finally {
      tableManager.loading.value = false
    }
  }

  const updateUser = async () => {
    if (!editingUser.value) {
      showNotification('No user selected for editing', 'error')
      return false
    }
    
    const errors = validateFormData(formData.value, tableManager.columns.value)
    
    if (errors.length > 0) {
      errors.forEach(error => showNotification(error, 'error'))
      return false
    }

    if (!tableManager.serverConnected.value) {
      showNotification('Cannot update user: Server not available', 'error')
      return false
    }

    tableManager.loading.value = true
    try {
      // Build userData from all editable columns
      const userData = {}
      tableManager.columns.value.forEach(col => {
        if (col.editable && formData.value[col.key] !== undefined) {
          userData[col.key] = col.type === 'number' ? 
            parseInt(formData.value[col.key]) || 0 : 
            formData.value[col.key]
        }
      })
      
      console.log('Sending user update with data:', userData)
      console.log('User ID:', editingUser.value.id)
      console.log('Table:', tableManager.currentTable.value)
      
      await userAPI.updateUser(editingUser.value.id, userData, tableManager.currentTable.value)
      
      // Update local data
      const index = tableManager.users.value.findIndex(u => u.id === editingUser.value.id)
      if (index !== -1) {
        tableManager.users.value[index] = {
          ...editingUser.value,
          ...userData
        }
      }
      
      resetForm()
      showNotification('User updated successfully!', 'success')
      return true // Indicate success for modal closing
    } catch (error) {
      console.error('Error updating user:', error)
      // Check if the error is from server-side validation
      if (error.response && error.response.status === 500 && error.response.data?.includes('validation failed')) {
        showNotification(`Server validation error: ${error.response.data}`, 'error')
      } else {
        showNotification('Error updating user. Please try again.', 'error')
      }
      return false
    } finally {
      tableManager.loading.value = false
    }
  }

  const deleteUser = async (id, showDeleteConfirm) => {
    if (!tableManager.serverConnected.value) {
      showNotification('Cannot delete user: Server not available', 'error')
      return
    }

    const user = tableManager.users.value.find(u => u.id === id)
    showDeleteConfirm(
      `Delete user "${user?.name || 'Unknown'}" from table "${tableManager.currentTable.value}"?`,
      async () => {
        tableManager.loading.value = true
        try {
          await userAPI.deleteUser(id, tableManager.currentTable.value)
          tableManager.users.value = tableManager.users.value.filter(user => user.id !== id)
          showNotification('User deleted successfully!', 'success')
        } catch (error) {
          console.error('Error deleting user:', error)
          showNotification('Error deleting user. Please try again.', 'error')
        } finally {
          tableManager.loading.value = false
        }
      }
    )
  }

  const editUser = (user) => {
    editingUser.value = user
    // Populate form with all editable column data
    const newFormData = {}
    tableManager.columns.value.forEach(col => {
      if (col.editable) {
        newFormData[col.key] = user[col.key]?.toString() || ''
      }
    })
    formData.value = newFormData
  }

  const addColumn = () => {
    if (!newColumn.value.key || !newColumn.value.label) {
      showNotification('Please fill in column key and label', 'error')
      return
    }

    if (tableManager.columns.value.some(col => col.key === newColumn.value.key)) {
      showNotification('Column key already exists', 'error')
      return
    }

    const columnToAdd = {
      ...newColumn.value,
      editable: true
    }

    tableManager.columns.value.push(columnToAdd)
    
    // Add default value to all existing users in current table
    tableManager.users.value.forEach(user => {
      if (!(newColumn.value.key in user)) {
        user[newColumn.value.key] = newColumn.value.defaultValue || ''
      }
    })

    // Add to form data
    formData.value[newColumn.value.key] = newColumn.value.defaultValue || ''

    resetNewColumn()
    showNotification(`Column added to table "${tableManager.currentTable.value}" successfully!`, 'success')
    
    return true // Success
  }

  const deleteColumn = (columnKey, showDeleteConfirm) => {
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
      () => {
        // Remove column from current table
        tableManager.columns.value = tableManager.columns.value.filter(col => col.key !== columnKey)
        
        // Remove data from all users in current table
        tableManager.users.value.forEach(user => {
          delete user[columnKey]
        })

        // Remove from form data
        delete formData.value[columnKey]

        showNotification(`Column "${columnKey}" deleted from table "${tableManager.currentTable.value}"!`, 'success')
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
    editingUser,
    formData,
    newColumn,
    hasUnsavedChanges,
    resetForm,
    clearAddForm,
    createUser,
    updateUser,
    deleteUser,
    editUser,
    addColumn,
    deleteColumn,
    resetNewColumn
  }
}
