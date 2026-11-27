<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError } from '@/api/client'
import { googleLogin, requestCode, verifyCode } from '@/api/endpoints'
import AppHeader from '@/components/AppHeader.vue'
import GoogleSignInButton from '@/components/GoogleSignInButton.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppField from '@/components/ui/AppField.vue'
import AppStatusLine from '@/components/ui/AppStatusLine.vue'
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
const emailField = ref<InstanceType<typeof AppField> | null>(null)
const codeField = ref<InstanceType<typeof AppField> | null>(null)
const resendButton = ref<InstanceType<typeof AppButton> | null>(null)
const busy = ref(false)
// Which request is running, so the label that says "Invio…" / "Verifica…" is on the right button (21 §5.3).
const busyAction = ref<'send' | 'verify' | ''>('')
const sending = computed(() => busy.value && busyAction.value === 'send')
const verifying = computed(() => busy.value && busyAction.value === 'verify')
// Google sign-in in progress (the popup closed, the app is finishing the login): the e-mail form
// stays disabled but must not say it is sending anything, so this is separate from `busy`.
const googleBusy = ref(false)
// Two kinds of error (pattern 5.1): the value is wrong -> `fieldError`, under the field, which becomes invalid;
// the system failed (network, 5xx, Google) -> `error`, an alert on top of the card, and the field stays neutral.
const error = ref('')
const fieldError = ref('')
// "Wait N min" asked by the server: a tap before it expires says so in a status line instead of a dead button (21 §5.1, 429).
const waitHint = ref(false)
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
const waitHintText = computed(() =>
  waitSeconds.value > 60 ? `Aspetta ancora ${Math.ceil(waitSeconds.value / 60)} min` : 'Aspetta ancora meno di un minuto',
)
watch(waiting, (on) => {
  if (!on) waitHint.value = false
})
// What the field asks for is checked on the tap, not while typing; the error goes away once the value is valid.
const EMAIL_RE = /^\S+@\S+\.\S+$/
const EMAIL_PROBLEM = "Controlla l'indirizzo: manca la @ o il dominio."
watch(email, (value) => {
  if (waitSeconds.value > 0 && value.trim().toLowerCase() !== waitEmail) resetWait()
  if (fieldError.value && EMAIL_RE.test(value.trim())) fieldError.value = ''
})

/** Shows the message under the field and puts the focus on it (pattern 5.2). */
async function fieldFail(message: string, target: typeof emailField) {
  fieldError.value = message
  await nextTick()
  target.value?.focus()
}

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
      fieldError.value = 'Codice non valido. Hai finito i tentativi: richiedi un nuovo codice.'
    } else {
      fieldError.value = `Codice non valido. ${left === 1 ? 'Ti resta 1 tentativo' : `Ti restano ${left} tentativi`}.`
    }
    return
  }
  if (err instanceof ApiError && err.code === 'CodeExpired') {
    codeDead.value = true
    resetWait()
    fieldError.value = 'Codice scaduto. Richiedi un nuovo codice.'
    return
  }
  showError(err, 'Impossibile verificare il codice, riprova')
}

async function sendCode() {
  if (busy.value || googleBusy.value) return
  if (waiting.value) {
    waitHint.value = true
    return
  }
  const resend = challengeId.value !== ''
  if (!resend && !EMAIL_RE.test(email.value.trim())) return fieldFail(EMAIL_PROBLEM, emailField)
  busy.value = true
  busyAction.value = 'send'
  error.value = ''
  fieldError.value = ''
  notice.value = ''
  try {
    const result = await requestCode(email.value.trim())
    challengeId.value = result.challengeId
    codeDead.value = false
    code.value = ''
    writeTab(STORAGE_KEY, { email: email.value.trim(), challengeId: result.challengeId })
    // First send: the "Abbiamo scritto a…" text already says it. Only a resend needs feedback.
    if (resend) notice.value = `Codice inviato a ${email.value.trim()}`
    await nextTick()
    codeField.value?.focus() // the code field replaces the email one: keep the keyboard flow going
  } catch (err) {
    if (err instanceof ApiError && err.status === 400) await fieldFail(EMAIL_PROBLEM, emailField)
    else showError(err, 'Impossibile inviare il codice, riprova')
  } finally {
    busy.value = false
    busyAction.value = ''
  }
}

