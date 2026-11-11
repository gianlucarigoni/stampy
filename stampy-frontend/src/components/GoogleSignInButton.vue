<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { renderGoogleButton } from '@/utils/googleIdentity'

const emit = defineEmits<{ credential: [idToken: string] }>()

// No client ID configured (or the script could not load): no button, e-mail login stays.
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
const container = ref<HTMLDivElement | null>(null)
const available = ref(Boolean(clientId))

onMounted(async () => {
  if (!clientId || !container.value) return
  const width = Math.min(400, Math.max(200, Math.round(container.value.clientWidth)))
  try {
    await renderGoogleButton(container.value, clientId, (idToken) => emit('credential', idToken), width)
  } catch {
    available.value = false
  }
})
</script>

<template>
  <div v-if="available">
    <div class="d-flex align-items-center gap-2 my-3 text-body-secondary">
      <hr class="flex-grow-1 m-0" />
      <span>oppure</span>
      <hr class="flex-grow-1 m-0" />
    </div>
    <div ref="container" class="d-flex justify-content-center"></div>
  </div>
</template>
