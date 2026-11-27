<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter, type LocationQuery, type RouteLocationRaw } from 'vue-router'
import { ApiError } from '@/api/client'
import type { HistoryFilters, HistoryItem, HistoryPage, RequestStatus } from '@/api/endpoints'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppEmptyState from '@/components/ui/AppEmptyState.vue'
import AppField from '@/components/ui/AppField.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import AppStatusChip from '@/components/ui/AppStatusChip.vue'

// One history screen for staff (a venue's requests) and customers (their own, all venues): the page that mounts it
// only says where the rows come from. A 403 is reported, not rendered here (F12, D21, D22, D39).
const props = defineProps<{
  audience: 'customer' | 'staff'
  title: string
  fetchHistory: (filters: HistoryFilters) => Promise<HistoryPage>
  /** Customer only: the venues the customer has a card in (B30), for the venue filter (D21). */
  fetchVenues?: () => Promise<{ venueId: string; venueName: string }[]>
  /** Where the "no requests yet" state leads. */
  homeTo: RouteLocationRaw
  homeLabel: string
}>()
const emit = defineEmits<{ forbidden: [] }>()
const route = useRoute()
const router = useRouter()
const ownRoute = route.name // the query string belongs to this route only

const DEBOUNCE_MS = 250
const STATUSES: RequestStatus[] = ['approved', 'rejected', 'expired', 'pending']
const STATUS_FILTER_TEXT: Record<RequestStatus, string> = {
  approved: 'Approvate',
  rejected: 'Non confermate',
  expired: 'Scadute',
  pending: 'In attesa',
}

type Filters = { status: string; venueId: string; minStamps: string; maxStamps: string; from: string; to: string }
const EMPTY: Filters = { status: '', venueId: '', minStamps: '', maxStamps: '', from: '', to: '' }
const KEYS = Object.keys(EMPTY) as (keyof Filters)[]
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// The URL query string is the source of truth; the form mirrors it (and writes back, debounced).
const form = reactive<Filters>({ ...EMPTY })

const items = shallowRef<HistoryItem[]>([])
const total = ref(0)
const next = ref<string | null>(null)
const loaded = ref(false) // a first page is on screen
const loading = ref(false) // first page (initial or after a filter change)
const loadingMore = ref(false)
const error = ref(false)
const moreError = ref(false)
const open = ref(false)
const venues = ref<{ venueId: string; venueName: string }[]>([])
const listEl = ref<HTMLElement | null>(null)

const pad = (n: number) => String(n).padStart(2, '0')
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const today = dayKey(new Date())

/** Whole number in 1..50 or null (the backend validates again). */
function whole(raw: string): number | null {
  if (!/^\d+$/.test(raw.trim())) return null
  const n = Number(raw)
  return n >= 1 && n <= 50 ? n : null
}

/** A real calendar day as YYYY-MM-DD, or false. */
function isDay(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const [y, m, d] = v.split('-').map(Number)
  const dt = new Date(Date.UTC(y!, m! - 1, d!))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m! - 1 && dt.getUTCDate() === d
}

/** Whitelist: unknown or malformed values are dropped silently, never a crash. */
function parseQuery(q: LocationQuery): Filters {
  const one = (k: string) => {
    const v = q[k]
    return typeof v === 'string' ? v : Array.isArray(v) && typeof v[0] === 'string' ? v[0] : ''
  }
  const f: Filters = { ...EMPTY }
  if ((STATUSES as string[]).includes(one('status'))) f.status = one('status')
  if (props.fetchVenues && UUID.test(one('venueId'))) f.venueId = one('venueId') // the staff route has no venue filter
  for (const k of ['minStamps', 'maxStamps'] as const) if (whole(one(k)) !== null) f[k] = String(whole(one(k)))
  for (const k of ['from', 'to'] as const) if (isDay(one(k))) f[k] = one(k)
  return f
}

const toQuery = (f: Filters) => Object.fromEntries(KEYS.filter((k) => f[k] !== '').map((k) => [k, f[k]]))
const sameQuery = (a: Filters, b: Filters) => KEYS.every((k) => a[k] === b[k])

