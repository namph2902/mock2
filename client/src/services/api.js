import axios from 'axios'
import Papa from 'papaparse'

const api = axios.create({
  baseURL: 'http://localhost:8080', 
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
})

// Record API functions
export const recordAPI = {
  async getAllRecords(tableName) {
    try {
      const response = await api.get(`/records?table=${tableName}`)
      return response.data
    } catch (error) {
      console.error('Error fetching records:', error)
      throw error
    }
  },

  // Create new record in a specific table
  async createRecord(recordData, tableName) {
    try {
      const response = await api.post(`/records?table=${tableName}`, recordData)
      return response.data
    } catch (error) {
      console.error('Error creating record:', error)
      throw error
    }
  },

  // Update record in a specific table
  async updateRecord(id, recordData, tableName) {
    try {
      const response = await api.put(`/records/${id}?table=${tableName}`, recordData)
      return response.status === 204 || response.status === 200
    } catch (error) {
      console.error('Error updating record:', error)
      throw error
    }
  },

  // Delete record from a specific table
  async deleteRecord(id, tableName) {
    try {
      await api.delete(`/records/${id}?table=${tableName}`)
      return true
    } catch (error) {
      console.error('Error deleting record:', error)
      throw error
    }
  },

  // Delete all records from a specific table
  async deleteAllRecords(tableName) {
    try {
      await api.delete(`/records?table=${tableName}&bulk=true`)
      return true
    } catch (error) {
      console.error('Error deleting all records:', error)
      throw error
    }
  },

  // Bulk create records in a specific table
  async bulkCreateRecords(recordsData, tableName) {
    try {
      const response = await api.post('/records/bulk', {
        users: recordsData,
        table: tableName
      })
      return response.data
    } catch (error) {
      console.error('Error bulk creating records:', error)
      throw error
    }
  }
}

// Table API functions
export const tableAPI = {
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

// Column API functions
export const columnAPI = {
  async addColumn(tableName, columnData) {
    try {
      const response = await api.post(`/columns?table=${tableName}`, columnData)
      return response.data
    } catch (error) {
      console.error('Error adding column:', error)
      throw error
    }
  },

  // Remove column from table
  async removeColumn(tableName, columnKey) {
    try {
      const response = await api.delete(`/columns?table=${tableName}&column=${columnKey}`)
      return response.data
    } catch (error) {
      console.error('Error removing column:', error)
      throw error
    }
  },

  // Get columns for a table
  async getColumns(tableName) {
    try {
      const response = await api.get(`/columns?table=${tableName}`)
      return response.data
    } catch (error) {
      console.error('Error fetching columns:', error)
      throw error
    }
  },
}

// Health check function
export const checkServerHealth = async () => {
  try {
    const response = await api.get('/tables')
    return response.status === 200
  } catch (error) {
    console.warn('Server health check failed:', error.message)
    return false
  }
}

export default api
