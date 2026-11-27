<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError } from '@/api/client'
import { getMyCards, getMyVenues, type MyCard } from '@/api/endpoints'
import DisplayNameForm from '@/components/DisplayNameForm.vue'
import { useAuth } from '@/composables/useAuth'
import { textColorOn } from '@/utils/color'

const router = useRouter()
const { user, logout } = useAuth()

const error = ref('')
const editingName = ref(false)
const nameForm = ref<InstanceType<typeof DisplayNameForm> | null>(null)
const editButton = ref<HTMLButtonElement | null>(null)

// Keyboard focus follows the form: into the field when it opens, back to the button when it closes.
async function startEditingName() {
  editingName.value = true
  await nextTick()
  nameForm.value?.focus()
}
async function stopEditingName() {
  editingName.value = false
  await nextTick()
  editButton.value?.focus()
}
// Owners and staff cannot delete their account from here (BACKLOG B4b). The backend answers 403
// anyway: this only avoids offering a button that cannot work.
const isMember = ref<boolean | null>(null) // null = not known yet
const blocked = computed(() => isMember.value === true)
const cards = ref<MyCard[] | null>(null) // null = loading or failed
const cardsError = ref(false)

onMounted(async () => {
  getMyCards()
    .then((r) => (cards.value = r.cards))
    .catch(() => (cardsError.value = true))
  try {
    isMember.value = (await getMyVenues()).venues.length > 0
  } catch {
    /* the 403 from the server is the real check */
  }
})

async function signOut() {
  error.value = ''
  try {
    await logout()
    await router.replace({ name: 'login' })
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Errore interno'
  }
}
</script>

<template>
  <div class="d-flex flex-column gap-3">
    <section class="card card-body flex-row align-items-center gap-3" aria-labelledby="profile-title">
      <div class="min-w-0">
        <h1 id="profile-title" class="h5 mb-0 text-break">{{ user?.displayName || 'Il tuo profilo' }}</h1>
        <p class="mb-0 text-body-secondary text-break">{{ user?.email }}</p>
      </div>
      <button v-if="!editingName" ref="editButton" class="btn btn-link ms-auto" type="button" @click="startEditingName">Modifica nome</button>
    </section>
    <section v-if="editingName" class="card card-body">
      <DisplayNameForm ref="nameForm" :initial="user?.displayName" submit-label="Salva" @saved="stopEditingName" />
      <button class="btn btn-link mt-2" type="button" @click="stopEditingName">Annulla</button>
    </section>

    <!-- The customer history is for customers: owners and staff see their venue's history from the menu. -->
    <section v-if="isMember === false" class="card">
      <RouterLink class="profile-row card-body d-flex align-items-center justify-content-between" :to="{ name: 'history' }">
        <span class="fw-semibold">Storico richieste</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M9 5l7 7-7 7" />
        </svg>
      </RouterLink>
    </section>

    <!-- One card per venue, with the venue's real branding (BACKLOG B30). Empty state for who has no card
         (owners and staff included): no button. The official button is a link, always visible, also for a card
         already saved (Google shows the existing card, it does not duplicate it). -->
    <p v-if="cards && cards.length === 0" class="card card-body text-body-secondary mb-0">Non hai ancora nessuna card. Si crea la prima volta che tocchi il tag di un locale.</p>
    <p v-else-if="cardsError" class="text-body-secondary mb-0" role="alert">Impossibile caricare le tue card.</p>
    <section
      v-for="c in cards ?? []"
      :key="c.venueId"
      class="card bg-body-tertiary rounded-4 overflow-hidden shadow-sm"
      :aria-labelledby="`wallet-card-${c.venueId}`"
    >
      <div class="p-3 pb-4" :style="{ background: c.branding.backgroundColor, color: textColorOn(c.branding.backgroundColor) }">
        <div class="d-flex align-items-center gap-3">
          <img :src="c.branding.logoUrl" alt="" class="rounded-circle bg-white flex-shrink-0 object-fit-cover" style="width: 2.5rem; height: 2.5rem" />
          <div class="min-w-0 me-auto">
            <h2 :id="`wallet-card-${c.venueId}`" class="h6 fw-semibold mb-0 text-break">{{ c.venueName }}</h2>
            <p class="small mb-0" style="opacity: 0.75">Carta fedeltà</p>
          </div>
          <span v-if="c.stampsRequired > 0" class="rounded-pill px-3 py-1 small fw-semibold" style="background: rgba(128, 128, 128, 0.3)">{{ c.stampsCount }}/{{ c.stampsRequired }}</span>
        </div>
      </div>
      <div v-if="c.saveUrl" class="card-body">
        <a class="wallet-button d-block mx-auto" :href="c.saveUrl" target="_blank" rel="noopener" aria-label="Aggiungi a Google Wallet">
          <picture>
            <source media="(min-width: 380px)" srcset="/google-wallet/add-to-google-wallet-it.svg" />
            <img src="/google-wallet/add-to-google-wallet-it-condensed.svg" alt="" style="display: block; height: 48px; width: auto" />
          </picture>
        </a>
      </div>
    </section>

    <section class="card card-body danger-zone" aria-labelledby="danger-title">
      <h2 id="danger-title" class="h6 danger-zone-title">Zona pericolosa</h2>
      <p v-if="blocked" class="text-body-secondary mb-0">Questo account gestisce un locale e non può essere eliminato da qui.</p>
      <template v-else>
        <RouterLink class="btn btn-outline-danger btn-danger-soft w-100 d-flex align-items-center justify-content-center" :to="{ name: 'delete-account' }">
          Elimina account
        </RouterLink>
      </template>
    </section>
  </div>
</template>

<style scoped>
/* Dark theme: the official button sits on a light plate so its black body keeps contrast. */
[data-bs-theme='dark'] .wallet-button {
  background: #fff;
  border-radius: 0.5rem;
  padding: 0.5rem;
  width: fit-content;
}
</style>
