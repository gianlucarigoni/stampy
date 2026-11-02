<script setup lang="ts">
import { onMounted, reactive, ref, shallowRef } from 'vue'
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
import { usePolling } from '@/composables/usePolling'
import { formatTime } from '@/utils/format'

const props = defineProps<{ venueId: string }>()

const POLL_MS = 3000
const MIN_PRODUCTS = 1
const MAX_PRODUCTS = 50 // same limit as the confirm DTO

const requests = shallowRef<QueueItem[] | null>(null)
const venue = shallowRef<MemberVenue | null>(null)
const venueCount = ref(0)
const forbidden = ref(false)
const error = ref('')
const success = ref('')
const busyId = ref('')

// Kept per request so a queue refresh never resets what staff is counting.
const products = reactive<Record<string, number>>({})

const productsOf = (requestId: string) => products[requestId] ?? MIN_PRODUCTS

function changeProducts(requestId: string, delta: number) {
  const next = productsOf(requestId) + delta
  products[requestId] = Math.min(MAX_PRODUCTS, Math.max(MIN_PRODUCTS, next))
}

const errorText = (err: unknown) => (err instanceof ApiError ? err.message : 'Errore interno')

/** Returns false when polling must stop. */
async function refresh(): Promise<boolean> {
  try {
    const result = await getQueue(props.venueId)
    requests.value = result.requests
    error.value = ''
    return true
  } catch (err) {
    if (err instanceof ApiError && (err.status === 403 || err.status === 400)) {
      forbidden.value = true
      return false
    }
    error.value = errorText(err) // transient: the next round may succeed
    return true
  }
}

const polling = usePolling(refresh, POLL_MS)

async function act(requestId: string, action: () => Promise<void>) {
  if (busyId.value) return
  busyId.value = requestId
  error.value = ''
  success.value = ''
  try {
    await action()
    delete products[requestId]
  } catch (err) {
    // Typically 404/409: request expired or already handled from another device.
    error.value = errorText(err)
  } finally {
    busyId.value = ''
    await refresh()
  }
}

// Stamps and rewards come only from the backend's answer: the rule is never computed here.
function describe(item: QueueItem, count: number, result: ConfirmResult) {
  const items = count === 1 ? '1 prodotto' : `${count} prodotti`
  const balance = `saldo ${result.stampsCount}/${result.stampsRequired}`
  const reward =
    result.rewards > 0
      ? ` Premio applicato${result.rewards > 1 ? ` (${result.rewards})` : ''}: non far pagare il prodotto in premio.`
      : ''
  return `${item.publicCode}: ${items}, ${balance}.${reward}`
}

const confirm = (item: QueueItem) =>
  act(item.requestId, async () => {
    const count = productsOf(item.requestId)
    const result = await confirmRequest(props.venueId, item.requestId, count)
    success.value = describe(item, count, result)
  })

const reject = (item: QueueItem) =>
  act(item.requestId, async () => {
    await rejectRequest(props.venueId, item.requestId)
    success.value = `${item.publicCode}: richiesta rifiutata.`
  })

onMounted(async () => {
  if (await refresh()) polling.start()
  try {
    const { venues } = await getMyVenues()
    venueCount.value = venues.length
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
      <RouterLink v-if="venueCount > 1" :to="{ name: 'staff-venues' }">Cambia locale</RouterLink>
    </div>

    <p v-if="error" class="alert alert-danger" role="alert">{{ error }}</p>
    <p v-if="success" class="alert alert-success" role="status">{{ success }}</p>

    <p v-if="!requests" class="text-body-secondary" role="status">Caricamento…</p>

    <p v-else-if="requests.length === 0" class="card card-body text-body-secondary">Nessuna richiesta in attesa.</p>

    <article v-for="item in requests ?? []" :key="item.requestId" class="card card-body mb-3">
      <div class="d-flex align-items-baseline justify-content-between gap-3">
        <h2 class="h5 mb-0 text-break">{{ item.publicCode }}</h2>
        <span class="text-body-secondary">{{ formatTime(item.createdAt) }}</span>
      </div>

      <p class="my-2">
        {{ item.stampsCount }} / {{ item.stampsRequired }} timbri
        <strong v-if="item.stampsCount >= item.stampsRequired" class="text-success">
          · Premio disponibile
        </strong>
      </p>

      <div class="stepper mb-3" role="group" aria-label="Prodotti consumati, premio compreso">
        <button
          type="button"
          class="btn btn-outline-primary fs-4"
          aria-label="Un prodotto in meno"
          :disabled="productsOf(item.requestId) <= MIN_PRODUCTS"
          @click="changeProducts(item.requestId, -1)"
        >
          −
        </button>
        <output class="quantity" aria-live="polite">
          {{ productsOf(item.requestId) }}
          <span class="text-body-secondary">{{ productsOf(item.requestId) === 1 ? 'prodotto' : 'prodotti' }}</span>
        </output>
        <button
          type="button"
          class="btn btn-outline-primary fs-4"
          aria-label="Un prodotto in più"
          :disabled="productsOf(item.requestId) >= MAX_PRODUCTS"
          @click="changeProducts(item.requestId, 1)"
        >
          +
        </button>
      </div>

      <div class="d-grid gap-2" style="grid-template-columns: 1fr 1fr">
        <button
          type="button"
          class="btn btn-outline-primary"
          :disabled="busyId !== ''"
          @click="reject(item)"
        >
          Rifiuta
        </button>
        <button type="button" class="btn btn-primary" :disabled="busyId !== ''" @click="confirm(item)">
          Conferma
        </button>
      </div>
    </article>
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
  font-size: 1.5rem;
  font-weight: 700;
  text-align: center;
}

.quantity span {
  display: block;
  font-size: 0.875rem;
  font-weight: 400;
}
</style>
