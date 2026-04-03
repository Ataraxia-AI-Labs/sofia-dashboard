import { API_URL, authFetch } from './helpers'
import type { Campaign, CampaignPreview, CampaignAnalytics } from '@/types'

// ============================================================
// CAMPAIGNS API — Marketing Campaigns (P5-09)
// ============================================================

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
  return res.json()
}

export async function listCampaigns(orgId: string): Promise<Campaign[]> {
  const res = await authFetch(`${API_URL}/api/campaigns/${orgId}`)
  if (!res.ok) return []
  return res.json()
}

export async function getCampaign(orgId: string, campaignId: string): Promise<Campaign | null> {
  const res = await authFetch(`${API_URL}/api/campaigns/${orgId}/${campaignId}`)
  if (!res.ok) return null
  return res.json()
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
  return res.json()
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
  return res.json()
}
