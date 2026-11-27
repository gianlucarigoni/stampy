<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError } from '@/api/client'
import { getMyVenues, type MemberVenue } from '@/api/endpoints'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppSkeleton from '@/components/ui/AppSkeleton.vue'

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
  <h1 class="h2 mb-3">I tuoi locali</h1>

  <section v-if="error" class="d-grid gap-3">
    <AppAlert type="error" title="Non siamo riusciti a caricare i tuoi locali">{{ error }}</AppAlert>
    <AppButton @click="load">Riprova</AppButton>
  </section>

  <AppSkeleton v-else-if="!venues" :lines="3" height="3.5rem" label="Caricamento dei locali…" />

  <ul v-else class="list-unstyled d-grid gap-3 mb-0">
    <li v-for="venue in venues" :key="venue.venueId">
      <AppCard :to="{ name: 'staff-queue', params: { venueId: venue.venueId } }">
        <span class="d-block fw-bold text-break">{{ venue.name }}</span>
        <span class="d-block small text-body-secondary">{{ venue.role === 'owner' ? 'Titolare' : 'Staff' }}</span>
      </AppCard>
    </li>
  </ul>
</template>
