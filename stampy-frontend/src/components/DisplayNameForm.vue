<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { ApiError } from '@/api/client'
import { updateDisplayName } from '@/api/endpoints'
import { useAuth } from '@/composables/useAuth'
import { NAME_MAX, NAME_MIN, nameProblem, normalizeName, problemFromDetails } from '@/utils/displayName'

const props = defineProps<{ initial?: string | null; submitLabel: string }>()
const emit = defineEmits<{ saved: [] }>()

const { setUser } = useAuth()
const name = ref(props.initial ?? '')
const busy = ref(false)
const error = ref('')
const input = ref<HTMLInputElement | null>(null)

// For the parent: move the keyboard focus to the field (e.g. when the form is opened on a click).
defineExpose({ focus: () => input.value?.focus() })

/** Shows the message and puts the focus back on the field, so keyboard and screen-reader users land on it. */
async function fail(message: string) {
  error.value = message
  await nextTick()
  input.value?.focus()
}

function messageFor(err: unknown): string {
  if (!(err instanceof ApiError)) return 'Errore interno'
  // The local rule passed but the server refused: the server is right, say why if it tells.
  if (err.status === 400) return problemFromDetails(err.details)
  if (err.status === 429) {
    return err.retryAfterSeconds ? `Troppi tentativi, riprova tra ${err.retryAfterSeconds} secondi` : 'Troppi tentativi, riprova più tardi'
  }
  return err.message // 401 (the router already sends to login), 403, timeout/network: the client's own Italian text
}

async function submit() {
  if (busy.value) return
  const problem = nameProblem(name.value)
  if (problem) return fail(problem)
  error.value = ''
  busy.value = true
  try {
    const { user } = await updateDisplayName(normalizeName(name.value))
    setUser(user)
    emit('saved')
  } catch (err) {
    await fail(messageFor(err))
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
        ref="input"
        v-model="name"
        class="form-control"
        :class="{ 'is-invalid': error }"
        :readonly="busy"
        type="text"
        name="displayName"
        autocomplete="name"
        autocapitalize="words"
        spellcheck="false"
        :maxlength="200"
        :aria-invalid="error ? 'true' : undefined"
        @input="error = ''"
        :aria-describedby="error ? 'display-name-hint display-name-error' : 'display-name-hint'"
      />
      <div id="display-name-hint" class="form-text">Da {{ NAME_MIN }} a {{ NAME_MAX }} caratteri.</div>
    </div>
    <p v-if="error" id="display-name-error" class="alert alert-danger" role="alert">{{ error }}</p>
    <button class="btn btn-primary w-100" type="submit" :disabled="busy || !name.trim()">
      {{ busy ? 'Salvo…' : submitLabel }}
    </button>
  </form>
</template>