// Errors are per group of fields (Timbri, Periodo): the message sits under the group, the culprit fields are marked.
type Errors = { stamps: string; period: string; minStamps: boolean; maxStamps: boolean; from: boolean; to: boolean }
const NO_ERRORS: Errors = { stamps: '', period: '', minStamps: false, maxStamps: false, from: false, to: false }
function validate(f: Filters): Errors {
  const e = { ...NO_ERRORS }
  for (const key of ['minStamps', 'maxStamps'] as const) {
    if (f[key] !== '' && whole(f[key]) === null) {
      e.stamps = 'I timbri devono essere un numero intero da 1 a 50.'
      e[key] = true
    }
  }
  if (!e.stamps && f.minStamps !== '' && f.maxStamps !== '' && whole(f.minStamps)! > whole(f.maxStamps)!) {
    e.stamps = 'Il minimo dei timbri supera il massimo.'
    e.minStamps = e.maxStamps = true
  }
  for (const key of ['from', 'to'] as const) {
    if (f[key] !== '' && (!isDay(f[key]) || f[key] > today)) {
      e.period = 'Le date nel futuro non sono ammesse.'
      e[key] = true
    }
  }
  if (!e.period && f.from !== '' && f.to !== '' && f.from > f.to) {
    e.period = 'La data "Al" è prima della data "Dal".'
    e.from = e.to = true
  }
  return e
}
const errors = ref<Errors>({ ...NO_ERRORS })
const hasErrors = computed(() => !!errors.value.stamps || !!errors.value.period)
watch(hasErrors, (on) => on && (open.value = true)) // the panel opens by itself on an error

// Time zone: the day the user picks, and the "Oggi / Ieri" grouping, are the DEVICE's local day. The filters go out
// as real instants (start of the "from" day, last millisecond of the "to" day, in local time), so the backend never
// reads them as UTC days and needs no change.
function dayStart(value: string) {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y!, m! - 1, d!).toISOString()
}
function dayEnd(value: string) {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y!, m! - 1, d! + 1, 0, 0, 0, -1).toISOString()
}
const toApi = (f: Filters): HistoryFilters => ({
  status: (f.status || undefined) as RequestStatus | undefined,
  venueId: f.venueId || undefined,
  minStamps: f.minStamps === '' ? undefined : Number(f.minStamps),
  maxStamps: f.maxStamps === '' ? undefined : Number(f.maxStamps),
  from: f.from === '' ? undefined : dayStart(f.from),
  to: f.to === '' ? undefined : dayEnd(f.to),
})

let appliedFilters: Filters = { ...EMPTY } // the filters of the rows on screen: "Carica altri" reuses them
const now = ref(new Date())

// Only the latest request may write its result (rapid changes, back/forward). A new first page cancels a pending one.
let latest = 0
async function load(f: Filters) {
  const mine = ++latest
  loading.value = true
  loadingMore.value = false
  error.value = false
  moreError.value = false
  try {
    const page = await props.fetchHistory(toApi(f))
    if (mine !== latest) return
    items.value = page.requests
    total.value = page.total
    next.value = page.nextCursor
    appliedFilters = f
    now.value = new Date()
    loaded.value = true
  } catch (err) {
    if (mine !== latest) return
    if (err instanceof ApiError && err.status === 403) {
      emit('forbidden')
    } else if (err instanceof ApiError && err.status === 404 && f.venueId) {
      // The venue of the filter is not one of the customer's any more: drop the filter, quietly.
      void router.replace({ query: toQuery({ ...f, venueId: '' }) })
    } else {
      error.value = true
      items.value = []
      total.value = 0
      next.value = null
      loaded.value = false
    }
  } finally {
    if (mine === latest) loading.value = false
  }
}

async function loadMore() {
  if (loadingMore.value || loading.value || !next.value) return
  const mine = latest
  loadingMore.value = true
  moreError.value = false
  try {
    const page = await props.fetchHistory({ ...toApi(appliedFilters), cursor: next.value })
    if (mine !== latest) return
    const seen = new Set(items.value.map((i) => i.requestId))
    const fresh = page.requests.filter((i) => !seen.has(i.requestId))
    const firstNew = items.value.length
    items.value = [...items.value, ...fresh]
    total.value = page.total
    next.value = page.nextCursor
    // The button goes away on the last page: keep the keyboard user's place on the first new row.
    if (next.value === null && fresh.length > 0) {
      await nextTick()
      listEl.value?.querySelectorAll<HTMLElement>('li[data-row]')[firstNew]?.focus()
    }
  } catch {
    if (mine === latest) moreError.value = true
  } finally {
    if (mine === latest) loadingMore.value = false
  }
}

