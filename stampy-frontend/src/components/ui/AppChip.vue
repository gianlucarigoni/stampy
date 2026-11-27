<script setup lang="ts">
// Chip (21 §4.7): SVG icon + text (+ border). The glyph is never a Unicode character; the text says the state.
import AppIcon from './AppIcon.vue'
import type { IconName } from './icons'

withDefaults(defineProps<{ variant?: 'neutral' | 'warn' | 'ok' | 'prize' | 'action'; icon?: IconName }>(), { variant: 'neutral' })
</script>

<template>
  <span class="app-chip" :class="`app-chip-${variant}`">
    <AppIcon v-if="icon" :name="icon" :size="16" />
    <slot />
  </span>
</template>
