// Mirrors the backend rule for `PATCH /auth/me` (`auth.dto.ts` in stampy-backend); the backend stays
// the real check. Keep the two in step: NFC, trim, inner runs of spaces become one, then 3-50
// characters (counted as code points, like class-validator) among letters, combining marks,
// digits, space, apostrophe, hyphen and dot, with at least one letter.
export const NAME_MIN = 3
export const NAME_MAX = 50
const ALLOWED = /^[\p{L}\p{M}\p{N} '’.-]+$/u
const HAS_LETTER = /\p{L}/u

export const NAME_GENERIC_PROBLEM = 'Nome non valido: controlla i caratteri e la lunghezza'
const TOO_SHORT = `Scrivi almeno ${NAME_MIN} caratteri`
const TOO_LONG = `Al massimo ${NAME_MAX} caratteri`
const BAD_CHARS = 'Usa solo lettere, numeri, spazi, apostrofo, trattino e punto'
const NO_LETTER = 'Scrivi almeno una lettera'

/** Same normalisation as the backend: NFC, trim, inner runs of spaces become one. */
export const normalizeName = (raw: string) => raw.normalize('NFC').trim().replace(/ {2,}/g, ' ')

/** Message to show, or '' when the name is acceptable. One message per cause. */
export function nameProblem(raw: string): string {
  const name = normalizeName(raw)
  const length = [...name].length // code points, as the backend counts them
  if (length < NAME_MIN) return TOO_SHORT
  if (length > NAME_MAX) return TOO_LONG
  if (!ALLOWED.test(name)) return BAD_CHARS
  if (!HAS_LETTER.test(name)) return NO_LETTER
  return ''
}

/**
 * Message for a 400 from `PATCH /auth/me`, read from the validator's `details`
 * (`[{ property, constraints: { isLength | matches | ... } }]`). Only used when the local rule
 * accepted the name, i.e. when the two rules have drifted apart: then the server is right.
 */
export function problemFromDetails(details: unknown): string {
  if (!Array.isArray(details)) return NAME_GENERIC_PROBLEM
  const keys = details.flatMap((d) => {
    const constraints = (d as { constraints?: unknown } | null)?.constraints
    return constraints && typeof constraints === 'object' ? Object.keys(constraints) : []
  })
  if (keys.includes('isLength')) return `Il nome deve avere da ${NAME_MIN} a ${NAME_MAX} caratteri`
  if (keys.includes('matches')) return BAD_CHARS
  return NAME_GENERIC_PROBLEM
}
