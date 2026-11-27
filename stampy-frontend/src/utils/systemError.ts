import { ApiError } from '@/api/client'

export interface SystemMessage {
  title?: string
  text: string
}

export const GENERIC_ERROR = 'Qualcosa non ha funzionato. Riprova tra un attimo.'

/**
 * Text of a system error (network, timeout, 5xx; pattern 5.1 of the design system): never about the field's value.
 * No response at all -> title "Connessione non riuscita" + what to do (`networkText`). A server answer carries its own
 * Italian message (kept as is); anything else gets the generic one.
 */
export function systemMessage(err: unknown, networkText: string): SystemMessage {
  if (err instanceof ApiError) {
    if (err.status === 0) return { title: 'Connessione non riuscita', text: networkText }
    return { text: err.message }
  }
  return { text: GENERIC_ERROR }
}
