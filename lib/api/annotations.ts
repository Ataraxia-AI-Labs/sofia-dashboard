import { API_URL, authFetch } from './helpers'

// ============================================================
// ANNOTATIONS API (P4-06)
// Extended annotation operations beyond basic annotate/remove
// ============================================================

export interface AnnotationRecord {
  id: string
  interaction_id: string
  organization_id: string
  rating: 'thumbs_up' | 'thumbs_down'
  notes?: string
  annotated_by?: string
  created_at: string
  updated_at?: string
}

export interface AnnotationStats {
  total: number
  thumbs_up: number
  thumbs_down: number
  approval_rate: number
}

export interface AnnotationFilters {
  rating?: 'thumbs_up' | 'thumbs_down'
  limit?: number
  offset?: number
  from?: string
  to?: string
}

/**
 * Create or update an annotation on an interaction.
 * Uses the existing backend endpoint POST /interactions/{org_id}/{interaction_id}/annotate
 */
export async function createAnnotation(
  orgId: string,
  interactionId: string,
  rating: 'thumbs_up' | 'thumbs_down',
  notes?: string,
): Promise<{ ok: boolean }> {
  const res = await authFetch(`${API_URL}/interactions/${orgId}/${interactionId}/annotate`, {
    method: 'POST',
    body: JSON.stringify({ rating, notes }),
  })
  if (!res.ok) return { ok: false }
  return res.json()
}

/**
 * Fetch annotations for an organization with optional filters.
 * Falls back to empty array if endpoint unavailable.
 */
export async function getAnnotations(
  orgId: string,
  filters?: AnnotationFilters,
): Promise<AnnotationRecord[]> {
  const params = new URLSearchParams()
  if (filters?.rating) params.set('rating', filters.rating)
  if (filters?.limit) params.set('limit', String(filters.limit))
  if (filters?.offset) params.set('offset', String(filters.offset))
  if (filters?.from) params.set('from', filters.from)
  if (filters?.to) params.set('to', filters.to)

  const qs = params.toString()
  const res = await authFetch(`${API_URL}/interactions/${orgId}/annotations${qs ? `?${qs}` : ''}`)
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : (data.annotations || [])
}

/**
 * Get annotation statistics for an organization.
 */
export async function getAnnotationStats(orgId: string): Promise<AnnotationStats> {
  const res = await authFetch(`${API_URL}/interactions/${orgId}/annotations/stats`)
  if (!res.ok) return { total: 0, thumbs_up: 0, thumbs_down: 0, approval_rate: 0 }
  return res.json()
}

/**
 * Delete an annotation by interaction ID.
 */
export async function deleteAnnotation(
  orgId: string,
  interactionId: string,
): Promise<{ ok: boolean }> {
  const res = await authFetch(`${API_URL}/interactions/${orgId}/${interactionId}/annotate`, {
    method: 'DELETE',
  })
  if (!res.ok) return { ok: false }
  return res.json()
}
