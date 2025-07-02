<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useNotifications } from './composables/useNotifications.js'
import { useModals } from './composables/useModals.js'
import { useValidation } from './composables/useValidation.js'
import { useTableManager } from './composables/useTableManager.js'
import { useUserManager } from './composables/useUserManager.js'
import { useCsvImporter } from './composables/useCsvImporter.js'

// Import components
import ConfirmModal from './components/ConfirmModal.vue'
import AddColumnModal from './components/AddColumnModal.vue'
import CsvImportModal from './components/CsvImportModal.vue'
import EditUserModal from './components/EditUserModal.vue'
import NotificationToast from './components/NotificationToast.vue'

// Setup composables
const { notifications, showNotification, removeNotification } = useNotifications()
const { 
  showColumnModal, 
  showCsvModal, 
  showDeleteConfirmModal, 
  showEditModal, 
  deleteConfirmAction,
  deleteConfirmMessage,
  showDeleteConfirm, 
  executeDeleteAction, 
  cancelDeleteAction, 
  closeEditModal 
} = useModals()

const { emailRegex } = useValidation()

const tableManager = useTableManager()
const userManager = useUserManager(tableManager)
const csvImporter = useCsvImporter(tableManager)

// Template ref for the CSV file input
const csvFile = ref(null)

// Computed property for email validation status
const emailValidationStatus = computed(() => {
  // Find any email field in the current table
  const emailColumn = tableManager.columns.value.find(col => 
    col.key.toLowerCase().includes('email') || col.type === 'email'
  )
  
  if (!emailColumn || !userManager.formData.value[emailColumn.key] || userManager.formData.value[emailColumn.key].trim() === '') {
    return 'empty'
  }
  return emailRegex.test(userManager.formData.value[emailColumn.key].trim()) ? 'valid' : 'invalid'
})

// Function to check if table scroll container is scrollable
const checkScrollable = () => {
  setTimeout(() => {
    const container = document.querySelector('.table-scroll-container')
    if (container) {
      const isScrollable = container.scrollWidth > container.clientWidth
      container.classList.toggle('scrollable', isScrollable)
      
      // Add initial scroll position classes
      const isAtStart = container.scrollLeft === 0
      const isAtEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 1
      
      container.classList.toggle('scroll-start', isAtStart)
      container.classList.toggle('scroll-end', isAtEnd)
    }
  }, 50)
}

// Handle keyboard shortcuts for modals
const handleKeydown = (event) => {
  if (event.key === 'Escape') {
    if (showEditModal.value) {
      handleCloseEditModal()
    } else if (showColumnModal.value) {
      showColumnModal.value = false
    } else if (showCsvModal.value) {
      showCsvModal.value = false
    } else if (showDeleteConfirmModal.value) {
      showDeleteConfirmModal.value = false
    }
  }
}

const handleSubmit = () => {
  if (userManager.editingUser.value) {
    handleUpdateUser()
  } else {
    userManager.createUser()
  }
}

const handleCloseEditModal = () => {
  const closed = closeEditModal(userManager.hasUnsavedChanges.value)
  if (closed) {
    userManager.resetForm()
  }
}

const handleUpdateUser = async () => {
  console.log('About to update user with formData:', userManager.formData.value)
  const success = await userManager.updateUser()
  if (success) {
    console.log('Update successful, closing modal')
    showEditModal.value = false
  } else {
    console.log('Update failed')
  }
}

const handleUpdateField = ({ field, value }) => {
  // Update the specific field in the userManager's formData
  console.log(`Updating field "${field}" with value:`, value)
  userManager.formData.value[field] = value
  console.log('Current formData after update:', userManager.formData.value)
}

const handleAddColumn = () => {
  const success = userManager.addColumn()
  if (success) {
    showColumnModal.value = false
    setTimeout(checkScrollable, 100)
  }
}

const handleEditUser = (user) => {
  userManager.editUser(user)
  showEditModal.value = true
}

