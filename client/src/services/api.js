import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8080', 
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
})

// User API functions
export const userAPI = {
  // Get all users
  async getAllUsers() {
    try {
      const response = await api.get('/users')
      return response.data
    } catch (error) {
      console.error('Error fetching users:', error)
      throw error
    }
  },

  // Create new user
  async createUser(userData) {
    try {
      const response = await api.post('/users', userData)
      return response.data
    } catch (error) {
      console.error('Error creating user:', error)
      throw error
    }
  },

  // Update user
  async updateUser(id, userData) {
    try {
      const response = await api.put(`/users/${id}`, userData)
      return response.data
    } catch (error) {
      console.error('Error updating user:', error)
      throw error
    }
  },

  // Delete user
  async deleteUser(id) {
    try {
      await api.delete(`/users/${id}`)
      return true
    } catch (error) {
      console.error('Error deleting user:', error)
      throw error
    }
  }
}

// Table API functions
export const tableAPI = {
  // Get all tables
  async getAllTables() {
    try {
      const response = await api.get('/tables')
      return response.data
    } catch (error) {
      console.error('Error fetching tables:', error)
      throw error
    }
  },

  // Create new table
  async createTable(tableName) {
    try {
      const response = await api.post('/tables', { name: tableName })
      return response.data
    } catch (error) {
      console.error('Error creating table:', error)
      throw error
    }
  }
}

// Utility function to check if server is running
export const checkServerHealth = async () => {
  try {
    await api.get('/users')
    return true
  } catch (error) {
    return false
  }
}

export default api
