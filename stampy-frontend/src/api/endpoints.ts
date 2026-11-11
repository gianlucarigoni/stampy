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
  | { state: 'request_pending'; requestId: string; expiresAt: string; promotionChanged: boolean }

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'expired'

export interface StampRequest {
  status: RequestStatus
  publicCode: string // card code: the customer can read it out to staff
  expiresAt: string
  stampsCount: number
  stampsRequired: number
  // The venue changed promotion: the card restarts from 0 on confirmation (count/required are already the new ones).
  promotionChanged: boolean
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
  promotionChanged: boolean // card still on the old promotion: it restarts from 0 on confirmation
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

/** Account deletion step 1: the code goes to the session user's own email (the body stays empty). */
export const requestAccountDeletion = () =>
  api<{ challengeId: string }>('/auth/account/delete/request', { method: 'POST' })

/** Account deletion step 2: 204 and the session cookie is gone. */
export const confirmAccountDeletion = (challengeId: string, code: string) =>
  api<void>('/auth/account/delete/confirm', { method: 'POST', body: { challengeId, code } })

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

export interface HistoryItem {
  requestId: string
  publicCode: string
  venueName?: string // only in the customer's history (several venues)
  status: RequestStatus
  createdAt: string
  resolvedAt: string | null
  stamps: number | null // confirmed quantity (reward included); only `approved`
  stampsAdded: number | null
  rewardsRedeemed: number | null
}

/** Every filter is optional; absent means "not filtered" (see `GET /venues/:venueId/requests/history`). */
export interface HistoryFilters {
  status?: RequestStatus
  minStamps?: number
  maxStamps?: number
  from?: string // ISO instant or YYYY-MM-DD
  to?: string // ISO instant or YYYY-MM-DD, inclusive
}

const queryString = (filters: HistoryFilters) => {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) if (value !== undefined && value !== '') qs.set(key, String(value))
  return qs.size > 0 ? `?${qs}` : ''
}

/** Staff: every request of the venue. */
export const getHistory = (venueId: string, filters: HistoryFilters) =>
  api<{ requests: HistoryItem[] }>(`/venues/${encodeURIComponent(venueId)}/requests/history${queryString(filters)}`)

/** Customer: the logged-in user's own requests, all venues (`GET /requests/mine`). */
export const getMyHistory = (filters: HistoryFilters) =>
  api<{ requests: HistoryItem[] }>(`/requests/mine${queryString(filters)}`)
