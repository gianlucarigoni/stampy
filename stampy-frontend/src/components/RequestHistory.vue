<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter, type LocationQuery } from 'vue-router'
import { ApiError } from '@/api/client'
import type { HistoryFilters, HistoryItem, RequestStatus } from '@/api/endpoints'

// One history screen for staff (a venue's requests) and customers (their own, all venues): the
// page that mounts it only says where the rows come from. A 403 is reported, not rendered here.
const props = defineProps<{
  title: string
  fetchHistory: (filters: HistoryFilters) => Promise<{ requests: HistoryItem[] }>
}>()
const emit = defineEmits<{ forbidden: [] }>()
const route = useRoute()
const router = useRouter()
const ownRoute = route.name // the query string belongs to this route only

const DEBOUNCE_MS = 250
const STATUSES: RequestStatus[] = ['approved', 'rejected', 'expired', 'pending']

type Filters = { status: string; minStamps: string; maxStamps: string; from: string; to: string }
const EMPTY: Filters = { status: '', minStamps: '', maxStamps: '', from: '', to: '' }
const KEYS = Object.keys(EMPTY) as (keyof Filters)[]

// The URL query string is the source of truth; the form mirrors it (and writes back, debounced).
const form = reactive<Filters>({ ...EMPTY })

const items = shallowRef<HistoryItem[]>([])
const loaded = ref(false)
const loading = ref(false)
const error = ref('')
const formError = ref('')
const open = ref(false)

const STATUS_TEXT: Record<RequestStatus, string> = {
  pending: '… In attesa',
  approved: '✔ Approvata',
  rejected: '⚠ Rifiutata',
  expired: '⏱ Scaduta',
}

const pad = (n: number) => String(n).padStart(2, '0')
const today = (() => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
})()

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
  for (const k of ['minStamps', 'maxStamps'] as const) if (whole(one(k)) !== null) f[k] = String(whole(one(k)))
  for (const k of ['from', 'to'] as const) if (isDay(one(k))) f[k] = one(k)
  return f
}

const toQuery = (f: Filters) => Object.fromEntries(KEYS.filter((k) => f[k] !== '').map((k) => [k, f[k]]))
const sameQuery = (a: Filters, b: Filters) => KEYS.every((k) => a[k] === b[k])

function validate(f: Filters): string {
  for (const key of ['minStamps', 'maxStamps'] as const) {
    if (f[key] !== '' && whole(f[key]) === null) return 'I timbri devono essere un numero intero da 1 a 50.'
  }
  if (f.minStamps !== '' && f.maxStamps !== '' && whole(f.minStamps)! > whole(f.maxStamps)!) {
    return 'Il minimo dei timbri supera il massimo.'
  }
  for (const key of ['from', 'to'] as const) {
    if (f[key] !== '' && (!isDay(f[key]) || f[key] > today)) return 'Le date nel futuro non sono ammesse.'
  }
  if (f.from !== '' && f.to !== '' && f.from > f.to) return 'La data "Al" è prima della data "Dal".'
  return ''
}

// The day the staff picks is the venue's local day: send real instants (start of the "from"
// day, last millisecond of the "to" day) so the backend does not read it as UTC.
function dayStart(value: string) {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y!, m! - 1, d!).toISOString()
}
function dayEnd(value: string) {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y!, m! - 1, d! + 1, 0, 0, 0, -1).toISOString()
}

// Only the latest request may write its result (rapid changes, back/forward).
let latest = 0
async function load(f: Filters) {
  const mine = ++latest
  loading.value = true
  error.value = ''
  try {
    const result = await props.fetchHistory({
      status: (f.status || undefined) as RequestStatus | undefined,
      minStamps: f.minStamps === '' ? undefined : Number(f.minStamps),
      maxStamps: f.maxStamps === '' ? undefined : Number(f.maxStamps),
      from: f.from === '' ? undefined : dayStart(f.from),
      to: f.to === '' ? undefined : dayEnd(f.to),
    })
    if (mine !== latest) return
    items.value = result.requests
    loaded.value = true
  } catch (err) {
    if (mine !== latest) return
    if (err instanceof ApiError && err.status === 403) emit('forbidden')
    else error.value = err instanceof ApiError ? err.message : 'Errore interno'
  } finally {
    if (mine === latest) loading.value = false
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
    formError.value = validate(f)
    if (formError.value) {
      latest++ // drop any in-flight response; keep the last list on screen
      loading.value = false
      return
    }
    load(f)
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
      formError.value = validate(f)
      if (formError.value) return // invalid: no push, no fetch
      if (!sameQuery(f, parseQuery(route.query))) router.push({ query: toQuery(f) })
    }, DEBOUNCE_MS)
  },
  { deep: true },
)

onBeforeUnmount(stopTimer)

