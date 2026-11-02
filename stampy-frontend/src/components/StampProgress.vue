<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ count: number; required: number }>()

// `count = required` is the normal "reward available" state, never an error.
const full = computed(() => props.count >= props.required)
// Up to 100 stamps are allowed: past this size the dots stop being readable.
const showDots = computed(() => props.required <= 20)
</script>

<template>
  <div>
    <ol v-if="showDots" class="dots" aria-hidden="true">
      <li v-for="n in required" :key="n" class="dot" :class="{ filled: n <= count }" />
    </ol>
    <p class="fw-semibold mb-3">{{ count }} / {{ required }} timbri</p>
    <p v-if="full" class="alert alert-success mb-0">Premio disponibile</p>
  </div>
</template>

<style scoped>
.dots {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0 0 0.75rem;
  padding: 0;
  list-style: none;
}

.dot {
  width: 2rem;
  height: 2rem;
  border: 2px solid var(--stampy-brand);
  border-radius: 50%;
}

.dot.filled {
  background: var(--stampy-brand);
}

</style>
