<script setup>
import { ref, onMounted, computed } from 'vue'
import { userAPI, checkServerHealth } from './services/api.js'

// UI State
const showDeleteModal = ref(false)
const userToDelete = ref(null)
const showEditModal = ref(false)
const formHasChanges = ref(false)
const originalFormData = ref({})
const sortConfig = ref({ field: 'id', direction: 'asc' })

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
const formErrors = ref({})

// Computed properties
const isFormValid = computed(() => {
  return formData.value.name && formData.value.email && formData.value.age && Object.keys(formErrors.value).length === 0
})

const hasUnsavedChanges = computed(() => {
  if (!editingUser.value) return false
  return (
    formData.value.name !== originalFormData.value.name ||
    formData.value.email !== originalFormData.value.email ||
    formData.value.age !== originalFormData.value.age
  )
})

const sortedUsers = computed(() => {
  const sorted = [...users.value].sort((a, b) => {
    const { field, direction } = sortConfig.value
    let aVal = a[field]
    let bVal = b[field]
    
    // Handle different data types
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase()
      bVal = bVal.toLowerCase()
    }
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1
    if (aVal > bVal) return direction === 'asc' ? 1 : -1
    return 0
  })
  
  return sorted
})

// Sort functionality
const sortBy = (field) => {
  if (sortConfig.value.field === field) {
    sortConfig.value.direction = sortConfig.value.direction === 'asc' ? 'desc' : 'asc'
  } else {
    sortConfig.value.field = field
    sortConfig.value.direction = 'asc'
  }
}

// Watch for form changes
const checkFormChanges = () => {
  formHasChanges.value = hasUnsavedChanges.value
}
const validateField = (field, value) => {
  const errors = { ...formErrors.value }
  
  switch (field) {
    case 'name':
      if (!value || value.trim().length < 2) {
        errors.name = 'Name must be at least 2 characters long'
      } else {
        delete errors.name
      }
      break
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!value || !emailRegex.test(value)) {
        errors.email = 'Please enter a valid email address'
      } else {
        delete errors.email
      }
      break
    case 'age':
      const ageNum = parseInt(value)
      if (!value || ageNum < 1 || ageNum > 120) {
        errors.age = 'Age must be between 1 and 120'
      } else {
        delete errors.age
      }
      break
  }
  
  formErrors.value = errors
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
      // Fallback to mock data when server is not running
      users.value = [
        { id: 1, name: 'John Doe', email: 'john@example.com', age: 28 },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 32 },
        { id: 3, name: 'Bob Johnson', email: 'bob@example.com', age: 45 }
      ]
    }
  } catch (error) {
    console.error('Error fetching users:', error)
    console.log('Failed to load users. Using demo data.')
    // Fallback to mock data on error
    users.value = [
      { id: 1, name: 'John Doe', email: 'john@example.com', age: 28 },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 32 },
      { id: 3, name: 'Bob Johnson', email: 'bob@example.com', age: 45 }
    ]
  } finally {
    loading.value = false
  }
}

const createUser = async () => {
  if (!isFormValid.value) {
    console.log('Please fix the form errors before submitting')
    return
  }
  
  loading.value = true
  try {
    const userData = {
      name: formData.value.name.trim(),
      email: formData.value.email.trim().toLowerCase(),
      age: parseInt(formData.value.age)
    }
    
    if (serverConnected.value) {
      const newUser = await userAPI.createUser(userData)
      users.value.push(newUser)
    } else {
      // Mock creation when server is not available
      const newUser = {
        id: Date.now(),
        ...userData
      }
      users.value.push(newUser)
    }
    
    // Clear the add form after successful creation
    formData.value = { name: '', email: '', age: '' }
    formErrors.value = {}
    console.log('User created successfully!')
  } catch (error) {
    console.error('Error creating user:', error)
    console.log('Failed to create user. Please try again.')
  } finally {
    loading.value = false
  }
}

const updateUser = async () => {
  if (!isFormValid.value) {
    console.log('Please fix the form errors before submitting')
    return
  }
  
  loading.value = true
  try {
    const userData = {
      name: formData.value.name.trim(),
      email: formData.value.email.trim().toLowerCase(),
      age: parseInt(formData.value.age)
    }
    
    if (serverConnected.value) {
      await userAPI.updateUser(editingUser.value.id, userData)
    }
    
    // Update local data
    const index = users.value.findIndex(u => u.id === editingUser.value.id)
    if (index !== -1) {
      users.value[index] = {
        ...editingUser.value,
        ...userData
      }
    }
    
    resetForm()
    console.log('User updated successfully!')
  } catch (error) {
    console.error('Error updating user:', error)
    console.log('Failed to update user. Please try again.')
  } finally {
    loading.value = false
  }
}

