import { API_URL, authFetch } from './helpers'

export interface RevenueDashboard {
  mrr: number
  arr: number
  churn_rate: number
  arpu: number
  ltv: number
  total_orgs: number
  plan_distribution: Record<string, number>
}

export interface CohortData {
  cohort: string
  months: Record<string, number>
  initial_count: number
}

export async function getRevenueDashboard(days?: number): Promise<RevenueDashboard> {
  const q = days ? `?days=${days}` : ''
  const res = await authFetch(`${API_URL}/admin/revenue/dashboard${q}`)
  if (!res.ok) throw new Error(`Revenue dashboard error: ${res.status}`)
  return res.json()
}

export async function getMRR(): Promise<{ mrr: number; arr: number; growth_rate: number }> {
  const res = await authFetch(`${API_URL}/admin/revenue/mrr`)
  if (!res.ok) return { mrr: 0, arr: 0, growth_rate: 0 }
  const d = await res.json()
  return {
    mrr: d.mrr_cop ?? d.mrr ?? 0,
    arr: d.arr_cop ?? d.arr ?? 0,
    growth_rate: d.growth_rate ?? 0,
  }
}

export async function getChurn(days?: number): Promise<{ churn_rate: number; at_risk: Record<string, unknown>[] }> {
  const q = days ? `?days=${days}` : ''
  const res = await authFetch(`${API_URL}/admin/revenue/churn${q}`)
  if (!res.ok) return { churn_rate: 0, at_risk: [] }
  const d = await res.json()
  return {
    churn_rate: d.churn_rate ?? 0,
    at_risk: d.at_risk_orgs ?? d.at_risk ?? [],
  }
}

export async function getCohorts(months?: number): Promise<CohortData[]> {
  const q = months ? `?months=${months}` : ''
  const res = await authFetch(`${API_URL}/admin/revenue/cohorts${q}`)
  if (!res.ok) return []
  const d = await res.json()
  const raw = d.cohorts ?? d
  if (Array.isArray(raw)) return raw
  return Object.entries(raw).map(([key, val]) => ({
    cohort: key,
    months: (val as Record<string, number>),
    initial_count: (val as Record<string, number>).cohort_size ?? 0,
  }))
}

export async function getRevenueFunnel(days?: number): Promise<Record<string, unknown>> {
  const q = days ? `?days=${days}` : ''
  const res = await authFetch(`${API_URL}/admin/revenue/funnel${q}`)
  if (!res.ok) return {}
  const d = await res.json()
  return d.funnel ?? d
}

export async function getRevenueForecast(months?: number): Promise<Record<string, unknown>> {
  const q = months ? `?months=${months}` : ''
  const res = await authFetch(`${API_URL}/admin/revenue/forecast${q}`)
  if (!res.ok) return {}
  const d = await res.json()
  return d.forecast ?? d
}
