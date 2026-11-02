<script setup lang="ts">
import { onMounted, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError } from '@/api/client'
import { getRequest, type StampRequest } from '@/api/endpoints'
import StampProgress from '@/components/StampProgress.vue'
import { usePolling } from '@/composables/usePolling'
import { readTab } from '@/utils/tabStorage'

const props = defineProps<{ requestId: string }>()

const POLL_MS = 2000

type Screen =
  | { kind: 'loading' }
  | { kind: 'pending'; balance: StampRequest }
  | { kind: 'closed'; result: StampRequest }
  | { kind: 'not-found' }
  | { kind: 'error'; message: string }

const router = useRouter()
const screen = shallowRef<Screen>({ kind: 'loading' })

// Saved by the visit page; null if this tab never went through it.
const venueId = readTab<string>(`stampy.request.${props.requestId}`)

// This page only reads: reloading it never opens a new stamp request.
async function refresh(): Promise<boolean> {
  try {
    const result = await getRequest(props.requestId)
    screen.value =
      result.status === 'pending'
        ? { kind: 'pending', balance: result }
        : { kind: 'closed', result }
    return result.status === 'pending'
  } catch (err) {
    // Patchy connection at the counter: keep trying. A 401 is handled by the router.
    if (err instanceof ApiError && (err.status === 0 || err.status >= 500)) return true
    // Missing and someone else's request answer the same 404; a malformed id answers 400.
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) {
      screen.value = { kind: 'not-found' }
    } else {
      screen.value = {
        kind: 'error',
        message: err instanceof ApiError ? err.message : 'Errore interno',
      }
    }
    return false
  }
}

const polling = usePolling(refresh, POLL_MS)

const askAgain = () => router.replace({ name: 'visit', params: { venueId: venueId ?? '' } })

async function load() {
  screen.value = { kind: 'loading' }
  if (await refresh()) polling.start()
}

onMounted(load)
</script>

<template>
  <p v-if="screen.kind === 'loading'" class="text-body-secondary" role="status">Un momento…</p>

  <section v-else-if="screen.kind === 'pending'" class="card card-body" aria-live="polite">
    <h1 class="h4">Richiesta inviata</h1>
    <p>Stiamo aspettando la conferma dello staff.</p>
    <StampProgress :count="screen.balance.stampsCount" :required="screen.balance.stampsRequired" />
  </section>

  <section v-else-if="screen.kind === 'closed'" class="card card-body" aria-live="polite">
    <template v-if="screen.result.status === 'approved'">
      <h1 class="h4">Timbro confermato</h1>
      <StampProgress :count="screen.result.stampsCount" :required="screen.result.stampsRequired" />
    </template>
    <template v-else>
      <h1 class="h4">
        {{ screen.result.status === 'expired' ? 'Richiesta scaduta' : 'Richiesta non confermata' }}
      </h1>
      <p>Nessun timbro aggiunto.</p>
      <button v-if="venueId" type="button" class="btn btn-primary" @click="askAgain">
        Richiedi di nuovo
      </button>
      <p v-else class="text-body-secondary mb-0">
        Avvicina di nuovo il telefono al tag del locale per fare una nuova richiesta.
      </p>
    </template>
  </section>

  <section v-else-if="screen.kind === 'not-found'" class="card card-body">
    <h1 class="h4">Richiesta non trovata</h1>
    <p class="text-body-secondary mb-0">
      Avvicina di nuovo il telefono al tag del locale per fare una nuova richiesta.
    </p>
  </section>

  <section v-else class="card card-body">
    <p class="alert alert-danger" role="alert">{{ screen.message }}</p>
    <button type="button" class="btn btn-primary" @click="load">Riprova</button>
  </section>
</template>