const confirmDeleteUser = (user) => {
  userToDelete.value = user
  showDeleteModal.value = true
}

const deleteUser = async () => {
  if (!userToDelete.value) return
  
  loading.value = true
  try {
    if (serverConnected.value) {
      await userAPI.deleteUser(userToDelete.value.id)
    }
    
    users.value = users.value.filter(user => user.id !== userToDelete.value.id)
    console.log('User deleted successfully!')
  } catch (error) {
    console.error('Error deleting user:', error)
    console.log('Failed to delete user. Please try again.')
  } finally {
    loading.value = false
    showDeleteModal.value = false
    userToDelete.value = null
  }
}

const editUser = (user) => {
  // Check for unsaved changes before switching users
  if (editingUser.value && hasUnsavedChanges.value) {
    if (!confirm('You have unsaved changes. Are you sure you want to edit a different user?')) {
      return
    }
  }
  
  editingUser.value = user
  formData.value = {
    name: user.name,
    email: user.email,
    age: user.age.toString()
  }
  
  // Store original data for comparison
  originalFormData.value = {
    name: user.name,
    email: user.email,
    age: user.age.toString()
  }
  
  formErrors.value = {}
  formHasChanges.value = false
  showEditModal.value = true
  
  console.log(`Editing user: ${user.name}`)
}

const resetForm = () => {
  // Check for unsaved changes
  if (editingUser.value && hasUnsavedChanges.value) {
    if (!confirm('You have unsaved changes. Are you sure you want to cancel?')) {
      return
    }
  }
  
  formData.value = { name: '', email: '', age: '' }
  editingUser.value = null
  formErrors.value = {}
  originalFormData.value = {}
  formHasChanges.value = false
  showEditModal.value = false
  
  console.log('Form reset')
}

const handleSubmit = () => {
  // Only handle creation for the main form, editing is handled separately
  if (!editingUser.value) {
    createUser()
  }
}

onMounted(() => {
  fetchUsers()
  
  // Add keyboard shortcuts
  const handleKeyPress = (e) => {
    // Escape key to cancel editing
    if (e.key === 'Escape' && editingUser.value) {
      resetForm()
    }
    // Ctrl/Cmd + S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's' && editingUser.value) {
      e.preventDefault()
      if (isFormValid.value) {
        handleSubmit()
      }
    }
  }
  
  document.addEventListener('keydown', handleKeyPress)
  
  // Cleanup on unmount
  return () => {
    document.removeEventListener('keydown', handleKeyPress)
  }
})
</script>