function reset() {
  stopTimer()
  Object.assign(form, EMPTY)
  formError.value = ''
  if (Object.keys(route.query).length > 0) router.push({ query: {} })
}

const activeCount = computed(() => KEYS.filter((k) => form[k] !== '').length)

const countText = computed(() =>
  items.value.length === 1 ? '1 richiesta' : `${items.value.length} richieste`,
)

const when = (iso: string) =>
  new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

function detail(item: HistoryItem) {
  if (item.status !== 'approved') return ''
  const parts = [`${item.stamps} confermati`]
  if ((item.stampsAdded ?? 0) > 0) parts.push(`+${item.stampsAdded} ${item.stampsAdded === 1 ? 'timbro' : 'timbri'}`)
  if ((item.rewardsRedeemed ?? 0) > 0) parts.push(`${item.rewardsRedeemed} ${item.rewardsRedeemed === 1 ? 'premio' : 'premi'}`)
  return parts.join(' · ')
}
</script>

<template>
    <h1 class="h4 mb-2">{{ title }}</h1>

    <div class="d-flex gap-2 mb-2">
      <button
        type="button"
        class="btn btn-outline-primary filter-toggle flex-grow-1 text-start"
        :class="{ active: open }"
        style="min-height: 44px"
        aria-controls="h-panel"
        :aria-expanded="open"
        @click="open = !open"
      >
        Filtri
        <span aria-hidden="true" class="float-end">{{ open ? '▴' : '▾' }}</span>
      </button>
      <button v-if="activeCount > 0" type="button" class="btn btn-outline-secondary filter-reset" style="min-height: 44px" @click="reset">
        Azzera
      </button>
    </div>

    <form v-show="open" id="h-panel" class="card card-body p-2 mb-2 filter-panel" novalidate @submit.prevent>
      <div class="row g-2">
        <div class="col-12">
          <label for="h-status" class="form-label small fw-semibold mb-1">Esito</label>
          <select id="h-status" v-model="form.status" class="form-select" style="height: 44px">
            <option value="">Tutti</option>
            <option value="approved">Approvate</option>
            <option value="rejected">Rifiutate</option>
            <option value="expired">Scadute</option>
            <option value="pending">In attesa</option>
          </select>
        </div>
        <fieldset class="col-12">
          <legend class="form-label small fw-semibold mb-1 float-none">
            Timbri 
          </legend>
          <div class="row g-2">
            <div class="col-6">
              <div class="input-group">
                <label for="h-min" class="input-group-text px-2" style="font-size: 0.875rem">Min</label>
                <input id="h-min" v-model="form.minStamps" class="form-control" style="height: 44px; min-width: 0" type="text" inputmode="numeric" autocomplete="off" />
              </div>
            </div>
            <div class="col-6">
              <div class="input-group">
                <label for="h-max" class="input-group-text px-2" style="font-size: 0.875rem">Max</label>
                <input id="h-max" v-model="form.maxStamps" class="form-control" style="height: 44px; min-width: 0" type="text" inputmode="numeric" autocomplete="off" />
              </div>
            </div>
          </div>
        </fieldset>
        <fieldset class="col-12">
          <legend class="form-label small fw-semibold mb-1 float-none">Periodo</legend>
          <div class="row g-2">
            <div class="col-6">
              <label for="h-from" class="form-label small text-body-secondary mb-1">Dal</label>
              <input id="h-from" v-model="form.from" class="form-control" style="height: 44px" type="date" :max="today" />
            </div>
            <div class="col-6">
              <label for="h-to" class="form-label small text-body-secondary mb-1">Al</label>
              <input id="h-to" v-model="form.to" class="form-control" style="height: 44px" type="date" :min="form.from || undefined" :max="today" />
            </div>
          </div>
        </fieldset>
      </div>
    </form>

    <p v-if="formError" class="text-danger fw-semibold mb-2" role="alert">⚠ {{ formError }}</p>
    <p v-if="error" class="alert alert-danger" role="alert">{{ error }}</p>
    <p class="small text-body-secondary mb-2" role="status">
      <template v-if="!loaded">{{ loading ? 'Caricamento…' : '' }}</template>
      <template v-else-if="items.length > 0">{{ countText }}</template>
    </p>
    <p v-if="loaded && items.length === 0" class="card card-body text-body-secondary">Nessuna richiesta trovata.</p>

    <ul class="list-unstyled mb-3">
      <li v-for="item in items" :key="item.requestId" class="card card-body mb-2">
        <div class="d-flex align-items-baseline justify-content-between gap-3">
          <strong class="text-break">{{ item.venueName ?? item.publicCode }}</strong>
          <span class="text-body-secondary text-end">{{ when(item.createdAt) }}</span>
        </div>
        <div>{{ STATUS_TEXT[item.status] }}</div>
        <div v-if="detail(item)" class="text-body-secondary">{{ detail(item) }}</div>
      </li>
    </ul>
</template>
