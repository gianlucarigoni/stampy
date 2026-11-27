<script setup lang="ts">
// Empty state / page error (21 §4.12, pattern 5.1 "di pagina"): icon + title + text + primary action
// (+ always a way out in the `actions` slot). Left aligned, in a card.
import AppIcon from './AppIcon.vue'
import type { IconName } from './icons'

withDefaults(defineProps<{ icon?: IconName; title: string; headingLevel?: 1 | 2 }>(), { icon: 'compass', headingLevel: 1 })
</script>

<template>
  <section class="card card-body app-empty">
    <AppIcon :name="icon" :size="48" class="app-empty-icon" />
    <component :is="`h${headingLevel}`" class="h2 mb-0">{{ title }}</component>
    <div class="app-empty-text"><slot /></div>
    <div v-if="$slots.actions" class="app-empty-actions"><slot name="actions" /></div>
  </section>
</template>
