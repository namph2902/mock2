<template>
  <!-- Edit Record Modal -->
  <div v-if="showEditModal" class="modal-overlay" @click="handleModalClick">
    <div class="modal-content edit-modal" @click.stop>
      <div class="modal-header">
        <div class="modal-title-section">
          <h3 class="text-lg font-semibold">Edit Record</h3>
          <div v-if="editingRecord" class="record-info">
            <span class="record-id-badge">ID: {{ editingRecord.id }}</span>
            <span class="record-name">{{ editingRecord.name || 'Unnamed Record' }}</span>
          </div>
        </div>
        <button @click="handleClose" class="modal-close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <!-- Validation Errors -->
      <div v-if="validationErrors.length > 0" class="validation-errors">
        <div v-for="error in validationErrors" :key="error" class="error-message">
          {{ error }}
        </div>
      </div>
      
      <div class="modal-body">
        <form @submit.prevent="handleSubmit" class="edit-form">
          <div 
            v-for="column in columns.filter(col => col.editable)" 
            :key="column.key"
            class="form-group"
          >
            <label class="form-label">
              {{ column.label }}
              <span v-if="column.required" class="required-indicator">*</span>
            </label>
            
            <!-- Special handling for email field with validation -->
            <div v-if="column.key.toLowerCase().includes('email') || column.type === 'email'" class="email-input-wrapper">
              <input 
                :value="formData[column.key] || ''"
                @input="updateField(column.key, $event.target.value)"
                :type="column.type" 
                :class="[
                  'form-input',
                  {
                    'error': formData[column.key] && formData[column.key].trim() !== '' && !emailRegex.test(formData[column.key].trim()),
                    'success': formData[column.key] && formData[column.key].trim() !== '' && emailRegex.test(formData[column.key].trim())
                  }
                ]"
                :placeholder="`Enter ${column.label.toLowerCase()}`"
                :required="column.required"
                :disabled="!serverConnected || loading"
              >
              <div v-if="formData[column.key] && formData[column.key].trim() !== '' && !emailRegex.test(formData[column.key].trim())" class="form-error">
                Please enter a valid email address (e.g., user@example.com)
              </div>
              <div v-if="formData[column.key] && formData[column.key].trim() !== '' && emailRegex.test(formData[column.key].trim())" class="form-success">
                ✓ Valid email format
              </div>
            </div>
            
            <!-- Regular input for non-email fields -->
            <input 
              v-else
              :value="formData[column.key] || ''"
              @input="updateField(column.key, $event.target.value)"
              :type="column.type" 
              class="form-input" 
              :placeholder="`Enter ${column.label.toLowerCase()}`"
              :required="column.required"
              :disabled="!serverConnected || loading"
            >
          </div>
          
          <!-- Submit button inside form for proper form handling -->
          <div class="modal-actions">
            <button type="button" @click="handleClose" class="btn btn-secondary" :disabled="loading">
              Cancel
            </button>
            <button 
              type="submit"
              class="btn btn-primary"
              :disabled="loading || !serverConnected"
            >
              <div v-if="loading" class="loading"></div>
              <svg v-if="!loading" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17,21 17,13 7,13 7,21"></polyline>
                <polyline points="7,3 7,8 15,8"></polyline>
              </svg>
              Update User
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  showEditModal: Boolean,
  editingRecord: Object,
  validationErrors: Array,
  columns: Array,
  formData: Object,
  emailRegex: RegExp,
  serverConnected: Boolean,
  loading: Boolean,
  hasUnsavedChanges: Boolean
})

const emit = defineEmits(['close', 'update-record', 'update-field'])

// Simple function to handle field updates
const updateField = (field, value) => {
  emit('update-field', { field, value })
}

const handleClose = () => {
  emit('close')
}

const handleSubmit = () => {
  emit('update-record')
}

const handleModalClick = () => {
  if (!props.hasUnsavedChanges) {
    emit('close')
  }
}
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

.edit-modal {
  max-width: 500px;
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

.modal-title-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.record-info {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-top: var(--space-xs);
}

.record-id-badge {
  background: var(--primary-100);
  color: var(--primary-700);
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: 600;
}

.record-name {
  color: var(--text-secondary);
  font-size: var(--text-sm);
  font-weight: 500;
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

.validation-errors {
  background: #fef2f2;
  border: 1px solid #ef4444;
  border-radius: var(--radius-md);
  padding: var(--space-md);
  margin: var(--space-md) var(--space-lg) 0;
}

.error-message {
  color: #ef4444;
  font-size: 0.875rem;
  margin-bottom: var(--space-xs);
}

.error-message:last-child {
  margin-bottom: 0;
}

.modal-body {
  padding: var(--space-xl);
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.form-label {
  font-weight: 500;
  color: var(--text-primary);
}

.required-indicator {
  color: #ef4444;
  font-weight: 600;
  margin-left: var(--space-xs);
}

.email-input-wrapper {
  position: relative;
}

.form-input {
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  transition: all 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px var(--primary-100);
}

.form-input.error {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.form-input.success {
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.form-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-error {
  color: #ef4444;
  font-size: var(--text-sm);
  margin-top: var(--space-xs);
}

.form-success {
  color: #10b981;
  font-size: var(--text-sm);
  margin-top: var(--space-xs);
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.modal-actions {
  display: flex;
  gap: var(--space-md);
  justify-content: flex-end;
  padding: var(--space-xl);
  border-top: 1px solid var(--border-light);
  background: var(--background-secondary);
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
}

.btn {
  padding: var(--space-sm) var(--space-lg);
  border-radius: var(--radius-md);
  border: 1px solid;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--surface);
  color: var(--text-secondary);
  border-color: var(--border-light);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--background-secondary);
  border-color: var(--border);
}

.btn-primary {
  background: var(--primary-500);
  color: white;
  border-color: var(--primary-500);
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-600);
  border-color: var(--primary-600);
}

.loading {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
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