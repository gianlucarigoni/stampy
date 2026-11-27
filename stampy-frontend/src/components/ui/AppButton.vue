<script setup lang="ts">
// Button (21 §4.1). Primary buttons are NEVER `disabled`: with invalid data the button stays full and the tap shows
// the message and focuses the field. While working (`busy`) it keeps its full look, shows a spinner and a distinct
// label, sets aria-busy and ignores taps (no `disabled`, so focus is not lost).
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import AppIcon from './AppIcon.vue'
import type { IconName } from './icons'

export type ButtonVariant = 'primary' | 'secondary' | 'link' | 'danger' | 'danger-outline'

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariant
    type?: 'button' | 'submit'
    busy?: boolean
    /** Text shown while busy ("Invio…"). Defaults to the normal label. */
    busyLabel?: string
    icon?: IconName
    /** 48 px instead of 52 (queue cards, dialogs). */
    compact?: boolean
    /** Full width (default on phones; `false` for inline buttons). */
    block?: boolean
    /** Render as a router link that looks like a button. */
    to?: RouteLocationRaw
    /** Render as an external link that looks like a button (target/rel come from the attributes). */
    href?: string
  }>(),
  { variant: 'primary', type: 'button', block: true },
)
const emit = defineEmits<{ click: [event: MouseEvent] }>()

const classes = computed(() => [
  'btn',
  'app-btn',
  {
    primary: 'btn-primary',
    secondary: 'btn-outline-secondary',
    link: 'btn-link',
    danger: 'btn-danger',
    'danger-outline': 'btn-outline-danger',
  }[props.variant],
  { 'w-100': props.block && props.variant !== 'link', 'app-btn-compact': props.compact, 'app-btn-busy': props.busy },
])

function onClick(event: MouseEvent) {
  if (props.busy) {
    event.preventDefault() // also stops a submit
    return
  }
  emit('click', event)
}
</script>

<template>
  <a v-if="href" :href="href" :class="classes" @click="emit('click', $event)">
    <AppIcon v-if="icon" :name="icon" :size="22" />
    <slot />
  </a>
  <RouterLink v-else-if="to" :to="to" :class="classes" :aria-busy="busy ? 'true' : undefined" @click="onClick">
    <AppIcon v-if="icon && !busy" :name="icon" :size="22" />
    <slot />
  </RouterLink>
  <button v-else :type="type" :class="classes" :aria-busy="busy ? 'true' : undefined" @click="onClick">
    <span v-if="busy" class="spin" aria-hidden="true" />
    <AppIcon v-else-if="icon" :name="icon" :size="22" />
    <template v-if="busy && busyLabel">{{ busyLabel }}</template>
    <slot v-else />
  </button>
</template>
