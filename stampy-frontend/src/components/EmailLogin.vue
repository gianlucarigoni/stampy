<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError } from '@/api/client'
import { requestCode, verifyCode } from '@/api/endpoints'
import AppHeader from '@/components/AppHeader.vue'
import { useAuth } from '@/composables/useAuth'
import { useCountdown } from '@/composables/useCountdown'
import { formatWait } from '@/utils/format'
import { destinationAfterLogin } from '@/utils/redirect'
import { readTab, removeTab, writeTab } from '@/utils/tabStorage'

// The customer leaves for the mail app in the middle of this flow and a mobile browser may
// reload the tab meanwhile: without this they would come back to an empty form.
const STORAGE_KEY = 'stampy.login'
interface SavedLogin {
  email: string
  challengeId: string
}

const route = useRoute()
const router = useRouter()
const { setUser } = useAuth()
const { remaining: waitSeconds, start: startWait } = useCountdown()

const saved = readTab<SavedLogin>(STORAGE_KEY)
const email = ref(saved?.email ?? '')
const challengeId = ref(saved?.challengeId ?? '')
const code = ref('')
const busy = ref(false)
const error = ref('')
const notice = ref('')

const waiting = computed(() => waitSeconds.value > 0)

function showError(err: unknown, fallback: string) {
  if (err instanceof ApiError && err.status === 429) {
    error.value = ''
    startWait(err.retryAfterSeconds ?? 60)
    return
  }
  error.value = err instanceof ApiError ? err.message : fallback
}

async function sendCode() {
  if (busy.value || waiting.value) return
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    const result = await requestCode(email.value.trim())
    challengeId.value = result.challengeId
    code.value = ''
    writeTab(STORAGE_KEY, { email: email.value.trim(), challengeId: result.challengeId })
    notice.value = `Codice inviato a ${email.value.trim()}`
  } catch (err) {
    if (err instanceof ApiError && err.status === 400) error.value = 'Email non valida'
    else showError(err, 'Impossibile inviare il codice, riprova')
  } finally {
    busy.value = false
  }
}

async function submitCode() {
  if (busy.value || code.value.length !== 6) return
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    const result = await verifyCode(challengeId.value, code.value)
    removeTab(STORAGE_KEY)
    setUser(result.user)
    await router.replace(await destinationAfterLogin(route.query.next))
  } catch (err) {
    // One message for every failure, including the attempt that invalidates the code: the
    // UI cannot tell them apart, so "send a new code" stays available below.
    showError(err, 'Codice non valido o scaduto')
    code.value = ''
  } finally {
    busy.value = false
  }
}

function changeEmail() {
  removeTab(STORAGE_KEY)
  challengeId.value = ''
  code.value = ''
  error.value = ''
  notice.value = ''
}

// Digits only, submitted as soon as complete (works with the iOS/Android code autofill).
watch(code, (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 6)
  if (digits !== value) {
    code.value = digits
    return
  }
  if (digits.length === 6) void submitCode()
})
</script>

<template>
  <div class="container narrow py-3">
    <AppHeader />
    <section class="card card-body">
      <template v-if="!challengeId">
        <h1 class="h4">Accedi</h1>
        <p class="text-body-secondary">Ti mandiamo un codice via email. Niente password.</p>

        <form @submit.prevent="sendCode">
          <div class="mb-3">
            <label for="email" class="form-label fw-semibold">Email</label>
            <input
              id="email"
              v-model="email"
              class="form-control"
              type="email"
              name="email"
              autocomplete="email"
              inputmode="email"
              autocapitalize="none"
              spellcheck="false"
              required
            />
          </div>

          <p v-if="error" class="alert alert-danger" role="alert">{{ error }}</p>
          <p v-if="waiting" class="alert alert-danger" role="alert">
            Riprova tra {{ formatWait(waitSeconds) }}
          </p>

          <button
            class="btn btn-primary w-100"
            type="submit"
            :disabled="busy || waiting || !email.trim()"
          >
            {{ busy ? 'Invio…' : 'Invia il codice' }}
          </button>
        </form>
      </template>

      <template v-else>
        <h1 class="h4">Inserisci il codice</h1>
        <p class="text-body-secondary">
          Abbiamo scritto a <strong>{{ email }}</strong
          >. Il codice vale 5 minuti.
        </p>

        <form @submit.prevent="submitCode">
          <div class="mb-3">
            <label for="code" class="form-label fw-semibold">Codice a 6 cifre</label>
            <input
              id="code"
              v-model="code"
              class="form-control form-control-code"
              type="text"
              name="code"
              inputmode="numeric"
              autocomplete="one-time-code"
              required
            />
          </div>

          <p v-if="notice" class="alert alert-success" role="status">{{ notice }}</p>
          <p v-if="error" class="alert alert-danger" role="alert">{{ error }}</p>
          <p v-if="waiting" class="alert alert-danger" role="alert">
            Riprova tra {{ formatWait(waitSeconds) }}
          </p>

          <button
            class="btn btn-primary w-100"
            type="submit"
            :disabled="busy || waiting || code.length !== 6"
          >
            {{ busy ? 'Verifica…' : 'Accedi' }}
          </button>
        </form>

        <div class="d-flex flex-wrap justify-content-between column-gap-3 mt-2">
          <button type="button" class="btn btn-link px-0" :disabled="busy || waiting" @click="sendCode">
            Invia un nuovo codice
          </button>
          <button type="button" class="btn btn-link px-0" :disabled="busy" @click="changeEmail">
            Cambia email
          </button>
        </div>
      </template>
    </section>
  </div>
</template>
