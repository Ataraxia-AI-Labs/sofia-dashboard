import { API_URL, authFetch, unwrapArray } from './helpers'

// ============================================================
// D1 — Patient Memory
// ============================================================

export interface PatientMemory {
  id: string
  patient_id: string
  category: string
  content: string
  source: string
  metadata: Record<string, unknown>
  created_at: string
}

export async function getPatientMemories(orgId: string, patientId: string, category?: string): Promise<PatientMemory[]> {
  const q = category ? `?category=${category}` : ''
  const res = await authFetch(`${API_URL}/api/conv-intel/${orgId}/patients/${patientId}/memories${q}`)
  if (!res.ok) return []
  // Backend wraps: { memories: [...], count: N }
  return unwrapArray<PatientMemory>(await res.json(), 'memories')
}

export async function addPatientMemory(orgId: string, patientId: string, data: {
  category: string; content: string; source?: string; metadata?: Record<string, unknown>
}): Promise<PatientMemory> {
  const res = await authFetch(`${API_URL}/api/conv-intel/${orgId}/patients/${patientId}/memories`, {
    method: 'POST', body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Add memory error: ${res.status}`)
  return res.json()
}

export async function deletePatientMemory(orgId: string, patientId: string, memoryId: string): Promise<void> {
  const res = await authFetch(`${API_URL}/api/conv-intel/${orgId}/patients/${patientId}/memories/${memoryId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Delete memory error: ${res.status}`)
}

export async function searchPatientMemories(orgId: string, patientId: string, query: string): Promise<PatientMemory[]> {
  const res = await authFetch(`${API_URL}/api/conv-intel/${orgId}/patients/${patientId}/memories/search?query=${encodeURIComponent(query)}`)
  if (!res.ok) return []
  return unwrapArray<PatientMemory>(await res.json(), 'memories', 'matches')
}

// ============================================================
// D2 — Personality Engine (6-dimensional)
// ============================================================

export interface PersonalityProfile {
  formality_score: number
  humor_tolerance: number
  detail_preference: number
  emotional_support_need: number
  pace_preference: number
  emoji_preference: number
  inferred_age_range: string
  inferred_gender: string
  communication_language: string
  total_calibration_interactions: number
}

export async function getPatientPersonality(orgId: string, patientId: string): Promise<PersonalityProfile | null> {
  const res = await authFetch(`${API_URL}/api/conv-intel/${orgId}/patients/${patientId}/personality`)
  if (!res.ok) return null
  const data = await res.json()
  // Backend wraps: { profile: {...} }
  return data?.profile || data || null
}

// ============================================================
// D4 — Emotional Intelligence (Plutchik 8)
// ============================================================

export interface EmotionProfile {
  joy: number
  trust: number
  fear: number
  surprise: number
  sadness: number
  disgust: number
  anger: number
  anticipation: number
  dominant_emotion: string
  emotional_stability: number
}

export interface EmotionTrajectory {
  date: string
  dominant_emotion: string
  scores: Record<string, number>
}

export async function getPatientEmotions(orgId: string, patientId: string): Promise<EmotionProfile | null> {
  const res = await authFetch(`${API_URL}/api/conv-intel/${orgId}/patients/${patientId}/emotions`)
  if (!res.ok) return null
  const data = await res.json()
  // Backend wraps: { emotions: [...], count: N } — but we need EmotionProfile object
  // If backend returns an array of emotion records, take the latest one
  if (data?.emotions && Array.isArray(data.emotions)) {
    return data.emotions[0] || null
  }
  // If it returns the profile directly
  if (data?.dominant_emotion) return data
  return null
}

export async function getEmotionTrajectory(orgId: string, patientId: string, days?: number): Promise<EmotionTrajectory[]> {
  const q = days ? `?days=${days}` : ''
  const res = await authFetch(`${API_URL}/api/conv-intel/${orgId}/patients/${patientId}/emotions/trajectory${q}`)
  if (!res.ok) return []
  return unwrapArray<EmotionTrajectory>(await res.json(), 'trajectory', 'emotions')
}

export async function getEmotionAnalytics(orgId: string): Promise<Record<string, unknown>> {
  const res = await authFetch(`${API_URL}/api/conv-intel/${orgId}/emotions/analytics`)
  if (!res.ok) return {}
  return res.json()
}

// ============================================================
// D3 — Intent Engine
// ============================================================

export async function getPatientIntents(orgId: string, patientId: string): Promise<Record<string, unknown>[]> {
  const res = await authFetch(`${API_URL}/api/conv-intel/${orgId}/patients/${patientId}/intents`)
  if (!res.ok) return []
  return unwrapArray<Record<string, unknown>>(await res.json(), 'intents')
}

export async function getIntentAnalytics(orgId: string): Promise<Record<string, unknown>> {
  const res = await authFetch(`${API_URL}/api/conv-intel/${orgId}/intents/analytics`)
  if (!res.ok) return {}
  return res.json()
}

// ============================================================
// D5 — Summarizer
// ============================================================

export async function getPatientSummary(orgId: string, patientId: string): Promise<{ summary: string; brief: string } | null> {
  const res = await authFetch(`${API_URL}/api/conv-intel/${orgId}/patients/${patientId}/summary`)
  if (!res.ok) return null
  const data = await res.json()
  // Backend wraps: { summary: {...} } where inner has summary + brief
  if (data?.summary && typeof data.summary === 'object') return data.summary
  if (data?.summary && typeof data.summary === 'string') return data
  return data || null
}

export async function generatePatientSummary(orgId: string, patientId: string): Promise<{ summary: string }> {
  const res = await authFetch(`${API_URL}/api/conv-intel/${orgId}/patients/${patientId}/summaries/generate`, { method: 'POST' })
  if (!res.ok) throw new Error(`Summary error: ${res.status}`)
  return res.json()
}

// ============================================================
// D7 — Staff Coaching
// ============================================================

export interface CoachingTip {
  id: string
  category: string
  tip: string
  priority: string
  is_read: boolean
  created_at: string
}

export interface StaffMetric {
  staff_id: string
  staff_name: string
  conversations_handled: number
  avg_response_time: number
  satisfaction_score: number
  resolution_rate: number
}

export async function getCoachingPatterns(orgId: string): Promise<Record<string, unknown>[]> {
  const res = await authFetch(`${API_URL}/api/conv-intel/${orgId}/coaching/patterns`)
  if (!res.ok) return []
  // Backend wraps: { patterns: [...], count: N }
  return unwrapArray<Record<string, unknown>>(await res.json(), 'patterns')
}

export async function getCoachingTips(orgId: string): Promise<CoachingTip[]> {
  const res = await authFetch(`${API_URL}/api/conv-intel/${orgId}/coaching/tips`)
  if (!res.ok) return []
  // Backend wraps: { tips: [...], count: N }
  return unwrapArray<CoachingTip>(await res.json(), 'tips')
}

export async function markTipRead(orgId: string, tipId: string): Promise<void> {
  await authFetch(`${API_URL}/api/conv-intel/${orgId}/coaching/tips/${tipId}/read`, { method: 'PATCH' })
}

export async function getStaffMetrics(orgId: string): Promise<StaffMetric[]> {
  const res = await authFetch(`${API_URL}/api/conv-intel/${orgId}/coaching/staff-metrics`)
  if (!res.ok) return []
  // Backend may return { metrics: [...] } or raw list or object
  return unwrapArray<StaffMetric>(await res.json(), 'metrics', 'staff')
}

export async function getCoachingDashboard(orgId: string): Promise<Record<string, unknown>> {
  const res = await authFetch(`${API_URL}/api/conv-intel/${orgId}/coaching/dashboard`)
  if (!res.ok) return {}
  const data = await res.json()
  return (data && typeof data === 'object' && !Array.isArray(data)) ? data : {}
}

// ============================================================
// D6 — Proactive Intelligence
// ============================================================

export async function getProactiveQueue(orgId: string): Promise<Record<string, unknown>[]> {
  const res = await authFetch(`${API_URL}/api/conv-intel/${orgId}/proactive/queue`)
  if (!res.ok) return []
  return unwrapArray<Record<string, unknown>>(await res.json(), 'queue', 'proactive')
}

export async function getProactiveAnalytics(orgId: string): Promise<Record<string, unknown>> {
  const res = await authFetch(`${API_URL}/api/conv-intel/${orgId}/proactive/analytics`)
  if (!res.ok) return {}
  return res.json()
}
