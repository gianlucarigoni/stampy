// Single entry point to the backend. Same origin by design (`CONTEXT.md` §5.4): the `sid`
// cookie is httpOnly and travels on its own, so no token ever exists in this code.

export class ApiError extends Error {
  constructor(
    /** HTTP status; 0 when the request never got a response. */
    readonly status: number,
    /** The backend's `error` field, e.g. `VenueNotFound`. */
    readonly code: string,
    message: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

let onUnauthorized = () => {}

/** Every 401 means the same thing (`CONTEXT.md` §5.4): there is no valid session. */
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

async function parseBody(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text()
  if (!text) return {}
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return {} // e.g. an HTML error page from a proxy
  }
}

export async function api<T>(
  path: string,
  options: { method?: 'GET' | 'POST'; body?: unknown } = {},
): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      method: options.method ?? 'GET',
      headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch {
    throw new ApiError(0, 'NetworkError', 'Connessione non riuscita, riprova')
  }

  const body = await parseBody(response)

  if (response.ok) return body as T

  if (response.status === 401) onUnauthorized()

  const retryAfter = Number(body.retryAfterSeconds ?? response.headers.get('Retry-After'))
  throw new ApiError(
    response.status,
    typeof body.error === 'string' ? body.error : 'UnknownError',
    typeof body.message === 'string' ? body.message : 'Errore interno',
    Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
  )
}
