import { API_URL, authFetch, unwrapArray } from './helpers'
import { parseAPIError } from '../supabase'

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

const STATUS_MAP: Record<string, Review['status']> = {
  PENDING: 'NEW',
  REPLIED: 'REPLIED',
  IGNORED: 'FLAGGED',
  NEW: 'NEW',
  FLAGGED: 'FLAGGED',
}

function mapReview(r: Record<string, unknown>): Review {
  const backendStatus = (r.status ?? 'PENDING') as string
  return {
    id: (r.id ?? '') as string,
    org_id: (r.org_id ?? r.organization_id ?? '') as string,
    platform: (r.platform ?? '') as string,
    author_name: (r.reviewer_name ?? r.author_name ?? '') as string,
    rating: (r.rating ?? 0) as number,
    text: (r.review_text ?? r.text ?? '') as string,
    reply: (r.review_reply ?? r.reply ?? null) as string | null,
    status: STATUS_MAP[backendStatus] ?? 'NEW',
    created_at: (r.created_at ?? r.published_at ?? '') as string,
  }
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
  const raw = unwrapArray<Record<string, unknown>>(await res.json(), 'reviews')
  return raw.map(mapReview)
}

export async function getReviewStats(orgId: string): Promise<ReviewStats> {
  const res = await authFetch(`${API_URL}/gmb/${orgId}/stats`)
  if (!res.ok) return { total_reviews: 0, average_rating: 0, rating_distribution: {}, nps_score: null, response_rate: 0 }
  const d = await res.json()
  const total = (d.total_reviews ?? d.total ?? 0) as number
  const replied = (d.replied ?? 0) as number
  return {
    total_reviews: total,
    average_rating: (d.average_rating ?? 0) as number,
    rating_distribution: (d.rating_distribution ?? d.distribution ?? {}) as Record<string, number>,
    nps_score: (d.nps_score ?? null) as number | null,
    response_rate: d.response_rate ?? (total > 0 ? replied / total : 0),
  }
}

export async function replyToReview(orgId: string, reviewId: string, reply: string): Promise<void> {
  const res = await authFetch(`${API_URL}/gmb/${orgId}/reviews/${reviewId}/reply`, {
    method: 'POST', body: JSON.stringify({ reply_text: reply }),
  })
  if (!res.ok) throw new Error(`Reply error: ${res.status}`)
}

export async function generateReviewReply(orgId: string, reviewId: string): Promise<{ reply: string }> {
  const res = await authFetch(`${API_URL}/gmb/${orgId}/reviews/${reviewId}/generate-reply`, { method: 'POST' })
  if (!res.ok) throw new Error(`Generate reply error: ${res.status}`)
  const d = await res.json()
  return { reply: d.suggested_reply ?? d.reply ?? '' }
}

export async function syncReviews(orgId: string): Promise<void> {
  const res = await authFetch(`${API_URL}/gmb/${orgId}/sync`, { method: 'POST' })
  if (!res.ok) {
    // S154: el middleware del backend transforma HTTPException.detail en
    // `{error, status_code, message}`. parseAPIError ya lee `message` primero,
    // luego `detail` como fallback. Sin esto el toast mostraba "Sync error:
    // 400" en vez de "Google Business no está conectado. Use POST
    // /gmb/.../connect primero." — operador no sabía que faltaba GBP.
    throw new Error(await parseAPIError(res))
  }
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
  const d = await res.json()
  const breakdown = (d.breakdown ?? {}) as Record<string, Record<string, number>>
  return {
    score: d.nps_score ?? d.score ?? 0,
    promoters: breakdown.promoters?.count ?? d.promoters ?? 0,
    detractors: breakdown.detractors?.count ?? d.detractors ?? 0,
    passives: breakdown.passives?.count ?? d.passives ?? 0,
  }
}

export async function requestReview(orgId: string, patientId: string): Promise<void> {
  const res = await authFetch(`${API_URL}/api/growth/engagement/${orgId}/reputation/request-review/${patientId}`, { method: 'POST' })
  if (!res.ok) throw new Error(`Request review error: ${res.status}`)
}
