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
  // Get all users from a specific table
  async getAllUsers(tableName = 'users') {
    try {
      const response = await api.get(`/users?table=${tableName}`)
      return response.data
    } catch (error) {
      console.error('Error fetching users:', error)
      throw error
    }
  },

  // Create new user in a specific table
  async createUser(userData, tableName = 'users') {
    try {
      const response = await api.post(`/users?table=${tableName}`, userData)
      return response.data
    } catch (error) {
      console.error('Error creating user:', error)
      throw error
    }
  },

  // Update user in a specific table
  async updateUser(id, userData, tableName = 'users') {
    try {
      const response = await api.put(`/users/${id}?table=${tableName}`, userData)
      // Server returns 204 No Content on successful update, so return success indicator
      return response.status === 204 || response.status === 200
    } catch (error) {
      console.error('Error updating user:', error)
      throw error
    }
  },

  // Delete user from a specific table
  async deleteUser(id, tableName = 'users') {
    try {
      await api.delete(`/users/${id}?table=${tableName}`)
      return true
    } catch (error) {
      console.error('Error deleting user:', error)
      throw error
    }
  },

  // Delete all users from a specific table
  async deleteAllUsers(tableName = 'users') {
    try {
      await api.delete(`/users?table=${tableName}&bulk=true`)
      return true
    } catch (error) {
      console.error('Error deleting all users:', error)
      throw error
    }
  },

  // Bulk create users in a specific table
  async bulkCreateUsers(usersData, tableName = 'users') {
    try {
      const response = await api.post('/users/bulk', {
        users: usersData,
        table: tableName
      })
      return response.data
    } catch (error) {
      console.error('Error bulk creating users:', error)
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
  },

  // Drop/delete table
  async dropTable(tableName) {
    try {
      const response = await api.delete(`/tables/${tableName}`)
      return response.data
    } catch (error) {
      console.error('Error dropping table:', error)
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

// Health check API
export const healthAPI = {
  async checkServer() {
    return checkServerHealth()
  }
}

export default api
