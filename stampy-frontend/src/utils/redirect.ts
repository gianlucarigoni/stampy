import type { RouteLocationRaw } from 'vue-router'
import { getMyVenues } from '@/api/endpoints'

/**
 * The `next` query value is only honored when it is an in-app path: it must start with a
 * single "/" (not "//", not "/\", which browsers read as another host), carry no control
 * characters, and must not point back at the login page.
 */
export function safeNext(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return null
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(raw)) return null
  if (raw === '/login' || raw.startsWith('/login?') || raw.startsWith('/login/')) return null
  return raw
}

/** Where to go right after login: `next` always wins, otherwise by how many venues they staff. */
export async function destinationAfterLogin(next: unknown): Promise<RouteLocationRaw> {
  const valid = safeNext(next)
  if (valid) return valid
  try {
    const { venues } = await getMyVenues()
    const only = venues.length === 1 ? venues[0] : undefined
    if (only) return { name: 'staff-queue', params: { venueId: only.venueId } }
    if (venues.length === 0) return { name: 'no-venue' }
  } catch {
    /* the picker shows the error and offers a retry */
  }
  return { name: 'staff-venues' }
}
