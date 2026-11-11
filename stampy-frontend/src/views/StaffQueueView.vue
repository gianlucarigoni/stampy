<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, shallowRef, watch } from 'vue'
import { ApiError } from '@/api/client'
import {
  confirmRequest,
  getMyVenues,
  getQueue,
  rejectRequest,
  type ConfirmResult,
  type MemberVenue,
  type QueueItem,
} from '@/api/endpoints'
import PromotionNotice from '@/components/PromotionNotice.vue'
import { usePolling } from '@/composables/usePolling'
import { formatTime } from '@/utils/format'

const props = defineProps<{ venueId: string }>()

const POLL_MS = 3000
const MIN_PRODUCTS = 1
const MAX_PRODUCTS = 50 // same limit as the confirm DTO

const requests = shallowRef<QueueItem[] | null>(null)
const venue = shallowRef<MemberVenue | null>(null)
const forbidden = ref(false)
// Two separate messages: `error` belongs to the last staff action and stays until the next
// one; `pollError` is the connection state of the background refresh (BUG-01).
const error = ref('')
const pollError = ref('')
// Outcome of the actions just done: the card stays in place showing it (see `rows`).
type Resolved = {
  requestId: string
  publicCode: string
  index: number // where the card was in the queue
  outcome:
    | { kind: 'approved'; stampsAdded: number; rewards: number; reward: string; rewardReady: boolean }
    | { kind: 'rejected' }
}
const resolved = ref<Resolved[]>([])
const announcement = ref('') // screen-reader text for the outcome (cards appear without a live region)
// Short on purpose: the feedback must not sit on top of the next request.
const RESOLVED_MS = 8000
const timers = new Set<ReturnType<typeof setTimeout>>()
// Display-only clock for "scade tra …" (the server decides what is expired, not this).
const now = ref(Date.now())
let clock: ReturnType<typeof setInterval> | undefined
const busyId = ref('')

// Kept per request so a queue refresh never resets what staff is counting.
// `products` is the last valid quantity; `drafts` is the raw text while staff types. The input
// shows the draft, so a re-render (polling every 3 s, the clock) can never overwrite it.
const products = reactive<Record<string, number>>({})
const drafts = reactive<Record<string, string>>({})

const productsOf = (requestId: string) => products[requestId] ?? MIN_PRODUCTS

/** Whole number in 1..50, otherwise null. The backend validates again. */
function parseProducts(raw: string): number | null {
  if (!/^\d+$/.test(raw.trim())) return null
  const n = Number(raw)
  return n >= MIN_PRODUCTS && n <= MAX_PRODUCTS ? n : null
}

/** The quantity that would be sent now; null while the typed text is not valid. */
const quantityOf = (requestId: string) =>
  requestId in drafts ? parseProducts(drafts[requestId]!) : productsOf(requestId)

const inputText = (requestId: string) => drafts[requestId] ?? String(productsOf(requestId))

function changeProducts(requestId: string, delta: number) {
  const next = (quantityOf(requestId) ?? productsOf(requestId)) + delta
  products[requestId] = Math.min(MAX_PRODUCTS, Math.max(MIN_PRODUCTS, next))
  delete drafts[requestId]
}

function typeProducts(requestId: string, input: HTMLInputElement) {
  drafts[requestId] = input.value
  const valid = parseProducts(input.value)
  if (valid !== null) products[requestId] = valid
}

// Leaving the field: a valid text is normalized ("07" -> 7); an invalid one stays visible with
// its message, and Confirm stays disabled, so a wrong quantity is never sent silently.
function commitProducts(requestId: string) {
  if (requestId in drafts && parseProducts(drafts[requestId]!) !== null) delete drafts[requestId]
}

const errorText = (err: unknown) => (err instanceof ApiError ? err.message : 'Errore interno')

// A timeout or dropped connection does not tell whether the server acted (UX-03).
const actionErrorText = (err: unknown) =>
  err instanceof ApiError && err.status === 0
    ? 'Esito non confermato: controlla la coda prima di riprovare.'
    : errorText(err)

