import { API_URL, authFetch } from './helpers'
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
  return res.json()
}

export async function getPriceSuggestions(orgId: string, status?: string): Promise<PriceSuggestion[]> {
  let url = `${API_URL}/pricing/${orgId}/suggestions`
  if (status) url += `?status=${status}`
  const res = await authFetch(url)
  if (!res.ok) return []
  return res.json()
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
  return res.json()
}
