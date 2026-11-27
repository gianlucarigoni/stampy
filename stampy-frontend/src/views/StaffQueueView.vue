<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, shallowRef, watch } from 'vue'
import { ApiError } from '@/api/client'
import { confirmRequest, getQueue, rejectRequest, type QueueItem } from '@/api/endpoints'
import QueueCard, { UNDO_MS, type CardState, type ClosedReason } from '@/components/QueueCard.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppChip from '@/components/ui/AppChip.vue'
import AppEmptyState from '@/components/ui/AppEmptyState.vue'
import AppSkeleton from '@/components/ui/AppSkeleton.vue'
import { usePolling } from '@/composables/usePolling'
import { formatTime, sinceText } from '@/utils/format'

const props = defineProps<{ venueId: string }>()

const POLL_MS = 3000
const NEW_MS = 3000 // how long a request that just arrived is marked "Nuova"
const TAP_GUARD_MS = 300 // taps right after the list changed are ignored: the card under the finger may be another one
const SCROLLED_PX = 120

const requests = shallowRef<QueueItem[] | null>(null) // last answer of the server
const forbidden = ref(false)
const pollError = ref('') // connection state of the background refresh, separate from the errors of the cards
const lastUpdate = ref<number | null>(null)
const announcement = ref('') // screen-reader text for the outcomes

// Cards, newest first. A card stays in `order` after it left the server's queue (handled, expired): see D25.
const order = ref<string[]>([])
const items = shallowRef<Record<string, QueueItem>>({})
const states = reactive<Record<string, CardState>>({})
const errors = reactive<Record<string, string>>({})
const heights = reactive<Record<string, number>>({}) // height of the pending card, kept by "Scaduta / Già gestita"
const newAt = reactive<Record<string, number>>({}) // ids shown as "Nuova"
const unseenNew = ref(0)
const scrolled = ref(false)
let tapGuardUntil = 0

const timers = new Map<string, ReturnType<typeof setTimeout>>() // the delayed calls (undo window)
const pendingCalls = new Map<string, () => Promise<void>>()
const stateOf = (id: string): CardState => states[id] ?? { kind: 'pending' }

// Display-only clock ("da 2 min", "scade tra …", the undo countdown). The server decides what is expired, not this.
const now = ref(Date.now())
let clock: ReturnType<typeof setInterval> | undefined
let ticks = 0

const heightOf = (id: string) => document.getElementById(`card-${id}`)?.offsetHeight ?? 0

/** Request that left the server's queue without us acting on it: expired, or handled by a colleague. */
function markGone(id: string) {
  heights[id] = heightOf(id)
  const item = items.value[id]
  // Indicative guess from the device clock: only the 409 `reason` is authoritative.
  const reason: ClosedReason = item && new Date(item.expiresAt).getTime() <= Date.now() + 5000 ? 'expired' : 'handled'
  states[id] = { kind: 'closed', reason }
}

