import { createRouter, createWebHistory } from 'vue-router'
import { setUnauthorizedHandler } from '@/api/client'
import { useAuth } from '@/composables/useAuth'
import { destinationAfterLogin, safeNext } from '@/utils/redirect'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // One login page for everyone; `?next=` brings the user back where they were going.
    {
      path: '/login',
      name: 'login',
      component: () => import('@/components/EmailLogin.vue'),
    },
    {
      path: '/session-error',
      name: 'session-error',
      component: () => import('@/views/SessionErrorView.vue'),
    },
    {
      // Layout for authenticated pages only: header and logout.
      path: '/',
      component: () => import('@/components/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: '/staff' },
        // Where NFC tags and QR codes point.
        {
          path: 'v/:venueId',
          name: 'visit',
          component: () => import('@/views/CustomerVisitView.vue'),
          props: true,
        },
        {
          path: 'r/:requestId',
          name: 'request',
          component: () => import('@/views/CustomerRequestView.vue'),
          props: true,
        },
        {
          path: 'scan',
          name: 'no-venue',
          component: () => import('@/views/NoVenueView.vue'),
        },
        {
          path: 'staff',
          name: 'staff-venues',
          component: () => import('@/views/StaffVenuesView.vue'),
        },
        {
          path: 'staff/:venueId',
          name: 'staff-queue',
          component: () => import('@/views/StaffQueueView.vue'),
          props: true,
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
    },
  ],
})

const { user, checkSession, clearUser } = useAuth()

router.beforeEach(async (to) => {
  if (to.name === 'session-error') return true

  try {
    await checkSession()
  } catch {
    return { name: 'session-error', query: { next: to.fullPath } }
  }

  if (!user.value && to.matched.some((r) => r.meta.requiresAuth)) {
    return { name: 'login', query: { next: to.fullPath } }
  }
  // Already logged in on the login page: continue as if they had just logged in.
  if (to.name === 'login' && user.value) return destinationAfterLogin(to.query.next)
  return true
})

// A 401 on any call mid-session means the session is gone. Without a user there is nothing
// to expire (e.g. the first session probe), so the guard handles that case.
setUnauthorizedHandler(() => {
  if (!user.value) return
  clearUser()
  const current = router.currentRoute.value
  if (current.name === 'login') return
  void router.replace({ name: 'login', query: { next: safeNext(current.fullPath) ?? undefined } })
})

export default router
