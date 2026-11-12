<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError } from '@/api/client'
import { getMyVenues } from '@/api/endpoints'
import DisplayNameForm from '@/components/DisplayNameForm.vue'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { user, logout } = useAuth()

const error = ref('')
const editingName = ref(false)
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
      <button v-if="!editingName" class="btn btn-link ms-auto" type="button" @click="editingName = true">Modifica nome</button>
    </section>
    <section v-if="editingName" class="card card-body">
      <DisplayNameForm :initial="user?.displayName" submit-label="Salva" @saved="editingName = false" />
      <button class="btn btn-link mt-2" type="button" @click="editingName = false">Annulla</button>
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
