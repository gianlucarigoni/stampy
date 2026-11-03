// localStorage flag: "the customer already dismissed the reward modal of this request".
// It may be unavailable (private mode), so failures are ignored: the modal then shows again.

const key = (requestId: string) => `stampy.reward-seen.${requestId}`

export function isRewardSeen(requestId: string): boolean {
  try {
    return localStorage.getItem(key(requestId)) === '1'
  } catch {
    return false
  }
}

export function markRewardSeen(requestId: string) {
  try {
    localStorage.setItem(key(requestId), '1')
  } catch {
    /* the modal may show again after a reload */
  }
}
