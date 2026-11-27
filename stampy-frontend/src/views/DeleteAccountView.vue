<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError } from '@/api/client'
import { confirmAccountDeletion, getMyVenues, requestAccountDeletion } from '@/api/endpoints'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppField from '@/components/ui/AppField.vue'
import AppStatusLine from '@/components/ui/AppStatusLine.vue'
import { useAuth } from '@/composables/useAuth'
import { useCountdown } from '@/composables/useCountdown'
import { formatWait } from '@/utils/format'
import { readTab, removeTab, writeTab } from '@/utils/tabStorage'

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
const error = ref('')
const fieldError = ref('')
const waitHint = ref(false)
const notice = ref('')
const codeDead = ref(false)
// Owners and staff cannot delete their account from here (BACKLOG B4b). The backend answers 403
// anyway: this only avoids offering a button that cannot work.
const blocked = ref(false)

const waiting = computed(() => waitSeconds.value > 0)
const waitAnnouncement = computed(() =>
  waitSeconds.value > 60 ? `Riprova tra ${Math.ceil(waitSeconds.value / 60)} minuti` : 'Riprova tra meno di un minuto',
)
const waitHintText = computed(() =>
  waitSeconds.value > 60 ? `Aspetta ancora ${Math.ceil(waitSeconds.value / 60)} min` : 'Aspetta ancora meno di un minuto',
)
watch(waiting, (on) => {
  if (!on) waitHint.value = false
})

onMounted(async () => {
  try {
    if ((await getMyVenues()).venues.length > 0) blocked.value = true
  } catch {
    /* the 403 from the server is the real check */
  }
})

const blockedMessage = 'Questo account gestisce un locale e non può essere eliminato da qui.'

function showError(err: unknown, fallback: string) {
  if (err instanceof ApiError && err.status === 403) {
    blocked.value = true
    challengeId.value = ''
    removeTab(STORAGE_KEY)
    return
  }
  if (err instanceof ApiError && err.status === 429) {
    error.value = ''
    startWait(err.retryAfterSeconds ?? 60)
    return
  }
  error.value = err instanceof ApiError ? err.message : fallback
}

function showCodeError(err: unknown) {
  if (err instanceof ApiError && err.code === 'InvalidCode') {
    const left = err.attemptsRemaining ?? 0
    if (left <= 0) {
      codeDead.value = true
      resetWait()
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
  showError(err, 'Impossibile eliminare l’account, riprova')
}

async function sendCode() {
  if (busy.value) return
  if (waiting.value) {
    waitHint.value = true
    return
  }
  busy.value = true
  busyAction.value = 'send'
  error.value = ''
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
    if (resend) notice.value = `Codice inviato a ${user.value?.email ?? 'la tua email'}`
    await nextTick()
    codeField.value?.focus()
  } catch (err) {
    showError(err, 'Impossibile inviare il codice, riprova')
  } finally {
    busy.value = false
    busyAction.value = ''
  }
}

async function confirmDeletion() {
  if (busy.value) return
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
  error.value = ''
  fieldError.value = ''
  notice.value = ''
  try {
    await confirmAccountDeletion(challengeId.value, code.value)
    accountDeleted()
    await router.replace({ name: 'login', query: { deleted: '1' } })
  } catch (err) {
    showCodeError(err)
    code.value = ''
  } finally {
    busy.value = false
    busyAction.value = ''
  }
}

function cancel() {
  if (busy.value) return
  removeTab(STORAGE_KEY)
  void router.back()
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

    <AppAlert v-if="blocked" type="warning" role="alert">{{ blockedMessage }}</AppAlert>

    <template v-else-if="!challengeId">
      <p class="text-body-emphasis">Se continui tutti i dati dell'account vengono eliminati, comprese le card dei tuoi posti preferiti</p>
      <p class="fw-semibold">Non si può annullare.</p>
      <p class="text-body-emphasis">Per motivi sicurezza dovrai confermare l'operazione tramite un codice che ti verrà inviato via email.</p>

      <AppAlert v-if="error" type="error">{{ error }}</AppAlert>
      <AppAlert v-if="waiting" type="warning" :announce="false">
        <span aria-hidden="true">Riprova tra {{ formatWait(waitSeconds) }}</span>
        <span class="visually-hidden" role="status">{{ waitAnnouncement }}</span>
      </AppAlert>

      <AppButton variant="danger" :busy="sending" busy-label="Invio…" @click="sendCode">Invia il codice</AppButton>
      <AppStatusLine v-if="waitHint" icon="clock">{{ waitHintText }}</AppStatusLine>
      <AppButton variant="link" :block="false" class="mt-2 align-self-start" @click="cancel">Annulla</AppButton>
    </template>

    <template v-else>
      <p class="text-body-secondary">
        Abbiamo scritto a <strong>{{ user?.email }}</strong
        >. Il codice vale 5 minuti.
      </p>

      <AppAlert v-if="notice" type="success">{{ notice }}</AppAlert>
      <AppAlert v-if="error" type="error">{{ error }}</AppAlert>
      <AppAlert v-if="waiting" type="warning" :announce="false">
        <span aria-hidden="true">Riprova tra {{ formatWait(waitSeconds) }}</span>
        <span class="visually-hidden" role="status">{{ waitAnnouncement }}</span>
      </AppAlert>

      <form novalidate @submit.prevent="confirmDeletion">
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
        <AppButton type="submit" variant="danger" :busy="confirming" busy-label="Elimino…">Elimina il mio account</AppButton>
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
        <AppButton variant="link" :block="false" @click="cancel">Annulla</AppButton>
      </div>
      <AppStatusLine v-if="waitHint" icon="clock">{{ waitHintText }}</AppStatusLine>
    </template>
  </section>
</template>
