<script setup>
import { ref, onMounted } from 'vue'
import HelloWorld from './components/HelloWorld.vue'
import ThemeShowcase from './components/ThemeShowcase.vue'
import { userAPI, checkServerHealth } from './services/api.js'

// UI State
const activeTab = ref('home')
const showNotifications = ref(false)
const notifications = ref([])

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
      console.warn('Server not available, using mock data')
      users.value = [
        { id: 1, name: 'John Doe', email: 'john@example.com', age: 28 },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 32 },
        { id: 3, name: 'Bob Johnson', email: 'bob@example.com', age: 45 }
      ]
    }
  } catch (error) {
    console.error('Error fetching users:', error)
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
  if (!formData.value.name || !formData.value.email || !formData.value.age) {
    alert('Please fill in all fields')
    return
  }
  
  loading.value = true
  try {
    const userData = {
      name: formData.value.name,
      email: formData.value.email,
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
  loading.value = true
  try {
    const userData = {
      name: formData.value.name,
      email: formData.value.email,
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
    showNotification('User updated successfully!', 'success')
  } catch (error) {
    console.error('Error updating user:', error)
    showNotification('Error updating user. Please try again.', 'error')
  } finally {
    loading.value = false
  }
}

const deleteUser = async (id) => {
  if (!confirm('Are you sure you want to delete this user?')) return
  
  loading.value = true
  try {
    if (serverConnected.value) {
      await userAPI.deleteUser(id)
    }
    
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
  formData.value = {
    name: user.name,
    email: user.email,
    age: user.age.toString()
  }
}

const resetForm = () => {
  formData.value = { name: '', email: '', age: '' }
  editingUser.value = null
}

const handleSubmit = () => {
  if (editingUser.value) {
    updateUser()
  } else {
    createUser()
  }
}

// Notification system
const showNotification = (message, type = 'info') => {
  const id = Date.now()
  notifications.value.push({ id, message, type })
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    removeNotification(id)
  }, 5000)
}

const removeNotification = (id) => {
  const index = notifications.value.findIndex(n => n.id === id)
  if (index > -1) {
    notifications.value.splice(index, 1)
  }
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
          <div class="navbar-brand">Vue Dashboard</div>
          <ul class="navbar-nav">
            <li><a href="#home">Home</a></li>
            <li><a href="#users">Users</a></li>
            <li><a href="#about">About</a></li>
          </ul>
          <div class="connection-status">
            <span v-if="serverConnected" class="status-indicator connected">
              🟢 Server Connected
            </span>
            <span v-else class="status-indicator disconnected">
              🔴 Server Disconnected
            </span>
            <button @click="fetchUsers" class="test-connection-btn" :disabled="loading">
              {{ loading ? '⟳' : '🔄' }} Test Connection
            </button>
          </div>
        </div>
      </div>
    </nav>

    <!-- Hero Section -->
    <HelloWorld msg="Modern Vue.js Dashboard" />

    <!-- Features Section -->
    <section class="features">
      <div class="container">
        <div class="text-center">
          <h2 class="text-3xl font-bold mb-4">Powerful Features</h2>
          <p class="text-secondary max-w-2xl mx-auto">
            Built with modern technologies and best practices for optimal performance and user experience.
          </p>
        </div>
        
        <div class="features-grid">
          <div class="feature-card slide-up">
            <div class="feature-icon">⚡</div>
            <h3 class="feature-title">Lightning Fast</h3>
            <p class="feature-description">
              Optimized performance with Vue 3 Composition API and efficient state management.
            </p>
          </div>
          
          <div class="feature-card slide-up" style="animation-delay: 0.1s">
            <div class="feature-icon">🎨</div>
            <h3 class="feature-title">Beautiful Design</h3>
            <p class="feature-description">
              Modern, responsive design with carefully crafted components and smooth animations.
            </p>
          </div>
          
          <div class="feature-card slide-up" style="animation-delay: 0.2s">
            <div class="feature-icon">🔧</div>
            <h3 class="feature-title">Easy to Use</h3>
            <p class="feature-description">
              Intuitive interface with comprehensive documentation and developer-friendly APIs.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Stats Section -->
    <section class="stats">
      <div class="container">
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-number">{{ users.length }}</span>
            <span class="stat-label">Total Users</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">100%</span>
            <span class="stat-label">Uptime</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">50ms</span>
            <span class="stat-label">Response Time</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">24/7</span>
            <span class="stat-label">Support</span>
          </div>
        </div>
      </div>
    </section>

    <!-- User Management Section -->
    <section class="user-management" id="users">
      <div class="container">
        <div class="text-center mb-8">
          <h2 class="text-3xl font-bold mb-4">User Management</h2>
          <p class="text-secondary">
            Add, edit, and manage users with our intuitive interface.
          </p>
        </div>

        <!-- User Form -->
        <div class="user-form">
          <h3 class="text-xl font-semibold mb-6">
            {{ editingUser ? 'Edit User' : 'Add New User' }}
          </h3>
          
          <form @submit.prevent="handleSubmit" class="grid grid-cols-1 md:grid-cols-3 gap-lg">
            <div class="form-group">
              <label class="form-label">Name</label>
              <input 
                v-model="formData.name"
                type="text" 
                class="form-input" 
                placeholder="Enter full name"
                required
              >
            </div>
            
            <div class="form-group">
              <label class="form-label">Email</label>
              <input 
                v-model="formData.email"
                type="email" 
                class="form-input" 
                placeholder="Enter email address"
                required
              >
            </div>
            
            <div class="form-group">
              <label class="form-label">Age</label>
              <input 
                v-model="formData.age"
                type="number" 
                class="form-input" 
                placeholder="Enter age"
                min="1"
                max="120"
                required
              >
            </div>
            
            <div class="flex gap-md col-span-full">
              <button 
                type="submit" 
                class="btn btn-primary"
                :disabled="loading"
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
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Age</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading && users.length === 0">
                  <td colspan="5" class="text-center py-8">
                    <div class="loading mx-auto"></div>
                    <p class="text-muted mt-2">Loading users...</p>
                  </td>
                </tr>
                
                <tr v-else-if="users.length === 0">
                  <td colspan="5" class="text-center py-8">
                    <p class="text-muted">No users found. Add your first user above!</p>
                  </td>
                </tr>
                
                <tr v-else v-for="user in users" :key="user.id">
                  <td class="font-medium">{{ user.id }}</td>
                  <td>{{ user.name }}</td>
                  <td>{{ user.email }}</td>
                  <td>{{ user.age }}</td>
                  <td>
                    <div class="flex gap-sm">
                      <button 
                        @click="editUser(user)"
                        class="btn btn-ghost text-primary-600 hover:text-primary-700"
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

    <!-- Footer -->
    <footer class="footer">
      <div class="container">
        <div class="footer-content">
          <p>&copy; 2025 Vue Dashboard. Built with ❤️ using Vue.js and modern design principles.</p>
          <div v-if="!serverConnected" class="mt-2">
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
              ⚠️ Using mock data - Go server not connected
            </span>
          </div>
        </div>
      </div>
    </footer>

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

/* Connection Status Styles */
.connection-status {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.status-indicator {
  font-size: 0.875rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-indicator.connected {
  color: #16a34a;
}

.status-indicator.disconnected {
  color: #dc2626;
}

.test-connection-btn {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.test-connection-btn:hover:not(:disabled) {
  background: var(--primary-hover);
}

.test-connection-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .connection-status {
    flex-direction: column;
    gap: 0.5rem;
  }
}
@media (min-width: 768px) {
  .md\:grid-cols-3 {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
