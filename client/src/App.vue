<script setup>
import { ref, onMounted, computed } from 'vue'
import { userAPI, tableAPI, checkServerHealth } from './services/api.js'

const notifications = ref([])
const showColumnModal = ref(false)
const showCsvModal = ref(false)
const showDeleteConfirmModal = ref(false)
const deleteConfirmAction = ref(null)
const deleteConfirmMessage = ref('')

const loading = ref(false)
const serverConnected = ref(false)
const editingUser = ref(null)

const availableTables = ref([])
const currentTable = ref('users')
const newTableName = ref('')

const defaultColumns = [
  { key: 'id', label: 'ID', type: 'number', required: true, editable: false },
  { key: 'name', label: 'Name', type: 'text', required: true, editable: true },
  { key: 'email', label: 'Email', type: 'email', required: true, editable: true },
  { key: 'age', label: 'Age', type: 'number', required: true, editable: true }
]

// Store data and columns separately for each table
const tableData = ref({
  users: []
})

const tableColumns = ref({
  users: [...defaultColumns]
})

// Computed properties for current table
const users = computed({
  get: () => tableData.value[currentTable.value] || [],
  set: (value) => {
    tableData.value[currentTable.value] = value
  }
})

const columns = computed({
  get: () => tableColumns.value[currentTable.value] || [...defaultColumns],
  set: (value) => {
    tableColumns.value[currentTable.value] = value
  }
})

const formData = ref({})

const newColumn = ref({
  key: '',
  label: '',
  type: 'text',
  required: false,
  defaultValue: ''
})

// CSV handling
const csvFile = ref(null)
const csvPreview = ref([])
const csvHeaders = ref([])

// Email validation regex (matches server-side pattern)
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

// Computed property for email validation status
const emailValidationStatus = computed(() => {
  if (!formData.value.email || formData.value.email.trim() === '') {
    return 'empty'
  }
  return emailRegex.test(formData.value.email.trim()) ? 'valid' : 'invalid'
})

// Client-side validation function
const validateFormData = () => {
  const errors = []
  
  // Validate email field specifically
  if (formData.value.email && formData.value.email.trim() !== '') {
    if (!emailRegex.test(formData.value.email.trim())) {
      errors.push('Please enter a valid email address')
    }
  }
  
  // Check required fields
  const requiredFields = tableColumns.value[currentTable.value].filter(col => col.required && col.editable)
  const missingFields = requiredFields.filter(field => !formData.value[field.key] || formData.value[field.key].trim() === '')
  
  if (missingFields.length > 0) {
    errors.push(`Please fill in all required fields: ${missingFields.map(f => f.label).join(', ')}`)
  }
  
  return errors
}

const showNotification = (message, type = 'info') => {
  const id = Date.now()
  notifications.value.push({ id, message, type })
  setTimeout(() => {
    removeNotification(id)
  }, 5000)
}

const removeNotification = (id) => {
  notifications.value = notifications.value.filter(n => n.id !== id)
}

const showDeleteConfirm = (message, action) => {
  deleteConfirmMessage.value = message
  deleteConfirmAction.value = action
  showDeleteConfirmModal.value = true
}

const executeDeleteAction = () => {
  if (deleteConfirmAction.value) {
    deleteConfirmAction.value()
  }
  showDeleteConfirmModal.value = false
  deleteConfirmAction.value = null
  deleteConfirmMessage.value = ''
}

const cancelDeleteAction = () => {
  showDeleteConfirmModal.value = false
  deleteConfirmAction.value = null
  deleteConfirmMessage.value = ''
}

// Table Management Functions
const switchTable = (tableName) => {
  if (tableName === currentTable.value) return
  
  currentTable.value = tableName
  
  // Initialize table data if it doesn't exist
  if (!tableData.value[tableName]) {
    tableData.value[tableName] = []
  }
  if (!tableColumns.value[tableName]) {
    tableColumns.value[tableName] = [...defaultColumns]
  }
  
  resetForm()
  showNotification(`Switched to table "${tableName}"`, 'success')
}

