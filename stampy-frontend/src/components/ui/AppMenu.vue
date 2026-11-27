<script setup lang="ts">
// Header burger + dropdown (21 §4.9). Closes with Esc, on a tap outside and on route change (the parent calls
// `close`). Items: icon + text, min 48 px; the current one has `aria-current` + a bar (not a full orange fill);
// "Esci" is last, behind a separator. While the roles are unknown (`loading`) placeholders keep the menu from jumping.
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import AppIcon from './AppIcon.vue'
import AppIconButton from './AppIconButton.vue'
import type { IconName } from './icons'

export interface MenuItem {
  name: string
  label: string
  to: RouteLocationRaw
  icon?: IconName
}

defineProps<{ items: MenuItem[]; loading?: boolean }>()
const emit = defineEmits<{ signout: [] }>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const toggle = ref<InstanceType<typeof AppIconButton> | null>(null)

function close(refocus = false) {
  if (!open.value) return
  open.value = false
  if (refocus) (toggle.value?.$el as HTMLElement | undefined)?.focus()
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
  <div ref="root" class="dropdown">
    <AppIconButton ref="toggle" icon="list" label="Menu" controls="app-menu" :expanded="open" @click="open = !open" />
    <ul v-show="open" id="app-menu" class="dropdown-menu dropdown-menu-end show p-0" data-bs-popper="static">
      <li v-for="item in items" :key="item.name">
        <RouterLink class="dropdown-item" :to="item.to" active-class="active">
          <AppIcon v-if="item.icon" :name="item.icon" :size="22" />
          {{ item.label }}
        </RouterLink>
        <hr class="dropdown-divider" />
      </li>
      <li v-if="loading" class="app-menu-skeleton" aria-hidden="true"><span class="app-skeleton-line" /></li>
      <li>
        <button type="button" class="dropdown-item" @click="emit('signout')">
          <AppIcon name="sign-out" :size="22" />
          Esci
        </button>
      </li>
    </ul>
  </div>
</template>
