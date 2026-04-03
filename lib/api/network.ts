import { API_URL, authFetch } from './helpers'
import type {
  NetworkBenchmarks, ServiceTrend, PricingBenchmark,
  ConversionPattern, OptimalHour, NetworkAlert, NetworkNarrative, NetworkStats,
} from '@/types'

// ============================================================
// NETWORK INTELLIGENCE API (P4-07)
// ============================================================

export async function getNetworkBenchmarks(orgId: string): Promise<NetworkBenchmarks | null> {
  const res = await authFetch(`${API_URL}/network/${orgId}/benchmarks`)
  if (!res.ok) return null
  const d = await res.json()
  const raw = d.benchmarks ?? d
  // Backend may return {org_metrics, country_benchmarks} — map to frontend shape
  if (raw.org_metrics && raw.country_benchmarks) {
    const org = raw.org_metrics as Record<string, number>
    const country = raw.country_benchmarks as Record<string, number>
    return {
      conversion_rate: { yours: org.conversion_rate ?? 0, market_avg: country.conversion_rate ?? 0, percentile: org.conversion_rate_percentile ?? 0 },
      avg_ticket: { yours: org.avg_ticket ?? 0, market_avg: country.avg_ticket ?? 0, percentile: org.avg_ticket_percentile ?? 0 },
      satisfaction: { yours: org.satisfaction ?? 0, market_avg: country.satisfaction ?? 0, percentile: org.satisfaction_percentile ?? 0 },
      response_time: { yours: org.response_time ?? 0, market_avg: country.response_time ?? 0, percentile: org.response_time_percentile ?? 0 },
    }
  }
  return raw as NetworkBenchmarks
}

export async function getServiceTrends(orgId: string): Promise<ServiceTrend[]> {
  const res = await authFetch(`${API_URL}/network/${orgId}/trends`)
  if (!res.ok) return []
  const d = await res.json()
  const raw = d.trends ?? d
  const arr = Array.isArray(raw) ? raw : []
  return arr.map((t: Record<string, unknown>) => ({
    service_name: (t.service_name ?? t.service ?? '') as string,
    trend: (t.trend ?? t.direction ?? 'STABLE') as ServiceTrend['trend'],
    change_pct: (t.change_pct ?? 0) as number,
    demand_count: (t.demand_count ?? t.current_mentions ?? 0) as number,
  }))
}

export async function getPricingBenchmark(orgId: string, service: string): Promise<PricingBenchmark | null> {
  const res = await authFetch(`${API_URL}/network/${orgId}/pricing-benchmark?service=${encodeURIComponent(service)}`)
  if (!res.ok) return null
  const d = await res.json()
  return (d.pricing ?? d) as PricingBenchmark
}

export async function getConversionPatterns(orgId: string): Promise<ConversionPattern[]> {
  const res = await authFetch(`${API_URL}/network/${orgId}/conversion-patterns`)
  if (!res.ok) return []
  const d = await res.json()
  const raw = d.patterns ?? d
  const arr = Array.isArray(raw) ? raw : []
  return arr.map((p: Record<string, unknown>) => ({
    pattern: (p.pattern ?? '') as string,
    impact_factor: typeof p.impact_factor === 'number' ? p.impact_factor : parseFloat(String(p.impact ?? '0')) || 0,
    description: (p.description ?? '') as string,
  }))
}

export async function getOptimalHours(orgId: string): Promise<OptimalHour[]> {
  const res = await authFetch(`${API_URL}/network/${orgId}/optimal-hours`)
  if (!res.ok) return []
  const d = await res.json()
  const raw = d.optimal_hours ?? d
  const arr = Array.isArray(raw) ? raw : []
  return arr.map((h: Record<string, unknown>) => ({
    hour: (h.hour ?? 0) as number,
    day: (h.day ?? h.day_of_week ?? '') as string,
    score: (h.score ?? h.conversion_score ?? 0) as number,
  }))
}

export async function getNetworkAlerts(orgId: string): Promise<NetworkAlert[]> {
  const res = await authFetch(`${API_URL}/network/${orgId}/alerts`)
  if (!res.ok) return []
  const d = await res.json()
  const raw = d.alerts ?? d
  return Array.isArray(raw) ? raw : []
}

export async function getNetworkNarrative(orgId: string): Promise<NetworkNarrative | null> {
  const res = await authFetch(`${API_URL}/network/${orgId}/narrative`)
  if (!res.ok) return null
  const d = await res.json()
  const raw = d.narrative ?? d
  if (typeof raw === 'string') {
    return { narrative: raw, generated_at: new Date().toISOString() }
  }
  return {
    narrative: (raw.narrative ?? raw.text ?? '') as string,
    generated_at: (raw.generated_at ?? (raw.generated ? new Date().toISOString() : '')) as string,
  }
}

export async function getNetworkStats(): Promise<NetworkStats | null> {
  const res = await authFetch(`${API_URL}/network/stats`)
  if (!res.ok) return null
  const d = await res.json()
  return (d.stats ?? d) as NetworkStats
}

export async function publishMetrics(orgId: string, periodDays: number = 30): Promise<boolean> {
  const res = await authFetch(`${API_URL}/network/${orgId}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ period_days: periodDays }),
  })
  return res.ok
}
