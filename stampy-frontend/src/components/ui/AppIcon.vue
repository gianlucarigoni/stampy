<script setup lang="ts">
// Inline Phosphor icon (MIT). Always decorative: the text next to it (or the aria-label of the control) says the meaning.
import { ICONS, type IconName } from './icons'

withDefaults(defineProps<{ name: IconName; size?: number }>(), { size: 20 })
</script>

<template>
  <svg class="app-icon" viewBox="0 0 256 256" :width="size" :height="size" fill="currentColor" aria-hidden="true" focusable="false">
    <path v-for="d in ICONS[name]" :key="d" :d="d" />
  </svg>
</template>
