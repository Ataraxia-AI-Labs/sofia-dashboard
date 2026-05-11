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
  // S154: backend posiblemente envuelve `{insights: {...}}` (consistente con
  // stats, rankings, pricing). Sin desempaque, insights.strengths quedaba
  // undefined y SwotCard crasheaba con items.length. Defensive default:
  // arrays vacíos si el shape no llega como esperamos.
  const data = await res.json()
  const raw = (data?.insights ?? data ?? {}) as Record<string, unknown>
  return {
    strengths: (raw.strengths as string[] | undefined) ?? [],
    weaknesses: (raw.weaknesses as string[] | undefined) ?? [],
    opportunities: (raw.opportunities as string[] | undefined) ?? [],
    threats: (raw.threats as string[] | undefined) ?? [],
    summary: (raw.summary as string | undefined) ?? '',
  }
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
  // S154: el backend devuelve un shape complejo:
  //   {report: {executive_summary, action_items, key_risks, ...},
  //    data_snapshot: {market_position, pricing_comparison, benchmarks, ...},
  //    generated_at, org_id}
  // El frontend espera CompetitorReport plano con market_position +
  // pricing_comparison + insights + benchmarks + generated_at. Sin
  // mapeo el panel crasheaba: report.market_position.competitive_services
  // sobre undefined → error boundary.
  //
  // Mapeamos:
  // - market_position ← data_snapshot.market_position (con defaults)
  // - pricing_comparison ← data_snapshot.pricing_comparison
  // - benchmarks ← data_snapshot.benchmarks.comparison (o [])
  // - insights ← derivamos del LLM report: key_risks → weaknesses,
  //   market_opportunities → opportunities, executive_summary → summary
  // - generated_at queda como viene
  const raw = (await res.json() ?? {}) as Record<string, unknown>
  const llm = (raw.report ?? {}) as Record<string, unknown>
  const snap = (raw.data_snapshot ?? {}) as Record<string, unknown>
  const pos = (snap.market_position ?? {}) as Record<string, unknown>
  const benchmarksWrap = (snap.benchmarks ?? {}) as Record<string, unknown>
  const competitive = (pos.competitive_services ?? pos.competitive ?? 0) as number
  const total = (pos.total_services ?? 0) as number
  const overall = (pos.overall_score as number | undefined) ??
    (total > 0 ? Math.round((competitive / total) * 100) : 0)
  return {
    market_position: {
      competitive_services: competitive,
      total_services: total,
      overall_score: overall,
      cheap_services: (pos.cheap_services as string[] | undefined) ?? [],
      expensive_services: (pos.expensive_services as string[] | undefined) ?? [],
      competitive_services_list: (pos.competitive_services_list as string[] | undefined) ?? [],
    },
    pricing_comparison: (snap.pricing_comparison as CompetitorReport['pricing_comparison'] | undefined) ?? [],
    benchmarks: (benchmarksWrap.comparison as CompetitorReport['benchmarks'] | undefined) ?? [],
    insights: {
      strengths: (llm.strengths as string[] | undefined) ?? [],
      weaknesses: (llm.key_risks as string[] | undefined) ?? [],
      opportunities: (llm.market_opportunities as string[] | undefined) ?? [],
      threats: (llm.threats as string[] | undefined) ?? [],
      summary: (llm.executive_summary as string | undefined) ?? '',
    },
    generated_at: (raw.generated_at as string | undefined) ?? new Date().toISOString(),
  }
}

export async function getPriceChanges(orgId: string): Promise<PriceChange[]> {
  const res = await authFetch(`${API_URL}/api/competitors/${orgId}/price-changes`)
  if (!res.ok) return []
  return unwrapArray<PriceChange>(await res.json(), 'price_changes', 'changes')
}
