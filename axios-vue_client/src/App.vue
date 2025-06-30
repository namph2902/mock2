<script setup>
import { ref, onMounted } from 'vue'
import { userAPI, checkServerHealth } from './services/api.js'

// UI State
const notifications = ref([])
const showColumnModal = ref(false)
const showCsvModal = ref(false)
const showTableModal = ref(false)
const showDeleteConfirmModal = ref(false)
const deleteConfirmAction = ref(null)
const deleteConfirmMessage = ref('')

// Reactive data
const users = ref([])
const loading = ref(false)
const serverConnected = ref(false)
const formData = ref({
  name: '',
  email: '',
  age: ''
})
const editingUser = ref(null)

// table management
const currentTable = ref('users')
const newTableName = ref('')

// Dynamic columns functionality
const defaultColumns = [
  { key: 'id', label: 'ID', type: 'number', required: true, editable: false },
  { key: 'name', label: 'Name', type: 'text', required: true, editable: true },
  { key: 'email', label: 'Email', type: 'email', required: true, editable: true },
  { key: 'age', label: 'Age', type: 'number', required: true, editable: true }
]

const columns = ref([...defaultColumns])
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

// Notification system
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

const deleteAllUsers = () => {
  showDeleteConfirm(
    () => {
      users.value = []
      showNotification('All users deleted successfully!', 'success')
    },
    'Are you sure you want to delete all users? This action cannot be undone.'
  )
}

const deleteColumn = (columnKey) => {
  if (defaultColumns.some(col => col.key === columnKey)) {
    showNotification('Cannot delete default columns', 'error')
    return
  }
  showDeleteConfirm(
    'Are you sure you want to delete this column? This will remove all data in this column.',
    () => {
      columns.value = columns.value.filter(col => col.key !== columnKey)
      users.value.forEach(user => {delete user[columnKey] }) 
    }
  )
}

const createNewTable = () => {
  if (!newTableName.value.trim()) {
    showNotification('Table name cannot be empty', 'error')
    return
  }

  showDeleteConfirm(
    () => {
      console.log(`Creating new table: ${newTableName.value}`)
      showNotification(`Table "${newTableName.value}" created successfully!`, 'success')
      newTableName.value = ''
    },
    `Are you sure you want to create a new table named "${newTableName.value}"?`
  )
}
// Check server connection and fetch users
const fetchUsers = async () => {
  loading.value = true
  try {
    serverConnected.value = await checkServerHealth()
    
    if (serverConnected.value) {
      const userData = await userAPI.getAllUsers()
      users.value = userData || []
    } else {
      console.warn('Server not available, no data to display')
      users.value = []
    }
  } catch (error) {
    console.error('Error fetching users:', error)
    users.value = []
  } finally {
    loading.value = false
  }
}

const createUser = async () => {
  // Dynamic validation for required fields
  const requiredFields = columns.value.filter(col => col.required && col.editable)
  const missingFields = requiredFields.filter(field => !formData.value[field.key])
  
  if (missingFields.length > 0) {
    showNotification(`Please fill in all required fields: ${missingFields.map(f => f.label).join(', ')}`, 'error')
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
    columns.value.forEach(col => {
      if (col.editable && formData.value[col.key] !== undefined) {
        userData[col.key] = col.type === 'number' ? 
          parseInt(formData.value[col.key]) || 0 : 
          formData.value[col.key]
      }
    })
    
    const newUser = await userAPI.createUser(userData)
    users.value.push(newUser)
    
    resetForm()
    showNotification('User created successfully!', 'success')
  } catch (error) {
    console.error('Error creating user:', error)
    showNotification('Error creating user. Please try again.', 'error')
  } finally {
    loading.value = false
  }
}

const updateUser = async () => {
  if (!serverConnected.value) {
    showNotification('Cannot update user: Server not available', 'error')
    return
  }

  loading.value = true
  try {
    // Build userData from all editable columns
    const userData = {}
    columns.value.forEach(col => {
      if (col.editable && formData.value[col.key] !== undefined) {
        userData[col.key] = col.type === 'number' ? 
          parseInt(formData.value[col.key]) || 0 : 
          formData.value[col.key]
      }
    })
    
    await userAPI.updateUser(editingUser.value.id, userData)
    
    // Update local data
    const index = users.value.findIndex(u => u.id === editingUser.value.id)
    if (index !== -1) {
      users.value[index] = {
        ...editingUser.value,
        ...userData
      }
    }
    
    resetForm()
    showNotification('User updated successfully!', 'success')
  } catch (error) {
    console.error('Error updating user:', error)
    showNotification('Error updating user. Please try again.', 'error')
  } finally {
    loading.value = false
  }
}