<template>
  <div class="app">
    <!-- Navigation -->
    <nav class="navbar">
      <div class="container">
        <div class="navbar-content">
          <div class="navbar-brand">Vue User Manager</div>
          <div class="flex items-center gap-lg">
            <div :class="['connection-status', serverConnected ? 'connected' : 'disconnected']">
              {{ serverConnected ? 'Server Connected' : 'Demo Mode' }}
            </div>
          </div>
        </div>
      </div>
    </nav>

    <!-- User Management Section -->
    <section class="user-management" id="users">
      <div class="container">
        <div class="text-center mb-8">
          <h1 class="text-4xl font-bold mb-4">User Management</h1>
          <p class="text-secondary">
            Manage your users with our intuitive interface. {{ serverConnected ? 'Connected to live database.' : 'Using demo data.' }}
          </p>
        </div>

        <!-- User Form - Add Only -->
        <div class="user-form">
          <div class="form-header">
            <h2 class="text-xl font-semibold mb-2">Add New User</h2>
          </div>
          
          <form @submit.prevent="handleSubmit" class="grid grid-cols-1 md:grid-cols-3 gap-lg">
            <div class="form-group">
              <label class="form-label">Full Name *</label>
              <input 
                v-model="formData.name"
                @blur="validateField('name', formData.name); checkFormChanges()"
                @input="validateField('name', formData.name); checkFormChanges()"
                type="text" 
                :class="['form-input', formErrors.name ? 'error' : (formData.name && !formErrors.name ? 'success' : '')]"
                placeholder="Enter full name"
                required
              >
              <div v-if="formErrors.name" class="form-error">{{ formErrors.name }}</div>
            </div>
            
            <div class="form-group">
              <label class="form-label">Email Address *</label>
              <input 
                v-model="formData.email"
                @blur="validateField('email', formData.email); checkFormChanges()"
                @input="validateField('email', formData.email); checkFormChanges()"
                type="email" 
                :class="['form-input', formErrors.email ? 'error' : (formData.email && !formErrors.email ? 'success' : '')]"
                placeholder="Enter email address"
                required
              >
              <div v-if="formErrors.email" class="form-error">{{ formErrors.email }}</div>
            </div>
            
            <div class="form-group">
              <label class="form-label">Age *</label>
              <input 
                v-model="formData.age"
                @blur="validateField('age', formData.age); checkFormChanges()"
                @input="validateField('age', formData.age); checkFormChanges()"
                type="number" 
                :class="['form-input', formErrors.age ? 'error' : (formData.age && !formErrors.age ? 'success' : '')]"
                placeholder="Enter age"
                min="1"
                max="120"
                required
              >
              <div v-if="formErrors.age" class="form-error">{{ formErrors.age }}</div>
            </div>
            
            <div class="form-actions col-span-full">
              <div class="flex gap-md">
                <button 
                  type="submit" 
                  class="btn btn-primary"
                  :disabled="loading || !isFormValid || editingUser"
                >
                  <div v-if="loading" class="loading"></div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 5v14m-7-7h14"/>
                  </svg>
                  Add User
                </button>
              </div>
            </div>
          </form>
        </div>

        <!-- Users Table -->
        <div class="user-table">
          <div class="card-header">
            <h3 class="text-lg font-semibold">All Users ({{ users.length }})</h3>
          </div>
          
          <div v-if="users.length === 0 && !loading" class="empty-state">
            <div class="empty-state-icon">👥</div>
            <h3 class="empty-state-title">No users found</h3>
            <p class="empty-state-description">
              Get started by adding your first user above.
            </p>
          </div>
          
          <div v-else-if="loading && users.length === 0" class="empty-state">
            <div class="loading"></div>
            <p class="text-muted mt-2">Loading users...</p>
          </div>
          
          <div v-else class="overflow-x-auto">
            <table class="table">
              <thead>
                <tr>
                  <th @click="sortBy('id')" class="sortable-header">
                    <div class="header-content">
                      <span>ID</span>
                      <svg v-if="sortConfig.field === 'id'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="sortConfig.direction === 'desc' ? 'rotate-180' : ''">
                        <path d="M7 14l5-5 5 5"/>
                      </svg>
                    </div>
                  </th>
                  <th @click="sortBy('name')" class="sortable-header">
                    <div class="header-content">
                      <span>Name</span>
                      <svg v-if="sortConfig.field === 'name'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="sortConfig.direction === 'desc' ? 'rotate-180' : ''">
                        <path d="M7 14l5-5 5 5"/>
                      </svg>
                    </div>
                  </th>
                  <th @click="sortBy('email')" class="sortable-header">
                    <div class="header-content">
                      <span>Email</span>
                      <svg v-if="sortConfig.field === 'email'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="sortConfig.direction === 'desc' ? 'rotate-180' : ''">
                        <path d="M7 14l5-5 5 5"/>
                      </svg>
                    </div>
                  </th>
                  <th @click="sortBy('age')" class="sortable-header">
                    <div class="header-content">
                      <span>Age</span>
                      <svg v-if="sortConfig.field === 'age'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="sortConfig.direction === 'desc' ? 'rotate-180' : ''">
                        <path d="M7 14l5-5 5 5"/>
                      </svg>
                    </div>
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="user in sortedUsers" :key="user.id">
                  <td class="font-medium">#{{ user.id }}</td>
                  <td>{{ user.name }}</td>
                  <td>{{ user.email }}</td>
                  <td>{{ user.age }} years</td>
                  <td>
                    <div class="flex gap-sm">
                      <button 
                        @click="editUser(user)"
                        class="btn btn-ghost text-primary-600 hover:text-primary-700"
                        title="Edit user"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Edit
                      </button>
                      
                      <button 
                        @click="confirmDeleteUser(user)"
                        class="btn btn-ghost text-red-600 hover:text-red-700"
                        title="Delete user"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="3,6 5,6 21,6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
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

    <!-- Edit User Modal -->
    <div v-if="showEditModal" class="modal-overlay" @click="showEditModal = false">
      <div class="modal edit-modal" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">Edit User: {{ editingUser?.name }}</h3>
          <div v-if="hasUnsavedChanges" class="unsaved-changes-indicator">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            Unsaved changes
          </div>
        </div>
        
        <div class="modal-content">
          <form @submit.prevent="updateUser" class="edit-form">
            <div class="form-group">
              <label class="form-label">Full Name *</label>
              <input 
                v-model="formData.name"
                @blur="validateField('name', formData.name); checkFormChanges()"
                @input="validateField('name', formData.name); checkFormChanges()"
                type="text" 
                :class="['form-input', formErrors.name ? 'error' : (formData.name && !formErrors.name ? 'success' : '')]"
                placeholder="Enter full name"
                required
              >
              <div v-if="formErrors.name" class="form-error">{{ formErrors.name }}</div>
            </div>
            
            <div class="form-group">
              <label class="form-label">Email Address *</label>
              <input 
                v-model="formData.email"
                @blur="validateField('email', formData.email); checkFormChanges()"
                @input="validateField('email', formData.email); checkFormChanges()"
                type="email" 
                :class="['form-input', formErrors.email ? 'error' : (formData.email && !formErrors.email ? 'success' : '')]"
                placeholder="Enter email address"
                required
              >
              <div v-if="formErrors.email" class="form-error">{{ formErrors.email }}</div>
            </div>
            
            <div class="form-group">
              <label class="form-label">Age *</label>
              <input 
                v-model="formData.age"
                @blur="validateField('age', formData.age); checkFormChanges()"
                @input="validateField('age', formData.age); checkFormChanges()"
                type="number" 
                :class="['form-input', formErrors.age ? 'error' : (formData.age && !formErrors.age ? 'success' : '')]"
                placeholder="Enter age"
                min="1"
                max="120"
                required
              >
              <div v-if="formErrors.age" class="form-error">{{ formErrors.age }}</div>
            </div>
            
            <div v-if="hasUnsavedChanges" class="unsaved-warning">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              You have unsaved changes
            </div>
          </form>
        </div>
        
        <div class="modal-actions">
          <button 
            class="btn btn-secondary" 
            @click="resetForm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
            Cancel
          </button>
          <button 
            class="btn btn-primary" 
            @click="updateUser"
            :disabled="loading || !isFormValid"
          >
            <div v-if="loading" class="loading"></div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Update User
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="showDeleteModal = false">
      <div class="modal" @click.stop>
        <h3 class="modal-title">Confirm Delete</h3>
        <div class="modal-content">
          Are you sure you want to delete <strong>{{ userToDelete?.name }}</strong>? This action cannot be undone.
        </div>
        <div class="modal-actions">
          <button 
            class="btn btn-secondary" 
            @click="showDeleteModal = false"
          >
            Cancel
          </button>
          <button 
            class="btn btn-primary" 
            @click="deleteUser"
            :disabled="loading"
            style="background: var(--error); border-color: var(--error);"
          >
            <div v-if="loading" class="loading"></div>
            Delete User
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.max-w-2xl {
  max-width: 42rem;
}

