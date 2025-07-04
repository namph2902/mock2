import { ref, computed } from 'vue'
import { recordAPI, tableAPI, columnAPI, checkServerHealth } from '../services/api.js'
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
    { key: 'id', label: 'ID', type: 'number', required: true, editable: false }
  ]

  // Store data and columns separately for each table
  const tableData = ref({
    users: []
  })

  const tableColumns = ref({
    users: [
      { key: 'id', label: 'ID', type: 'number', required: true, editable: false }
    ]
  })

  // Computed properties for current table
  const records = computed({
    get: () => tableData.value[currentTable.value] || [],
    set: (value) => {
      tableData.value[currentTable.value] = value
    }
  })

  const columns = computed({
    get: () => tableColumns.value[currentTable.value] || [
      { key: 'id', label: 'ID', type: 'number', required: true, editable: false }
    ],
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

  // Helper function to fetch and set columns from server
  const fetchAndSetColumns = async (tableName) => {
    if (!serverConnected.value) return

    try {
      const serverColumns = await columnAPI.getColumns(tableName)
      if (serverColumns && serverColumns.length > 0) {
        // Transform server column names into column objects
        const columnObjects = serverColumns.map(columnName => ({
          key: columnName,
          label: columnName.charAt(0).toUpperCase() + columnName.slice(1).replace(/_/g, ' '),
          type: detectColumnType(columnName, null), // Will be refined when data is loaded
          required: columnName === 'id',
          editable: columnName !== 'id'
        }))
        
        tableColumns.value[tableName] = columnObjects
      }
    } catch (error) {
      console.error('Error fetching columns for table:', tableName, error)
      // If fetching columns fails, fall back to default behavior
    }
  }

  const switchTable = async (tableName) => {
    if (tableName === currentTable.value) return
    
    currentTable.value = tableName
    
    // Initialize table data if it doesn't exist
    if (!tableData.value[tableName]) {
      tableData.value[tableName] = []
    }
    if (!tableColumns.value[tableName]) {
      // For all tables, use minimal columns (just ID) initially
      tableColumns.value[tableName] = [
        { key: 'id', label: 'ID', type: 'number', required: true, editable: false }
      ]
    }
    
    // Fetch actual columns from server
    await fetchAndSetColumns(tableName)
    
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
          showNotification(`Table "${tableName}" created successfully! You can now add custom columns.`, 'success')
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

  const deleteAllRecords = (showDeleteConfirm) => {
    const userCount = tableData.value[currentTable.value]?.length || 0
    if (userCount === 0) {
      showNotification('No users to delete', 'info')
      return
    }

    const confirmMessage = serverConnected.value 
      ? `Delete all ${userCount} users from table "${currentTable.value}"? This action cannot be undone.`
      : `Delete all ${userCount} users from table "${currentTable.value}" (local data only)? Server changes will not be saved.`

    showDeleteConfirm(
      confirmMessage,
      async () => {
        try {
          loading.value = true
          if (serverConnected.value) {
            // Delete from database
            await recordAPI.deleteAllRecords(currentTable.value)
            showNotification(`All users deleted from table "${currentTable.value}"!`, 'success')
          } else {
            // Local deletion only
            showNotification(`All users deleted from table "${currentTable.value}" (local only)!`, 'warning')
          }
          
          // Clear frontend data in both cases
          tableData.value[currentTable.value] = []
        } catch (error) {
          console.error('Error deleting all users:', error)
          showNotification('Failed to delete all users from database', 'error')
          // Still clear local data even if server deletion failed
          tableData.value[currentTable.value] = []
        } finally {
          loading.value = false
        }
      }
    )
  }

  const fetchRecords = async () => {
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
        
        // Fetch columns from server first
        await fetchAndSetColumns(currentTable.value)
        
        // Fetch user data for current table
        const userData = await recordAPI.getAllRecords(currentTable.value)
        tableData.value[currentTable.value] = userData || []
        
        // Refine column types based on actual data if we have users
        if (userData && userData.length > 0 && tableColumns.value[currentTable.value]) {
          const sampleUser = userData[0]
          tableColumns.value[currentTable.value] = tableColumns.value[currentTable.value].map(col => ({
            ...col,
            type: detectColumnType(col.key, sampleUser[col.key])
          }))
        }
      } else {
        console.warn('Server not available, using local demo mode')
        // Initialize with default data and columns when server is not available
        availableTables.value = ['users']
        tableData.value[currentTable.value] = []
        
        // Ensure default columns are set for the current table
        if (!tableColumns.value[currentTable.value] || tableColumns.value[currentTable.value].length === 0) {
          if (currentTable.value === 'users') {
            tableColumns.value[currentTable.value] = [...defaultColumns]
          } else {
            // For non-users tables, start with minimal columns
            tableColumns.value[currentTable.value] = [
              { key: 'id', label: 'ID', type: 'number', required: true, editable: false }
            ]
          }
        }
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
    records,
    columns,
    deletableTables,
    switchTable,
    createNewTable,
    dropTable,
    deleteAllRecords,
    fetchRecords,
    fetchAndSetColumns
  }
}
