<script setup lang="ts">
// "Esci" asks first (D32): rejoining costs an email and a 6-digit code, in the middle of service. Native <dialog>
// (focus trap and Esc for free). The safe answer is the primary button; "Esci" is the secondary, 16 px below.
import { nextTick, ref, watch } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'

const props = defineProps<{ open: boolean; busy?: boolean }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()
const dialog = ref<HTMLDialogElement | null>(null)

watch(
  () => props.open,
  async (open) => {
    await nextTick()
    if (open && !dialog.value?.open) dialog.value?.showModal()
    if (!open && dialog.value?.open) dialog.value.close()
  },
  { immediate: true },
)
</script>

<template>
  <dialog ref="dialog" class="signout-dialog" aria-labelledby="signout-title" @cancel.prevent="emit('cancel')" @click.self="emit('cancel')">
    <div class="d-grid gap-3">
      <h2 id="signout-title" class="h5 mb-0">Vuoi uscire?</h2>
      <p class="mb-0 text-body-secondary">Per rientrare ti servirà un nuovo codice via email.</p>
      <AppButton compact @click="emit('cancel')">Resta connesso</AppButton>
      <AppButton compact variant="secondary" :busy="busy" busy-label="Esco…" @click="emit('confirm')">Esci</AppButton>
    </div>
  </dialog>
</template>

<style scoped>
.signout-dialog {
  width: min(24rem, calc(100vw - 2rem));
  padding: 1.25rem;
  color: var(--app-text);
  background: var(--app-surface);
  border: 1.5px solid var(--app-field);
  border-radius: 1.125rem;
}
.signout-dialog::backdrop {
  background: var(--app-scrim);
}
</style>
