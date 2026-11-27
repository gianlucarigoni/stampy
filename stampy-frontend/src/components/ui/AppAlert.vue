<script setup lang="ts">
// Alert (21 §4.3): icon + text + color, never color alone. Not between a field and its button (it would move it):
// on top of the card, or under the button for a system error.
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import AppIconButton from './AppIconButton.vue'
import type { IconName } from './icons'

export type AlertType = 'error' | 'warning' | 'success' | 'info' | 'prize'

const props = withDefaults(defineProps<{ type: AlertType; title?: string; dismissible?: boolean; role?: string; announce?: boolean }>(), { dismissible: false, announce: true })
defineEmits<{ dismiss: [] }>()

const meta: Record<AlertType, { cls: string; icon: IconName; role: string }> = {
  error: { cls: 'alert-danger', icon: 'x-circle-fill', role: 'alert' },
  warning: { cls: 'alert-warning', icon: 'warning-fill', role: 'status' },
  success: { cls: 'alert-success', icon: 'check-circle-fill', role: 'status' },
  info: { cls: 'alert-info', icon: 'info-fill', role: 'note' },
  prize: { cls: 'alert-prize', icon: 'gift-fill', role: 'status' },
}
const m = computed(() => meta[props.type])
</script>

<template>
  <div class="alert app-alert" :class="m.cls" :role="announce ? (role ?? m.role) : undefined">
    <AppIcon :name="m.icon" :size="22" class="app-alert-icon" />
    <div class="app-alert-body">
      <b v-if="title" class="app-alert-title">{{ title }}</b>
      <slot />
    </div>
    <AppIconButton v-if="dismissible" icon="x" label="Chiudi avviso" class="app-alert-close" @click="$emit('dismiss')" />
  </div>
</template>
