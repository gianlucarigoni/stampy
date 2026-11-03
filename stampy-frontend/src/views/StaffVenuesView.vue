<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError } from '@/api/client'
import { getMyVenues, type MemberVenue } from '@/api/endpoints'

const router = useRouter()

const venues = shallowRef<MemberVenue[] | null>(null)
const error = ref('')

async function load() {
  error.value = ''
  try {
    const result = await getMyVenues()
    // Not a member anywhere: this is a customer who opened `/`, not a staff screen.
    if (result.venues.length === 0) {
      await router.replace({ name: 'no-venue' })
      return
    }
    const only = result.venues.length === 1 ? result.venues[0] : undefined
    if (only) {
      await router.replace({ name: 'staff-queue', params: { venueId: only.venueId } })
      return
    }
    venues.value = result.venues
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Errore interno'
  }
}

onMounted(load)
</script>

<template>
  <section v-if="error" class="card card-body">
    <p class="alert alert-danger" role="alert">{{ error }}</p>
    <button type="button" class="btn btn-primary" @click="load">Riprova</button>
  </section>

  <p v-else-if="!venues" class="text-body-secondary" role="status">Caricamento…</p>

  <section v-else-if="venues.length > 0" class="card card-body d-grid gap-3">
    <h1 class="h4 mb-0">I tuoi locali</h1>
    <RouterLink
      v-for="venue in venues"
      :key="venue.venueId"
      class="btn btn-outline-primary"
      :to="{ name: 'staff-queue', params: { venueId: venue.venueId } }"
    >
      {{ venue.name }}
    </RouterLink>
  </section>
</template>
