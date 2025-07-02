<template>
  <!-- Confirmation Modal -->
  <div v-if="showDeleteConfirmModal" class="modal-overlay">
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="text-lg font-semibold">Confirm Action</h3>
      </div>
      <div class="mb-4 whitespace-pre-line">{{ deleteConfirmMessage }}</div>
      <div class="flex gap-md justify-end">
        <button @click="cancelDeleteAction" class="btn btn-secondary">
          Cancel
        </button>
        <button @click="executeDeleteAction" class="btn btn-danger">
          Confirm
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  showDeleteConfirmModal: Boolean,
  deleteConfirmMessage: String,
  executeDeleteAction: Function,
  cancelDeleteAction: Function
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease-out;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: var(--surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-2xl);
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  animation: scaleIn 0.2s ease-out;
  border: 1px solid var(--border-light);
  padding: var(--space-xl);
}

.modal-header {
  margin-bottom: var(--space-lg);
}

.whitespace-pre-line {
  white-space: pre-line;
}

.mb-4 {
  margin-bottom: 1rem;
}

.flex {
  display: flex;
}

.gap-md {
  gap: 0.75rem;
}

.justify-end {
  justify-content: flex-end;
}

.btn {
  padding: var(--space-sm) var(--space-lg);
  border-radius: var(--radius-md);
  border: 1px solid;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-secondary {
  background: var(--surface);
  color: var(--text-secondary);
  border-color: var(--border-light);
}

.btn-secondary:hover {
  background: var(--background-secondary);
  border-color: var(--border);
}

.btn-danger {
  background: #ef4444;
  color: white;
  border-color: #ef4444;
}

.btn-danger:hover {
  background: #dc2626;
  border-color: #dc2626;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from { 
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
  to { 
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
