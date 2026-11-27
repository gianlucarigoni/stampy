<script setup lang="ts">
// Header (21 §4.9): 56 px, wordmark placeholder (name = $product-name / --app-product-name, D5) and the controls.
// `centered`: three equal columns (start slot | wordmark | default slot), so the wordmark stays in the middle whether
// or not the start slot has content. Without it: wordmark left, slot right.
defineProps<{ centered?: boolean }>()
</script>

<template>
  <header class="app-header" :class="centered ? 'app-header-centered' : 'app-header-split'">
    <div v-if="centered" class="d-flex justify-content-start"><slot name="start" /></div>
    <span class="wordmark">Stampy</span>
    <div v-if="centered" class="d-flex justify-content-end"><slot /></div>
    <slot v-else />
  </header>
</template>
