// sessionStorage for what must survive a tab reload (e.g. a mobile browser dropping the tab
// while the customer is in the mail app). It can be unavailable, so failures are ignored.

export function readTab<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key)
    return raw === null ? null : (JSON.parse(raw) as T)
  } catch {
    return null
  }
}

export function writeTab(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* the flow still works, it just does not survive a reload */
  }
}

export function removeTab(key: string) {
  try {
    sessionStorage.removeItem(key)
  } catch {
    /* nothing to remove */
  }
}

export function clearTab() {
  try {
    sessionStorage.clear()
  } catch {
    /* nothing to clear */
  }
}
