import { API_URL, authFetch, fetchArray } from './helpers'

// =================================================================
// Types
// =================================================================

export interface DataQualityAlert {
  id: string
  organization_id: string
  table_name: string
  column_name: string | null
  issue_type: string
  affected_rows: number
  total_rows: number
  pct_affected: number
  severity: 'WARN' | 'CRITICAL'
  details?: Record<string, unknown> | null
  created_at: string
}

export interface DataQualityResponse {
  alerts: DataQualityAlert[]
  count: number
  critical: number
  warn: number
}

export interface GrowthSnapshot {
  id: string
  organization_id: string
  snapshot_date: string
  leads_new: number
  leads_contacted: number
  appointments_scheduled: number
  appointments_completed?: number | null
  revenue_paid_cop: number | string
  conversion_rate?: number | null
  created_at: string
}

export interface ProactiveMessage {
  id: string
  organization_id: string
  patient_id: string
  channel: string
  trigger_type: string
  message_text: string
  scheduled_for: string
  status: 'PENDING' | 'SENT' | 'CANCELLED' | 'FAILED'
  created_at: string
}

export interface CoachingTip {
  id: string
  organization_id: string
  week_starting: string
  category: string
  insight: string
  evidence?: Record<string, unknown> | null
  conviction?: number | null
  applied: boolean
  created_at: string
}

export interface PatientSummary {
  ok: boolean
  cached?: boolean
  summary_text?: string
  key_topics?: string[]
  pending_actions?: string[]
  emotional_state?: string
  next_best_action?: string
  expires_at?: string
  error?: string
}

export interface ReviewRequest {
  id: string
  organization_id: string
  patient_id: string
  appointment_id: string | null
  status: 'PENDING' | 'SENT' | 'COMPLETED' | 'FAILED'
  scheduled_for: string
  sent_at: string | null
  response_score?: number | null
  response_text?: string | null
  responded_at?: string | null
  external_review_url?: string | null
  created_at: string
}

export interface AttributionSnapshot {
  id: string
  organization_id: string
  snapshot_date: string
  channel: string
  first_touch_credit: number | string
  last_touch_credit: number | string
  linear_credit: number | string
  time_decay_credit: number | string
  position_based_credit: number | string
  attributed_revenue_cop: number | string
  conversions_count: number
  created_at: string
}

export interface GrowthAnomaly {
  id: string
  organization_id: string
  metric_name: string
  metric_today: number
  metric_baseline: number
  z_score: number
  severity: 'INFO' | 'WARN' | 'CRITICAL'
  description?: string | null
  resolved: boolean
  resolved_at?: string | null
  detected_at: string
}

export interface SofiaLearning {
  id: string
  organization_id: string
  week_starting: string
  source_type: string
  source_id?: string | null
  pattern: string
  rule_extracted: string
  confidence: number
  active: boolean
  applied_at?: string | null
  created_at: string
}

// =================================================================
// 1. Data Quality
// =================================================================

export async function fetchDataQualityAlerts(
  orgId: string,
  opts?: { severity?: 'WARN' | 'CRITICAL'; limit?: number },
): Promise<DataQualityResponse> {
  const qs = new URLSearchParams()
  if (opts?.severity) qs.set('severity', opts.severity)
  if (opts?.limit) qs.set('limit', String(opts.limit))
  const url = `${API_URL}/api/zombies/${orgId}/data-quality/alerts${qs.toString() ? `?${qs}` : ''}`
  const res = await authFetch(url)
  if (!res.ok) return { alerts: [], count: 0, critical: 0, warn: 0 }
  return res.json()
}

export async function runDataQualityCheck(orgId: string): Promise<{ ok: boolean; alerts_raised?: number; error?: string }> {
  const res = await authFetch(`${API_URL}/api/zombies/${orgId}/data-quality/run`, { method: 'POST' })
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
  return res.json()
}

export async function dismissDataQualityAlert(orgId: string, alertId: string): Promise<boolean> {
  const res = await authFetch(`${API_URL}/api/zombies/${orgId}/data-quality/alerts/${alertId}/dismiss`, { method: 'POST' })
  return res.ok
}

// =================================================================
// 2. Growth Snapshots
// =================================================================

export async function fetchGrowthSnapshots(orgId: string, days: number = 30): Promise<GrowthSnapshot[]> {
  return fetchArray<GrowthSnapshot>(`${API_URL}/api/zombies/${orgId}/growth/snapshots?days=${days}`, 'snapshots')
}

// =================================================================
// 3. Proactive Queue
// =================================================================

export async function fetchProactiveQueue(orgId: string, status: string = 'PENDING'): Promise<ProactiveMessage[]> {
  return fetchArray<ProactiveMessage>(
    `${API_URL}/api/zombies/${orgId}/proactive/queue?status=${status}`,
    'queue',
  )
}

export async function cancelProactiveMessage(orgId: string, messageId: string): Promise<boolean> {
  const res = await authFetch(`${API_URL}/api/zombies/${orgId}/proactive/${messageId}/cancel`, { method: 'POST' })
  return res.ok
}

// =================================================================
// 4. Coaching Tips
// =================================================================

export async function fetchCoachingTips(orgId: string, limit: number = 20): Promise<CoachingTip[]> {
  return fetchArray<CoachingTip>(`${API_URL}/api/zombies/${orgId}/coaching/tips?limit=${limit}`, 'tips')
}

// =================================================================
// 5. Patient Summary
// =================================================================

export async function generatePatientSummary(
  orgId: string,
  patientId: string,
  forceRefresh: boolean = false,
): Promise<PatientSummary> {
  const res = await authFetch(
    `${API_URL}/api/zombies/${orgId}/patients/${patientId}/summary?force_refresh=${forceRefresh}`,
    { method: 'POST' },
  )
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
  return res.json()
}

// =================================================================
// 6. Review Requests
// =================================================================

export async function fetchReviewRequests(orgId: string, status?: string): Promise<ReviewRequest[]> {
  const qs = status ? `?status=${status}` : ''
  return fetchArray<ReviewRequest>(`${API_URL}/api/zombies/${orgId}/reviews/requests${qs}`, 'requests')
}

// =================================================================
// 7. Attribution Snapshots
// =================================================================

export async function fetchAttributionSnapshots(orgId: string, days: number = 30): Promise<AttributionSnapshot[]> {
  return fetchArray<AttributionSnapshot>(`${API_URL}/api/zombies/${orgId}/attribution/snapshots?days=${days}`, 'snapshots')
}

// =================================================================
// 8. Growth Anomalies
// =================================================================

export async function fetchGrowthAnomalies(orgId: string): Promise<GrowthAnomaly[]> {
  return fetchArray<GrowthAnomaly>(`${API_URL}/api/zombies/${orgId}/growth/anomalies`, 'anomalies')
}

// =================================================================
// 10. SofIA Learnings
// =================================================================

export async function fetchSofiaLearnings(orgId: string): Promise<SofiaLearning[]> {
  return fetchArray<SofiaLearning>(`${API_URL}/api/zombies/${orgId}/learnings`, 'learnings')
}