const handleCsvImport = () => {
  csvImporter.importFromCsv(showDeleteConfirm)
  showCsvModal.value = false
}

const handleCsvUpload = (event) => {
  csvImporter.handleCsvUploadAndPreview(event)
  if (csvImporter.csvHeaders.value.length > 0) {
    showCsvModal.value = true
  }
}

onMounted(() => {
  // Initialize form data for current table
  userManager.clearAddForm()
  tableManager.fetchUsers()
  
  // Add keyboard event listener for modal shortcuts
  document.addEventListener('keydown', handleKeydown)
  
  // Add scroll event listener to check table scrollability
  setTimeout(() => {
    checkScrollable()
    
    // Watch for table content changes and recheck scrollability
    let scrollCheckTimeout = null
    const throttledCheckScrollable = () => {
      if (scrollCheckTimeout) clearTimeout(scrollCheckTimeout)
      scrollCheckTimeout = setTimeout(checkScrollable, 150)
    }
    
    const observer = new MutationObserver(throttledCheckScrollable)
    
    const tableContainer = document.querySelector('.table-scroll-container')
    if (tableContainer) {
      observer.observe(tableContainer, { 
        childList: true, 
        subtree: true,
        attributes: true 
      })
      
      // Also check on window resize
      window.addEventListener('resize', throttledCheckScrollable)
      
      // Check on scroll to show/hide scroll indicators
      let scrollTimeout = null
      tableContainer.addEventListener('scroll', () => {
        if (scrollTimeout) clearTimeout(scrollTimeout)
        scrollTimeout = setTimeout(() => {
          const isAtStart = tableContainer.scrollLeft === 0
          const isAtEnd = tableContainer.scrollLeft + tableContainer.clientWidth >= tableContainer.scrollWidth - 1
          
          tableContainer.classList.toggle('scroll-start', isAtStart)
          tableContainer.classList.toggle('scroll-end', isAtEnd)
        }, 50)
      })
    }
  }, 500)
})

