import { ref } from 'vue'

export function useModals() {
  const showColumnModal = ref(false)
  const showDeleteConfirmModal = ref(false)
  const showEditModal = ref(false)
  const deleteConfirmAction = ref(null)
  const deleteConfirmMessage = ref('')

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

  const closeEditModal = (hasUnsavedChanges = false) => {
    // Check for unsaved changes and show confirmation if needed
    if (hasUnsavedChanges) {
      const confirmClose = confirm('You have unsaved changes. Are you sure you want to close without saving?')
      if (!confirmClose) {
        return false // Don't close if user cancels
      }
    }
    
    showEditModal.value = false
    return true
  }

  return {
    showColumnModal,
    showDeleteConfirmModal,
    showEditModal,
    deleteConfirmAction,
    deleteConfirmMessage,
    showDeleteConfirm,
    executeDeleteAction,
    cancelDeleteAction,
    closeEditModal
  }
}
