<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError } from '@/api/client'
import { confirmAccountDeletion, getMyVenues, requestAccountDeletion } from '@/api/endpoints'
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
const codeInput = ref<HTMLInputElement | null>(null)
const busy = ref(false)
const error = ref('')
const notice = ref('')
const codeDead = ref(false)
// Owners and staff cannot delete their account from here (BACKLOG B4b). The backend answers 403
// anyway: this only avoids offering a button that cannot work.
const blocked = ref(false)

const waiting = computed(() => waitSeconds.value > 0)
const waitAnnouncement = computed(() =>
  waitSeconds.value > 60 ? `Riprova tra ${Math.ceil(waitSeconds.value / 60)} minuti` : 'Riprova tra meno di un minuto',
)

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
  showError(err, 'Impossibile eliminare l’account, riprova')
}

async function sendCode() {
  if (busy.value || waiting.value) return
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    const result = await requestAccountDeletion()
    challengeId.value = result.challengeId
    codeDead.value = false
    code.value = ''
    writeTab(STORAGE_KEY, { challengeId: result.challengeId })
    notice.value = `Codice inviato a ${user.value?.email ?? 'la tua email'}`
    await nextTick()
    codeInput.value?.focus()
  } catch (err) {
    showError(err, 'Impossibile inviare il codice, riprova')
  } finally {
    busy.value = false
  }
}

async function confirmDeletion() {
  if (busy.value || code.value.length !== 6) return
  busy.value = true
  error.value = ''
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
  }
}

function cancel() {
  removeTab(STORAGE_KEY)
  void router.back()
}

// Digits only. Unlike the login, it does NOT submit by itself: this action cannot be undone.
watch(code, (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 6)
  if (digits !== value) code.value = digits
})
</script>

<template>
  <section class="card card-body">
    <h1 class="h4">Elimina il tuo account</h1>

    <p v-if="blocked" class="alert alert-warning" role="alert">{{ blockedMessage }}</p>

    <template v-else-if="!challengeId">
      <p class="text-body-emphasis">Se continui tutti i dati dell'account vengono eliminati, comprese le card dei tuoi posti preferiti</p>
      <p class="fw-semibold">Non si può annullare.</p>
      <p class="text-body-emphasis">Per motivi sicurezza dovrai confermare l'operazione tramite un codice che ti verrà inviato via email.</p>

      <p v-if="error" class="alert alert-danger" role="alert">{{ error }}</p>
      <p v-if="waiting" class="alert alert-warning">
        <span aria-hidden="true">Riprova tra {{ formatWait(waitSeconds) }}</span>
        <span class="visually-hidden" role="status">{{ waitAnnouncement }}</span>
      </p>

      <button class="btn btn-danger w-100" type="button" :disabled="busy || waiting" @click="sendCode">
        {{ busy ? 'Invio…' : 'Invia il codice' }}
      </button>
      <button class="btn btn-link mt-2" type="button" :disabled="busy" @click="cancel">Annulla</button>
    </template>

    <template v-else>
      <p class="text-body-secondary">
        Abbiamo scritto a <strong>{{ user?.email }}</strong
        >. Il codice vale 5 minuti.
      </p>

      <form @submit.prevent="confirmDeletion">
        <div class="mb-3">
          <label for="code" class="form-label fw-semibold">Codice a 6 cifre</label>
          <input
            id="code"
            ref="codeInput"
            v-model="code"
            class="form-control form-control-code"
            type="text"
            name="code"
            inputmode="numeric"
            autocomplete="one-time-code"
            :disabled="codeDead"
            required
            :aria-invalid="error ? 'true' : undefined"
            :aria-describedby="error ? 'delete-error' : undefined"
          />
        </div>

        <p v-if="notice" class="alert alert-success" role="status">{{ notice }}</p>
        <p v-if="error" id="delete-error" class="alert alert-danger" role="alert">{{ error }}</p>
        <p v-if="waiting" class="alert alert-warning">
          <span aria-hidden="true">Riprova tra {{ formatWait(waitSeconds) }}</span>
          <span class="visually-hidden" role="status">{{ waitAnnouncement }}</span>
        </p>

        <button class="btn btn-danger w-100" type="submit" :disabled="busy || codeDead || code.length !== 6">
          {{ busy ? 'Elimino…' : 'Elimina il mio account' }}
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
        <button type="button" class="btn btn-link px-0" :disabled="busy" @click="cancel">Annulla</button>
      </div>
    </template>
  </section>
</template>
