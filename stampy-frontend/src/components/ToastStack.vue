<script setup lang="ts">
export interface Toast {
  id: string
  text: string
}

defineProps<{ toasts: Toast[] }>()
const emit = defineEmits<{ dismiss: [id: string] }>()
</script>

<template>
  <!-- Non-blocking: fixed at the bottom, never takes focus; the live region announces it. -->
  <div class="toast-stack" role="status" aria-live="polite">
    <div v-for="toast in toasts" :key="toast.id" class="alert alert-success toast-item" >
      <span class="toast-text"><strong>✔ Premio ritirato</strong> · {{ toast.text }}</span>
      <button type="button" class="btn-close" aria-label="Chiudi notifica" @click="emit('dismiss', toast.id)" />
    </div>
  </div>
</template>

<style scoped>
.toast-stack {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0 1rem 1rem;
  pointer-events: none;
}

.toast-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  width: 100%;
  max-width: 28rem;
  margin: 0;
  box-shadow: 0 0.5rem 1rem rgb(0 0 0 / 0.25);
  pointer-events: auto;
}

.toast-text {
  flex: 1;
}

/* Bootstrap's close button is not imported: a plain text X is enough. */
.btn-close {
  min-height: 2.75rem;
  min-width: 2.75rem;
  margin: -0.5rem -0.75rem -0.5rem 0;
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 1.25rem;
  line-height: 1;
}

.btn-close::before {
  content: '×';
}
</style>