/** Returns false when polling must stop. */
async function refresh(): Promise<boolean> {
  try {
    const list = (await getQueue(props.venueId)).requests
    const live = new Set(list.map((r) => r.requestId))
    const first = requests.value === null
    for (const id of order.value) if (!live.has(id) && !(id in states)) markGone(id)
    const fresh = list.filter((r) => !(r.requestId in items.value)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    items.value = { ...items.value, ...Object.fromEntries(list.map((r) => [r.requestId, r])) }
    if (fresh.length > 0) {
      order.value = [...fresh.map((r) => r.requestId), ...order.value]
      if (!first) {
        tapGuardUntil = Date.now() + TAP_GUARD_MS
        if (scrolled.value) unseenNew.value += fresh.length
        for (const r of fresh) {
          newAt[r.requestId] = Date.now()
          setTimeout(() => delete newAt[r.requestId], NEW_MS)
        }
        announcement.value = fresh.length === 1 ? 'Nuova richiesta in coda.' : `${fresh.length} nuove richieste in coda.`
      }
    }
    requests.value = list
    pollError.value = ''
    lastUpdate.value = Date.now()
    return true
  } catch (err) {
    // Any "this venue is not yours" answer looks the same (same 404 for a foreign and a missing venue).
    if (err instanceof ApiError && [400, 403, 404].includes(err.status)) {
      forbidden.value = true
      return false
    }
    pollError.value = err instanceof ApiError && err.status !== 0 ? `Non riesco ad aggiornare la coda (errore ${err.status})` : 'Connessione assente'
    return true // transient: the next round may succeed
  }
}
const polling = usePolling(refresh, POLL_MS)

// --- actions: the call is delayed by UNDO_MS so "Annulla" can cancel it (D27, UI only) ---------------------------------
function request(item: QueueItem, action: 'confirm' | 'reject', count = 1) {
  const id = item.requestId
  if (Date.now() < tapGuardUntil || states[id]) return
  heights[id] = heightOf(id)
  delete errors[id]
  const call = () =>
    action === 'confirm'
      ? confirmRequest(props.venueId, id, count).then((r) => {
          states[id] = {
            kind: 'done',
            at: Date.now(),
            outcome: {
              kind: 'approved',
              stampsAdded: r.stampsAdded,
              rewards: r.rewards,
              reward: r.reward,
              // The customer's card is now full: staff only needs to know a reward is waiting, not the balance.
              rewardReady: r.stampsCount >= r.stampsRequired,
            },
          }
          announcement.value = `${item.publicCode}: richiesta approvata${r.rewards > 0 ? `, consegna il premio: ${r.reward}` : ''}.`
        })
      : rejectRequest(props.venueId, id).then(() => {
          states[id] = { kind: 'done', at: Date.now(), outcome: { kind: 'rejected' } }
          announcement.value = `${item.publicCode}: richiesta rifiutata, nessun timbro aggiunto.`
        })
  const send = async () => {
    timers.delete(id)
    pendingCalls.delete(id)
    states[id] = { kind: 'sending', action }
    try {
      await call()
    } catch (err) {
      fail(item, err)
    }
  }
  pendingCalls.set(id, send)
  timers.set(id, setTimeout(send, UNDO_MS))
  states[id] = { kind: 'undo', action, products: count, deadline: Date.now() + UNDO_MS }
  now.value = Date.now()
}

function fail(item: QueueItem, err: unknown) {
  const id = item.requestId
  if (err instanceof ApiError && err.status === 409 && err.reason) {
    // The 409 says why: expired, or confirmed / rejected by a colleague (B38).
    states[id] = { kind: 'closed', reason: err.reason as ClosedReason }
    return
  }
  if (err instanceof ApiError && err.status === 404) {
    states[id] = { kind: 'closed', reason: 'gone' }
    return
  }
  // The card goes back to pending with the error inside it, prefixed by the code (21 §5.1 "della coda").
  delete states[id]
  errors[id] =
    err instanceof ApiError && err.status === 0
      ? `${item.publicCode} · Esito non confermato: controlla la coda prima di riprovare.`
      : `${item.publicCode} · ${err instanceof ApiError ? err.message : 'Errore interno'}`
}

function undo(id: string) {
  clearTimeout(timers.get(id))
  timers.delete(id)
  pendingCalls.delete(id)
  delete states[id] // no call was made: nothing to undo on the server
}

function close(id: string) {
  delete states[id]
  delete errors[id]
  delete heights[id]
  delete newAt[id]
  order.value = order.value.filter((x) => x !== id)
  const { [id]: _gone, ...rest } = items.value
  items.value = rest
}
const closable = computed(() => order.value.filter((id) => states[id]?.kind === 'done' || states[id]?.kind === 'closed'))
const closeAll = () => [...closable.value].forEach(close)

// --- derived ------------------------------------------------------------------------------------------------------------
// Requests still waiting (a card with an outcome or an action in progress is not "in coda" any more).
const live = computed(() => order.value.filter((id) => !(id in states)).map((id) => items.value[id]!))
const oldest = computed(() => live.value.reduce<string | null>((a, r) => (a === null || r.createdAt < a ? r.createdAt : a), null))
const counter = computed(() => `${live.value.length} in coda`)
const updatedAt = computed(() => (lastUpdate.value ? formatTime(new Date(lastUpdate.value).toISOString()) : ''))

watch(live, (list) => {
  document.title = list.length > 0 ? `(${list.length}) Stampy` : 'Stampy'
})

// "↑ N nuove": the newest card is on top, so a request that arrives while staff scrolled down is above the screen.
function onScroll() {
  scrolled.value = window.scrollY > SCROLLED_PX
  if (!scrolled.value) unseenNew.value = 0
}
const toTop = () => window.scrollTo({ top: 0 })

function flush() {
  // Leaving the page must not lose a tap that was still in its undo window: the call goes out now.
  for (const id of [...pendingCalls.keys()]) {
    clearTimeout(timers.get(id))
    void pendingCalls.get(id)?.()
  }
}

onUnmounted(() => {
  clearInterval(clock)
  window.removeEventListener('scroll', onScroll)
  flush()
  document.title = 'Stampy'
})

onMounted(async () => {
  window.addEventListener('scroll', onScroll, { passive: true })
  clock = setInterval(() => {
    // 4 times a second only while a countdown is visible, otherwise every 10 s.
    const counting = Object.values(states).some((s) => s.kind === 'undo')
    if (counting || ++ticks % 40 === 0) now.value = Date.now()
  }, 250)
  if (await refresh()) polling.start()
})
</script>

<template>
  <AppEmptyState v-if="forbidden" icon="warning-circle-fill" title="Non sei autorizzato">
    Non sei autorizzato a gestire questo locale.
    <template #actions>
      <AppButton :to="{ name: 'staff-venues' }">I tuoi locali</AppButton>
    </template>
  </AppEmptyState>

  <template v-else>
    <!-- Sticky: counter, connection banner and "new requests" stay in view while staff scrolls. -->
    <div class="queue-bar">
      <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <h1 class="h2 mb-0">Richieste</h1>
        <AppChip v-if="requests" variant="neutral" icon="clock">
          {{ counter }}<template v-if="oldest"> · la più vecchia da {{ sinceText(oldest, now) }}</template>
        </AppChip>
      </div>
      <AppAlert v-if="pollError" type="warning" class="mb-0">
        {{ pollError }}: la coda potrebbe non essere aggiornata<template v-if="updatedAt"> (ultimo aggiornamento {{ updatedAt }})</template>. Riprovo…
      </AppAlert>
      <AppButton v-if="unseenNew > 0 && scrolled" compact variant="secondary" @click="toTop">
        ↑ {{ unseenNew === 1 ? '1 nuova' : `${unseenNew} nuove` }}
      </AppButton>
    </div>
    <p class="visually-hidden" role="status">{{ announcement }}</p>

    <div v-if="!requests" class="d-grid gap-3">
      <AppSkeleton v-for="n in 2" :key="n" card :lines="4" height="3.5rem" />
    </div>

    <template v-else>
      <section v-if="live.length === 0" class="card card-body queue-empty">
        <p class="fw-bold mb-1">Nessuna richiesta in attesa</p>
        <p class="mb-0 text-body-secondary"><span class="dot" aria-hidden="true" /> In ascolto · aggiornato alle {{ updatedAt }}</p>
      </section>

      <AppButton v-if="closable.length >= 2" compact variant="secondary" class="mb-3" @click="closeAll">Chiudi tutti</AppButton>

      <div class="queue-list">
        <QueueCard
          v-for="id in order"
          :key="id"
          :item="items[id]!"
          :state="stateOf(id)"
          :now="now"
          :is-new="id in newAt"
          :error="errors[id]"
          :frozen-height="heights[id]"
          @confirm="(n) => request(items[id]!, 'confirm', n)"
          @reject="request(items[id]!, 'reject')"
          @undo="undo(id)"
          @close="close(id)"
        />
      </div>
    </template>
  </template>
</template>

<style scoped>
.queue-bar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: grid;
  gap: 0.75rem;
  margin: 0 -0.5rem 0.75rem;
  padding: 0.5rem;
  background: var(--app-bg);
}
.queue-list {
  display: grid;
  gap: 1rem;
  overflow-anchor: auto;
}
.queue-empty {
  margin-bottom: 1rem;
}
.dot {
  display: inline-block;
  width: 0.625rem;
  height: 0.625rem;
  margin-right: 0.25rem;
  background: var(--app-ok);
  border-radius: 50%;
}
</style>
