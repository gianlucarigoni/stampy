<script setup lang="ts">
// Status chip shared by queue, outcome and history (21 §4.7). The label can be overridden by the default slot.
import { computed } from 'vue'
import AppChip from './AppChip.vue'

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'prize'

const props = defineProps<{ status: RequestStatus }>()

const meta = {
  pending: { variant: 'neutral', icon: 'clock', label: 'In attesa' },
  approved: { variant: 'ok', icon: 'check-circle-fill', label: 'Approvata' },
  rejected: { variant: 'warn', icon: 'x-circle-fill', label: 'Non confermata' },
  expired: { variant: 'neutral', icon: 'clock', label: 'Scaduta' },
  prize: { variant: 'prize', icon: 'gift-fill', label: 'Premio' },
} as const
const m = computed(() => meta[props.status])
</script>

<template>
  <AppChip :variant="m.variant" :icon="m.icon"><slot>{{ m.label }}</slot></AppChip>
</template>
