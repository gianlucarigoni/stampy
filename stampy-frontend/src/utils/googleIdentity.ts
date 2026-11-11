// Google Identity Services ("Sign in with Google"). The script is loaded only on the login
// page, so the rest of the app never talks to Google. Reference:
// https://developers.google.com/identity/gsi/web/reference/js-reference

interface CredentialResponse {
  credential: string
}

interface GoogleIdentity {
  accounts: {
    id: {
      initialize(config: {
        client_id: string
        callback: (response: CredentialResponse) => void
        auto_select?: boolean
        ux_mode?: 'popup' | 'redirect'
      }): void
      renderButton(parent: HTMLElement, options: Record<string, string | number>): void
    }
  }
}

const SCRIPT_URL = 'https://accounts.google.com/gsi/client'

let loading: Promise<GoogleIdentity> | null = null
let onCredential: (idToken: string) => void = () => {}
let initializedFor = ''

function loadScript(): Promise<GoogleIdentity> {
  const existing = (window as unknown as { google?: GoogleIdentity }).google
  if (existing?.accounts?.id) return Promise.resolve(existing)
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.onload = () => {
      const google = (window as unknown as { google?: GoogleIdentity }).google
      if (google?.accounts?.id) resolve(google)
      else reject(new Error('Google Identity Services not available'))
    }
    script.onerror = () => reject(new Error('Google Identity Services failed to load'))
    document.head.appendChild(script)
  })
}

/**
 * Draws Google's button into `parent`; `handler` receives the ID token when the user signs in.
 * Rejects when the script cannot load (offline, ad blocker): the caller just hides the button.
 */
export async function renderGoogleButton(
  parent: HTMLElement,
  clientId: string,
  handler: (idToken: string) => void,
  width: number,
): Promise<void> {
  loading ??= loadScript().catch((err) => {
    loading = null // a later visit to the login page may succeed
    throw err
  })
  const google = await loading

  onCredential = handler // initialize() runs once per client ID; the handler can change between mounts
  if (initializedFor !== clientId) {
    google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => onCredential(response.credential),
      auto_select: false,
      ux_mode: 'popup',
    })
    initializedFor = clientId
  }

  parent.replaceChildren()
  google.accounts.id.renderButton(parent, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'continue_with',
    shape: 'rectangular',
    logo_alignment: 'left',
    locale: 'it',
    width, // Google accepts 200–400 px
  })
}
