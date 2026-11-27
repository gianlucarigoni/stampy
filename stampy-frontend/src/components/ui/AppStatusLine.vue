<script setup lang="ts">
// Persistent status line (21 §5.4, replaces toasts: a message that disappears by itself breaks WCAG 2.2.1 and covers
// the controls). `role=status`, stays until the user interacts again.
import AppIcon from './AppIcon.vue'
import type { IconName } from './icons'

withDefaults(defineProps<{ icon?: IconName }>(), { icon: 'check-circle-fill' })
</script>

<template>
  <p class="app-status-line" role="status">
    <AppIcon :name="icon" :size="18" />
    <span><slot /></span>
  </p>
</template>
