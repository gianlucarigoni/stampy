<script setup lang="ts">
import { onMounted, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError } from '@/api/client'
import { visitVenue } from '@/api/endpoints'
import { useAuth } from '@/composables/useAuth'
import { formatWait } from '@/utils/format'
import { readTab, removeTab, writeTab } from '@/utils/tabStorage'

const props = defineProps<{ venueId: string }>()

interface NewCard {
  saveUrl: string
  publicCode: string
}

type Screen =
  | { kind: 'loading' }
  | ({ kind: 'card' } & NewCard)
  | { kind: 'error'; message: string; canRetry: boolean }

const router = useRouter()
const { user } = useAuth()
const screen = shallowRef<Screen>({ kind: 'loading' })

// `saveUrl` is returned only once, when the card is created, and there is no way to get it
// back yet (BACKLOG B8). Without this, reloading the page on return from Wallet would lose
// it and also open a stamp request the customer did not ask for.
const cardKey = () => `stampy.card.${user.value?.id}.${props.venueId}`

function showFailure(err: unknown) {
  if (!(err instanceof ApiError)) {
    screen.value = { kind: 'error', message: 'Errore interno', canRetry: true }
  } else if (err.status === 429) {
    const wait = err.retryAfterSeconds ? ` Riprova tra ${formatWait(err.retryAfterSeconds)}.` : ''
    screen.value = { kind: 'error', message: `Troppe richieste.${wait}`, canRetry: true }
  } else if (err.code === 'VenueNotFound' || err.status === 400) {
    screen.value = { kind: 'error', message: 'Questo link non è valido.', canRetry: false }
  } else if (err.code === 'PromotionNotFound') {
    screen.value = {
      kind: 'error',
      message: 'Questo locale non ha promozioni attive in questo momento.',
      canRetry: false,
    }
  } else {
    screen.value = { kind: 'error', message: err.message, canRetry: true }
  }
}

async function runVisit() {
  removeTab(cardKey())
  screen.value = { kind: 'loading' }
  try {
    const result = await visitVenue(props.venueId)
    if (result.state === 'card_created') {
      const card: NewCard = { saveUrl: result.saveUrl, publicCode: result.publicCode }
      writeTab(cardKey(), card)
      screen.value = { kind: 'card', ...card }
    } else {
      // GET /requests/:id does not return the venue (BACKLOG B15): the request page needs it
      // to offer "try again", so it is kept for this tab.
      writeTab(`stampy.request.${result.requestId}`, props.venueId)
      await router.replace({ name: 'request', params: { requestId: result.requestId } })
    }
  } catch (err) {
    showFailure(err)
  }
}

onMounted(() => {
  const card = readTab<NewCard>(cardKey())
  if (card) screen.value = { kind: 'card', ...card }
  else void runVisit()
})
</script>

<template>
  <p v-if="screen.kind === 'loading'" class="text-body-secondary" role="status">Un momento…</p>

  <section v-else-if="screen.kind === 'card'" class="card card-body d-grid gap-3">
    <h1 class="h4 mb-0">La tua card è pronta</h1>
    <p class="mb-0">Salvala in Google Wallet: è qui che vedrai i tuoi timbri.</p>
    <a
      class="btn btn-primary"
      :href="screen.saveUrl"
      target="_blank"
      rel="noopener noreferrer"
    >
      Aggiungi a Google Wallet
    </a>
    <button type="button" class="btn btn-outline-primary" @click="runVisit">
      Richiedi il timbro
    </button>
    <p class="text-body-secondary mb-0">Codice card: {{ screen.publicCode }}</p>
  </section>

  <section v-else class="card card-body">
    <p class="alert alert-danger" role="alert">{{ screen.message }}</p>
    <button v-if="screen.canRetry" type="button" class="btn btn-primary" @click="runVisit">
      Riprova
    </button>
  </section>
</template>