onUnmounted(() => {
  // Clean up keyboard event listener
  document.removeEventListener('keydown', handleKeydown)
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
              <div class="table-select-wrapper">
                <select 
                  v-model="tableManager.currentTable.value" 
                  @change="tableManager.switchTable(tableManager.currentTable.value)"
                  class="table-select"
                >
                  <option v-for="table in tableManager.availableTables.value" :key="table" :value="table">
                    {{ table }}{{ table === 'users' ? ' (default)' : '' }}
                  </option>
                </select>
                <div v-if="tableManager.currentTable.value !== 'users'" class="table-indicator" title="This table can be deleted">
                  ⚠️
                </div>
              </div>
            </div>
            <div class="connection-status" :class="tableManager.serverConnected.value ? 'connected' : 'disconnected'">
              {{ tableManager.serverConnected.value ? 'Server Connected' : 'Demo Mode' }}
            </div>
          </div>
        </div>
      </div>
    </nav>

    <!-- User Management Section -->
    <section class="user-management">
      <div class="container">
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold mb-4">User Management - {{ tableManager.currentTable.value }}</h1>
          <p class="text-secondary mb-4">
            Add, edit, and manage users with dynamic columns and CSV import.
          </p>
          
          <!-- Customization Info for Non-Default Tables -->
          <div v-if="tableManager.currentTable.value !== 'users'" class="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <div class="flex items-center justify-center mb-2">
              <svg class="w-5 h-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
              </svg>
              <span class="text-blue-800 font-medium">Custom Table: Full Customization Available</span>
            </div>
            <p class="text-blue-700 text-sm">
              You can freely customize this table: add/remove any columns (except ID), import CSV data with automatic column creation, and email validation will be applied to any email fields.
            </p>
          </div>
          
          <!-- Stats Info -->
          <div class="stats-info justify-center">
            <span class="stat-badge">{{ tableManager.users.value.length }} Users</span>
            <span class="stat-badge">{{ tableManager.columns.value.length }} Columns</span>
            <span class="stat-badge">{{ tableManager.availableTables.value.length }} Tables</span>
            <span 
              v-if="tableManager.deletableTables.value.length > 0" 
              class="stat-badge stat-badge-warning"
              :title="`${tableManager.deletableTables.value.length} tables can be deleted: ${tableManager.deletableTables.value.join(', ')}`"
            >
              {{ tableManager.deletableTables.value.length }} Deletable
            </span>
          </div>
        </div>

        <!-- Show server connection warning -->
        <div v-if="!tableManager.serverConnected.value" class="mb-6 p-8 bg-yellow-50 border border-yellow-200 rounded-md text-center">
          <div class="flex flex-col items-center">
            <svg class="w-16 h-16 text-yellow-400 mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
            </svg>
            <h3 class="text-xl font-semibold text-yellow-800 mb-2">Server Not Available</h3>
            <p class="text-yellow-700 mb-4">Unable to connect to the backend server. Please check your connection and try again.</p>
            <button @click="tableManager.fetchUsers" class="btn btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-2">
                <path d="M1 4v6h6"></path>
                <path d="M3.51 15a9 9 0 102.13-9.36L1 10"></path>
              </svg>
              Retry Connection
            </button>
          </div>
        </div>

        <!-- Enhanced Management Buttons -->
        <div v-if="tableManager.serverConnected.value" class="management-toolbar">
          <div class="toolbar-left">
            <button 
              @click="showColumnModal = true"
              class="btn btn-secondary btn-sm"
              :disabled="!tableManager.serverConnected.value"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Column
            </button>
            
            <button 
              @click="csvFile.click()"
              class="btn btn-outline btn-sm" 
              :disabled="!tableManager.serverConnected.value"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14,2 14,8 20,8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10,9 9,9 8,9"></polyline>
              </svg>
              Import CSV
            </button>
          </div>

          <div class="toolbar-center">
            <!-- New Table Creation -->
            <div class="new-table-input">
              <input 
                v-model="tableManager.newTableName.value"
                type="text" 
                class="form-input form-input-sm"
                placeholder="New table name"
              >
              <button 
                @click="tableManager.createNewTable(showDeleteConfirm)" 
                class="btn btn-primary btn-sm" 
                :disabled="!tableManager.newTableName.value.trim()"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Create
              </button>
            </div>
          </div>

          <div class="toolbar-right">
            <!-- Danger Zone -->
            <button 
              @click="tableManager.dropTable(tableManager.currentTable.value, showDeleteConfirm)"
              class="btn btn-danger btn-sm"
              :disabled="!tableManager.serverConnected.value || tableManager.currentTable.value === 'users' || tableManager.availableTables.value.length <= 1 || tableManager.loading.value"
              :title="tableManager.currentTable.value === 'users' ? 'Cannot delete the default users table' : `Delete table '${tableManager.currentTable.value}'`"
            >
              <div v-if="tableManager.loading.value" class="loading"></div>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18"></path>
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
              Delete {{ tableManager.currentTable.value }}
            </button>
            
            <button 
              @click="tableManager.deleteAllUsers(showDeleteConfirm)"
              class="btn btn-danger btn-sm"
              :disabled="!tableManager.serverConnected.value || tableManager.users.value.length === 0"
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

          <input 
            type="file" 
            accept=".csv" 
            @change="handleCsvUpload"
            class="hidden"
            ref="csvFile"
            :disabled="!tableManager.serverConnected.value"
          >
        </div>

        <!-- User Form -->
        <div v-if="tableManager.serverConnected.value" class="user-form">
          <div class="form-header">
            <h3 class="text-xl font-semibold">
              {{ tableManager.currentTable.value === 'users' ? 'Add New User' : 'Add New Row' }}
            </h3>
          </div>
          
          <form @submit.prevent="userManager.createUser" class="form-grid">
            <div 
              v-for="column in tableManager.columns.value.filter(col => col.editable)" 
              :key="column.key"
              class="form-field"
            >
              <label class="form-label">
                {{ tableManager.currentTable.value === 'users' ? column.label : '' }}
                <span v-if="column.required" class="required-indicator">*</span>
              </label>
              
              <!-- Special handling for email field with validation -->
              <div v-if="column.key.toLowerCase().includes('email') || column.type === 'email'" class="email-input-wrapper">
                <input 
                  v-model="userManager.formData.value[column.key]"
                  :type="column.type" 
                  :class="[
                    'form-input',
                    {
                      'error': userManager.formData.value[column.key] && userManager.formData.value[column.key].trim() !== '' && !emailRegex.test(userManager.formData.value[column.key].trim()),
                      'success': userManager.formData.value[column.key] && userManager.formData.value[column.key].trim() !== '' && emailRegex.test(userManager.formData.value[column.key].trim())
                    }
                  ]"
                  :placeholder="tableManager.currentTable.value === 'users' ? `Enter ${column.label.toLowerCase()}` : ''"
                  :required="column.required"
                  :disabled="!tableManager.serverConnected.value"
                >
                <div v-if="userManager.formData.value[column.key] && userManager.formData.value[column.key].trim() !== '' && !emailRegex.test(userManager.formData.value[column.key].trim())" class="form-error">
                  Please enter a valid email address (e.g., user@example.com)
                </div>
                <div v-if="userManager.formData.value[column.key] && userManager.formData.value[column.key].trim() !== '' && emailRegex.test(userManager.formData.value[column.key].trim())" class="form-success">
                  ✓ Valid email format
                </div>
              </div>
              
              <!-- Regular input for non-email fields -->
              <input 
                v-else
                v-model="userManager.formData.value[column.key]"
                :type="column.type" 
                class="form-input" 
                :placeholder="tableManager.currentTable.value === 'users' ? `Enter ${column.label.toLowerCase()}` : ''"
                :required="column.required"
                :disabled="!tableManager.serverConnected.value"
              >
            </div>
            
            <div class="form-actions">
              <button 
                type="submit" 
                class="btn btn-primary"
                :disabled="tableManager.loading.value || !tableManager.serverConnected.value"
              >
                <div v-if="tableManager.loading.value" class="loading"></div>
                {{ tableManager.currentTable.value === 'users' ? 'Add User' : 'Add Row' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Users Table -->
        <div v-if="tableManager.serverConnected.value" class="user-table">
          <div class="card-header">
            <h3 class="text-lg font-semibold">
              {{ tableManager.currentTable.value === 'users' ? `All Users in ${tableManager.currentTable.value}` : 'Data Table' }}
            </h3>
          </div>
          
          <div class="overflow-x-auto table-scroll-container">
            <table class="table">
              <thead>
                <tr>
                  <th v-for="column in tableManager.columns.value" :key="column.key">
                    <div class="flex items-center justify-between">
                      <span>{{ tableManager.currentTable.value === 'users' ? column.label : '' }}</span>
                      <button 
                        v-if="tableManager.currentTable.value === 'users' ? !tableManager.defaultColumns.some(col => col.key === column.key) : column.key !== 'id'"
                        @click="userManager.deleteColumn(column.key, showDeleteConfirm)"
                        class="ml-2 text-red-500 hover:text-red-700"
                        title="Remove column"
                        :disabled="!tableManager.serverConnected.value"
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
                <tr v-if="tableManager.loading.value && tableManager.users.value.length === 0">
                  <td :colspan="tableManager.columns.value.length + 1" class="text-center py-8">
                    <div class="loading mx-auto"></div>
                    <p class="text-muted mt-2">Loading users...</p>
                  </td>
                </tr>
                
                <tr v-else-if="!tableManager.serverConnected.value">
                  <td :colspan="tableManager.columns.value.length + 1" class="text-center py-8">
                    <div class="text-muted">
                      <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.5-.762-6.063-2.045l-.895.045L3.47 15.47c-.177.177-.47.177-.647 0L.354 12.993c-.178-.177-.178-.47 0-.647L2.823 9.877l.895.045A7.962 7.962 0 0112 7.5c2.34 0 4.5.762 6.063 2.045l.895-.045 2.469 2.469c.177.177.177.47 0 .647l-2.469 2.477c-.177.177-.47.177-.647 0l-.895-.045z"></path>
                      </svg>
                      <h3 class="text-lg font-medium text-gray-600 mb-2">Data Unavailable</h3>
                      <p class="text-gray-500">Unable to connect to server. Please check your connection and try again.</p>
                    </div>
                  </td>
                </tr>
                
                <tr v-else-if="tableManager.users.value.length === 0">
                  <td :colspan="tableManager.columns.value.length + 1" class="text-center py-8">
                    <p class="text-muted">
                      {{ tableManager.currentTable.value === 'users' 
                          ? `No users found in ${tableManager.currentTable.value}. Add your first user above!`
                          : 'No data found. Add your first row above!'
                      }}
                    </p>
                  </td>
                </tr>
                
                <tr v-else v-for="user in tableManager.users.value" :key="user.id">
                  <td v-for="column in tableManager.columns.value" :key="column.key" class="font-medium">
                    <span 
                      :class="[
                        'user-data-cell',
                        `data-type-${column.type}`,
                        { 'data-empty': !user[column.key] }
                      ]"
                      :title="column.key === 'id' ? `User ID: ${user[column.key]}` : `${column.label}: ${user[column.key] || 'Not set'}`"
                    >
                      <!-- Special formatting for different data types -->
                      <template v-if="column.type === 'email' && user[column.key]">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline mr-1">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                          <polyline points="22,6 12,13 2,6"></polyline>
                        </svg>
                        {{ user[column.key] }}
                      </template>
                      <template v-else-if="column.type === 'tel' && user[column.key]">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline mr-1">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                        </svg>
                        {{ user[column.key] }}
                      </template>
                      <template v-else-if="column.type === 'url' && user[column.key]">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline mr-1">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"></path>
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"></path>
                        </svg>
                        <a :href="user[column.key]" target="_blank" class="text-blue-600 hover:text-blue-800">
                          {{ user[column.key] }}
                        </a>
                      </template>
                      <template v-else-if="column.key === 'id'">
                        <span class="id-badge">#{{ user[column.key] }}</span>
                      </template>
                      <template v-else-if="column.type === 'number'">
                        <span class="number-value">{{ user[column.key] || '0' }}</span>
                      </template>
                      <template v-else>
                        {{ user[column.key] || '-' }}
                      </template>
                    </span>
                  </td>
                  <td>
                    <div class="flex gap-sm">
                      <button 
                        @click="handleEditUser(user)"
                        class="btn btn-ghost text-blue-600 hover:text-blue-700"
                        :disabled="!tableManager.serverConnected.value"
                        title="Edit this user"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Edit
                      </button>
                      
                      <button 
                        @click="userManager.deleteUser(user.id, showDeleteConfirm)"
                        class="btn btn-ghost text-red-600 hover:text-red-700"
                        :disabled="!tableManager.serverConnected.value"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="3,6 5,6 21,6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          <line x1="10" y1="11" x2="10" y2="17"/>
                          <line x1="14" y1="11" x2="14" y2="17"/>
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

    <!-- Modals -->
    <ConfirmModal
      :showDeleteConfirmModal="showDeleteConfirmModal"
      :deleteConfirmMessage="deleteConfirmMessage"
      :executeDeleteAction="executeDeleteAction"
      :cancelDeleteAction="cancelDeleteAction"
    />

    <AddColumnModal
      :showColumnModal="showColumnModal"
      :currentTable="tableManager.currentTable.value"
      :newColumn="userManager.newColumn.value"
      @close="showColumnModal = false"
      @add-column="handleAddColumn"
    />

    <CsvImportModal
      :showCsvModal="showCsvModal"
      :currentTable="tableManager.currentTable.value"
      :csvHeaders="csvImporter.csvHeaders.value"
      :csvPreview="csvImporter.csvPreview.value"
      @close="showCsvModal = false"
      @import-csv="handleCsvImport"
    />

    <EditUserModal
      :showEditModal="showEditModal"
      :editingUser="userManager.editingUser.value"
      :validationErrors="[]"
      :columns="tableManager.columns.value"
      :formData="userManager.formData.value"
      :emailRegex="emailRegex"
      :serverConnected="tableManager.serverConnected.value"
      :loading="tableManager.loading.value"
      :hasUnsavedChanges="userManager.hasUnsavedChanges.value"
      @close="handleCloseEditModal"
      @update-user="handleUpdateUser"
      @update-field="handleUpdateField"
    />

    <NotificationToast
      :notifications="notifications"
      :removeNotification="removeNotification"
    />
  </div>
</template>

<style scoped>
@import './assets/theme-components-clean.css';

/* Application Layout */
.app {
  min-height: 100vh;
  background: var(--background);
  display: flex;
  flex-direction: column;
}

/* Navigation */
.navbar {
  background: var(--surface);
  border-bottom: 1px solid var(--border-light);
  padding: var(--space-md) 0;
  box-shadow: var(--shadow-sm);
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

.table-select-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.table-select {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  padding: var(--space-xs) var(--space-sm);
  font-size: var(--text-sm);
  color: var(--text-primary);
  min-width: 120px;
}

.table-select:focus {
  outline: none;
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px var(--primary-100);
}

.table-indicator {
  position: absolute;
  right: -25px;
  font-size: 14px;
  cursor: help;
}

.connection-status {
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: 500;
}

.connection-status.connected {
  background: var(--success-100);
  color: var(--success-700);
}

.connection-status.disconnected {
  background: var(--warning-100);
  color: var(--warning-700);
}

/* Main Content */
.user-management {
  flex: 1;
  padding: var(--space-xl) 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-lg);
}

/* Header Styles */
.text-center {
  text-align: center;
}

.mb-8 {
  margin-bottom: 2rem;
}

.mb-4 {
  margin-bottom: 1rem;
}

.text-3xl {
  font-size: 1.875rem;
}

.font-bold {
  font-weight: 700;
}

.text-secondary {
  color: var(--text-secondary);
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
  cursor: default;
}

.stat-badge-warning {
  background: #fef3c7;
  color: #d97706;
  border-color: #fbbf24;
}

/* Management Toolbar */
.management-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-lg);
  margin-bottom: var(--space-xl);
  padding: var(--space-lg);
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  flex-wrap: wrap;
}

