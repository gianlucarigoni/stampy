<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import { ApiError } from '@/api/client'
import { getMyVenues, type MemberVenue } from '@/api/endpoints'
import AppHeader from '@/components/AppHeader.vue'
import { useAuth } from '@/composables/useAuth'

const route = useRoute()
const router = useRouter()
const { logout } = useAuth()

const error = ref('')
const open = ref(false)
const menuRoot = ref<HTMLElement | null>(null)
const toggle = ref<HTMLButtonElement | null>(null)

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

// One header for everyone; only the items differ, depending on the page:
// - staff screen of a venue the user belongs to: the venue's history, plus "Cambia locale"
//   only when the user belongs to more than one venue (the queue is reached with the back button)
// - staff venue list (or a venue not yet confirmed): no page items, only "Esci"
// - every other screen: the customer's profile (history and account deletion live there)
interface MenuItem {
  label: string
  to: RouteLocationRaw
  name: string
}
const isStaffArea = computed(() => isStaffScreen.value || route.name === 'staff-venues')
const menuItems = computed<MenuItem[]>(() => {
  const venueId = staffVenueId.value
  if (!venueId) {
    if (isStaffArea.value) return []
    return [
      { label: 'Profilo', to: { name: 'profile' }, name: 'profile' },
    ]
  }
  const items: MenuItem[] = [
    { label: 'Storico richieste', to: { name: 'staff-history', params: { venueId } }, name: 'staff-history' },
  ]
  if ((memberships.value?.length ?? 0) > 1) items.push({ label: 'Cambia locale', to: { name: 'staff-venues' }, name: 'staff-venues' })
  return items
})

// Back control: only on the history and profile pages, always at the same spot. Staff go to the
// queue of the venue. A customer has no home screen: from the history back goes to the profile;
// from the profile, to the page they opened it from (not `router.back()`: every filter change is
// a history entry, back would only undo a filter).
const showBack = computed(
  () => route.name === 'history' || route.name === 'profile' || (route.name === 'staff-history' && !!staffVenueId.value),
)
let profileOrigin: string | null = null
const stopOrigin = router.afterEach((to, from) => {
  const inProfileArea = from.name === 'profile' || from.name === 'history' || from.name === 'delete-account'
  if (to.name === 'profile' && !inProfileArea) profileOrigin = from.matched.length > 0 ? from.fullPath : null
})
onBeforeUnmount(stopOrigin)
function goBack() {
  if (route.name === 'staff-history') router.push({ name: 'staff-queue', params: { venueId: staffVenueId.value! } })
  else if (route.name === 'history') router.push({ name: 'profile' })
  else router.push(profileOrigin ?? { name: 'no-venue' })
}

async function signOut() {
  open.value = false
  error.value = ''
  try {
    await logout()
    await router.replace({ name: 'login' })
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Errore interno'
  }
}

function close(refocus = false) {
  if (!open.value) return
  open.value = false
  if (refocus) toggle.value?.focus()
}
const onDocClick = (e: MouseEvent) => {
  if (open.value && !menuRoot.value?.contains(e.target as Node)) close()
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
watch(() => route.fullPath, () => close())
</script>

<template>
  <div class="container narrow py-3">
    <AppHeader centered>
      <template #start>
        <button
          v-if="showBack"
          type="button"
          class="btn btn-outline-primary d-flex align-items-center justify-content-center p-0"
          style="width: 44px; height: 44px"
          aria-label="Indietro"
          @click="goBack"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
      </template>
      <div ref="menuRoot" class="dropdown">
        <button
          ref="toggle"
          type="button"
          class="btn btn-outline-primary d-flex align-items-center justify-content-center p-0"
          style="width: 44px; height: 44px"
          aria-label="Menu"
          aria-controls="app-menu"
          :aria-expanded="open"
          @click="open = !open"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <ul v-show="open" id="app-menu" class="dropdown-menu dropdown-menu-end show p-0 " data-bs-popper="static">
          <li v-for="item in menuItems" :key="item.name">
            <RouterLink class="dropdown-item d-flex align-items-center" style="min-height: 44px" :to="item.to" active-class="active">
              {{ item.label }}
            </RouterLink>
            <hr class="dropdown-divider" />
          </li>
          <li>
            <button type="button" class="dropdown-item d-flex align-items-center" style="min-height: 44px" @click="signOut">Esci</button>
          </li>
        </ul>
      </div>
    </AppHeader>

    <main id="main" tabindex="-1">
      <p v-if="error" class="alert alert-danger" role="alert">{{ error }}</p>
      <RouterView :key="route.path" />
    </main>
  </div>
</template>
