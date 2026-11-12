<script setup lang="ts">
import { ref } from 'vue'
import { ApiError } from '@/api/client'
import { updateDisplayName } from '@/api/endpoints'
import { useAuth } from '@/composables/useAuth'
import { NAME_MAX, nameProblem, normalizeName } from '@/utils/displayName'

const props = defineProps<{ initial?: string | null; submitLabel: string }>()
const emit = defineEmits<{ saved: [] }>()

const { setUser } = useAuth()
const name = ref(props.initial ?? '')
const busy = ref(false)
const error = ref('')

async function submit() {
  if (busy.value) return
  error.value = nameProblem(name.value)
  if (error.value) return
  busy.value = true
  try {
    const { user } = await updateDisplayName(normalizeName(name.value))
    setUser(user)
    emit('saved')
  } catch (err) {
    if (err instanceof ApiError && err.status === 400) error.value = 'Nome non valido: controlla i caratteri e la lunghezza'
    else error.value = err instanceof ApiError ? err.message : 'Errore interno'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <form novalidate @submit.prevent="submit">
    <div class="mb-3">
      <label for="display-name" class="form-label fw-semibold">Il tuo nome</label>
      <input
        id="display-name"
        v-model="name"
        class="form-control"
        type="text"
        name="displayName"
        autocomplete="name"
        :maxlength="NAME_MAX + 10"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="error ? 'display-name-error' : undefined"
      />
    </div>
    <p v-if="error" id="display-name-error" class="alert alert-danger" role="alert">{{ error }}</p>
    <button class="btn btn-primary w-100" type="submit" :disabled="busy || !name.trim()">
      {{ busy ? 'Salvo…' : submitLabel }}
    </button>
  </form>
</template>
