<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
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
const { remaining: waitSeconds, start: startWait, reset: resetWait } = useCountdown()

const saved = readTab<SavedLogin>(STORAGE_KEY)
const email = ref(saved?.email ?? '')
const challengeId = ref(saved?.challengeId ?? '')
const code = ref('')
const codeInput = ref<HTMLInputElement | null>(null)
const busy = ref(false)
const error = ref('')
// After deleting the account the app lands here: say it worked.
const notice = ref(route.query.deleted === '1' ? 'Account eliminato. Puoi sempre rientrare con la tua email.' : '')
// The current code can no longer be used (expired, or out of attempts): only "new code" is left.
const codeDead = ref(false)

// The server's waits are per recipient: a countdown only means something for the email that
// caused it. Another address starts clean.
let waitEmail = ''
const waiting = computed(() => waitSeconds.value > 0)
// Screen readers hear a coarse message that changes at most once a minute; the per-second
// countdown is visual only (A11Y-03), otherwise it would be announced every second.
const waitAnnouncement = computed(() =>
  waitSeconds.value > 60
    ? `Riprova tra ${Math.ceil(waitSeconds.value / 60)} minuti`
    : 'Riprova tra meno di un minuto',
)
watch(email, (value) => {
  if (waitSeconds.value > 0 && value.trim().toLowerCase() !== waitEmail) resetWait()
})

function showError(err: unknown, fallback: string) {
  if (err instanceof ApiError && err.status === 429) {
    error.value = ''
    waitEmail = email.value.trim().toLowerCase()
    startWait(err.retryAfterSeconds ?? 60)
    return
  }
  error.value = err instanceof ApiError ? err.message : fallback
}

// "Non valido" = wrong code on a live challenge; "scaduto" = the challenge is gone (time,
// attempts used up, already used, replaced). The backend tells them apart.
function showCodeError(err: unknown) {
  if (err instanceof ApiError && err.code === 'InvalidCode') {
    const left = err.attemptsRemaining ?? 0
    if (left <= 0) {
      codeDead.value = true
      resetWait() // a pending "wait before a new code" no longer applies: the backend lets a dead code be replaced at once
      error.value = 'Codice non valido. Hai finito i tentativi: richiedi un nuovo codice.'
    } else {
      error.value = `Codice non valido. ${left === 1 ? 'Ti resta 1 tentativo' : `Ti restano ${left} tentativi`}.`
    }
    return
  }
  if (err instanceof ApiError && err.code === 'CodeExpired') {
    codeDead.value = true
    resetWait()
    error.value = 'Codice scaduto. Richiedi un nuovo codice.'
    return
  }
  showError(err, 'Impossibile verificare il codice, riprova')
}

async function sendCode() {
  if (busy.value || waiting.value) return
  busy.value = true
  error.value = ''
  notice.value = ''
  const resend = challengeId.value !== ''
  try {
    const result = await requestCode(email.value.trim())
    challengeId.value = result.challengeId
    codeDead.value = false
    code.value = ''
    writeTab(STORAGE_KEY, { email: email.value.trim(), challengeId: result.challengeId })
    // First send: the "Abbiamo scritto a…" text already says it. Only a resend needs feedback.
    if (resend) notice.value = `Codice inviato a ${email.value.trim()}`
    await nextTick()
    codeInput.value?.focus() // the code field replaces the email one: keep the keyboard flow going
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
    showCodeError(err)
    code.value = ''
  } finally {
    busy.value = false
  }
}

function changeEmail() {
  resetWait()
  removeTab(STORAGE_KEY)
  challengeId.value = ''
  codeDead.value = false
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
    <main id="main" tabindex="-1">
    <section class="card card-body">
      <template v-if="!challengeId">
        <h1 class="h4">Accedi</h1>
        <p class="text-body-secondary">Ti mandiamo un codice via email. Niente password.</p>

        <p v-if="notice" class="alert alert-success" role="status">{{ notice }}</p>

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
              :aria-invalid="error ? 'true' : undefined"
              :aria-describedby="error ? 'login-error' : undefined"
            />
          </div>

          <p v-if="error" id="login-error" class="alert alert-danger" role="alert">{{ error }}</p>
          <p v-if="waiting" class="alert alert-warning">
            <span aria-hidden="true">Riprova tra {{ formatWait(waitSeconds) }}</span>
            <span class="visually-hidden" role="status">{{ waitAnnouncement }}</span>
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
              :disabled="codeDead"
              required
              ref="codeInput"
              :aria-invalid="error ? 'true' : undefined"
              :aria-describedby="error ? 'login-error' : undefined"
            />
          </div>

          <p v-if="notice" class="alert alert-success" role="status">{{ notice }}</p>
          <p v-if="error" id="login-error" class="alert alert-danger" role="alert">{{ error }}</p>
          <p v-if="waiting" class="alert alert-warning">
            <span aria-hidden="true">Riprova tra {{ formatWait(waitSeconds) }}</span>
            <span class="visually-hidden" role="status">{{ waitAnnouncement }}</span>
          </p>

          <button
            class="btn btn-primary w-100"
            type="submit"
            :disabled="busy || waiting || codeDead || code.length !== 6"
          >
            {{ busy ? 'Verifica…' : 'Accedi' }}
          </button>
        </form>

        <div class="d-flex flex-wrap justify-content-between column-gap-3 mt-2">
          <button
            type="button"
            :class="codeDead ? 'btn btn-primary' : 'btn btn-link px-0'"
            :disabled="busy || waiting"
            @click="sendCode"
          >
            Invia un nuovo codice
          </button>
          <button type="button" class="btn btn-link px-0" :disabled="busy" @click="changeEmail">
            Cambia email
          </button>
        </div>
      </template>
    </section>
    </main>
  </div>
</template>
