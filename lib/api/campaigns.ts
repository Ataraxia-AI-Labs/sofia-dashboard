import { API_URL, authFetch, unwrapArray } from './helpers'
import type { Campaign, CampaignPreview, CampaignAnalytics } from '@/types'

// ============================================================
// CAMPAIGNS API — Marketing Campaigns (P5-09)
// ============================================================

// S154: el backend persiste stats con nombres semánticos modernos
// (read/clicked/booked) pero el panel renderea con los nombres
// históricos (responded/converted). Normalizamos en el helper para
// que cada vista pinte números reales sin duplicar la lógica.
//   read    → primer interés (no se rendea, pero queda accesible)
//   clicked → engagement accionable → responded
//   booked  → cita agendada (conversión real) → converted
// Si el backend ya envía los nombres legacy, prevalecen.
function normalizeStats<T extends { stats?: Record<string, unknown> }>(camp: T): T {
  const raw = (camp?.stats ?? {}) as Record<string, unknown>
  if (!raw || typeof raw !== 'object') return camp
  const num = (v: unknown) => (typeof v === 'number' ? v : Number(v) || 0)
  const responded = num(raw.responded ?? raw.clicked)
  const converted = num(raw.converted ?? raw.booked)
  return {
    ...camp,
    stats: {
      ...raw,
      sent: num(raw.sent),
      delivered: num(raw.delivered),
      responded,
      converted,
      revenue: num(raw.revenue),
    },
  }
}

export async function createCampaign(
  orgId: string,
  data: { name: string; message_template: string; segment_criteria: Record<string, unknown> }
): Promise<Campaign> {
  const res = await authFetch(`${API_URL}/api/campaigns/${orgId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Create campaign failed')
  return normalizeStats(await res.json() as Campaign)
}

export async function listCampaigns(orgId: string): Promise<Campaign[]> {
  const res = await authFetch(`${API_URL}/api/campaigns/${orgId}`)
  if (!res.ok) return []
  const list = unwrapArray<Campaign>(await res.json(), 'campaigns')
  return list.map(normalizeStats)
}

export async function getCampaign(orgId: string, campaignId: string): Promise<Campaign | null> {
  const res = await authFetch(`${API_URL}/api/campaigns/${orgId}/${campaignId}`)
  if (!res.ok) return null
  return normalizeStats(await res.json() as Campaign)
}

export async function previewCampaign(orgId: string, campaignId: string): Promise<CampaignPreview | null> {
  const res = await authFetch(`${API_URL}/api/campaigns/${orgId}/${campaignId}/preview`, { method: 'POST' })
  if (!res.ok) return null
  return res.json()
}

export async function scheduleCampaign(
  orgId: string,
  campaignId: string,
  sendAt: string
): Promise<void> {
  const res = await authFetch(`${API_URL}/api/campaigns/${orgId}/${campaignId}/schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ send_at: sendAt }),
  })
  if (!res.ok) throw new Error('Schedule failed')
}

export async function executeCampaign(orgId: string, campaignId: string): Promise<void> {
  const res = await authFetch(`${API_URL}/api/campaigns/${orgId}/${campaignId}/execute`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error('Execute failed')
}

export async function cancelCampaign(orgId: string, campaignId: string): Promise<void> {
  const res = await authFetch(`${API_URL}/api/campaigns/${orgId}/${campaignId}/cancel`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error('Cancel failed')
}

export async function getCampaignResults(
  orgId: string,
  campaignId: string
): Promise<Campaign | null> {
  const res = await authFetch(`${API_URL}/api/campaigns/${orgId}/${campaignId}/results`)
  if (!res.ok) return null
  return normalizeStats(await res.json() as Campaign)
}

export async function getCampaignAnalytics(orgId: string): Promise<CampaignAnalytics | null> {
  const res = await authFetch(`${API_URL}/api/campaigns/${orgId}/analytics`)
  if (!res.ok) return null
  return res.json()
}

export async function suggestSegment(
  orgId: string,
  goal: string
): Promise<{ criteria: Record<string, unknown>; explanation: string }> {
  const res = await authFetch(`${API_URL}/api/campaigns/${orgId}/suggest-segment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal }),
  })
  if (!res.ok) throw new Error('Suggest segment failed')
  // S154: backend devuelve `{suggested_criteria, explanation, goal}` con
  // age_range como objeto `{min, max}`. Frontend espera `{criteria,
  // explanation}` con age_range como array `[min, max]`. Sin esto,
  // clickear "Sugerir IA" en Crear Campaña no populaba el form y
  // `c.age_range[0]` daba undefined o crasheaba.
  const raw = await res.json() as Record<string, unknown>
  const src = (raw.suggested_criteria ?? raw.criteria ?? {}) as Record<string, unknown>
  const ageObj = src.age_range as { min?: number; max?: number } | number[] | undefined
  let ageRange: number[] | undefined
  if (Array.isArray(ageObj)) ageRange = ageObj
  else if (ageObj && typeof ageObj === 'object') ageRange = [Number(ageObj.min ?? 18), Number(ageObj.max ?? 65)]
  const lastVisitObj = src.last_visit_days_ago as { min?: number } | number | undefined
  const lastVisit = typeof lastVisitObj === 'object' && lastVisitObj !== null
    ? Number((lastVisitObj as { min?: number }).min ?? 0)
    : (lastVisitObj as number | undefined)
  return {
    criteria: {
      ...src,
      age_range: ageRange,
      gender: src.gender,
      services: src.services_used ?? src.services,
      last_visit_days: lastVisit,
      min_lead_score: src.lead_score_min ?? src.min_lead_score,
      min_ltv_tier: src.ltv_tier_min ?? src.min_ltv_tier,
    },
    explanation: (raw.explanation as string) ?? '',
  }
}
