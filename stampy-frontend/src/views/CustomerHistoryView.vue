<script setup lang="ts">
import { getMyHistory } from '@/api/endpoints'
import RequestHistory from '@/components/RequestHistory.vue'
</script>

<template>
  <RequestHistory title="Le tue richieste" :fetch-history="getMyHistory" />
</template>
