import { API_URL, authFetch } from './helpers'

export interface Review {
  id: string
  org_id: string
  platform: string
  author_name: string
  rating: number
  text: string
  reply: string | null
  status: 'NEW' | 'REPLIED' | 'FLAGGED'
  created_at: string
}

export interface ReviewStats {
  total_reviews: number
  average_rating: number
  rating_distribution: Record<string, number>
  nps_score: number | null
  response_rate: number
}

export async function listReviews(orgId: string, params?: { status?: string; rating?: number; limit?: number; offset?: number }): Promise<Review[]> {
  const q = new URLSearchParams()
  if (params?.status) q.set('status', params.status)
  if (params?.rating) q.set('rating', String(params.rating))
  if (params?.limit) q.set('limit', String(params.limit))
  if (params?.offset) q.set('offset', String(params.offset))
  const qs = q.toString() ? `?${q}` : ''
  const res = await authFetch(`${API_URL}/gmb/${orgId}/reviews${qs}`)
  if (!res.ok) return []
  return res.json()
}

export async function getReviewStats(orgId: string): Promise<ReviewStats> {
  const res = await authFetch(`${API_URL}/gmb/${orgId}/stats`)
  if (!res.ok) return { total_reviews: 0, average_rating: 0, rating_distribution: {}, nps_score: null, response_rate: 0 }
  return res.json()
}

export async function replyToReview(orgId: string, reviewId: string, reply: string): Promise<void> {
  const res = await authFetch(`${API_URL}/gmb/${orgId}/reviews/${reviewId}/reply`, {
    method: 'POST', body: JSON.stringify({ reply }),
  })
  if (!res.ok) throw new Error(`Reply error: ${res.status}`)
}

export async function generateReviewReply(orgId: string, reviewId: string): Promise<{ reply: string }> {
  const res = await authFetch(`${API_URL}/gmb/${orgId}/reviews/${reviewId}/generate-reply`, { method: 'POST' })
  if (!res.ok) throw new Error(`Generate reply error: ${res.status}`)
  return res.json()
}

export async function syncReviews(orgId: string): Promise<void> {
  const res = await authFetch(`${API_URL}/gmb/${orgId}/sync`, { method: 'POST' })
  if (!res.ok) throw new Error(`Sync error: ${res.status}`)
}

export async function getReputationDashboard(orgId: string): Promise<Record<string, unknown>> {
  const res = await authFetch(`${API_URL}/api/growth/engagement/${orgId}/reputation`)
  if (!res.ok) return {}
  return res.json()
}

export async function getNPS(orgId: string, days?: number): Promise<{ score: number; promoters: number; detractors: number; passives: number }> {
  const q = days ? `?days=${days}` : ''
  const res = await authFetch(`${API_URL}/api/growth/engagement/${orgId}/reputation/nps${q}`)
  if (!res.ok) return { score: 0, promoters: 0, detractors: 0, passives: 0 }
  return res.json()
}

export async function requestReview(orgId: string, patientId: string): Promise<void> {
  const res = await authFetch(`${API_URL}/api/growth/engagement/${orgId}/reputation/request-review/${patientId}`, { method: 'POST' })
  if (!res.ok) throw new Error(`Request review error: ${res.status}`)
}