let timer: ReturnType<typeof setTimeout> | undefined
const stopTimer = () => clearTimeout(timer)

// URL → form → fetch (deep links, reload, back/forward all come through here).
watch(
  () => route.query,
  (q) => {
    if (route.name !== ownRoute) return // leaving the page: its query is not ours
    stopTimer()
    const f = parseQuery(q)
    Object.assign(form, f)
    errors.value = validate(f)
    if (hasErrors.value) {
      latest++ // drop any in-flight response
      loading.value = false
      return
    }
    void load(f)
  },
  { immediate: true },
)

// form → URL, debounced. `push` so Back restores the previous filters; a burst of typing is one entry.
watch(
  form,
  () => {
    stopTimer()
    timer = setTimeout(() => {
      const f = { ...form }
      errors.value = validate(f)
      if (hasErrors.value) return // invalid: no push, no fetch
      if (!sameQuery(f, parseQuery(route.query))) void router.push({ query: toQuery(f) })
    }, DEBOUNCE_MS)
  },
  { deep: true },
)

onMounted(async () => {
  if (!props.fetchVenues) return
  try {
    venues.value = await props.fetchVenues()
  } catch {
    /* no venue filter: the rest of the history works */
  }
})
onBeforeUnmount(stopTimer)

function reset() {
  stopTimer()
  Object.assign(form, EMPTY)
  errors.value = { ...NO_ERRORS }
  if (Object.keys(route.query).length > 0) void router.push({ query: {} })
}

// --- Active filters, shown as removable chips (what the applied query really filters by) -----------------------------
const applied = computed(() => parseQuery(route.query))
const dayText = (v: string) => {
  const [y, m, d] = v.split('-').map(Number)
  return new Date(y!, m! - 1, d!).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: y === new Date().getFullYear() ? undefined : 'numeric' })
}
const chips = computed(() => {
  const a = applied.value
  const out: { id: string; label: string; clear: (keyof Filters)[] }[] = []
  if (a.status) out.push({ id: 'status', label: `Esito: ${STATUS_FILTER_TEXT[a.status as RequestStatus]}`, clear: ['status'] })
  if (a.venueId) {
    out.push({ id: 'venueId', label: `Locale: ${venues.value.find((v) => v.venueId === a.venueId)?.venueName ?? 'scelto'}`, clear: ['venueId'] })
  }
  if (a.minStamps || a.maxStamps) {
    const label = a.minStamps && a.maxStamps ? `da ${a.minStamps} a ${a.maxStamps}` : a.minStamps ? `almeno ${a.minStamps}` : `al massimo ${a.maxStamps}`
    out.push({ id: 'stamps', label: `Timbri: ${label}`, clear: ['minStamps', 'maxStamps'] })
  }
  if (a.from) out.push({ id: 'from', label: `Dal ${dayText(a.from)}`, clear: ['from'] })
  if (a.to) out.push({ id: 'to', label: `Al ${dayText(a.to)}`, clear: ['to'] })
  return out
})
const formHasValues = computed(() => KEYS.some((k) => form[k] !== ''))

function removeChip(clear: (keyof Filters)[]) {
  stopTimer()
  const f = { ...applied.value }
  for (const k of clear) f[k] = ''
  Object.assign(form, f)
  errors.value = validate(f)
  void router.push({ query: toQuery(f) })
}

// --- Rows grouped by (local) day --------------------------------------------------------------------------------------
const groups = computed(() => {
  const todayKey = dayKey(now.value)
  const y = new Date(now.value)
  y.setDate(y.getDate() - 1)
  const yesterdayKey = dayKey(y)
  const out: { key: string; label: string; rows: HistoryItem[] }[] = []
  for (const item of items.value) {
    const d = new Date(item.createdAt)
    const key = dayKey(d)
    let g = out[out.length - 1]
    if (!g || g.key !== key) {
      const label =
        key === todayKey
          ? 'Oggi'
          : key === yesterdayKey
            ? 'Ieri'
            : d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: d.getFullYear() === now.value.getFullYear() ? undefined : 'numeric' })
      g = { key, label, rows: [] }
      out.push(g)
    }
    g.rows.push(item)
  }
  return out
})

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
const fullDate = (iso: string) =>
  new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const isPrize = (i: HistoryItem) => i.status === 'approved' && (i.rewardsRedeemed ?? 0) > 0

