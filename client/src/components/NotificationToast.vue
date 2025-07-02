<template>
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
</template>

<script setup>
const props = defineProps({
  notifications: Array,
  removeNotification: Function
})
</script>

<style scoped>
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

.toast {
  background: white;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  padding: var(--space-md) var(--space-lg);
  box-shadow: var(--shadow-lg);
  min-width: 300px;
  animation: slideIn 0.3s ease-out;
}

.toast-success {
  border-left: 4px solid var(--success);
  background: #f0fdf4;
}

.toast-error {
  border-left: 4px solid var(--error);
  background: #fef2f2;
}

.toast-info {
  border-left: 4px solid var(--primary-500);
  background: #eff6ff;
}

.toast-warning {
  border-left: 4px solid #f59e0b;
  background: #fef3c7;
}

.cursor-pointer {
  cursor: pointer;
}

.flex {
  display: flex;
}

.items-center {
  align-items: center;
}

.justify-between {
  justify-content: space-between;
}

.ml-2 {
  margin-left: 0.5rem;
}

.text-gray-400 {
  color: #9ca3af;
}

.text-gray-600 {
  color: #4b5563;
}

.text-gray-400:hover {
  color: #4b5563;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>