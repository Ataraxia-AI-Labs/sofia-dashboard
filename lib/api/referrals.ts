import { API_URL, authFetch } from './helpers'

export interface ReferralProgram {
  id: string
  org_id: string
  is_active: boolean
  reward_type: string
  reward_value: number
  reward_description: string
  min_referrals_for_reward: number
  created_at: string
}

export interface ReferralLeaderEntry {
  patient_id: string
  patient_name: string
  referral_count: number
  converted_count: number
  reward_earned: number
}

export interface ReferralAnalytics {
  total_referrals: number
  total_converted: number
  conversion_rate: number
  total_rewards_given: number
  top_channels: Record<string, number>
}

export async function getReferralProgram(orgId: string): Promise<ReferralProgram | null> {
  const res = await authFetch(`${API_URL}/api/growth/engagement/${orgId}/referrals/program`)
  if (!res.ok) return null
  return res.json()
}

export async function updateReferralProgram(orgId: string, data: Partial<ReferralProgram>): Promise<ReferralProgram> {
  const res = await authFetch(`${API_URL}/api/growth/engagement/${orgId}/referrals/program`, {
    method: 'POST', body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Referral program error: ${res.status}`)
  return res.json()
}

export async function generateReferralLink(orgId: string, patientId: string): Promise<{ referral_url: string; code: string }> {
  const res = await authFetch(`${API_URL}/api/growth/engagement/${orgId}/referrals/links/${patientId}`, { method: 'POST' })
  if (!res.ok) throw new Error(`Referral link error: ${res.status}`)
  return res.json()
}

export async function getReferralLeaderboard(orgId: string): Promise<ReferralLeaderEntry[]> {
  const res = await authFetch(`${API_URL}/api/growth/engagement/${orgId}/referrals/leaderboard`)
  if (!res.ok) return []
  return res.json()
}

export async function getReferralAnalytics(orgId: string): Promise<ReferralAnalytics> {
  const res = await authFetch(`${API_URL}/api/growth/engagement/${orgId}/referrals/analytics`)
  if (!res.ok) return { total_referrals: 0, total_converted: 0, conversion_rate: 0, total_rewards_given: 0, top_channels: {} }
  return res.json()
}
