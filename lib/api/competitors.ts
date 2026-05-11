import { API_URL, authFetch, unwrapArray } from './helpers'
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
  return unwrapArray<Competitor>(await res.json(), 'competitors')
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
  return unwrapArray<PricingComparison>(await res.json(), 'comparison', 'pricing')
}

export async function getMarketPosition(orgId: string): Promise<MarketPosition | null> {
  const res = await authFetch(`${API_URL}/api/competitors/${orgId}/market-position`)
  if (!res.ok) return null
  // S154: backend devuelve un shape diferente al que el frontend espera:
  //   Backend → {position_summary, competitive, expensive, cheap, total_services}
  //     (competitive/expensive/cheap son contadores numéricos)
  //   Frontend → {competitive_services, total_services, overall_score,
  //               cheap_services: string[], expensive_services: string[]}
  // Sin mapeo, `position.overall_score.toFixed(0)` lanzaba TypeError porque
  // overall_score era undefined → error boundary "¡Algo salió mal!".
  // Para evitar invenciones: si el backend no devuelve overall_score, lo
  // derivamos como competitive/total*100. cheap_services/expensive_services
  // se quedan como [] hasta que el backend exponga esa info.
  const raw = (await res.json() ?? {}) as Record<string, unknown>
  const competitive = (raw.competitive_services ?? raw.competitive ?? 0) as number
  const total = (raw.total_services ?? 0) as number
  const overall = (raw.overall_score as number | undefined) ??
    (total > 0 ? Math.round((competitive / total) * 100) : 0)
  return {
    competitive_services: competitive,
    total_services: total,
    overall_score: overall,
    cheap_services: (raw.cheap_services as string[] | undefined) ?? [],
    expensive_services: (raw.expensive_services as string[] | undefined) ?? [],
    competitive_services_list: (raw.competitive_services_list as string[] | undefined) ?? [],
  }
}

export async function getCompetitiveInsights(orgId: string): Promise<CompetitiveInsights | null> {
  const res = await authFetch(`${API_URL}/api/competitors/${orgId}/insights`)
  if (!res.ok) return null
  return res.json()
}

export async function getBenchmarks(orgId: string): Promise<MarketBenchmark[]> {
  const res = await authFetch(`${API_URL}/api/competitors/${orgId}/benchmarks`)
  if (!res.ok) return []
  return unwrapArray<MarketBenchmark>(await res.json(), 'benchmarks')
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
  return unwrapArray<PriceChange>(await res.json(), 'price_changes', 'changes')
}
