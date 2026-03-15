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
  return res.json()
}

export async function getServiceTrends(orgId: string): Promise<ServiceTrend[]> {
  const res = await authFetch(`${API_URL}/network/${orgId}/trends`)
  if (!res.ok) return []
  return res.json()
}

export async function getPricingBenchmark(orgId: string, service: string): Promise<PricingBenchmark | null> {
  const res = await authFetch(`${API_URL}/network/${orgId}/pricing-benchmark?service=${encodeURIComponent(service)}`)
  if (!res.ok) return null
  return res.json()
}

export async function getConversionPatterns(orgId: string): Promise<ConversionPattern[]> {
  const res = await authFetch(`${API_URL}/network/${orgId}/conversion-patterns`)
  if (!res.ok) return []
  return res.json()
}

export async function getOptimalHours(orgId: string): Promise<OptimalHour[]> {
  const res = await authFetch(`${API_URL}/network/${orgId}/optimal-hours`)
  if (!res.ok) return []
  return res.json()
}

export async function getNetworkAlerts(orgId: string): Promise<NetworkAlert[]> {
  const res = await authFetch(`${API_URL}/network/${orgId}/alerts`)
  if (!res.ok) return []
  return res.json()
}

export async function getNetworkNarrative(orgId: string): Promise<NetworkNarrative | null> {
  const res = await authFetch(`${API_URL}/network/${orgId}/narrative`)
  if (!res.ok) return null
  return res.json()
}

export async function getNetworkStats(): Promise<NetworkStats | null> {
  const res = await authFetch(`${API_URL}/network/stats`)
  if (!res.ok) return null
  return res.json()
}

export async function publishMetrics(orgId: string, periodDays: number = 30): Promise<boolean> {
  const res = await authFetch(`${API_URL}/network/${orgId}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ period_days: periodDays }),
  })
  return res.ok
}