const createNewTable = async () => {
  if (!newTableName.value.trim()) {
    showNotification('Please enter a table name', 'error')
    return
  }

  const tableName = newTableName.value.trim()
  
  if (availableTables.value.includes(tableName)) {
    showNotification('Table name already exists', 'error')
    return
  }

  if (!serverConnected.value) {
    showNotification('Cannot create table: Server not available', 'error')
    return
  }

  showDeleteConfirm(
    `Create new table "${tableName}"? This will add a new empty table to the database.`,
    async () => {
      loading.value = true
      try {
        // Create table on server
        await tableAPI.createTable(tableName)
        
        // Update local state
        availableTables.value.push(tableName)
        tableData.value[tableName] = []
        tableColumns.value[tableName] = [...defaultColumns]
        
        // Switch to new table
        currentTable.value = tableName
        resetForm()
        
        newTableName.value = ''
        showNotification(`Table "${tableName}" created successfully!`, 'success')
      } catch (error) {
        console.error('Error creating table:', error)
        if (error.response && error.response.status === 409) {
          showNotification('Table already exists on server', 'error')
        } else {
          showNotification('Error creating table. Please try again.', 'error')
        }
      } finally {
        loading.value = false
      }
    }
  )
}

const dropTable = (tableName) => {
  if (tableName === 'users') {
    showNotification('Cannot drop the default "users" table', 'error')
    return
  }

  showDeleteConfirm(
    `Drop table "${tableName}"? This will permanently delete all data in this table and cannot be undone.`,
    () => {
      // Remove table from available tables
      availableTables.value = availableTables.value.filter(t => t !== tableName)
      
      // Delete table data
      delete tableData.value[tableName]
      delete tableColumns.value[tableName]
      
      // Switch to users table if current table was dropped
      if (currentTable.value === tableName) {
        currentTable.value = 'users'
        resetForm()
      }
      
      showNotification(`Table "${tableName}" dropped successfully!`, 'success')
    }
  )
}

const deleteAllUsers = () => {
  showDeleteConfirm(
    `Delete all users from table "${currentTable.value}"? This action cannot be undone.`,
    () => {
      tableData.value[currentTable.value] = []
      showNotification(`All users deleted from table "${currentTable.value}"!`, 'success')
    }
  )
}

const deleteColumn = (columnKey) => {
  if (defaultColumns.some(col => col.key === columnKey)) {
    showNotification('Cannot delete default columns', 'error')
    return
  }
  
  showDeleteConfirm(
    `Delete column "${columnKey}" from table "${currentTable.value}"? This will remove all data in this column.`,
    () => {
      // Remove column from current table
      tableColumns.value[currentTable.value] = tableColumns.value[currentTable.value].filter(col => col.key !== columnKey)
      
      // Remove data from all users in current table
      tableData.value[currentTable.value].forEach(user => {
        delete user[columnKey]
      })

      // Remove from form data
      delete formData.value[columnKey]

      showNotification(`Column "${columnKey}" deleted from table "${currentTable.value}"!`, 'success')
    }
  )
}

// Check server connection and fetch users
const fetchUsers = async () => {
  loading.value = true
  try {
    serverConnected.value = await checkServerHealth()
    
    if (serverConnected.value) {
      // Fetch available tables from server
      try {
        const tables = await tableAPI.getAllTables()
        availableTables.value = tables || ['users']
        
        // Ensure current table exists in available tables
        if (!availableTables.value.includes(currentTable.value)) {
          currentTable.value = availableTables.value[0] || 'users'
        }
      } catch (error) {
        console.error('Error fetching tables:', error)
        // Fallback to default tables if server doesn't support table listing
        availableTables.value = ['users']
      }
      
      // Fetch user data for current table
      const userData = await userAPI.getAllUsers()
      tableData.value[currentTable.value] = userData || []
    } else {
      console.warn('Server not available, no data to display')
      tableData.value[currentTable.value] = []
    }
  } catch (error) {
    console.error('Error fetching users:', error)
    tableData.value[currentTable.value] = []
  } finally {
    loading.value = false
  }
}

