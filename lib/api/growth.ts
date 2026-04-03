import { API_URL, authFetch } from './helpers'

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

export async function getGrowthDashboard(orgId: string, days?: number): Promise<GrowthMetrics> {
  const q = days ? `?days=${days}` : ''
  const res = await authFetch(`${API_URL}/api/growth/analytics/${orgId}/command-center${q}`)
  if (!res.ok) throw new Error(`Growth dashboard error: ${res.status}`)
  return res.json()
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
  return res.json()
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
  return res.json()
}

// ============================================================
// E3 — Local SEO
// ============================================================

export async function getSEOHealth(orgId: string): Promise<Record<string, unknown>> {
  const res = await authFetch(`${API_URL}/api/growth/ads/${orgId}/seo/health`)
  if (!res.ok) return {}
  return res.json()
}
