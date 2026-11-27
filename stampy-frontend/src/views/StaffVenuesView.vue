<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError } from '@/api/client'
import { getMyVenues, type MemberVenue } from '@/api/endpoints'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
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
  <section v-if="error" class="card card-body">
    <AppAlert type="error">{{ error }}</AppAlert>
    <AppButton @click="load">Riprova</AppButton>
  </section>

  <AppSkeleton v-else-if="!venues" card :lines="3" height="3rem" />

  <section v-else-if="venues.length > 0" class="card card-body d-grid gap-3">
    <h1 class="h4 mb-0">I tuoi locali</h1>
    <AppButton
      v-for="venue in venues"
      :key="venue.venueId"
      variant="secondary"
      :to="{ name: 'staff-queue', params: { venueId: venue.venueId } }"
    >
      {{ venue.name }}
    </AppButton>
  </section>
</template>