.mx-auto {
  margin-left: auto;
  margin-right: auto;
}

.mb-4 {
  margin-bottom: var(--space-md);
}

.mb-6 {
  margin-bottom: var(--space-lg);
}

.mb-8 {
  margin-bottom: var(--space-xl);
}

.mt-2 {
  margin-top: var(--space-sm);
}

.py-8 {
  padding-top: var(--space-xl);
  padding-bottom: var(--space-xl);
}

.overflow-x-auto {
  overflow-x: auto;
}

.col-span-full {
  grid-column: 1 / -1;
}

.text-red-600 {
  color: #dc2626;
}

.hover\:text-red-700:hover {
  color: #b91c1c;
}

.text-primary-600 {
  color: var(--primary-600);
}

.hover\:text-primary-700:hover {
  color: var(--primary-700);
}

.fixed {
  position: fixed;
}

.top-4 {
  top: 1rem;
}

.right-4 {
  right: 1rem;
}

.z-50 {
  z-index: 50;
}

.space-y-2 > * + * {
  margin-top: 0.5rem;
}

.cursor-pointer {
  cursor: pointer;
}

.inline-flex {
  display: inline-flex;
}

.items-center {
  align-items: center;
}

.px-2 {
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

.py-1 {
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
}

.rounded-full {
  border-radius: 9999px;
}

.text-xs {
  font-size: 0.75rem;
}

.bg-yellow-100 {
  background-color: #fef3c7;
}

.text-yellow-800 {
  color: #92400e;
}

.ml-2 {
  margin-left: 0.5rem;
}

.text-gray-400 {
  color: #9ca3af;
}

.hover\:text-gray-600:hover {
  color: #4b5563;
}

@media (min-width: 768px) {
  .md\:grid-cols-3 {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