/** Indicative only, from the device clock: "3 min fa" / "scade tra 2 min". */
function ageText(item: QueueItem) {
  const left = Math.ceil((new Date(item.expiresAt).getTime() - now.value) / 1000)
  if (left <= 0) return 'scade ora'
  return left < 60 ? `scade tra ${left} s` : `scade tra ${Math.ceil(left / 60)} min`
}

/** Returns false when polling must stop. */
async function refresh(): Promise<boolean> {
  try {
    const result = await getQueue(props.venueId)
    requests.value = result.requests
    pollError.value = ''
    forgetGone(result.requests)
    return true
  } catch (err) {
    if (err instanceof ApiError && (err.status === 403 || err.status === 400)) {
      forbidden.value = true
      return false
    }
    pollError.value = errorText(err) // transient: the next round may succeed
    return true
  }
}

// Quantities of requests that left the queue (expired, handled elsewhere) are dropped.
function forgetGone(list: QueueItem[]) {
  const live = new Set(list.map((item) => item.requestId))
  for (const id of Object.keys(products)) if (!live.has(id)) delete products[id]
  for (const id of Object.keys(drafts)) if (!live.has(id)) delete drafts[id]
}

const polling = usePolling(refresh, POLL_MS)

function later(fn: () => void, ms: number) {
  const timer = setTimeout(() => {
    timers.delete(timer)
    fn()
  }, ms)
  timers.add(timer)
}

function settle(entry: Resolved) {
  resolved.value = [...resolved.value.filter((r) => r.requestId !== entry.requestId), entry]
  later(() => dismissResolved(entry.requestId), RESOLVED_MS)
}

const dismissResolved = (requestId: string) =>
  (resolved.value = resolved.value.filter((r) => r.requestId !== requestId))

// Queue order with the just-handled cards kept where they were (they are no longer in the
// queue, but staff needs to see the outcome in place of the card).
type Row =
  | { type: 'item'; item: QueueItem }
  | { type: 'resolved'; entry: Resolved }

const rows = computed<Row[]>(() => {
  const byId = new Map(resolved.value.map((r) => [r.requestId, r]))
  const queue = requests.value ?? []
  const list: Row[] = queue.map((item) => {
    const entry = byId.get(item.requestId)
    return entry ? { type: 'resolved', entry } : { type: 'item', item }
  })
  const shown = new Set(queue.map((item) => item.requestId))
  for (const entry of [...resolved.value].sort((a, b) => a.index - b.index)) {
    if (!shown.has(entry.requestId)) list.splice(Math.min(entry.index, list.length), 0, { type: 'resolved', entry })
  }
  return list
})

async function act(requestId: string, action: () => Promise<void>) {
  if (busyId.value) return
  busyId.value = requestId
  error.value = ''
  try {
    await action()
    delete products[requestId]
    delete drafts[requestId]
  } catch (err) {
    // Typically 404/409: request expired or already handled from another device.
    error.value = actionErrorText(err)
  } finally {
    busyId.value = ''
    await refresh()
  }
}

const indexOf = (item: QueueItem) => Math.max(0, (requests.value ?? []).indexOf(item))

// Stamps and rewards come only from the backend's answer: the rule is never computed here.
function onApproved(item: QueueItem, index: number, result: ConfirmResult) {
  settle({
    requestId: item.requestId,
    publicCode: item.publicCode,
    index,
    outcome: {
      kind: 'approved',
      stampsAdded: result.stampsAdded,
      rewards: result.rewards,
      reward: result.reward,
      // The customer's card is now full: staff only needs to know a reward is waiting, not the balance.
      rewardReady: result.stampsCount >= result.stampsRequired,
    },
  })
  announcement.value = `${item.publicCode}: richiesta approvata${result.rewards > 0 ? `, premio ritirato: ${result.reward}` : ''}.`
}

function confirm(item: QueueItem) {
  const count = quantityOf(item.requestId)
  if (count === null) return // the button is disabled; never send a guessed quantity
  return act(item.requestId, async () => {
    const index = indexOf(item)
    const result = await confirmRequest(props.venueId, item.requestId, count)
    onApproved(item, index, result)
  })
}

