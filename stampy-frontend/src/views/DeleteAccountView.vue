<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError } from '@/api/client'
import { confirmAccountDeletion, getMyVenues, requestAccountDeletion } from '@/api/endpoints'
import RateLimitAlert from '@/components/RateLimitAlert.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppField from '@/components/ui/AppField.vue'
import AppSkeleton from '@/components/ui/AppSkeleton.vue'
import AppStatusLine from '@/components/ui/AppStatusLine.vue'
import { useAuth } from '@/composables/useAuth'
import { useCountdown } from '@/composables/useCountdown'
import { waitMinutes } from '@/utils/format'
import { readTab, removeTab, writeTab } from '@/utils/tabStorage'
import { systemMessage, type SystemMessage } from '@/utils/systemError'

// Same reason as the login: the customer goes to the mail app for the code and the tab may reload.
const STORAGE_KEY = 'stampy.deleteAccount'

const router = useRouter()
const { user, accountDeleted } = useAuth()
const { remaining: waitSeconds, start: startWait, reset: resetWait } = useCountdown()

const challengeId = ref(readTab<{ challengeId: string }>(STORAGE_KEY)?.challengeId ?? '')
const code = ref('')
const codeField = ref<InstanceType<typeof AppField> | null>(null)
const resendButton = ref<InstanceType<typeof AppButton> | null>(null)
const busy = ref(false)
// Which request is running: "Invio…" goes on the button/link that was tapped, "Elimino…" only on the final confirm (21 §5.3).
const busyAction = ref<'send' | 'confirm' | ''>('')
const sending = computed(() => busy.value && busyAction.value === 'send')
const confirming = computed(() => busy.value && busyAction.value === 'confirm')
// Wrong code -> `fieldError` under the field; system failure -> `error`, an alert (pattern 5.1).
const error = ref<SystemMessage | null>(null)
const fieldError = ref('')
const waitHint = ref(false)
const notice = ref('')
const codeDead = ref(false)
// Owners and staff cannot delete their account from here (BACKLOG B4b). The backend answers 403
// anyway: this only avoids offering a button that cannot work.
const blocked = ref(false)
// Until `GET /venues/mine` answers we do not know whether to offer the deletion: a placeholder keeps the card from
// jumping when a member's warning replaces the steps (21 §5.5).
const known = ref(false)
// Which request the server asked to wait for: a wait on the final confirm swaps the red button for a quiet one.
const waitKind = ref<'send' | 'confirm'>('send')

const waiting = computed(() => waitSeconds.value > 0)
const waitHintText = computed(() => `Aspetta ancora ${waitMinutes(waitSeconds.value)}`)
const sendLabel = computed(() =>
  waiting.value && waitKind.value === 'send' ? `Riprova tra ${waitMinutes(waitSeconds.value)}` : 'Continua: invia il codice',
)
const confirmWaiting = computed(() => waiting.value && waitKind.value === 'confirm')
const retryLabel = computed(() => `Riprova tra ${waitMinutes(waitSeconds.value)}`)
watch(waiting, (on) => {
  if (!on) waitHint.value = false
})

onMounted(async () => {
  try {
    if ((await getMyVenues()).venues.length > 0) blocked.value = true
  } catch {
    /* the 403 from the server is the real check */
  } finally {
    known.value = true
  }
})

const blockedMessage = 'Questo account gestisce un locale e non può essere eliminato da qui.'

function showError(err: unknown, networkText: string) {
  if (err instanceof ApiError && err.status === 403) {
    blocked.value = true
    challengeId.value = ''
    removeTab(STORAGE_KEY)
    return
  }
  if (err instanceof ApiError && err.status === 429) {
    error.value = null
    startWait(err.retryAfterSeconds ?? 60)
    return
  }
  error.value = systemMessage(err, networkText)
}

function showCodeError(err: unknown) {
  if (err instanceof ApiError && err.code === 'InvalidCode') {
    const left = err.attemptsRemaining ?? 0
    if (left <= 0) {
      codeDead.value = true
      resetWait()
      code.value = ''
      fieldError.value = 'Codice non valido. Hai finito i tentativi: richiedi un nuovo codice.'
    } else {
      fieldError.value = `Codice non valido. ${left === 1 ? 'Ultimo tentativo' : `Ti restano ${left} tentativi`}.`
    }
    code.value = '' // only a wrong code is cleared: after a network error the typed code stays (D20)
    return
  }
  if (err instanceof ApiError && err.code === 'CodeExpired') {
    codeDead.value = true
    resetWait()
    fieldError.value = 'Codice scaduto. Richiedi un nuovo codice.'
    code.value = ''
    return
  }
  waitKind.value = 'confirm'
  showError(err, 'Riprova: il tuo codice è ancora valido.')
}

async function sendCode() {
  if (busy.value) return
  if (waiting.value) {
    waitHint.value = true
    return
  }
  waitKind.value = 'send'
  busy.value = true
  busyAction.value = 'send'
  error.value = null
  fieldError.value = ''
  notice.value = ''
  const resend = challengeId.value !== ''
  try {
    const result = await requestAccountDeletion()
    challengeId.value = result.challengeId
    codeDead.value = false
    code.value = ''
    writeTab(STORAGE_KEY, { challengeId: result.challengeId })
    // First send: the "Abbiamo scritto a…" text already says it. Only a resend needs feedback.
    if (resend) notice.value = 'Nuovo codice inviato.'
    await nextTick()
    codeField.value?.focus()
  } catch (err) {
    showError(err, 'Controlla la connessione. Se continua, riprova tra poco.')
  } finally {
    busy.value = false
    busyAction.value = ''
  }
}

