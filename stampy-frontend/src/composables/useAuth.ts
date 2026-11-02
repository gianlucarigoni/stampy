import { shallowRef } from 'vue'
import { ApiError } from '@/api/client'
import { getMe, logout as apiLogout, type AuthUser } from '@/api/endpoints'
import { clearTab } from '@/utils/tabStorage'

// Module state: one session per tab, shared by whoever calls useAuth().
const user = shallowRef<AuthUser | null>(null)
let checked = false

/** Asks the backend once per tab load; later calls reuse the answer. */
async function checkSession() {
  if (checked) return
  try {
    user.value = (await getMe()).user
    checked = true
  } catch (err) {
    // 401 = not logged in. Anything else is a real failure and is not cached.
    if (!(err instanceof ApiError && err.status === 401)) throw err
    checked = true
  }
}

function setUser(next: AuthUser) {
  user.value = next
  checked = true
}

function clearUser() {
  user.value = null
}

async function logout() {
  try {
    await apiLogout()
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 401)) throw err
  }
  clearTab() // a staff phone is shared: leave nothing of this user in the tab
  user.value = null
}

export function useAuth() {
  return { user, checkSession, setUser, clearUser, logout }
}
