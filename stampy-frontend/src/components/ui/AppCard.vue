<script setup lang="ts">
// Card (21 §4.4): surface, 1.5 px border, no shadow. With `to` the whole card is a link row (min 56 px, chevron).
import type { RouteLocationRaw } from 'vue-router'
import AppIcon from './AppIcon.vue'

defineProps<{ to?: RouteLocationRaw }>()
</script>

<template>
  <RouterLink v-if="to" :to="to" class="card app-card app-card-link">
    <span class="app-card-link-body"><slot /></span>
    <AppIcon name="caret-right" :size="20" class="app-card-chevron" />
  </RouterLink>
  <section v-else class="card card-body app-card"><slot /></section>
</template>
