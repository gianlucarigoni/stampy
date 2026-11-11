<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getMyHistory, getMyVenues } from '@/api/endpoints'
import RequestHistory from '@/components/RequestHistory.vue'

const router = useRouter()
// Owners and staff do not get the customer history (their venue's history is in the menu):
// a typed URL goes back to the profile. Only the frontend decides this for now.
const allowed = ref(false)

onMounted(async () => {
  try {
    if ((await getMyVenues()).venues.length > 0) {
      await router.replace({ name: 'profile' })
      return
    }
  } catch {
    /* if the check fails, the customer history is still the user's own data */
  }
  allowed.value = true
})
</script>

<template>
  <RequestHistory v-if="allowed" title="Le tue richieste" :fetch-history="getMyHistory" />
</template>
