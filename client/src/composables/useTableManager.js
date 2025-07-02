import { ref, computed } from 'vue'
import { userAPI, tableAPI, checkServerHealth } from '../services/api.js'
import { useNotifications } from './useNotifications.js'
import { useValidation } from './useValidation.js'

export function useTableManager() {
  const { showNotification } = useNotifications()
  const { validateFormData } = useValidation()
  
  // Force refresh - removed newTableTitle and newTableHeader refs
  const loading = ref(false)
  const serverConnected = ref(false)
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

  const deletableTables = computed(() => {
    return availableTables.value.filter(table => table !== 'users')
  })

  // Helper function to detect column type from data
  const detectColumnType = (key, value) => {
    const keyLower = key.toLowerCase()
    
    if (keyLower.includes('email')) return 'email'
    if (keyLower.includes('phone') || keyLower.includes('tel')) return 'tel'
    if (keyLower.includes('url') || keyLower.includes('website') || keyLower.includes('link')) return 'url'
    if (keyLower.includes('date') || keyLower.includes('time')) return 'date'
    if (typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)))) return 'number'
    if (typeof value === 'boolean') return 'checkbox'
    
    return 'text'
  }

  const switchTable = (tableName) => {
    if (tableName === currentTable.value) return
    
    currentTable.value = tableName
    
    // Initialize table data if it doesn't exist
    if (!tableData.value[tableName]) {
      tableData.value[tableName] = []
    }
    if (!tableColumns.value[tableName]) {
      // For the default 'users' table, use default columns
      // For other tables, use minimal columns (just ID)
      if (tableName === 'users') {
        tableColumns.value[tableName] = [...defaultColumns]
      } else {
        tableColumns.value[tableName] = [
          { key: 'id', label: 'ID', type: 'number', required: true, editable: false }
        ]
      }
    }
    
    showNotification(`Switched to table "${tableName}"`, 'success')
  }

  const createNewTable = async (showDeleteConfirm) => {
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
          
          // For new tables, start with minimal columns (just ID)
          const minimalColumns = [
            { key: 'id', label: 'ID', type: 'number', required: true, editable: false }
          ]
          tableColumns.value[tableName] = minimalColumns
          
          // Switch to new table
          currentTable.value = tableName
          
          newTableName.value = ''
          showNotification(`Table "${tableName}" created successfully! You can now add custom columns or import CSV data.`, 'success')
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

  const dropTable = async (tableName, showDeleteConfirm) => {
    if (tableName === 'users') {
      showNotification('Cannot drop the default "users" table', 'error')
      return
    }

    if (!serverConnected.value) {
      showNotification('Cannot drop table: Server not available', 'error')
      return
    }

    showDeleteConfirm(
      `Drop table "${tableName}"? This will permanently delete all data in this table and cannot be undone.

Table info:
• ${tableData.value[tableName]?.length || 0} users will be deleted
• ${tableColumns.value[tableName]?.length || 0} columns will be removed
• This action cannot be undone

Are you sure you want to continue?`,
      async () => {
        loading.value = true
        try {
          // Drop table on server
          await tableAPI.dropTable(tableName)
          
          // Remove table from available tables
          availableTables.value = availableTables.value.filter(t => t !== tableName)
          
          // Delete table data locally
          delete tableData.value[tableName]
          delete tableColumns.value[tableName]
          
          // Switch to users table if current table was dropped
          if (currentTable.value === tableName) {
            currentTable.value = 'users'
          }
          
          showNotification(`Table "${tableName}" dropped successfully!`, 'success')
        } catch (error) {
          console.error('Error dropping table:', error)
          if (error.response && error.response.status === 404) {
            showNotification('Table not found on server', 'error')
          } else {
            showNotification('Error dropping table. Please try again.', 'error')
          }
        } finally {
          loading.value = false
        }
      }
    )
  }

  const deleteAllUsers = (showDeleteConfirm) => {
    showDeleteConfirm(
      `Delete all users from table "${currentTable.value}"? This action cannot be undone.`,
      async () => {
        try {
          loading.value = true
          if (serverConnected.value) {
            // Delete from database
            await userAPI.deleteAllUsers(currentTable.value)
          }
          
          // Clear frontend data
          tableData.value[currentTable.value] = []
          showNotification(`All users deleted from table "${currentTable.value}"!`, 'success')
        } catch (error) {
          console.error('Error deleting all users:', error)
          showNotification('Failed to delete all users from database', 'error')
        } finally {
          loading.value = false
        }
      }
    )
  }

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
        const userData = await userAPI.getAllUsers(currentTable.value)
        tableData.value[currentTable.value] = userData || []
        
        // Auto-detect columns from fetched data if not already set
        if (userData && userData.length > 0 && (!tableColumns.value[currentTable.value] || tableColumns.value[currentTable.value].length === 0)) {
          const sampleUser = userData[0]
          const detectedColumns = Object.keys(sampleUser).map(key => ({
            key,
            label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
            type: detectColumnType(key, sampleUser[key]),
            required: key === 'id' || key === 'name' || key === 'email',
            editable: key !== 'id' && key !== 'created_at' && key !== 'updated_at'
          }))
          tableColumns.value[currentTable.value] = detectedColumns
        }
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

  return {
    loading,
    serverConnected,
    availableTables,
    currentTable,
    newTableName,
    defaultColumns,
    tableData,
    tableColumns,
    users,
    columns,
    deletableTables,
    switchTable,
    createNewTable,
    dropTable,
    deleteAllUsers,
    fetchUsers
  }
}
