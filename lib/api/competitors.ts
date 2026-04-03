import { API_URL, authFetch } from './helpers'
import type {
  Competitor, PricingComparison, MarketPosition,
  CompetitiveInsights, MarketBenchmark, PriceChange, CompetitorReport,
} from '@/types'

// ============================================================
// COMPETITOR ANALYSIS API (P5-02)
// ============================================================

export async function registerCompetitor(
  orgId: string,
  data: { name: string; city: string; specialty: string; services_prices: Record<string, number>; website?: string; notes?: string }
): Promise<Competitor | null> {
  const res = await authFetch(`${API_URL}/api/competitors/${orgId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) return null
  return res.json()
}

export async function listCompetitors(orgId: string): Promise<Competitor[]> {
  const res = await authFetch(`${API_URL}/api/competitors/${orgId}`)
  if (!res.ok) return []
  return res.json()
}

export async function updateCompetitor(
  orgId: string,
  competitorId: string,
  data: Partial<Competitor>
): Promise<Competitor | null> {
  const res = await authFetch(`${API_URL}/api/competitors/${orgId}/${competitorId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) return null
  return res.json()
}

export async function deleteCompetitor(orgId: string, competitorId: string): Promise<boolean> {
  const res = await authFetch(`${API_URL}/api/competitors/${orgId}/${competitorId}`, {
    method: 'DELETE',
  })
  return res.ok
}

export async function getPricingComparison(orgId: string): Promise<PricingComparison[]> {
  const res = await authFetch(`${API_URL}/api/competitors/${orgId}/pricing-comparison`)
  if (!res.ok) return []
  return res.json()
}

export async function getMarketPosition(orgId: string): Promise<MarketPosition | null> {
  const res = await authFetch(`${API_URL}/api/competitors/${orgId}/market-position`)
  if (!res.ok) return null
  return res.json()
}

export async function getCompetitiveInsights(orgId: string): Promise<CompetitiveInsights | null> {
  const res = await authFetch(`${API_URL}/api/competitors/${orgId}/insights`)
  if (!res.ok) return null
  return res.json()
}

export async function getBenchmarks(orgId: string): Promise<MarketBenchmark[]> {
  const res = await authFetch(`${API_URL}/api/competitors/${orgId}/benchmarks`)
  if (!res.ok) return []
  return res.json()
}

export async function generateReport(orgId: string): Promise<CompetitorReport | null> {
  const res = await authFetch(`${API_URL}/api/competitors/${orgId}/report`, {
    method: 'POST',
  })
  if (!res.ok) return null
  return res.json()
}

export async function getPriceChanges(orgId: string): Promise<PriceChange[]> {
  const res = await authFetch(`${API_URL}/api/competitors/${orgId}/price-changes`)
  if (!res.ok) return []
  return res.json()
}
