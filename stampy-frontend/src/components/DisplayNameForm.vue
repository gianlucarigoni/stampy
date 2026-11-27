<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { ApiError } from '@/api/client'
import { updateDisplayName } from '@/api/endpoints'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppField from '@/components/ui/AppField.vue'
import { useAuth } from '@/composables/useAuth'
import { NAME_MAX, NAME_MIN, nameProblem, normalizeName, problemFromDetails } from '@/utils/displayName'

const props = defineProps<{ initial?: string | null; submitLabel: string }>()
const emit = defineEmits<{ saved: [] }>()

const { setUser } = useAuth()
const name = ref(props.initial ?? '')
const busy = ref(false)
// The name is wrong -> `error`, under the field (the field turns invalid, focus goes to it).
// The system failed (network, 429, 5xx) -> `systemError`, an alert; the name is fine, so the field stays neutral.
const error = ref('')
const systemError = ref('')
const field = ref<InstanceType<typeof AppField> | null>(null)

// For the parent: move the keyboard focus to the field (e.g. when the form is opened on a click).
defineExpose({ focus: () => field.value?.focus() })

/** Shows the message under the field and puts the focus back on it, so keyboard and screen-reader users land on it. */
async function fail(message: string) {
  error.value = message
  await nextTick()
  field.value?.focus()
}

async function failFor(err: unknown) {
  // The local rule passed but the server refused: the server is right, say why if it tells.
  if (err instanceof ApiError && err.status === 400) return fail(problemFromDetails(err.details))
  if (!(err instanceof ApiError)) systemError.value = 'Errore interno'
  else if (err.status === 429) {
    systemError.value = err.retryAfterSeconds
      ? `Troppi tentativi, riprova tra ${err.retryAfterSeconds} secondi`
      : 'Troppi tentativi, riprova più tardi'
  } else systemError.value = err.message // 401 (the router already sends to login), 403, timeout/network: the client's own Italian text
}

async function submit() {
  if (busy.value) return
  const problem = nameProblem(name.value)
  if (problem) return fail(problem)
  error.value = ''
  systemError.value = ''
  busy.value = true
  try {
    const { user } = await updateDisplayName(normalizeName(name.value))
    setUser(user)
    emit('saved')
  } catch (err) {
    await failFor(err)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <form novalidate @submit.prevent="submit">
    <AppAlert v-if="systemError" type="error">{{ systemError }}</AppAlert>
    <AppField
      id="display-name"
      ref="field"
      v-model="name"
      label="Il tuo nome"
      :hint="`Da ${NAME_MIN} a ${NAME_MAX} caratteri.`"
      :error="error"
      :busy="busy"
      type="text"
      name="displayName"
      autocomplete="name"
      autocapitalize="words"
      spellcheck="false"
      :maxlength="200"
      @input="error = ''"
    />
    <AppButton type="submit" :busy="busy" busy-label="Salvo…">{{ submitLabel }}</AppButton>
  </form>
</template>
