<script setup lang="ts">
// `centered`: three equal columns (start slot | wordmark | default slot), so the wordmark stays in
// the middle whether or not the start slot has content. Without it: wordmark left, slot right.
defineProps<{ centered?: boolean }>()
</script>

<template>
  <header
    class="mb-3"
    :class="centered ? 'app-header-centered' : 'd-flex align-items-center justify-content-between gap-3'"
    style="min-height: 2.75rem"
  >
    <div v-if="centered" class="d-flex justify-content-start"><slot name="start" /></div>
    <span class="wordmark">Stampy</span>
    <div v-if="centered" class="d-flex justify-content-end"><slot /></div>
    <slot v-else />
  </header>
</template>

<style scoped>
.app-header-centered {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 0.75rem;
}
</style>