// A rejection that went through is a success of the operation, not an error.
const reject = (item: QueueItem) =>
  act(item.requestId, async () => {
    const index = indexOf(item)
    await rejectRequest(props.venueId, item.requestId)
    settle({ requestId: item.requestId, publicCode: item.publicCode, index, outcome: { kind: 'rejected' } })
    announcement.value = `${item.publicCode}: richiesta rifiutata, nessun timbro aggiunto.`
  })

// Pending requests in the tab title: staff may be looking at another tab.
watch(requests, (list) => {
  document.title = list && list.length > 0 ? `(${list.length}) Stampy` : 'Stampy'
})

onUnmounted(() => {
  clearInterval(clock)
  timers.forEach(clearTimeout)
  document.title = 'Stampy'
})

onMounted(async () => {
  clock = setInterval(() => (now.value = Date.now()), 10000)
  if (await refresh()) polling.start()
  try {
    const { venues } = await getMyVenues()
    venue.value = venues.find((v) => v.venueId === props.venueId) ?? null
  } catch {
    /* only the title depends on this */
  }
})
</script>

<template>
  <section v-if="forbidden" class="card card-body">
    <p class="alert alert-danger" role="alert">Non sei autorizzato a gestire questo locale.</p>
    <RouterLink :to="{ name: 'staff-venues' }">I tuoi locali</RouterLink>
  </section>

  <template v-else>
    <div class="d-flex align-items-baseline justify-content-between gap-3 mb-3">
      <h1 class="h4 mb-0">{{ venue?.name ?? 'Richieste' }}</h1>
    </div>

    <!-- Sticky: with several cards the outcome of the last one must stay in view (UX-02). -->
    <div class="feedback">
      <p v-if="error" class="alert alert-danger mb-2" role="alert">{{ error }}</p>
    </div>
    <p class="visually-hidden" role="status">{{ announcement }}</p>
    <p v-if="pollError" class="alert alert-warning" role="status">{{ pollError }}</p>

    <p v-if="!requests" class="text-body-secondary" role="status">Caricamento…</p>

    <p v-else-if="rows.length === 0" class="card card-body text-body-secondary">Nessuna richiesta in attesa.</p>

    <template v-for="row in rows" :key="row.type === 'item' ? row.item.requestId : row.entry.requestId">
    <article v-if="row.type === 'resolved'" class="card card-body mb-3">
      <h2 class="h5 text-break">{{ row.entry.publicCode }}</h2>
      <div
        v-if="row.entry.outcome.kind === 'approved'"
        class="alert alert-success mb-3"
      >
        <p class="fw-semibold mb-1">✔ Richiesta approvata</p>
        <p class="mb-0">
          <template v-if="row.entry.outcome.stampsAdded > 0">
            +{{ row.entry.outcome.stampsAdded }} {{ row.entry.outcome.stampsAdded === 1 ? 'timbro' : 'timbri' }}
          </template>
          <template v-if="row.entry.outcome.rewards > 0">
            <template v-if="row.entry.outcome.stampsAdded > 0"> · </template>
            <strong>{{ row.entry.outcome.rewards === 1 ? 'Premio ritirato' : `${row.entry.outcome.rewards} premi ritirati` }}:</strong>
            {{ row.entry.outcome.reward }}
          </template>
          <template v-else-if="row.entry.outcome.stampsAdded === 0">Nessun timbro aggiunto</template>
          <strong v-if="row.entry.outcome.rewardReady"> · Premio disponibile</strong>
        </p>
      </div>
      <div v-else class="alert alert-warning mb-3">
        <p class="fw-semibold mb-1">⚠ Richiesta rifiutata</p>
        <p class="mb-0">Nessun timbro aggiunto.</p>
      </div>
      <button
        type="button"
        class="btn btn-outline-secondary"
        :aria-label="`Chiudi esito di ${row.entry.publicCode}`"
        @click="dismissResolved(row.entry.requestId)"
      >
        Ok
      </button>
    </article>
    <template v-else>
    <article v-for="item in [row.item]" :key="item.requestId" class="card card-body mb-3">
      <div class="d-flex align-items-baseline justify-content-between gap-3">
        <h2 class="h5 mb-0 text-break">{{ item.publicCode }}</h2>
        <span class="text-body-secondary text-end">
          {{ formatTime(item.createdAt) }}
          <small class="d-block">{{ ageText(item) }}</small>
        </span>
      </div>

      <p v-if="item.promotionChanged" class="mt-2 mb-0"><PromotionNotice variant="staff" /></p>

      <p class="my-2">
        {{ item.stampsCount }} / {{ item.stampsRequired }} timbri
        <strong v-if="item.stampsCount >= item.stampsRequired" class="text-success">
          · Premio disponibile
        </strong>
      </p>

      <div class="stepper mb-3" role="group" :aria-label="`Prodotti consumati per ${item.publicCode}, premio compreso`">
        <button
          type="button"
          class="btn btn-outline-primary fs-4"
          :aria-label="`Un prodotto in meno per ${item.publicCode}`"
          :disabled="(quantityOf(item.requestId) ?? MAX_PRODUCTS) <= MIN_PRODUCTS"
          @click="changeProducts(item.requestId, -1)"
        >
          −
        </button>
        <div class="quantity">
          <input
            class="form-control quantity-input"
            type="number"
            inputmode="numeric"
            :min="MIN_PRODUCTS"
            :max="MAX_PRODUCTS"
            step="1"
            :aria-label="`Numero di prodotti per ${item.publicCode}`"
            :aria-invalid="quantityOf(item.requestId) === null"
            :aria-describedby="quantityOf(item.requestId) === null ? `qty-error-${item.requestId}` : undefined"
            :value="inputText(item.requestId)"
            @input="typeProducts(item.requestId, $event.target as HTMLInputElement)"
            @change="commitProducts(item.requestId)"
          />
          <span class="text-body-secondary">{{ quantityOf(item.requestId) === 1 ? 'prodotto' : 'prodotti' }}</span>
        </div>
        <button
          type="button"
          class="btn btn-outline-primary fs-4"
          :aria-label="`Un prodotto in più per ${item.publicCode}`"
          :disabled="(quantityOf(item.requestId) ?? MIN_PRODUCTS) >= MAX_PRODUCTS"
          @click="changeProducts(item.requestId, 1)"
        >
          +
        </button>
      </div>
      <p
        v-if="quantityOf(item.requestId) === null"
        :id="`qty-error-${item.requestId}`"
        class="text-danger fw-semibold"
      >
        ⚠ Quantità non valida: inserisci un numero intero da {{ MIN_PRODUCTS }} a {{ MAX_PRODUCTS }}.
      </p>

      <div class="d-grid gap-3" style="grid-template-columns: 1fr 1fr">
        <button
          type="button"
          class="btn btn-outline-danger"
          :aria-label="`Rifiuta ${item.publicCode}`"
          :disabled="busyId !== ''"
          @click="reject(item)"
        >
          Rifiuta
        </button>
        <button
          type="button"
          class="btn btn-primary"
          :aria-label="`Conferma ${item.publicCode}`"
          :disabled="busyId !== '' || quantityOf(item.requestId) === null"
          @click="confirm(item)"
        >
          {{ busyId === item.requestId ? 'Invio…' : 'Conferma' }}
        </button>
      </div>
    </article>
    </template>
    </template>
  </template>
</template>

<style scoped>
.stepper {
  display: grid;
  grid-template-columns: 3.5rem 1fr 3.5rem;
  align-items: center;
  gap: 0.5rem;
}

.quantity {
  text-align: center;
}

.quantity-input {
  font-size: 1.5rem;
  font-weight: 700;
  text-align: center;
  padding: 0.25rem;
}

.quantity span {
  display: block;
  font-size: 0.875rem;
}

.feedback {
  position: sticky;
  top: 0;
  z-index: 10;
}
</style>
