<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { ApiError } from '@/api/client'
import { updateDisplayName } from '@/api/endpoints'
import RateLimitAlert from '@/components/RateLimitAlert.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppField from '@/components/ui/AppField.vue'
import AppStatusLine from '@/components/ui/AppStatusLine.vue'
import { useAuth } from '@/composables/useAuth'
import { useCountdown } from '@/composables/useCountdown'
import { waitMinutes } from '@/utils/format'
import { systemMessage, type SystemMessage } from '@/utils/systemError'
import { NAME_MAX, NAME_MIN, nameProblem, normalizeName, problemFromDetails } from '@/utils/displayName'

const props = defineProps<{ initial?: string | null; submitLabel: string }>()
const emit = defineEmits<{ saved: [] }>()

const { setUser } = useAuth()
const name = ref(props.initial ?? '')
const busy = ref(false)
// The name is wrong -> `error`, under the field (the field turns invalid, focus goes to it).
// The system failed (network, 429, 5xx) -> `systemError`, an alert; the name is fine, so the field stays neutral.
const error = ref('')
const systemError = ref<SystemMessage | null>(null)
// The server's wait (429): the primary keeps its full look, its label says how long (21 §5.1).
const { remaining: waitSeconds, start: startWait } = useCountdown()
const waiting = computed(() => waitSeconds.value > 0)
const waitHint = ref(false)
const label = computed(() => (waiting.value ? `Riprova tra ${waitMinutes(waitSeconds.value)}` : props.submitLabel))
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
  if (err instanceof ApiError && err.status === 429) {
    systemError.value = null
    startWait(err.retryAfterSeconds ?? 60)
    return
  }
  // Network, 5xx, 403…: the name is fine, so the field stays neutral (N-4); the alert says what to do.
  systemError.value = systemMessage(err, 'Il nome non è stato salvato. Riprova tra poco.')
}

async function submit() {
  if (busy.value) return
  if (waiting.value) {
    waitHint.value = true
    return
  }
  const problem = nameProblem(name.value)
  if (problem) return fail(problem)
  error.value = ''
  systemError.value = null
  waitHint.value = false
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
    <AppAlert v-if="systemError" type="error" :title="systemError.title">{{ systemError.text }}</AppAlert>
    <RateLimitAlert v-if="waiting" :seconds="waitSeconds" />
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
      placeholder="Marta"
      autocomplete="name"
      autocapitalize="words"
      spellcheck="false"
      :maxlength="200"
      @input="error = ''"
    />
    <AppButton type="submit" :busy="busy" busy-label="Salvo…">{{ label }}</AppButton>
    <AppStatusLine v-if="waitHint && waiting" icon="clock">Aspetta ancora {{ waitMinutes(waitSeconds) }}</AppStatusLine>
  </form>
</template>
