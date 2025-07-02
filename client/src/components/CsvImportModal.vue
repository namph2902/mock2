<template>
  <!-- CSV Import Modal -->
  <div v-if="showCsvModal" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content modal-large" @click.stop>
      <div class="modal-header">
        <h3 class="text-lg font-semibold">Import CSV to {{ currentTable }}</h3>
        <button @click="$emit('close')" class="modal-close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <div class="space-y-4">
        <div class="bg-blue-50 p-4 rounded-lg">
          <h4 class="font-medium mb-2">Detected Columns:</h4>
          <div class="flex flex-wrap gap-2">
            <span 
              v-for="header in csvHeaders" 
              :key="header"
              class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
            >
              {{ header }}
            </span>
          </div>
        </div>
        
        <div>
          <h4 class="font-medium mb-2">Preview (first 5 rows):</h4>
          <div class="overflow-x-auto">
            <table class="table">
              <thead>
                <tr>
                  <th v-for="header in csvHeaders" :key="header">{{ header }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in csvPreview" :key="index">
                  <td v-for="header in csvHeaders" :key="header">
                    {{ row[header] }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <div class="flex gap-md justify-end">
          <button @click="$emit('close')" class="btn btn-secondary">
            Cancel
          </button>
          <button @click="$emit('import-csv')" class="btn btn-primary">
            Import to {{ currentTable }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  showCsvModal: Boolean,
  currentTable: String,
  csvHeaders: Array,
  csvPreview: Array
})

const emit = defineEmits(['close', 'import-csv'])
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

.modal-large {
  max-width: 800px;
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

.space-y-4 {
  padding: var(--space-xl);
}

.bg-blue-50 {
  background: #eff6ff;
}

.p-4 {
  padding: 1rem;
}

.rounded-lg {
  border-radius: var(--radius-lg);
}

.font-medium {
  font-weight: 500;
}

.mb-2 {
  margin-bottom: 0.5rem;
}

.flex {
  display: flex;
}

.flex-wrap {
  flex-wrap: wrap;
}

.gap-2 {
  gap: 0.5rem;
}

.gap-md {
  gap: 0.75rem;
}

.justify-end {
  justify-content: flex-end;
}

.px-3 {
  padding-left: 0.75rem;
  padding-right: 0.75rem;
}

.py-1 {
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
}

.bg-blue-100 {
  background: #dbeafe;
}

.text-blue-800 {
  color: #1e40af;
}

.rounded-full {
  border-radius: 9999px;
}

.text-sm {
  font-size: 0.875rem;
}

.overflow-x-auto {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th,
.table td {
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--border-light);
  text-align: left;
}

.table th {
  background: var(--background-secondary);
  font-weight: 500;
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