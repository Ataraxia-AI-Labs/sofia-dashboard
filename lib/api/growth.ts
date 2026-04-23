import { API_URL, authFetch, unwrapArray } from './helpers'

// ============================================================
// E5 — Attribution Intelligence
// ============================================================

export interface AttributionData {
  model_type: string
  channels: Record<string, { conversions: number; revenue: number; weight: number }>
  total_conversions: number
  total_revenue: number
}

export async function getAttribution(orgId: string, modelType?: string, days?: number): Promise<AttributionData> {
  const q = new URLSearchParams()
  if (modelType) q.set('model_type', modelType)
  if (days) q.set('days', String(days))
  const res = await authFetch(`${API_URL}/api/growth/analytics/${orgId}/attribution?${q}`)
  if (!res.ok) throw new Error(`Attribution error: ${res.status}`)
  return res.json()
}

export async function getChannelROI(orgId: string, days?: number): Promise<Record<string, unknown>> {
  const q = days ? `?days=${days}` : ''
  const res = await authFetch(`${API_URL}/api/growth/analytics/${orgId}/attribution/channel-roi${q}`)
  if (!res.ok) return {}
  return res.json()
}

export async function getPatientJourney(orgId: string, patientId: string): Promise<Record<string, unknown>> {
  const res = await authFetch(`${API_URL}/api/growth/analytics/${orgId}/attribution/journey/${patientId}`)
  if (!res.ok) return {}
  return res.json()
}

// ============================================================
// E8 — Growth Command Center (full funnel)
// ============================================================

export interface GrowthMetrics {
  funnel: { visitors: number; leads: number; appointments: number; completed: number; revenue: number }
  anomalies: Record<string, unknown>[]
  trends: Record<string, unknown>
  kpis: Record<string, number>
}

interface BackendFunnelStage { stage: string; count: number; conversion_rate: number | null }
interface BackendGrowthCommandCenter {
  funnel?: { stages?: BackendFunnelStage[]; overall_conversion_rate?: number }
  anomalies?: { anomalies?: Record<string, unknown>[] }
  growth_velocity?: Record<string, unknown>
  ltv_cac_ratio?: { avg_ltv?: number }
}

export async function getGrowthDashboard(orgId: string, days?: number): Promise<GrowthMetrics> {
  const q = days ? `?days=${days}` : ''
  const res = await authFetch(`${API_URL}/api/growth/analytics/${orgId}/command-center${q}`)
  if (!res.ok) throw new Error(`Growth dashboard error: ${res.status}`)
  const raw = (await res.json()) as BackendGrowthCommandCenter

  // Backend shape: funnel.stages[] with {stage, count}. Frontend expects named steps.
  const stages = raw.funnel?.stages ?? []
  const byStage = Object.fromEntries(stages.map(s => [s.stage, s.count])) as Record<string, number>
  return {
    funnel: {
      visitors: byStage.messages ?? 0,
      leads: byStage.patients ?? 0,
      appointments: byStage.appointments ?? 0,
      completed: byStage.payments ?? 0,
      revenue: Math.round((raw.ltv_cac_ratio?.avg_ltv ?? 0) * (byStage.payments ?? 0)),
    },
    anomalies: raw.anomalies?.anomalies ?? [],
    trends: (raw.growth_velocity ?? {}) as Record<string, unknown>,
    kpis: { overall_conversion_rate: raw.funnel?.overall_conversion_rate ?? 0 },
  }
}

// ============================================================
// E1 — Ads Campaigns
// ============================================================

export interface AdCampaign {
  id: string
  org_id: string
  platform: string
  name: string
  status: string
  budget: number
  spend: number
  impressions: number
  clicks: number
  conversions: number
  roi: number | null
  created_at: string
}

export async function listAdCampaigns(orgId: string, platform?: string): Promise<AdCampaign[]> {
  const q = platform ? `?platform=${platform}` : ''
  const res = await authFetch(`${API_URL}/api/growth/ads/${orgId}/campaigns${q}`)
  if (!res.ok) return []
  return unwrapArray<AdCampaign>(await res.json(), 'campaigns', 'ads')
}

export async function getAdCampaignROI(orgId: string, campaignId: string): Promise<Record<string, unknown>> {
  const res = await authFetch(`${API_URL}/api/growth/ads/${orgId}/campaigns/${campaignId}/roi`)
  if (!res.ok) return {}
  return res.json()
}

export async function generateAdContent(orgId: string, campaignId: string): Promise<Record<string, unknown>> {
  const res = await authFetch(`${API_URL}/api/growth/ads/${orgId}/campaigns/${campaignId}/generate`, { method: 'POST' })
  if (!res.ok) throw new Error(`Generate error: ${res.status}`)
  return res.json()
}

export async function generateKeywords(orgId: string): Promise<string[]> {
  const res = await authFetch(`${API_URL}/api/growth/ads/${orgId}/keywords`, { method: 'POST' })
  if (!res.ok) return []
  return unwrapArray<string>(await res.json(), 'keywords')
}

// ============================================================
// E3 — Local SEO
// ============================================================

export async function getSEOHealth(orgId: string): Promise<Record<string, unknown>> {
  const res = await authFetch(`${API_URL}/api/growth/ads/${orgId}/seo/health`)
  if (!res.ok) return {}
  return res.json()
}