async function submitCode() {
  if (busy.value) return
  if (codeDead.value) {
    // The code can no longer be used: the field already says why, the way forward is the new-code button.
    ;(resendButton.value?.$el as HTMLElement | undefined)?.focus()
    return
  }
  if (code.value.length !== 6) return fieldFail('Scrivi le 6 cifre.', codeField)
  busy.value = true
  busyAction.value = 'verify'
  error.value = ''
  fieldError.value = ''
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
    busyAction.value = ''
  }
}

// Google sign-in (POST /auth/google). The backend decides whether the address is acceptable:
// 403 carries its own message ("usa il codice via email"), 401 means the token did not verify.
async function signInWithGoogle(idToken: string) {
  if (busy.value || googleBusy.value) return
  googleBusy.value = true
  error.value = ''
  fieldError.value = ''
  notice.value = ''
  try {
    const result = await googleLogin(idToken)
    removeTab(STORAGE_KEY)
    setUser(result.user)
    await router.replace(await destinationAfterLogin(route.query.next))
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) error.value = err.message
    else if (err instanceof ApiError && err.status === 401) error.value = 'Accesso con Google non riuscito, riprova'
    else if (err instanceof ApiError && err.status === 503)
      error.value = 'Accesso con Google non disponibile: usa il codice via email'
    else showError(err, 'Accesso con Google non riuscito, riprova')
  } finally {
    googleBusy.value = false
  }
}

function changeEmail() {
  if (busy.value) return
  resetWait()
  removeTab(STORAGE_KEY)
  challengeId.value = ''
  codeDead.value = false
  code.value = ''
  error.value = ''
  fieldError.value = ''
  notice.value = ''
}

// Digits only, submitted as soon as complete (works with the iOS/Android code autofill).
watch(code, (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 6)
  if (digits !== value) {
    code.value = digits
    return
  }
  if (digits && !codeDead.value) fieldError.value = ''
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

        <AppAlert v-if="notice" type="success">{{ notice }}</AppAlert>
        <AppAlert v-if="error" type="error">{{ error }}</AppAlert>
        <AppAlert v-if="waiting" type="warning" :announce="false">
          <span aria-hidden="true">Riprova tra {{ formatWait(waitSeconds) }}</span>
          <span class="visually-hidden" role="status">{{ waitAnnouncement }}</span>
        </AppAlert>

        <form novalidate @submit.prevent="sendCode">
          <AppField
            id="email"
            ref="emailField"
            v-model="email"
            label="Email"
            :error="fieldError"
            type="email"
            name="email"
            autocomplete="email"
            inputmode="email"
            autocapitalize="none"
            spellcheck="false"
            required
          />
          <AppButton type="submit" :busy="sending" busy-label="Invio…">Invia il codice</AppButton>
          <AppStatusLine v-if="waitHint" icon="clock">{{ waitHintText }}</AppStatusLine>
        </form>

        <GoogleSignInButton @credential="signInWithGoogle" />
      </template>

      <template v-else>
        <h1 class="h4">Inserisci il codice</h1>
        <p class="text-body-secondary">
          Abbiamo scritto a <strong>{{ email }}</strong
          >. Il codice vale 5 minuti.
        </p>

        <AppAlert v-if="notice" type="success">{{ notice }}</AppAlert>
        <AppAlert v-if="error" type="error">{{ error }}</AppAlert>
        <AppAlert v-if="waiting" type="warning" :announce="false">
          <span aria-hidden="true">Riprova tra {{ formatWait(waitSeconds) }}</span>
          <span class="visually-hidden" role="status">{{ waitAnnouncement }}</span>
        </AppAlert>

        <form novalidate @submit.prevent="submitCode">
          <AppField
            id="code"
            ref="codeField"
            v-model="code"
            label="Codice a 6 cifre"
            :error="fieldError"
            :dead="codeDead"
            code
            type="text"
            name="code"
            inputmode="numeric"
            autocomplete="one-time-code"
            required
          />
          <AppButton type="submit" :busy="verifying" busy-label="Verifica…">Accedi</AppButton>
        </form>

        <div class="d-flex flex-wrap justify-content-between column-gap-3 mt-2">
          <AppButton
            ref="resendButton"
            :variant="codeDead ? 'primary' : 'link'"
            :block="codeDead"
            :busy="sending"
            busy-label="Invio…"
            @click="sendCode"
          >
            Invia un nuovo codice
          </AppButton>
          <AppButton variant="link" :block="false" @click="changeEmail">Cambia email</AppButton>
        </div>
        <AppStatusLine v-if="waitHint" icon="clock">{{ waitHintText }}</AppStatusLine>
      </template>
    </section>
    </main>
  </div>
</template>
