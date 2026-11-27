<script setup lang="ts">
// Icon-only button 44x44 (21 §4.1): burger, back, close, stepper. `label` is mandatory (aria-label).
// `limited` = at its minimum/maximum: not faded, `aria-disabled`, the tap does nothing (never `disabled`, 21 §4.1 stepper).
import AppIcon from './AppIcon.vue'
import type { IconName } from './icons'

const props = defineProps<{ icon: IconName; label: string; expanded?: boolean; controls?: string; limited?: boolean }>()
const emit = defineEmits<{ click: [event: MouseEvent] }>()

function onClick(event: MouseEvent) {
  if (props.limited) return
  emit('click', event)
}
</script>

<template>
  <button
    type="button"
    class="app-icon-btn"
    :class="{ 'is-limited': limited }"
    :aria-label="label"
    :aria-expanded="expanded === undefined ? undefined : expanded"
    :aria-controls="controls"
    :aria-disabled="limited ? 'true' : undefined"
    @click="onClick"
  >
    <AppIcon :name="icon" :size="22" />
  </button>
</template>
