// Typed backend calls. Contracts: `docs/CODEBASE.md` §3.
import { api } from './client'

export interface AuthUser {
  id: string
  email: string
  displayName: string | null
}

export type VisitResult =
  | { state: 'card_created'; saveUrl: string; publicCode: string }
  | { state: 'card_not_added'; saveUrl: string; publicCode: string }
  | { state: 'request_pending'; requestId: string; expiresAt: string }

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'expired'

export interface StampRequest {
  status: RequestStatus
  expiresAt: string
  stampsCount: number
  stampsRequired: number
  // Only on `approved`: what that confirmation recorded (backend-computed, never inferred here).
  stampsAdded?: number
  rewardsRedeemed?: number
  reward?: string
}

export interface MemberVenue {
  venueId: string
  name: string
  slug: string
  role: 'owner' | 'staff'
}

export interface QueueItem {
  requestId: string
  publicCode: string
  stampsCount: number
  stampsRequired: number
  createdAt: string
  expiresAt: string
}

export interface ConfirmResult {
  status: 'approved'
  stampsCount: number
  stampsRequired: number
  rewards: number // rewards consumed by this confirmation
  stampsAdded: number
  reward: string // name of the promotion's reward
}

export const requestCode = (email: string) =>
  api<{ challengeId: string }>('/auth/email/request', { method: 'POST', body: { email } })

export const verifyCode = (challengeId: string, code: string) =>
  api<{ user: AuthUser }>('/auth/email/verify', { method: 'POST', body: { challengeId, code } })

export const getMe = () => api<{ user: AuthUser }>('/auth/me', { timeoutMs: 4000 })

export const logout = () => api<void>('/auth/logout', { method: 'POST' })

/**
 * A plain tap on the tag. With `requestStamp` ("Richiedi il timbro") a stamp request is
 * opened even if the card was never added to Wallet.
 */
export const visitVenue = (venueId: string, requestStamp = false) =>
  api<VisitResult>(
    `/venues/${encodeURIComponent(venueId)}/visit${requestStamp ? '?requestStamp=1' : ''}`,
    { method: 'POST' },
  )

/** "Aggiungi a Google Wallet" was tapped: the card goes from not_added to active. */
export const markWalletAdded = (venueId: string) =>
  api<void>(`/venues/${encodeURIComponent(venueId)}/card/wallet-added`, { method: 'POST' })

export const getRequest = (requestId: string) =>
  api<StampRequest>(`/requests/${encodeURIComponent(requestId)}`)

export const getMyVenues = () => api<{ venues: MemberVenue[] }>('/venues/mine')

export const getQueue = (venueId: string) =>
  api<{ requests: QueueItem[] }>(`/venues/${encodeURIComponent(venueId)}/requests`)

/** `products` = products consumed, reward included. The backend computes the stamps. */
export const confirmRequest = (venueId: string, requestId: string, products: number) =>
  api<ConfirmResult>(
    `/venues/${encodeURIComponent(venueId)}/requests/${encodeURIComponent(requestId)}/confirm`,
    { method: 'POST', body: { stamps: products } },
  )

export const rejectRequest = (venueId: string, requestId: string) =>
  api<{ status: 'rejected' }>(
    `/venues/${encodeURIComponent(venueId)}/requests/${encodeURIComponent(requestId)}/reject`,
    { method: 'POST' },
  )