const createUser = async () => {
  // Client-side validation
  const validationErrors = validateFormData()
  if (validationErrors.length > 0) {
    validationErrors.forEach(error => showNotification(error, 'error'))
    return
  }

  if (!serverConnected.value) {
    showNotification('Cannot create user: Server not available', 'error')
    return
  }
  
  loading.value = true
  try {
    // Build userData from all editable columns
    const userData = {}
    tableColumns.value[currentTable.value].forEach(col => {
      if (col.editable && formData.value[col.key] !== undefined) {
        userData[col.key] = col.type === 'number' ? 
          parseInt(formData.value[col.key]) || 0 : 
          formData.value[col.key]
      }
    })
    
    const newUser = await userAPI.createUser(userData)
    tableData.value[currentTable.value].push(newUser)
    
    resetForm()
    showNotification(`User created successfully in table "${currentTable.value}"!`, 'success')
  } catch (error) {
    console.error('Error creating user:', error)
    // Check if the error is from server-side validation
    if (error.response && error.response.status === 500 && error.response.data?.includes('validation failed')) {
      showNotification(`Server validation error: ${error.response.data}`, 'error')
    } else {
      showNotification('Error creating user. Please try again.', 'error')
    }
  } finally {
    loading.value = false
  }
}

const updateUser = async () => {
  // Client-side validation
  const validationErrors = validateFormData()
  if (validationErrors.length > 0) {
    validationErrors.forEach(error => showNotification(error, 'error'))
    return
  }

  if (!serverConnected.value) {
    showNotification('Cannot update user: Server not available', 'error')
    return
  }

  loading.value = true
  try {
    // Build userData from all editable columns
    const userData = {}
    tableColumns.value[currentTable.value].forEach(col => {
      if (col.editable && formData.value[col.key] !== undefined) {
        userData[col.key] = col.type === 'number' ? 
          parseInt(formData.value[col.key]) || 0 : 
          formData.value[col.key]
      }
    })
    
    await userAPI.updateUser(editingUser.value.id, userData)
    
    // Update local data
    const index = tableData.value[currentTable.value].findIndex(u => u.id === editingUser.value.id)
    if (index !== -1) {
      tableData.value[currentTable.value][index] = {
        ...editingUser.value,
        ...userData
      }
    }
    
    resetForm()
    showNotification('User updated successfully!', 'success')
  } catch (error) {
    console.error('Error updating user:', error)
    // Check if the error is from server-side validation
    if (error.response && error.response.status === 500 && error.response.data?.includes('validation failed')) {
      showNotification(`Server validation error: ${error.response.data}`, 'error')
    } else {
      showNotification('Error updating user. Please try again.', 'error')
    }
  } finally {
    loading.value = false
  }
}

const deleteUser = async (id) => {
  if (!serverConnected.value) {
    showNotification('Cannot delete user: Server not available', 'error')
    return
  }

  const user = tableData.value[currentTable.value].find(u => u.id === id)
  showDeleteConfirm(
    `Delete user "${user?.name || 'Unknown'}" from table "${currentTable.value}"?`,
    async () => {
      loading.value = true
      try {
        await userAPI.deleteUser(id)
        tableData.value[currentTable.value] = tableData.value[currentTable.value].filter(user => user.id !== id)
        showNotification('User deleted successfully!', 'success')
      } catch (error) {
        console.error('Error deleting user:', error)
        showNotification('Error deleting user. Please try again.', 'error')
      } finally {
        loading.value = false
      }
    }
  )
}

const editUser = (user) => {
  editingUser.value = user
  // Populate form with all editable column data
  const newFormData = {}
  tableColumns.value[currentTable.value].forEach(col => {
    if (col.editable) {
      newFormData[col.key] = user[col.key]?.toString() || ''
    }
  })
  formData.value = newFormData
}

const resetForm = () => {
  // Reset form to include all editable columns for current table
  const newFormData = {}
  tableColumns.value[currentTable.value].forEach(col => {
    if (col.editable) {
      newFormData[col.key] = col.defaultValue || ''
    }
  })
  formData.value = newFormData
  editingUser.value = null
}

const handleSubmit = () => {
  if (editingUser.value) {
    updateUser()
  } else {
    createUser()
  }
}