async function confirmDeletion() {
  if (busy.value) return
  if (confirmWaiting.value) {
    waitHint.value = true
    return
  }
  if (codeDead.value) {
    // The code can no longer be used: the field already says why, the way forward is the new-code button.
    ;(resendButton.value?.$el as HTMLElement | undefined)?.focus()
    return
  }
  // The button is never disabled: with fewer than 6 digits the tap says why and moves to the field (D20, pattern 5.2).
  if (code.value.length !== 6) {
    fieldError.value = 'Scrivi le 6 cifre.'
    await nextTick()
    codeField.value?.focus()
    return
  }
  busy.value = true
  busyAction.value = 'confirm'
  error.value = null
  fieldError.value = ''
  notice.value = ''
  try {
    await confirmAccountDeletion(challengeId.value, code.value)
    accountDeleted()
    await router.replace({ name: 'login', query: { deleted: '1' } })
  } catch (err) {
    showCodeError(err)
  } finally {
    busy.value = false
    busyAction.value = ''
  }
}

// Always the profile route, never `router.back()` (21 §5.3): where the customer came from may be anywhere.
function cancel() {
  if (busy.value) return
  removeTab(STORAGE_KEY)
  void router.push({ name: 'profile' })
}

// Digits only. Unlike the login, it does NOT submit by itself: this action cannot be undone.
watch(code, (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 6)
  if (digits !== value) code.value = digits
  if (digits && !codeDead.value) fieldError.value = ''
})
</script>

<template>
  <section class="card card-body">
    <h1 class="h4">Elimina il tuo account</h1>

    <AppSkeleton v-if="!known" :lines="4" height="1.25rem" label="Caricamento…" />

    <template v-else-if="blocked">
      <AppAlert type="warning" role="alert">{{ blockedMessage }}</AppAlert>
      <AppButton variant="secondary" @click="cancel">Torna al profilo</AppButton>
    </template>

    <template v-else-if="!challengeId">
      <!-- Wording of the warning is unchanged until it is validated (D18, B24): only the layout follows 21 §5.3. -->
      <AppAlert type="warning" title="Non si può annullare.">
        Se continui tutti i dati dell'account vengono eliminati, comprese le card dei tuoi posti preferiti
      </AppAlert>
      <p class="text-body-emphasis">Per motivi sicurezza dovrai confermare l'operazione tramite un codice che ti verrà inviato via email.</p>

      <AppAlert v-if="error" type="error" :title="error.title">{{ error.text }}</AppAlert>
      <RateLimitAlert v-if="waiting" :seconds="waitSeconds" />

      <!-- Step 1 is neutral, not red (D19): red only marks the irreversible step. -->
      <AppButton :busy="sending" busy-label="Invio…" @click="sendCode">{{ sendLabel }}</AppButton>
      <AppStatusLine v-if="waitHint" icon="clock">{{ waitHintText }}</AppStatusLine>
      <AppButton variant="secondary" class="exit-gap" @click="cancel">Torna al profilo</AppButton>
    </template>

    <template v-else>
      <div class="swap">
        <p class="text-body-secondary" :class="{ 'swap-hidden': notice }">
          Abbiamo scritto a <strong class="text-break">{{ user?.email }}</strong
          >. Il codice vale 5 minuti.
        </p>
        <AppStatusLine v-if="notice" class="swap-top">{{ notice }}</AppStatusLine>
      </div>

      <AppAlert v-if="error" type="error" :title="error.title">{{ error.text }}</AppAlert>
      <RateLimitAlert v-if="waiting" :seconds="waitSeconds" />

      <!-- "New code" sits ABOVE the field, far from the red button (21 §5.3). -->
      <div v-if="!codeDead" class="mb-2">
        <AppButton ref="resendButton" variant="link" :block="false" :busy="sending" busy-label="Invio…" @click="sendCode">
          Invia un nuovo codice
        </AppButton>
      </div>

      <form novalidate @submit.prevent="confirmDeletion">
        <AppField
          id="code"
          ref="codeField"
          :model-value="codeDead ? 'Codice non più valido' : code"
          label="Codice a 6 cifre"
          hint="Qui il codice non si invia da solo."
          :error="fieldError"
          :dead="codeDead"
          :code="!codeDead"
          :busy="confirming"
          type="text"
          name="code"
          inputmode="numeric"
          autocomplete="one-time-code"
          required
          @update:model-value="code = $event"
        />
        <!-- Never disabled (D20): the 6-digit code is the gate, a tap with fewer digits says so. -->
        <AppButton v-if="codeDead" ref="resendButton" :busy="sending" busy-label="Invio…" @click="sendCode">Invia un nuovo codice</AppButton>
        <AppButton v-else-if="confirmWaiting" variant="secondary" @click="confirmDeletion">{{ retryLabel }}</AppButton>
        <AppButton v-else type="submit" variant="danger" class="app-btn-tall" :busy="confirming" busy-label="Elimino…">
          Elimina definitivamente il mio account
        </AppButton>
      </form>
      <AppStatusLine v-if="waitHint" icon="clock">{{ waitHintText }}</AppStatusLine>
      <AppButton variant="secondary" class="exit-gap" @click="cancel">Torna al profilo</AppButton>
    </template>
  </section>
</template>

<style scoped>
.exit-gap {
  margin-top: 1rem;
}
.swap {
  display: grid;
}
.swap > * {
  grid-area: 1 / 1;
  margin-top: 0;
}
.swap-hidden {
  visibility: hidden;
}
</style>
