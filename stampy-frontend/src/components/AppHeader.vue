<script setup lang="ts">
// Header (21 §4.9): 56 px, wordmark placeholder (name = $product-name / --app-product-name, D5) and the controls.
// `centered`: three equal columns (start slot | wordmark | default slot), so the wordmark stays in the middle whether
// or not the start slot has content. Without it: wordmark left, slot right.
// `title` slot (staff area, P6): replaces the wordmark with the active venue chip; the middle column then takes the
// free width (`minmax(0, 1fr)`) so a long venue name is truncated by the chip instead of pushing the controls out.
defineProps<{ centered?: boolean }>()
</script>

<template>
  <header class="app-header" :class="[centered ? 'app-header-centered' : 'app-header-split', { 'app-header-title': $slots.title }]">
    <div v-if="centered" class="d-flex justify-content-start"><slot name="start" /></div>
    <slot name="title"><span class="wordmark">Stampy</span></slot>
    <div v-if="centered" class="d-flex justify-content-end"><slot /></div>
    <slot v-else />
  </header>
</template>
