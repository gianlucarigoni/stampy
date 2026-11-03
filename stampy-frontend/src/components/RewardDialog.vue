<script setup lang="ts">
import { onMounted, ref } from 'vue'

defineProps<{ reward: string; count: number }>()
const emit = defineEmits<{ close: [] }>()

// Native <dialog>: showModal() gives the focus trap, the inert background, Esc and focus
// return for free. It stays until the customer closes it (no backdrop click, no timeout).
const dialog = ref<HTMLDialogElement | null>(null)

onMounted(() => dialog.value?.showModal())
</script>

<template>
  <dialog
    ref="dialog"
    class="reward-dialog"
    aria-labelledby="reward-title"
    aria-describedby="reward-text"
    @close="emit('close')"
  >
    <div class="p-4">
      <h2 id="reward-title" class="h4">Premio sbloccato!</h2>
      <p id="reward-text" class="mb-3">
        {{ count > 1 ? `Hai ottenuto ${count} premi` : 'Hai ottenuto il premio' }}:
        <strong class="d-block fs-4 text-break">{{ reward }}</strong>
      </p>
      <p class="text-body-secondary">Mostra questa schermata al personale.</p>
      <form method="dialog" class="d-flex justify-content-end">
        <button class="btn btn-primary reward-close" autofocus>Chiudi</button>
      </form>
    </div>
  </dialog>
</template>

<style scoped>
.reward-dialog {
  width: min(24rem, calc(100vw - 2rem));
  padding: 0;
  border: 2px solid var(--stampy-brand);
  border-radius: var(--bs-border-radius-lg);
  color: var(--bs-body-color);
  background: var(--bs-body-bg);
}

.reward-dialog::backdrop {
  background: rgb(0 0 0 / 0.6);
}

.reward-close {
  min-width: 8rem;
}

@media (max-width: 400px) {
  .reward-close {
    width: 100%;
  }
}
</style>
