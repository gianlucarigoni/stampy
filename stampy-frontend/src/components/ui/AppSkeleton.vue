<script setup lang="ts">
// Loading placeholder (21 §4.12): blocks of `surface-2`, the same height as the final content, no shimmer.
// The container is `aria-busy`; a visually hidden status says what is loading.
withDefaults(defineProps<{ lines?: number; height?: string; label?: string; card?: boolean }>(), {
  lines: 3,
  height: '1.125rem',
  label: 'Caricamento…',
  card: false,
})
</script>

<template>
  <div class="app-skeleton" :class="{ 'card card-body': card }" aria-busy="true">
    <span class="visually-hidden" role="status">{{ label }}</span>
    <span v-for="n in lines" :key="n" class="app-skeleton-line" :style="{ height, width: n === lines && lines > 1 ? '60%' : '100%' }" aria-hidden="true" />
  </div>
</template>
