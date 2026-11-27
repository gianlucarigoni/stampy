<script setup lang="ts">
// Venue name and reward on the customer pages. Each row is omitted if its data is missing.
defineProps<{ venueName?: string; rewardName?: string; required?: number }>()
</script>

<template>
  <div v-if="venueName || rewardName" class="mb-3">
    <p v-if="venueName" class="fw-semibold mb-0">{{ venueName }}</p>
    <p v-if="rewardName" class="text-body-secondary mb-0">
      <template v-if="required">{{ required }} timbri = </template>{{ rewardName }}
    </p>
  </div>
</template>
