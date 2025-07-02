import { ref } from 'vue'

const notifications = ref([])

export function useNotifications() {
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

  return {
    notifications,
    showNotification,
    removeNotification
  }
}
