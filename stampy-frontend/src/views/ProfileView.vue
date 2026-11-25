<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError } from '@/api/client'
import { getMyVenues } from '@/api/endpoints'
import DisplayNameForm from '@/components/DisplayNameForm.vue'
import { useAuth } from '@/composables/useAuth'

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

onMounted(async () => {
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

    <!-- STATIC MODEL of a venue card with the official Google button inside (BACKLOG B30: real cards and
         the button wiring come later). Branding of the venue: backgroundColor (--brand) + logo.
         The coloured top is the venue; the bottom is the app surface, where Google's black button reads in both themes. -->
    <section class="card bg-body-tertiary rounded-4 overflow-hidden shadow-sm" style="--brand: #1e3a5f" aria-labelledby="wallet-card-title">
      <div class="p-3 pb-4 text-white" style="background: linear-gradient(155deg, color-mix(in srgb, var(--brand) 78%, #fff) 0%, var(--brand) 70%)">
        <div class="d-flex align-items-center gap-3">
          <span class="rounded-circle bg-white d-flex align-items-center justify-content-center fw-bold flex-shrink-0" style="width: 2.5rem; height: 2.5rem; color: var(--brand)" aria-hidden="true">BA</span>
          <div class="min-w-0 me-auto">
            <h2 id="wallet-card-title" class="h6 fw-semibold mb-0 text-break">Bar Aurora</h2>
            <p class="small mb-0" style="opacity: 0.75">Carta fedeltà</p>
          </div>
          <span class="rounded-pill px-3 py-1 small fw-semibold" style="background: rgba(255, 255, 255, 0.16)">3/10</span>
        </div>
        <div class="d-grid gap-2 mt-4 mx-auto" style="grid-template-columns: repeat(5, 1fr); max-width: 16.5rem" role="img" aria-label="3 timbri su 10">
          <span v-for="n in 10" :key="n" class="rounded-circle d-flex align-items-center justify-content-center" style="aspect-ratio: 1" :style="{ background: n <= 3 ? '#fff' : 'rgba(255, 255, 255, 0.14)' }">
            <svg v-if="n <= 3" width="45%" height="45%" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
          </span>
        </div>
      </div>
      <div class="card-body d-flex flex-column gap-3">
        <div>
          <p class="fw-semibold mb-0">Ancora 7 timbri</p>
          <p class="text-body-secondary mb-0">Al decimo, un caffè in regalo.</p>
        </div>
        <button type="button" class="d-block mx-auto p-0 border-0 bg-transparent" aria-label="Aggiungi a Google Wallet">
          <picture>
            <source media="(min-width: 380px)" srcset="/google-wallet/add-to-google-wallet-it.svg" />
            <img src="/google-wallet/add-to-google-wallet-it-condensed.svg" alt="" style="display: block; height: 48px; width: auto" />
          </picture>
        </button>
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
