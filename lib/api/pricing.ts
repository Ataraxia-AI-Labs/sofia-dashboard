import { API_URL, authFetch, unwrapArray } from './helpers'
import type { PricingRules, PriceSuggestion, PricingInsights, SuggestPriceRequest, SuggestPriceBatchRequest } from '@/types'

// ============================================================
// DYNAMIC PRICING API (P4-03)
// ============================================================

export async function getPricingRules(orgId: string): Promise<PricingRules | null> {
  const res = await authFetch(`${API_URL}/pricing/${orgId}/rules`)
  if (!res.ok) return null
  return res.json()
}

export async function updatePricingRules(orgId: string, rules: Partial<PricingRules>): Promise<PricingRules | null> {
  const res = await authFetch(`${API_URL}/pricing/${orgId}/rules`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rules),
  })
  if (!res.ok) return null
  return res.json()
}

export async function suggestPrice(orgId: string, data: SuggestPriceRequest): Promise<PriceSuggestion | null> {
  const res = await authFetch(`${API_URL}/pricing/${orgId}/suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) return null
  return res.json()
}

export async function suggestPriceBatch(orgId: string, data: SuggestPriceBatchRequest): Promise<PriceSuggestion[]> {
  const res = await authFetch(`${API_URL}/pricing/${orgId}/suggest-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) return []
  return unwrapArray<PriceSuggestion>(await res.json(), 'suggestions', 'prices')
}

export async function getPriceSuggestions(orgId: string, status?: string): Promise<PriceSuggestion[]> {
  let url = `${API_URL}/pricing/${orgId}/suggestions`
  if (status) url += `?status=${status}`
  const res = await authFetch(url)
  if (!res.ok) return []
  return unwrapArray<PriceSuggestion>(await res.json(), 'suggestions', 'prices')
}

export async function applyPriceSuggestion(orgId: string, id: string): Promise<boolean> {
  const res = await authFetch(`${API_URL}/pricing/${orgId}/suggestions/${id}/apply`, {
    method: 'POST',
  })
  return res.ok
}

export async function rejectPriceSuggestion(orgId: string, id: string, reason: string): Promise<boolean> {
  const res = await authFetch(`${API_URL}/pricing/${orgId}/suggestions/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  })
  return res.ok
}

export async function getPricingInsights(orgId: string): Promise<PricingInsights | null> {
  const res = await authFetch(`${API_URL}/pricing/${orgId}/insights`)
  if (!res.ok) return null
  // S154: backend envuelve la respuesta como `{insights: {...}}` (consistente
  // con `{stats: ...}`, `{rankings: ...}`, `{campaign: ...}`). Además los
  // nombres de los campos no coinciden con el tipo PricingInsights del
  // frontend:
  //   Backend       → Frontend
  //   applied       → applied_count
  //   rejected      → rejected_count
  //   total_revenue_impact → revenue_impact
  // Sin el mapeo, `insights.applied_count.toString()` lanzaba TypeError
  // "Cannot read properties of undefined" y el panel mostraba el error
  // boundary "¡Algo salió mal!".
  const data = await res.json()
  const raw = (data?.insights ?? data ?? {}) as Record<string, unknown>
  return {
    total_suggestions: (raw.total_suggestions ?? 0) as number,
    applied_count: (raw.applied_count ?? raw.applied ?? 0) as number,
    rejected_count: (raw.rejected_count ?? raw.rejected ?? 0) as number,
    avg_discount_pct: (raw.avg_discount_pct ?? 0) as number,
    revenue_impact: (raw.revenue_impact ?? raw.total_revenue_impact ?? 0) as number,
    most_adjusted_services: (raw.most_adjusted_services ?? []) as Array<{ service: string; adjustments: number }>,
  }
}
