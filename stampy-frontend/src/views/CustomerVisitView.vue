<script setup lang="ts">
import { onMounted, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError } from '@/api/client'
import { markWalletAdded, visitVenue } from '@/api/endpoints'
import { formatWait } from '@/utils/format'
import { writeTab } from '@/utils/tabStorage'

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
const screen = shallowRef<Screen>({ kind: 'loading' })

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

// `requestStamp` = the customer tapped "Richiedi il timbro". A plain tap on a card that was
// never added to Wallet shows the two buttons and opens no stamp request.
async function runVisit(requestStamp = false) {
  screen.value = { kind: 'loading' }
  try {
    const result = await visitVenue(props.venueId, requestStamp)
    if (result.state === 'card_created' || result.state === 'card_not_added') {
      screen.value = { kind: 'card', saveUrl: result.saveUrl, publicCode: result.publicCode }
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

// The link opens in a new tab on its own; this only records the tap (not_added -> active).
// A failure here is harmless: the card stays not_added and the next tap shows this screen.
function walletTapped() {
  void markWalletAdded(props.venueId).catch(() => {})
}

onMounted(() => void runVisit())
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
      @click="walletTapped"
    >
      Aggiungi a Google Wallet
    </a>
    <button type="button" class="btn btn-outline-primary" @click="runVisit(true)">
      Richiedi il timbro
    </button>
    <p class="text-body-secondary mb-0">Codice card: {{ screen.publicCode }}</p>
  </section>

  <section v-else class="card card-body">
    <p class="alert alert-danger" role="alert">{{ screen.message }}</p>
    <button v-if="screen.canRetry" type="button" class="btn btn-primary" @click="runVisit()">
      Riprova
    </button>
  </section>
</template>
