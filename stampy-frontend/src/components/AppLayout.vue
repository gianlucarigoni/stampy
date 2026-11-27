<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError } from '@/api/client'
import { getMyVenues, type MemberVenue } from '@/api/endpoints'
import AppHeader from '@/components/AppHeader.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppIconButton from '@/components/ui/AppIconButton.vue'
import AppMenu, { type MenuItem } from '@/components/ui/AppMenu.vue'
import { useAuth } from '@/composables/useAuth'

const route = useRoute()
const router = useRouter()
const { logout } = useAuth()

const error = ref('')
const menu = ref<InstanceType<typeof AppMenu> | null>(null)

// Memberships, asked once and only on staff screens (customers never need them).
// The backend still checks the role on every request: this only decides which links to show.
const memberships = ref<MemberVenue[] | null>(null)
async function loadMemberships() {
  if (memberships.value !== null) return
  try {
    memberships.value = (await getMyVenues()).venues
  } catch {
    memberships.value = [] // no staff links; "Esci" still works
  }
}

const isStaffScreen = computed(() => route.name === 'staff-queue' || route.name === 'staff-history')
watch(isStaffScreen, (on) => on && loadMemberships(), { immediate: true })

// Owner and staff may both see the queue and the history of their venue.
const staffVenueId = computed(() => {
  const id = route.params.venueId
  if (!isStaffScreen.value || typeof id !== 'string') return null
  return memberships.value?.some((v) => v.venueId === id) ? id : null
})

// One header for everyone: "Profilo" first (customer: history and account deletion live there; staff and
// owners have no customer history there). Inside a venue the user belongs to, "Storico richieste" (that
// venue's requests) comes right after, and "Cambia locale" only when the user belongs to more than one
// venue (never on the venue list itself, where it would point to the same page).
const isStaffArea = computed(() => isStaffScreen.value || route.name === 'staff-venues')
const menuItems = computed<MenuItem[]>(() => {
  // On /name (B28 4) every link would only bounce back here until the name is saved: the menu offers just "Esci".
  if (route.name === 'display-name') return []
  const items: MenuItem[] = [{ label: 'Profilo', to: { name: 'profile' }, name: 'profile', icon: 'user' }]
  const venueId = staffVenueId.value
  if (venueId) {
    items.push({ label: 'Storico richieste', to: { name: 'staff-history', params: { venueId } }, name: 'staff-history', icon: 'clock-counter-clockwise' })
  }
  if (isStaffArea.value && route.name !== 'staff-venues' && (memberships.value?.length ?? 0) > 1) {
    items.push({ label: 'Cambia locale', to: { name: 'staff-venues' }, name: 'staff-venues', icon: 'storefront' })
  }
  return items
})

// Back control: only on the history and profile pages, always at the same spot. Staff go to the
// queue of the venue. A customer has no home screen: from the history back goes to the profile;
// from the profile, to the page they opened it from (not `router.back()`: every filter change is
// a history entry, back would only undo a filter).
const showBack = computed(
  () =>
    route.name === 'history' ||
    route.name === 'profile' ||
    route.name === 'delete-account' ||
    (route.name === 'staff-history' && !!staffVenueId.value),
)
let profileOrigin: string | null = null
const stopOrigin = router.afterEach((to, from) => {
  const inProfileArea = from.name === 'profile' || from.name === 'history' || from.name === 'delete-account'
  if (to.name === 'profile' && !inProfileArea) profileOrigin = from.matched.length > 0 ? from.fullPath : null
})
onBeforeUnmount(stopOrigin)
function goBack() {
  if (route.name === 'staff-history') router.push({ name: 'staff-queue', params: { venueId: staffVenueId.value! } })
  else if (route.name === 'history' || route.name === 'delete-account') router.push({ name: 'profile' })
  else router.push(profileOrigin ?? { name: 'no-venue' })
}

async function signOut() {
  menu.value?.close()
  error.value = ''
  try {
    await logout()
    await router.replace({ name: 'login' })
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Errore interno'
  }
}

// Roles unknown yet on a staff screen: the menu keeps a placeholder instead of jumping when the links appear (21 §5.5).
const menuLoading = computed(() => isStaffScreen.value && memberships.value === null)
watch(() => route.fullPath, () => menu.value?.close())
</script>

<template>
  <div class="container narrow py-3">
    <AppHeader centered>
      <template #start>
        <AppIconButton v-if="showBack" icon="arrow-left" label="Indietro" @click="goBack" />
      </template>
      <AppMenu ref="menu" :items="menuItems" :loading="menuLoading" @signout="signOut" />
    </AppHeader>

    <main id="main" tabindex="-1">
      <AppAlert v-if="error" type="error">{{ error }}</AppAlert>
      <RouterView :key="route.path" />
    </main>
  </div>
</template>
