<script setup lang="ts">
// The venue changed promotion: the card restarts from 0 when the staff confirms. Informative only, never an error.
// `customer`: one quiet line on the pending screen. `staff`: a small pill on the queue row, so the staff can say it aloud.
// Never shows how many stamps are lost (product decision 2026-11-09).
defineProps<{ variant: 'customer' | 'staff' }>()
</script>

<template>
  <p v-if="variant === 'customer'" class="promo-notice promo-notice--customer" role="note">
    <svg class="promo-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
    <span><strong>Nuova promozione!</strong> La tua card riparte da zero.</span>
  </p>
  <span v-else class="promo-notice promo-notice--staff">
    <svg class="promo-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
    Nuova promozione 
  </span>
</template>

<style scoped>
.promo-notice {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--bs-body-color);
  background: color-mix(in srgb, var(--stampy-brand) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--stampy-brand) 45%, transparent);
}

.promo-notice--customer {
  margin: 0 0 1rem;
  padding: 0.625rem 0.875rem;
  border-radius: var(--bs-border-radius);
}

.promo-notice--staff {
  display: inline-flex;
  padding: 0.125rem 0.625rem;
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 600;
}

.promo-icon {
  flex: none;
  width: 1.125rem;
  height: 1.125rem;
  fill: none;
  stroke: var(--stampy-brand);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