/** The second line of a row: who (staff only), stamps added (the reward is not counted among them), the reward by name. */
function detail(i: HistoryItem): { text: string; prize?: boolean }[] {
  const parts: { text: string; prize?: boolean }[] = []
  if (props.audience === 'staff' && i.displayName) parts.push({ text: i.displayName })
  if (i.status === 'approved') {
    const added = i.stampsAdded ?? 0
    const rewards = i.rewardsRedeemed ?? 0
    if (added > 0) parts.push({ text: `${added} ${added === 1 ? 'timbro' : 'timbri'}` })
    if (rewards > 0) {
      const what = rewards === 1 ? 'Premio riscattato' : `${rewards} premi riscattati`
      parts.push({ text: i.reward ? `${what}: ${i.reward}` : what, prize: true })
    }
    if (added === 0 && rewards === 0) parts.push({ text: 'Nessun timbro' })
  } else if (i.status !== 'pending') {
    parts.push({ text: 'Nessun timbro' })
  }
  return parts
}

const countText = computed(() => (total.value === 1 ? '1 richiesta' : `${total.value} richieste`))
const showVenueFilter = computed(() => props.audience === 'customer' && venues.value.length > 1)
</script>

<template>
  <h1 class="h2 mb-3">{{ title }}</h1>

  <div class="hist-bar-row">
    <AppButton
      variant="secondary"
      class="hist-toggle"
      :block="false"
      :icon="open ? 'caret-up' : 'caret-down'"
      aria-controls="h-panel"
      :aria-expanded="open"
      @click="open = !open"
    >
      Filtri{{ chips.length > 0 ? ` · ${chips.length}` : '' }}
    </AppButton>
    <AppButton v-if="formHasValues" variant="link" :block="false" @click="reset">Azzera</AppButton>
    <p class="hist-count" role="status">{{ loaded && total > 0 && !hasErrors ? countText : '' }}</p>
  </div>

  <ul v-if="chips.length > 0" class="hist-chips" aria-label="Filtri attivi">
    <li v-for="c in chips" :key="c.id" class="hist-chip">
      <span class="hist-chip-text">{{ c.label }}</span>
      <button type="button" class="hist-chip-x" :aria-label="`Rimuovi filtro: ${c.label}`" @click="removeChip(c.clear)">
        <AppIcon name="x" :size="18" />
      </button>
    </li>
  </ul>

  <form v-show="open" id="h-panel" class="card card-body hist-panel" novalidate @submit.prevent>
    <div class="app-field">
      <label for="h-status" class="form-label">Esito</label>
      <select id="h-status" v-model="form.status" class="form-select">
        <option value="">Tutti</option>
        <option v-for="s in STATUSES" :key="s" :value="s">{{ STATUS_FILTER_TEXT[s] }}</option>
      </select>
    </div>
    <div v-if="showVenueFilter" class="app-field">
      <label for="h-venue" class="form-label">Locale</label>
      <select id="h-venue" v-model="form.venueId" class="form-select">
        <option value="">Tutti i locali</option>
        <option v-for="v in venues" :key="v.venueId" :value="v.venueId">{{ v.venueName }}</option>
      </select>
    </div>
    <fieldset>
      <legend class="form-label">Timbri</legend>
      <div class="hist-pair">
        <AppField v-model="form.minStamps" id="h-min" label="Min" no-reserve type="text" inputmode="numeric" autocomplete="off" :invalid="errors.minStamps" aria-describedby="h-stamps-msg" />
        <AppField v-model="form.maxStamps" id="h-max" label="Max" no-reserve type="text" inputmode="numeric" autocomplete="off" :invalid="errors.maxStamps" aria-describedby="h-stamps-msg" />
      </div>
      <div v-if="errors.stamps" id="h-stamps-msg" class="app-field-msg is-error">
        <AppIcon name="warning-circle-fill" :size="18" />
        <span role="alert">{{ errors.stamps }}</span>
      </div>
    </fieldset>
    <fieldset>
      <legend class="form-label">Periodo</legend>
      <div class="hist-pair">
        <AppField v-model="form.from" id="h-from" label="Dal" no-reserve type="date" :max="today" :invalid="errors.from" aria-describedby="h-period-msg" />
        <AppField v-model="form.to" id="h-to" label="Al" no-reserve type="date" :min="form.from || undefined" :max="today" :invalid="errors.to" aria-describedby="h-period-msg" />
      </div>
      <div v-if="errors.period" id="h-period-msg" class="app-field-msg is-error">
        <AppIcon name="warning-circle-fill" :size="18" />
        <span role="alert">{{ errors.period }}</span>
      </div>
    </fieldset>
  </form>

  <section class="hist-body" aria-label="Richieste">
    <!-- Invalid filters: the list would not match them, so it is not shown (ST-10). -->
    <AppEmptyState v-if="hasErrors" icon="funnel" title="Correggi i filtri" :heading-level="2">
      Finché i filtri non sono validi non mostriamo l'elenco.
    </AppEmptyState>

    <div v-else-if="error" class="hist-error">
      <AppAlert type="error" title="Non siamo riusciti a caricare le richieste">Controlla la connessione e riprova.</AppAlert>
      <AppButton icon="arrow-clockwise" :busy="loading" busy-label="Riprovo…" @click="load(parseQuery(route.query))">Riprova</AppButton>
    </div>

    <div v-else-if="!loaded" class="card hist-list hist-skeleton" aria-busy="true">
      <span class="visually-hidden" role="status">Caricamento…</span>
      <div v-for="n in 5" :key="n" class="hist-row" aria-hidden="true">
        <span class="app-skeleton-line hist-sk-time" />
        <span class="hist-main">
          <span class="app-skeleton-line hist-sk-name" />
          <span class="app-skeleton-line hist-sk-detail" />
        </span>
        <span class="app-skeleton-line hist-sk-chip" />
      </div>
    </div>

    <template v-else-if="items.length === 0">
      <AppEmptyState v-if="chips.length > 0" icon="funnel" title="Nessun risultato" :heading-level="2">
        Nessun risultato con questi filtri.
        <template #actions><AppButton variant="secondary" @click="reset">Azzera filtri</AppButton></template>
      </AppEmptyState>
      <AppEmptyState v-else icon="clock-counter-clockwise" :title="audience === 'customer' ? 'Non hai ancora richieste' : 'Nessuna richiesta'" :heading-level="2">
        {{ audience === 'customer' ? 'Quando chiedi un timbro, la vedrai qui.' : 'Le richieste di timbro del locale compariranno qui.' }}
        <template #actions><AppButton :to="homeTo">{{ homeLabel }}</AppButton></template>
      </AppEmptyState>
    </template>

    <div v-else ref="listEl" class="hist-groups" :aria-busy="loading ? 'true' : undefined">
      <div v-if="loading" class="hist-progress" aria-hidden="true" />
      <section v-for="g in groups" :key="g.key" class="hist-day">
        <h2 class="hist-day-title">{{ g.label }}</h2>
        <ul class="card hist-list">
          <li v-for="item in g.rows" :key="item.requestId" data-row tabindex="-1" class="hist-row" :class="{ 'is-prize': isPrize(item) }">
            <time class="hist-time" :datetime="item.createdAt" :title="fullDate(item.createdAt)">{{ timeOf(item.createdAt) }}</time>
            <div class="hist-main">
              <span v-if="audience === 'customer'" class="hist-name">{{ item.venueName }}</span>
              <span v-else class="hist-code">{{ item.publicCode }}</span>
              <span class="hist-detail">
                <template v-for="(p, i) in detail(item)" :key="i">
                  <template v-if="i > 0"> · </template>
                  <b v-if="p.prize" class="hist-prize-text">{{ p.text }}</b>
                  <template v-else>{{ p.text }}</template>
                </template>
              </span>
            </div>
            <AppStatusChip :status="isPrize(item) ? 'prize' : item.status" />
          </li>
        </ul>
      </section>

      <div class="hist-more">
        <AppAlert v-if="moreError" type="error">Non siamo riusciti a caricare altre richieste. Controlla la connessione e riprova.</AppAlert>
        <AppButton v-if="next" variant="secondary" :busy="loadingMore" busy-label="Carico…" @click="loadMore">Carica altri</AppButton>
        <p v-if="total > items.length || next" class="hist-shown" role="status">Mostrate {{ items.length }} di {{ total }}</p>
      </div>
    </div>
  </section>
</template>