const deleteUser = async (id) => {
  if (!serverConnected.value) {
    showNotification('Cannot delete user: Server not available', 'error')
    return
  }

  if (!confirm('Are you sure you want to delete this user?')) return
  
  loading.value = true
  try {
    await userAPI.deleteUser(id)
    users.value = users.value.filter(user => user.id !== id)
    showNotification('User deleted successfully!', 'success')
  } catch (error) {
    console.error('Error deleting user:', error)
    showNotification('Error deleting user. Please try again.', 'error')
  } finally {
    loading.value = false
  }
}

const editUser = (user) => {
  editingUser.value = user
  // Populate form with all editable column data
  const newFormData = {}
  columns.value.forEach(col => {
    if (col.editable) {
      newFormData[col.key] = user[col.key]?.toString() || ''
    }
  })
  formData.value = newFormData
}

const resetForm = () => {
  // Reset form to include all editable columns
  const newFormData = {}
  columns.value.forEach(col => {
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

  if (columns.value.some(col => col.key === newColumn.value.key)) {
    showNotification('Column key already exists', 'error')
    return
  }

  const columnToAdd = {
    ...newColumn.value,
    editable: true
  }

  columns.value.push(columnToAdd)
  
  // Add default value to all existing users
  users.value.forEach(user => {
    if (!(newColumn.value.key in user)) {
      user[newColumn.value.key] = newColumn.value.defaultValue || ''
    }
  })

  // Add to form data
  formData.value[newColumn.value.key] = newColumn.value.defaultValue || ''

  resetNewColumn()
  showColumnModal.value = false
  showNotification('Column added successfully!', 'success')
}

const removeColumn = (columnKey) => {
  if (defaultColumns.some(col => col.key === columnKey)) {
    showNotification('Cannot remove default columns', 'error')
    return
  }

  if (!confirm('Are you sure you want to remove this column? This will delete all data in this column.')) {
    return
  }

  columns.value = columns.value.filter(col => col.key !== columnKey)
  
  // Remove from all users
  users.value.forEach(user => {
    delete user[columnKey]
  })

  // Remove from form data
  delete formData.value[columnKey]

  showNotification('Column removed successfully!', 'success')
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
  // Add new columns from CSV headers
  csvHeaders.value.forEach(header => {
    const sanitizedKey = header.toLowerCase().replace(/[^a-z0-9]/g, '_')
    if (!columns.value.some(col => col.key === sanitizedKey)) {
      columns.value.push({
        key: sanitizedKey,
        label: header,
        type: 'text',
        required: false,
        editable: true
      })
      formData.value[sanitizedKey] = ''
    }
  })

  // Parse and import users
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

    users.value.push(...newUsers)
    showCsvModal.value = false
    csvFile.value = null
    csvPreview.value = []
    csvHeaders.value = []
    showNotification(`Imported ${newUsers.length} users from CSV`, 'success')
  }
  reader.readAsText(file)
}

onMounted(() => {
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
          <div class="connection-status" :class="serverConnected ? 'connected' : 'disconnected'">
            {{ serverConnected ? 'Server Connected' : 'Demo Mode' }}
          </div>
        </div>
      </div>
    </nav>

    <!-- User Management Section -->
    <section class="user-management">
      <div class="container">
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold mb-4">User Management</h1>
          <p class="text-secondary">
            Add, edit, and manage users with dynamic columns and CSV import.
          </p>
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

        <!-- Column Management -->
        <div class="mb-6 flex gap-md flex-wrap">
          <button 
            @click="showColumnModal = true"
            class="btn btn-secondary"
            :disabled="!serverConnected"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Column
          </button>
          
          <label class="btn btn-outline cursor-pointer" :class="{ 'btn-disabled': !serverConnected }">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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

          <div class="stats-info">
            <span class="stat-badge">{{ users.length }} Users</span>
            <span class="stat-badge">{{ columns.length }} Columns</span>
            <span class="stat-badge">{{ columns.length - defaultColumns.length }} Custom</span>
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
              <input 
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
            <h3 class="text-lg font-semibold">All Users</h3>
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
                    <p class="text-muted">No users found. Add your first user above!</p>
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

    <!-- Add Column Modal -->
    <div v-if="showColumnModal" class="modal-overlay" @click="showColumnModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="text-lg font-semibold">Add New Column</h3>
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
          <h3 class="text-lg font-semibold">Import from CSV</h3>
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
              Import Data
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
.app {
  min-height: 100vh;
  background: var(--background);
}

.navbar {
  background: var(--surface);
  border-bottom: 1px solid var(--border-light);
  padding: var(--space-md) 0;
}

.navbar-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.navbar-brand {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--primary-600);
}

.user-management {
  padding: var(--space-3xl) 0;
}

.stats-info {
  display: flex;
  gap: var(--space-sm);
  align-items: center;
}

.stat-badge {
  background: var(--primary-50);
  color: var(--primary-700);
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: 500;
}

.card-header {
  padding: var(--space-lg);
  border-bottom: 1px solid var(--border-light);
}

.toast {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  box-shadow: var(--shadow-sm);
  min-width: 300px;
}

.toast-success {
  border-color: var(--success);
  background: var(--secondary-100);
}

.toast-error {
  border-color: var(--error);
  background: #fef2f2;
}

/* Existing responsive and utility classes remain the same */
.max-w-2xl { max-width: 42rem; }
.mx-auto { margin-left: auto; margin-right: auto; }
.mb-4 { margin-bottom: var(--space-md); }
.mb-6 { margin-bottom: var(--space-lg); }
.mb-8 { margin-bottom: var(--space-xl); }
.mt-2 { margin-top: var(--space-sm); }
.py-8 { padding-top: var(--space-xl); padding-bottom: var(--space-xl); }
.overflow-x-auto { overflow-x: auto; }
.col-span-full { grid-column: 1 / -1; }
.text-red-600 { color: #dc2626; }
.hover\:text-red-700:hover { color: #b91c1c; }
.text-primary-600 { color: var(--primary-600); }
.hover\:text-primary-700:hover { color: var(--primary-700); }
.fixed { position: fixed; }
.top-4 { top: 1rem; }
.right-4 { right: 1rem; }
.z-50 { z-index: 50; }
.space-y-2 > * + * { margin-top: 0.5rem; }
.cursor-pointer { cursor: pointer; }
.inline-flex { display: inline-flex; }
.items-center { align-items: center; }
.px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
.py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
.rounded-full { border-radius: 9999px; }
.text-xs { font-size: 0.75rem; }
.bg-yellow-100 { background-color: #fef3c7; }
.text-yellow-800 { color: #92400e; }
.ml-2 { margin-left: 0.5rem; }
.text-gray-400 { color: #9ca3af; }
.hover\:text-gray-600:hover { color: #4b5563; }

@media (min-width: 768px) {
  .md\:grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  background: white;
  border-radius: 8px;
  padding: 24px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-large { max-width: 800px; }

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: #6b7280;
}

.modal-close:hover { color: #374151; }

.space-y-4 > * + * { margin-top: 1rem; }
.flex-wrap { flex-wrap: wrap; }
.bg-blue-50 { background-color: #eff6ff; }
.bg-blue-100 { background-color: #dbeafe; }
.text-blue-800 { color: #1e40af; }
.hidden { display: none; }
.justify-end { justify-content: flex-end; }

.btn-disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.bg-yellow-50 {
  background-color: #fffbeb;
}

.border-yellow-200 {
  border-color: #fde68a;
}

.text-yellow-800 {
  color: #92400e;
}

.text-yellow-400 {
  color: #fbbf24;
}

.w-5 {
  width: 1.25rem;
}

.h-5 {
  height: 1.25rem;
}

.w-16 {
  width: 4rem;
}

.h-16 {
  height: 4rem;
}

.text-gray-300 {
  color: #d1d5db;
}

.text-gray-500 {
  color: #6b7280;
}

.text-gray-600 {
  color: #4b5563;
}
</style>