const addColumn = () => {
  if (!newColumn.value.key || !newColumn.value.label) {
    showNotification('Please fill in column key and label', 'error')
    return
  }

  if (tableColumns.value[currentTable.value].some(col => col.key === newColumn.value.key)) {
    showNotification('Column key already exists', 'error')
    return
  }

  const columnToAdd = {
    ...newColumn.value,
    editable: true
  }

  tableColumns.value[currentTable.value].push(columnToAdd)
  
  // Add default value to all existing users in current table
  tableData.value[currentTable.value].forEach(user => {
    if (!(newColumn.value.key in user)) {
      user[newColumn.value.key] = newColumn.value.defaultValue || ''
    }
  })

  // Add to form data
  formData.value[newColumn.value.key] = newColumn.value.defaultValue || ''

  resetNewColumn()
  showColumnModal.value = false
  showNotification(`Column added to table "${currentTable.value}" successfully!`, 'success')
}

const removeColumn = (columnKey) => {
  deleteColumn(columnKey)
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

const handleCsvUpload = (event) => {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const csv = e.target.result
    const lines = csv.split('\n').map(line => line.trim()).filter(line => line)

    if (lines.length === 0) {
      showNotification('CSV file is empty', 'error')
      return
    }

    const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''))
    csvHeaders.value = headers

    const preview = lines.slice(1, 6).map(line => {
      const values = line.split(',').map(value => value.trim().replace(/"/g, ''))
      const row = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      return row
    })
    csvPreview.value = preview
    showCsvModal.value = true
  }
  reader.readAsText(file)
}

const importFromCsv = () => {
  // Add new columns from CSV headers to current table
  csvHeaders.value.forEach(header => {
    const sanitizedKey = header.toLowerCase().replace(/[^a-z0-9]/g, '_')
    if (!tableColumns.value[currentTable.value].some(col => col.key === sanitizedKey)) {
      tableColumns.value[currentTable.value].push({
        key: sanitizedKey,
        label: header,
        type: 'text',
        required: false,
        editable: true
      })
      formData.value[sanitizedKey] = ''
    }
  })

  // Parse and import users to current table
  const file = csvFile.value?.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const csv = e.target.result
    const lines = csv.split('\n').map(line => line.trim()).filter(line => line.trim())
    const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''))

    const newUsers = lines.slice(1).map((line, index) => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
      const user = { id: Date.now() + index }

      headers.forEach((header, headerIndex) => {
        const key = header.toLowerCase().replace(/[^a-z0-9]/g, '_')
        user[key] = values[headerIndex] || ''
      })
      return user
    })

    tableData.value[currentTable.value].push(...newUsers)
    showCsvModal.value = false
    csvFile.value = null
    csvPreview.value = []
    csvHeaders.value = []
    showNotification(`Imported ${newUsers.length} users to table "${currentTable.value}"`, 'success')
  }
  reader.readAsText(file)
}

onMounted(() => {
  // Initialize form data for current table
  resetForm()
  fetchUsers()
})
</script>

