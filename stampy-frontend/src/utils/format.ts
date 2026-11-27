/** "45 s" under a minute, otherwise whole minutes rounded up ("12 min"). */
export function formatWait(seconds: number): string {
  return seconds < 60 ? `${seconds} s` : `${Math.ceil(seconds / 60)} min`
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

/** Whole minutes rounded up, never "0 min": changes at most once a minute, so it is safe in a button label. */
export function waitMinutes(seconds: number): string {
  return `${Math.max(1, Math.ceil(seconds / 60))} min`
}

/** Minutes (or seconds under a minute) since an instant, from the device clock: indicative only. */
export function sinceText(iso: string, nowMs: number): string {
  const s = Math.max(0, Math.floor((nowMs - new Date(iso).getTime()) / 1000))
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min`
}