.toolbar-left,
.toolbar-center,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.toolbar-center {
  flex: 1;
  justify-content: center;
  min-width: 250px;
}

.toolbar-right {
  justify-content: flex-end;
}

.new-table-input {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  padding: var(--space-xs);
  min-width: 250px;
}

.new-table-input input {
  border: none;
  background: transparent;
  flex: 1;
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

/* Form Styling */
.user-form {
  margin-bottom: var(--space-xl);
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.form-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-xl);
  padding: var(--space-lg) var(--space-xl);
  border-bottom: 1px solid var(--border-light);
  background: var(--background-secondary);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-lg);
  align-items: start;
  padding: var(--space-xl);
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.form-actions {
  grid-column: 1 / -1;
  display: flex;
  gap: var(--space-md);
  justify-content: flex-start;
  align-items: center;
  margin-top: var(--space-lg);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--border-light);
}

.form-label {
  font-weight: 500;
  color: var(--text-primary);
  font-size: var(--text-sm);
}

.required-indicator {
  color: var(--error);
  font-weight: 600;
  margin-left: var(--space-xs);
}

.form-input {
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  transition: all 0.2s ease;
  background: var(--surface);
}

.form-input:focus {
  outline: none;
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px var(--primary-100);
}

.form-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: var(--background-secondary);
}

