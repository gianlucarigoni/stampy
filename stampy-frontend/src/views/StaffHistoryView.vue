<script setup lang="ts">
import { ref } from 'vue'
import { getHistory, type HistoryFilters } from '@/api/endpoints'
import RequestHistory from '@/components/RequestHistory.vue'
import AppAlert from '@/components/ui/AppAlert.vue'

const props = defineProps<{ venueId: string }>()
const forbidden = ref(false)
const fetchHistory = (filters: HistoryFilters) => getHistory(props.venueId, filters)
</script>

<template>
  <section v-if="forbidden" class="card card-body">
    <AppAlert type="error">Non sei autorizzato a gestire questo locale.</AppAlert>
    <RouterLink :to="{ name: 'staff-venues' }">I tuoi locali</RouterLink>
  </section>
  <RequestHistory v-else title="Storico richieste" :fetch-history="fetchHistory" @forbidden="forbidden = true" />
</template>
