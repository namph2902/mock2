<template>
  <!-- Add Column Modal -->
  <div v-if="showColumnModal" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3 class="text-lg font-semibold">Add New Column to {{ currentTable }}</h3>
        <button @click="$emit('close')" class="modal-close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <form @submit.prevent="$emit('add-column')" class="space-y-4">
        <div class="form-group">
          <label class="form-label">Column Key (unique identifier)</label>
          <input 
            v-model="newColumn.key"
            type="text" 
            class="form-input"
            placeholder="e.g., phone_number"
            required
          >
        </div>
        
        <div class="form-group">
          <label class="form-label">Column Label (display name)</label>
          <input 
            v-model="newColumn.label"
            type="text" 
            class="form-input"
            placeholder="e.g., Phone Number"
            required
          >
        </div>
        
        <div class="form-group">
          <label class="form-label">Input Type</label>
          <select v-model="newColumn.type" class="form-input">
            <option value="text">Text</option>
            <option value="email">Email</option>
            <option value="number">Number</option>
            <option value="tel">Phone</option>
            <option value="url">URL</option>
            <option value="date">Date</option>
          </select>
        </div>
        
        <div class="form-group">
          <label class="form-label">Default Value (optional)</label>
          <input 
            v-model="newColumn.defaultValue"
            type="text" 
            class="form-input"
            placeholder="Default value for new users"
          >
        </div>
        
        <div class="flex items-center">
          <input 
            v-model="newColumn.required"
            type="checkbox" 
            class="mr-2"
          >
          <label>Required field</label>
        </div>
        
        <div class="flex gap-md justify-end">
          <button type="button" @click="$emit('close')" class="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" class="btn btn-primary">
            Add Column
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  showColumnModal: Boolean,
  currentTable: String,
  newColumn: Object
})

const emit = defineEmits(['close', 'add-column'])
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
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  animation: scaleIn 0.2s ease-out;
  border: 1px solid var(--border-light);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-xl);
  border-bottom: 1px solid var(--border-light);
  background: var(--background-secondary);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

.modal-close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  padding: var(--space-xs);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close:hover {
  background: var(--border-light);
  color: var(--text-primary);
}

.space-y-4 > * + * {
  margin-top: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: 0 var(--space-xl);
}

.form-label {
  font-weight: 500;
  color: var(--text-primary);
}

.form-input {
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
}

.form-input:focus {
  outline: none;
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px var(--primary-100);
}

.flex {
  display: flex;
  padding: 0 var(--space-xl);
}

.items-center {
  align-items: center;
}

.justify-end {
  justify-content: flex-end;
}

.gap-md {
  gap: 0.75rem;
}

.mr-2 {
  margin-right: 0.5rem;
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

.btn-primary {
  background: var(--primary-500);
  color: white;
  border-color: var(--primary-500);
}

.btn-primary:hover {
  background: var(--primary-600);
  border-color: var(--primary-600);
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