.form-input.error {
  border-color: var(--error);
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.form-input.success {
  border-color: var(--success);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.email-input-wrapper {
  position: relative;
}

.form-error {
  color: var(--error);
  font-size: var(--text-sm);
  margin-top: var(--space-xs);
}

.form-success {
  color: var(--success);
  font-size: var(--text-sm);
  margin-top: var(--space-xs);
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

/* Button Styling */
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-lg);
  border-radius: var(--radius-md);
  border: 1px solid;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  text-decoration: none;
  font-size: var(--text-sm);
  line-height: 1.5;
  justify-content: center;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--primary-500);
  color: white;
  border-color: var(--primary-500);
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-600);
  border-color: var(--primary-600);
}

.btn-secondary {
  background: var(--surface);
  color: var(--text-secondary);
  border-color: var(--border-light);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--background-secondary);
  border-color: var(--border);
}

.btn-outline {
  background: transparent;
  color: var(--primary-600);
  border-color: var(--primary-300);
}

.btn-outline:hover:not(:disabled) {
  background: var(--primary-50);
  border-color: var(--primary-400);
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

.btn-ghost {
  background: transparent;
  border-color: transparent;
  padding: var(--space-xs) var(--space-sm);
}

.btn-ghost:hover:not(:disabled) {
  background: var(--background-secondary);
}

.btn-sm {
  padding: var(--space-xs) var(--space-md);
  font-size: var(--text-xs);
  border-radius: var(--radius-sm);
}

/* Table Styling */
.user-table {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.card-header {
  padding: var(--space-lg) var(--space-xl);
  background: var(--background-secondary);
  border-bottom: 1px solid var(--border-light);
}

/* Table Scroll Performance Optimizations */
.table-scroll-container {
  position: relative;
  overflow-x: auto;
  border-radius: 0 0 var(--radius-xl) var(--radius-xl);
  /* Performance optimizations */
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  will-change: scroll-position;
}

.table-scroll-container::-webkit-scrollbar {
  height: 8px;
}

.table-scroll-container::-webkit-scrollbar-track {
  background: var(--background-secondary);
}

.table-scroll-container::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 4px;
}

.table-scroll-container::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}

