import { API_URL, authFetch } from './helpers'
import type {
  PatientGamification,
  GamificationInsights,
  LeaderboardEntry,
  Reward,
  PointsHistoryEntry,
} from '@/types'

// ============================================================
// GAMIFICATION API (P5-06)
// ============================================================

export async function awardPoints(
  orgId: string,
  data: { patient_id: string; action: string; points?: number }
): Promise<{ success: boolean } | null> {
  const res = await authFetch(`${API_URL}/gamification/${orgId}/award`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) return null
  return res.json()
}

export async function getPatientGamification(
  orgId: string,
  patientId: string
): Promise<PatientGamification | null> {
  const res = await authFetch(`${API_URL}/gamification/${orgId}/patient/${patientId}`)
  if (!res.ok) return null
  return res.json()
}

export async function getLeaderboard(orgId: string): Promise<LeaderboardEntry[]> {
  const res = await authFetch(`${API_URL}/gamification/${orgId}/leaderboard`)
  if (!res.ok) return []
  return res.json()
}

export async function getTierDistribution(
  orgId: string
): Promise<Record<string, number>> {
  const res = await authFetch(`${API_URL}/gamification/${orgId}/tiers`)
  if (!res.ok) return {}
  return res.json()
}

export async function redeemPoints(
  orgId: string,
  data: { patient_id: string; reward_id: string }
): Promise<{ success: boolean } | null> {
  const res = await authFetch(`${API_URL}/gamification/${orgId}/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) return null
  return res.json()
}

export async function getRewardsCatalog(orgId: string): Promise<Reward[]> {
  const res = await authFetch(`${API_URL}/gamification/${orgId}/rewards`)
  if (!res.ok) return []
  return res.json()
}

export async function createReward(
  orgId: string,
  data: { name: string; description: string; points_cost: number }
): Promise<Reward | null> {
  const res = await authFetch(`${API_URL}/gamification/${orgId}/rewards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) return null
  return res.json()
}

export async function getGamificationInsights(
  orgId: string
): Promise<GamificationInsights | null> {
  const res = await authFetch(`${API_URL}/gamification/${orgId}/insights`)
  if (!res.ok) return null
  return res.json()
}

export async function getPointsHistory(
  orgId: string,
  patientId: string
): Promise<PointsHistoryEntry[]> {
  const res = await authFetch(`${API_URL}/gamification/${orgId}/history/${patientId}`)
  if (!res.ok) return []
  return res.json()
}
