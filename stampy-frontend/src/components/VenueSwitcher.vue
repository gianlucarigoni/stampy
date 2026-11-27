<script setup lang="ts">
// Active-venue chip in the staff header (P6, 21 §4.9). With more than one venue it opens a dropdown with the venues the
// user is staff or owner of: one tap changes venue (same page, other venue). "Tutti i locali" keeps the full page.
// With a single venue the chip is only a label (nothing to switch to). The last venue is NOT remembered (D33).
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { MemberVenue } from '@/api/endpoints'
import AppIcon from '@/components/ui/AppIcon.vue'

const props = defineProps<{ venues: MemberVenue[]; currentId: string; routeName: 'staff-queue' | 'staff-history' }>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const toggle = ref<HTMLButtonElement | null>(null)
const current = computed(() => props.venues.find((v) => v.venueId === props.currentId))
const switchable = computed(() => props.venues.length > 1)

function close(refocus = false) {
  if (!open.value) return
  open.value = false
  if (refocus) toggle.value?.focus()
}
defineExpose({ close })

const onDocClick = (e: MouseEvent) => {
  if (open.value && !root.value?.contains(e.target as Node)) close()
}
const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close(true)
onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div v-if="current" ref="root" class="venue-switcher">
    <button
      v-if="switchable"
      ref="toggle"
      type="button"
      class="venue-chip"
      aria-haspopup="true"
      aria-controls="venue-menu"
      :aria-expanded="open"
      :aria-label="`Locale attivo: ${current.name}. Cambia locale`"
      @click="open = !open"
    >
      <span class="venue-chip-name">{{ current.name }}</span>
      <AppIcon name="caret-down" :size="18" />
    </button>
    <span v-else class="venue-chip venue-chip-static"><span class="venue-chip-name">{{ current.name }}</span></span>

    <ul v-if="switchable" v-show="open" id="venue-menu" class="dropdown-menu show p-0 venue-menu" data-bs-popper="static">
      <li v-for="v in venues" :key="v.venueId">
        <RouterLink
          class="dropdown-item"
          :class="{ active: v.venueId === currentId }"
          :aria-current="v.venueId === currentId ? 'true' : undefined"
          :to="{ name: routeName, params: { venueId: v.venueId } }"
          @click="close()"
        >
          <AppIcon name="storefront" :size="22" />
          <span class="venue-chip-name">{{ v.name }}</span>
        </RouterLink>
        <hr class="dropdown-divider" />
      </li>
      <li>
        <RouterLink class="dropdown-item" :to="{ name: 'staff-venues' }" @click="close()">
          <AppIcon name="list" :size="22" />
          Tutti i locali
        </RouterLink>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.venue-switcher {
  min-width: 0;
  justify-self: center;
}
.venue-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  max-width: 100%;
  min-height: 2.75rem; /* 44 touch target */
  padding: 0 0.875rem;
  font-family: "Figtree", system-ui, sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: var(--app-text);
  background: var(--app-surface);
  border: 1.5px solid var(--app-field);
  border-radius: 99px;
}
button.venue-chip:active {
  background: var(--app-surface-2);
}
button.venue-chip[aria-expanded="true"] {
  background: var(--app-surface-2);
  border: 2px solid var(--app-text);
}
.venue-chip-static {
  border-color: var(--app-border);
}
.venue-chip-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.venue-menu {
  position: absolute;
  top: calc(100% + 0.25rem);
  left: 50%;
  transform: translateX(-50%);
  width: min(20rem, 100%);
  min-width: min(13.75rem, 100%); /* 220 */
  overflow: hidden;
  background: var(--app-surface);
  border: 1.5px solid var(--app-field);
  z-index: 20;
  --bs-dropdown-link-hover-bg: var(--app-surface-2);
  --bs-dropdown-link-active-bg: var(--app-surface-2);
  --bs-dropdown-link-active-color: var(--app-text);
}
.venue-menu .dropdown-divider {
  margin: 0;
}
.venue-menu .dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-height: 3rem;
  border-radius: 0;
  font-family: "Figtree", system-ui, sans-serif;
  font-weight: 600;
}
.venue-menu .dropdown-item.active {
  background-color: var(--app-surface-2);
  box-shadow: inset 4px 0 0 var(--app-link);
  color: var(--app-text);
  font-weight: 700;
}
</style>