/* Scroll indicators for better UX */
.table-scroll-container.scrollable::before,
.table-scroll-container.scrollable::after {
  content: '';
  position: absolute;
  top: 0;
  width: 20px;
  height: 100%;
  pointer-events: none;
  z-index: 5;
  transition: opacity 0.3s ease;
}

.table-scroll-container.scrollable::before {
  left: 0;
  background: linear-gradient(to right, var(--surface), transparent);
  opacity: 0;
}

.table-scroll-container.scrollable::after {
  right: 0;
  background: linear-gradient(to left, var(--surface), transparent);
  opacity: 1;
}

.table-scroll-container.scrollable.scroll-start::before {
  opacity: 0;
}

.table-scroll-container.scrollable.scroll-end::after {
  opacity: 0;
}

.table-scroll-container.scrollable:not(.scroll-start)::before {
  opacity: 1;
}

.table-scroll-container.scrollable:not(.scroll-end)::after {
  opacity: 1;
}

.table {
  width: 100%;
  min-width: max-content;
  border-collapse: collapse;
  table-layout: auto;
}

.table th,
.table td {
  padding: var(--space-md) var(--space-lg);
  text-align: left;
  border-bottom: 1px solid var(--border-light);
  white-space: nowrap;
}

.table th {
  background: var(--background-secondary);
  font-weight: 600;
  color: var(--text-primary);
  position: sticky;
  top: 0;
  z-index: 10;
}

