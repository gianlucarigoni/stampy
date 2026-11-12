// Mirrors the backend rule for `PATCH /auth/me` (`auth.dto.ts`); the backend stays the real check.
export const NAME_MIN = 3
export const NAME_MAX = 50
const ALLOWED = /^[\p{L}\p{N} '’.-]+$/u

/** Same normalisation as the backend: trim, inner runs of spaces become one. */
export const normalizeName = (raw: string) => raw.trim().replace(/ {2,}/g, ' ')

/** Message to show, or '' when the name is acceptable. */
export function nameProblem(raw: string): string {
  const name = normalizeName(raw)
  if (name.length < NAME_MIN) return `Scrivi almeno ${NAME_MIN} caratteri`
  if (name.length > NAME_MAX) return `Al massimo ${NAME_MAX} caratteri`
  if (!ALLOWED.test(name)) return 'Usa solo lettere, numeri, spazi, apostrofo, trattino e punto'
  return ''
}
