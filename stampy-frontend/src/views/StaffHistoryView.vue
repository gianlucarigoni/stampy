<script setup lang="ts">
import { ref } from 'vue'
import { getHistory, type HistoryFilters } from '@/api/endpoints'
import RequestHistory from '@/components/RequestHistory.vue'

const props = defineProps<{ venueId: string }>()
const forbidden = ref(false)
const fetchHistory = (filters: HistoryFilters) => getHistory(props.venueId, filters)
</script>

<template>
  <section v-if="forbidden" class="card card-body">
    <p class="alert alert-danger" role="alert">Non sei autorizzato a gestire questo locale.</p>
    <RouterLink :to="{ name: 'staff-venues' }">I tuoi locali</RouterLink>
  </section>
  <RequestHistory v-else title="Storico richieste" :fetch-history="fetchHistory" @forbidden="forbidden = true" />
</template>