.table tbody tr:hover {
  background: var(--background-secondary);
}

.table tbody tr:last-child td {
  border-bottom: none;
}

/* Data Cell Styling */
.user-data-cell {
  display: inline-flex;
  align-items: center;
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
  min-height: 24px;
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid transparent;
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.data-type-email {
  background: rgba(59, 130, 246, 0.1);
  color: var(--primary-700);
}

.data-type-tel {
  background: rgba(16, 185, 129, 0.1);
  color: #047857;
}

.data-type-url {
  background: rgba(168, 85, 247, 0.1);
  color: #7c3aed;
}

.data-type-number {
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
  font-family: 'SF Mono', Consolas, monospace;
  font-weight: 600;
}

.data-empty {
  background: rgba(107, 114, 128, 0.1);
  color: var(--text-muted);
  font-style: italic;
}

.id-badge {
  background: var(--primary-100);
  color: var(--primary-700);
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 700;
  font-family: 'SF Mono', Consolas, monospace;
  border: 1px solid var(--primary-200);
}

.number-value {
  font-family: 'SF Mono', Consolas, monospace;
  font-weight: 600;
  font-size: var(--text-sm);
}

/* Utility Classes */
.hidden {
  display: none;
}

.loading {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.flex {
  display: flex;
}

.items-center {
  align-items: center;
}

.justify-center {
  justify-content: center;
}

.justify-between {
  justify-content: space-between;
}

.gap-sm {
  gap: var(--space-sm);
}

.gap-md {
  gap: var(--space-md);
}

.ml-2 {
  margin-left: 0.5rem;
}

.mr-2 {
  margin-right: 0.5rem;
}

.mt-2 {
  margin-top: 0.5rem;
}

.mb-2 {
  margin-bottom: 0.5rem;
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

.mx-auto {
  margin-left: auto;
  margin-right: auto;
}

.py-8 {
  padding-top: 2rem;
  padding-bottom: 2rem;
}

.text-center {
  text-align: center;
}

.text-lg {
  font-size: 1.125rem;
}

.text-xl {
  font-size: 1.25rem;
}

.font-semibold {
  font-weight: 600;
}

.font-medium {
  font-weight: 500;
}

.text-muted {
  color: var(--text-muted);
}

.text-blue-600 {
  color: #2563eb;
}

.text-blue-800 {
  color: #1e40af;
}

.text-blue-500 {
  color: #3b82f6;
}

.text-blue-700 {
  color: #1d4ed8;
}

.text-red-500 {
  color: #ef4444;
}

.text-red-700 {
  color: #b91c1c;
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

.text-yellow-800 {
  color: #92400e;
}

.text-yellow-700 {
  color: #a16207;
}

.text-yellow-400 {
  color: #fbbf24;
}

.bg-blue-50 {
  background: #eff6ff;
}

.bg-yellow-50 {
  background: #fefce8;
}

.border {
  border-width: 1px;
}

.border-blue-200 {
  border-color: #bfdbfe;
}

.border-yellow-200 {
  border-color: #fde047;
}

.rounded-lg {
  border-radius: var(--radius-lg);
}

.rounded-md {
  border-radius: var(--radius-md);
}

.p-4 {
  padding: 1rem;
}

.p-8 {
  padding: 2rem;
}

.hover\:text-blue-700:hover {
  color: #1d4ed8;
}

.hover\:text-blue-800:hover {
  color: #1e40af;
}

.hover\:text-red-700:hover {
  color: #b91c1c;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive Design */
@media (max-width: 768px) {
  .management-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .toolbar-left,
  .toolbar-center,
  .toolbar-right {
    justify-content: center;
    width: 100%;
  }
  
  .toolbar-center {
    order: -1;
    margin-bottom: var(--space-md);
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .form-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .form-actions .btn {
    width: 100%;
    justify-content: center;
  }
  
  .stats-info {
    flex-direction: column;
    gap: var(--space-sm);
  }
  
  .stat-badge {
    width: 100%;
    justify-content: center;
  }
}
</style>