<template>
  <div class="app">
    <!-- Navigation -->
    <nav class="navbar">
      <div class="container">
        <div class="navbar-content">
          <div class="navbar-brand">Vue User Manager</div>
          <div class="navbar-info">
            <!-- Table Selector -->
            <div class="table-selector">
              <label class="form-label">Current Table:</label>
              <select 
                v-model="currentTable" 
                @change="switchTable(currentTable)"
                class="table-select"
              >
                <option v-for="table in availableTables" :key="table" :value="table">
                  {{ table }}
                </option>
              </select>
            </div>
            <div class="connection-status" :class="serverConnected ? 'connected' : 'disconnected'">
              {{ serverConnected ? 'Server Connected' : 'Demo Mode' }}
            </div>
          </div>
        </div>
      </div>
    </nav>

    <!-- User Management Section -->
    <section class="user-management">
      <div class="container">
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold mb-4">User Management - {{ currentTable }}</h1>
          <p class="text-secondary mb-4">
            Add, edit, and manage users with dynamic columns and CSV import.
          </p>
          
          <!-- Stats Info -->
          <div class="stats-info justify-center">
            <span class="stat-badge">{{ users.length }} Users</span>
            <span class="stat-badge">{{ columns.length }} Columns</span>
            <span class="stat-badge">{{ availableTables.length }} Tables</span>
          </div>
        </div>

        <!-- Show server connection warning -->
        <div v-if="!serverConnected" class="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div class="flex items-center">
            <svg class="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
            </svg>
            <span class="text-yellow-800 font-medium">Server not available - Data and operations are limited</span>
          </div>
        </div>

        <!-- Enhanced Management Buttons -->
        <div class="mb-6 flex gap-sm flex-wrap items-center">
          <button 
            @click="showColumnModal = true"
            class="btn btn-secondary btn-sm"
            :disabled="!serverConnected"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Column
          </button>
          
          <label class="btn btn-outline btn-sm cursor-pointer" :class="{ 'btn-disabled': !serverConnected }">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14,2 14,8 20,8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10,9 9,9 8,9"></polyline>
            </svg>
            Import CSV
            <input 
              type="file" 
              accept=".csv" 
              @change="handleCsvUpload"
              class="hidden"
              ref="csvFile"
              :disabled="!serverConnected"
            >
          </label>

          <!-- New Table Creation -->
          <div class="new-table-input">
            <input 
              v-model="newTableName"
              type="text" 
              class="form-input form-input-sm"
              placeholder="New table name"
            >
            <button 
              @click="createNewTable" 
              class="btn btn-primary btn-sm" 
              :disabled="!newTableName.trim()"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Create
            </button>
          </div>

          <!-- Danger Zone -->
          <div class="danger-zone">
            <button 
              @click="deleteAllUsers"
              class="btn btn-danger btn-sm"
              :disabled="!serverConnected || users.length === 0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3,6 5,6 21,6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
              Delete All
            </button>
          </div>
        </div>

        <!-- User Form -->
        <div class="user-form">
          <h3 class="text-xl font-semibold mb-6">
            {{ editingUser ? 'Edit User' : 'Add New User' }}
          </h3>
          
          <form @submit.prevent="handleSubmit" class="grid grid-cols-1 md:grid-cols-3 gap-lg">
            <div 
              v-for="column in columns.filter(col => col.editable)" 
              :key="column.key"
              class="form-group"
            >
              <label class="form-label">
                {{ column.label }}
                <span v-if="column.required" class="text-red-500">*</span>
              </label>
              
              <!-- Special handling for email field with validation -->
              <div v-if="column.key === 'email'" class="email-input-wrapper">
                <input 
                  v-model="formData[column.key]"
                  :type="column.type" 
                  :class="[
                    'form-input',
                    {
                      'error': emailValidationStatus === 'invalid',
                      'success': emailValidationStatus === 'valid'
                    }
                  ]"
                  :placeholder="`Enter ${column.label.toLowerCase()}`"
                  :required="column.required"
                  :disabled="!serverConnected"
                >
                <div v-if="emailValidationStatus === 'invalid'" class="form-error">
                  Please enter a valid email address (e.g., user@example.com)
                </div>
                <div v-if="emailValidationStatus === 'valid'" class="form-success">
                  ✓ Valid email format
                </div>
              </div>
              
              <!-- Regular input for non-email fields -->
              <input 
                v-else
                v-model="formData[column.key]"
                :type="column.type" 
                class="form-input" 
                :placeholder="`Enter ${column.label.toLowerCase()}`"
                :required="column.required"
                :disabled="!serverConnected"
              >
            </div>
            
            <div class="flex gap-md col-span-full">
              <button 
                type="submit" 
                class="btn btn-primary"
                :disabled="loading || !serverConnected"
              >
                <div v-if="loading" class="loading"></div>
                {{ editingUser ? 'Update User' : 'Add User' }}
              </button>
              
              <button 
                v-if="editingUser"
                type="button" 
                class="btn btn-secondary"
                @click="resetForm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        <!-- Users Table -->
        <div class="user-table">
          <div class="card-header">
            <h3 class="text-lg font-semibold">All Users in {{ currentTable }}</h3>
          </div>
          
          <div class="overflow-x-auto">
            <table class="table">
              <thead>
                <tr>
                  <th v-for="column in columns" :key="column.key">
                    <div class="flex items-center justify-between">
                      <span>{{ column.label }}</span>
                      <button 
                        v-if="!defaultColumns.some(col => col.key === column.key)"
                        @click="removeColumn(column.key)"
                        class="ml-2 text-red-500 hover:text-red-700"
                        title="Remove column"
                        :disabled="!serverConnected"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading && users.length === 0">
                  <td :colspan="columns.length + 1" class="text-center py-8">
                    <div class="loading mx-auto"></div>
                    <p class="text-muted mt-2">Loading users...</p>
                  </td>
                </tr>
                
                <tr v-else-if="!serverConnected">
                  <td :colspan="columns.length + 1" class="text-center py-8">
                    <div class="text-muted">
                      <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.5-.762-6.063-2.045l-.895.045L3.47 15.47c-.177.177-.47.177-.647 0L.354 12.993c-.178-.177-.178-.47 0-.647L2.823 9.877l.895.045A7.962 7.962 0 0112 7.5c2.34 0 4.5.762 6.063 2.045l.895-.045 2.469 2.469c.177.177.177.47 0 .647l-2.469 2.477c-.177.177-.47.177-.647 0l-.895-.045z"></path>
                      </svg>
                      <h3 class="text-lg font-medium text-gray-600 mb-2">Data Unavailable</h3>
                      <p class="text-gray-500">Unable to connect to server. Please check your connection and try again.</p>
                    </div>
                  </td>
                </tr>
                
                <tr v-else-if="users.length === 0">
                  <td :colspan="columns.length + 1" class="text-center py-8">
                    <p class="text-muted">No users found in {{ currentTable }}. Add your first user above!</p>
                  </td>
                </tr>
                
                <tr v-else v-for="user in users" :key="user.id">
                  <td v-for="column in columns" :key="column.key" class="font-medium">
                    {{ user[column.key] || '-' }}
                  </td>
                  <td>
                    <div class="flex gap-sm">
                      <button 
                        @click="editUser(user)"
                        class="btn btn-ghost text-primary-600 hover:text-primary-700"
                        :disabled="!serverConnected"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Edit
                      </button>
                      
                      <button 
                        @click="deleteUser(user.id)"
                        class="btn btn-ghost text-red-600 hover:text-red-700"
                        :disabled="!serverConnected"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="3,6 5,6 21,6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4a2 2 0 0 1 2 2v2"/>
                        </svg>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>

    <!-- Confirmation Modal -->
    <div v-if="showDeleteConfirmModal" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="text-lg font-semibold">Confirm Action</h3>
        </div>
        <div class="mb-4">{{ deleteConfirmMessage }}</div>
        <div class="flex gap-md justify-end">
          <button @click="cancelDeleteAction" class="btn btn-secondary">
            Cancel
          </button>
          <button @click="executeDeleteAction" class="btn btn-danger">
            Confirm
          </button>
        </div>
      </div>
    </div>

    <!-- Add Column Modal -->
    <div v-if="showColumnModal" class="modal-overlay" @click="showColumnModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="text-lg font-semibold">Add New Column to {{ currentTable }}</h3>
          <button @click="showColumnModal = false" class="modal-close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <form @submit.prevent="addColumn" class="space-y-4">
          <div class="form-group">
            <label class="form-label">Column Key (unique identifier)</label>
            <input 
              v-model="newColumn.key"
              type="text" 
              class="form-input"
              placeholder="e.g., phone_number"
              required
            >
          </div>
          
          <div class="form-group">
            <label class="form-label">Column Label (display name)</label>
            <input 
              v-model="newColumn.label"
              type="text" 
              class="form-input"
              placeholder="e.g., Phone Number"
              required
            >
          </div>
          
          <div class="form-group">
            <label class="form-label">Input Type</label>
            <select v-model="newColumn.type" class="form-input">
              <option value="text">Text</option>
              <option value="email">Email</option>
              <option value="number">Number</option>
              <option value="tel">Phone</option>
              <option value="url">URL</option>
              <option value="date">Date</option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label">Default Value (optional)</label>
            <input 
              v-model="newColumn.defaultValue"
              type="text" 
              class="form-input"
              placeholder="Default value for new users"
            >
          </div>
          
          <div class="flex items-center">
            <input 
              v-model="newColumn.required"
              type="checkbox" 
              class="mr-2"
            >
            <label>Required field</label>
          </div>
          
          <div class="flex gap-md justify-end">
            <button type="button" @click="showColumnModal = false" class="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary">
              Add Column
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- CSV Import Modal -->
    <div v-if="showCsvModal" class="modal-overlay" @click="showCsvModal = false">
      <div class="modal-content modal-large" @click.stop>
        <div class="modal-header">
          <h3 class="text-lg font-semibold">Import CSV to {{ currentTable }}</h3>
          <button @click="showCsvModal = false" class="modal-close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div class="space-y-4">
          <div class="bg-blue-50 p-4 rounded-lg">
            <h4 class="font-medium mb-2">Detected Columns:</h4>
            <div class="flex flex-wrap gap-2">
              <span 
                v-for="header in csvHeaders" 
                :key="header"
                class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {{ header }}
              </span>
            </div>
          </div>
          
          <div>
            <h4 class="font-medium mb-2">Preview (first 5 rows):</h4>
            <div class="overflow-x-auto">
              <table class="table">
                <thead>
                  <tr>
                    <th v-for="header in csvHeaders" :key="header">{{ header }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, index) in csvPreview" :key="index">
                    <td v-for="header in csvHeaders" :key="header">
                      {{ row[header] }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <div class="flex gap-md justify-end">
            <button @click="showCsvModal = false" class="btn btn-secondary">
              Cancel
            </button>
            <button @click="importFromCsv" class="btn btn-primary">
              Import to {{ currentTable }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Notifications -->
    <div class="fixed top-4 right-4 z-50 space-y-2">
      <div 
        v-for="notification in notifications" 
        :key="notification.id"
        :class="[
          'toast',
          `toast-${notification.type}`,
          'cursor-pointer'
        ]"
        @click="removeNotification(notification.id)"
      >
        <div class="flex items-center justify-between">
          <span>{{ notification.message }}</span>
          <button class="ml-2 text-gray-400 hover:text-gray-600">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>

.navbar-info {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
}

.table-selector {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.table-select {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  padding: var(--space-xs) var(--space-sm);
  font-size: var(--text-sm);
  color: var(--text-primary);
}

.table-select:focus {
  outline: none;
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px var(--primary-100);
}

.danger-zone {
  display: flex;
  gap: var(--space-sm);
}

.btn-danger {
  background: #ef4444;
  color: white;
  border-color: #ef4444;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
  border-color: #dc2626;
}

.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Small button variant */
.btn-sm {
  padding: var(--space-xs) var(--space-md);
  font-size: var(--text-xs);
  border-radius: var(--radius-sm);
}

/* Small form input */
.form-input-sm {
  padding: var(--space-xs) var(--space-sm);
  font-size: var(--text-xs);
  border-radius: var(--radius-sm);
}

/* New table input styling */
.new-table-input {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  padding: var(--space-xs);
}

.new-table-input input {
  border: none;
  background: transparent;
  min-width: 150px;
  font-size: var(--text-xs);
  padding: var(--space-xs);
}

.new-table-input input:focus {
  outline: none;
  box-shadow: none;
}

.new-table-input:focus-within {
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Stats Info */
.stats-info {
  display: flex;
  gap: var(--space-md);
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
}

.stat-badge {
  display: inline-flex;
  align-items: center;
  padding: var(--space-sm) var(--space-md);
  background: var(--primary-50);
  color: var(--primary-700);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: 500;
  border: 1px solid var(--primary-200);
}

/* Toast notifications */
.toast {
  background: white;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  padding: var(--space-md) var(--space-lg);
  box-shadow: var(--shadow-lg);
  min-width: 300px;
  animation: slideIn 0.3s ease-out;
}

.toast-success {
  border-left: 4px solid var(--success);
  background: #f0fdf4;
}

.toast-error {
  border-left: 4px solid var(--error);
  background: #fef2f2;
}

.toast-info {
  border-left: 4px solid var(--primary-500);
  background: #eff6ff;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.w-full { width: 100%; }
.border-t { border-top: 1px solid #e5e7eb; }
.pt-4 { padding-top: 1rem; }
.space-y-2 > * + * { margin-top: 0.5rem; }

/* Email validation specific styles */
.email-input-wrapper {
  position: relative;
}

.form-success {
  color: var(--success);
  font-size: var(--text-sm);
  margin-top: var(--space-xs);
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

/* Enhanced validation feedback */
.form-input.error {
  border-color: var(--error);
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.form-input.success {
  border-color: var(--success);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}
</style>
