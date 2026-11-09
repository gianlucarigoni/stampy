<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ count: number; required: number }>()

// `count = required` is the normal "reward available" state, never an error.
const full = computed(() => props.count >= props.required)
// Up to 100 stamps are allowed: past this size the dots stop being readable.
const showDots = computed(() => props.required <= 20)

// Rows are balanced (sizes differ by at most 1): never a lone dot on the last row.
const MAX_PER_ROW = 6
const rows = computed(() => {
  const total = props.required
  const rowCount = Math.max(1, Math.ceil(total / MAX_PER_ROW))
  const base = Math.floor(total / rowCount)
  const extra = total % rowCount
  let next = 1
  return Array.from({ length: rowCount }, (_, i) => {
    const size = base + (i < extra ? 1 : 0)
    return Array.from({ length: size }, () => next++)
  })
})
</script>

<template>
  <div>
    <div v-if="showDots" class="dots" :style="{ '--cols': rows[0]?.length ?? 1 }" aria-hidden="true">
      <div v-for="(row, i) in rows" :key="i" class="dots-row">
        <span v-for="n in row" :key="n" class="dot" :class="{ filled: n <= count }" />
      </div>
    </div>
    <p class="fw-semibold mb-3">{{ count }} / {{ required }} timbri</p>
    <div v-if="full" class="alert alert-success mb-0">
      <p class="fw-semibold mb-1">Premio disponibile</p>
      <p class="mb-0">Il prossimo prodotto è gratis: mostra questa schermata al personale.</p>
    </div>
  </div>
</template>

<style scoped>
.dots {
  --gap: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  margin: 0 0 1rem;
}

.dots-row {
  display: flex;
  justify-content: center;
  gap: var(--gap);
}

/* Dots share the width of the longest row (capped), so every dot has the same size. */
.dot {
  flex: none;
  width: min(3rem, calc((100% - (var(--cols) - 1) * var(--gap)) / var(--cols)));
  aspect-ratio: 1;
  border: 3px solid var(--stampy-brand);
  border-radius: 50%;
  transition: background-color 0.2s;
}

.dot.filled {
  background: var(--stampy-brand);
}

@media (prefers-reduced-motion: reduce) {
  .dot {
    transition: none;
  }
}
</style>
