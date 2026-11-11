/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** OAuth client ID (Web) for "Sign in with Google". Not a secret. Absent = the button is hidden. */
  readonly VITE_GOOGLE_CLIENT_ID?: string
}
