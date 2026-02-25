import { API_URL, authFetch } from './supabase'
import type { Organization, Branch, Patient } from '@/types'

// ============================================================
// HELPERS — URL builder with optional branch_id
// ============================================================

function withBranch(url: string, branchId?: string | null): string {
  if (!branchId) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}branch_id=${branchId}`
}

// ============================================================
// BRANCHES (Multi-Sede)
// ============================================================

export async function fetchBranches(orgId: string): Promise<Branch[]> {
  try {
    const res = await authFetch(`${API_URL}/api/branches/${orgId}`)
    if (!res.ok) return []
    const data = await res.json()
    return data.branches || data || []
  } catch {
    return []
  }
}

// ============================================================
// ANALYTICS
// ============================================================

export async function fetchFullAnalytics(orgId: string, dias: number = 30, branchId?: string | null) {
  const res = await authFetch(withBranch(`${API_URL}/analytics/${orgId}/full?dias=${dias}`, branchId))
  if (!res.ok) throw new Error(`Analytics error: ${res.status}`)
  return res.json()
}

export async function fetchQuickMetrics(orgId: string) {
  const res = await authFetch(`${API_URL}/analytics/${orgId}/quick`)
  if (!res.ok) throw new Error(`Quick metrics error: ${res.status}`)
  return res.json()
}

// ============================================================
// PATIENTS (via backend API)
// ============================================================

export async function fetchPatients(orgId: string, opts?: {
  limit?: number
  offset?: number
  search?: string
  orderBy?: string
  orderDir?: 'asc' | 'desc'
  branchId?: string | null
}) {
  const params = new URLSearchParams()
  if (opts?.limit) params.set('limit', String(opts.limit))
  if (opts?.offset) params.set('offset', String(opts.offset))
  if (opts?.search) params.set('search', opts.search)
  if (opts?.orderBy) params.set('orderBy', opts.orderBy)
  if (opts?.orderDir) params.set('orderDir', opts.orderDir)

  const url = `${API_URL}/patients/${orgId}?${params.toString()}`
  const res = await authFetch(url)
  if (!res.ok) throw new Error(`Patients error: ${res.status}`)
  return res.json() as Promise<{ patients: Patient[]; total: number }>
}

export async function fetchPatientDetail(patientId: string) {
  const res = await authFetch(`${API_URL}/patients/${patientId}/detail`)
  if (!res.ok) throw new Error(`Patient detail error: ${res.status}`)
  return res.json()
}

export async function fetchPatientMLFeatures(patientId: string) {
  const res = await authFetch(`${API_URL}/patients/${patientId}/ml-features`)
  if (!res.ok) return null
  return res.json()
}

// ============================================================
// APPOINTMENTS (via backend API)
// ============================================================

export async function fetchAppointments(orgId: string, opts?: {
  from?: string
  to?: string
  status?: string
  branchId?: string | null
}) {
  const params = new URLSearchParams()
  if (opts?.from) params.set('from', opts.from)
  if (opts?.to) params.set('to', opts.to)
  if (opts?.status) params.set('status', opts.status)

  const url = `${API_URL}/appointments/${orgId}?${params.toString()}`
  const res = await authFetch(url)
  if (!res.ok) throw new Error(`Appointments error: ${res.status}`)
  return res.json()
}

export async function fetchPatientAppointments(patientId: string) {
  const res = await authFetch(`${API_URL}/patients/${patientId}/detail`)
  if (!res.ok) return []
  const patient = await res.json()
  // Use org_id from patient to fetch appointments filtered client-side
  const orgId = patient.organization_id
  if (!orgId) return []
  const all = await fetchAppointments(orgId)
  return (all || [])
    .filter((a: Record<string, unknown>) => a.patient_id === patientId)
    .slice(0, 20)
}

export async function updateAppointmentStatus(appointmentId: string, status: string, reason?: string) {
  const body: Record<string, string> = { status }
  if (reason) body.cancellation_reason = reason
  const res = await authFetch(`${API_URL}/appointments/${appointmentId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Update appointment error: ${res.status}`)
}

export async function createAppointment(orgId: string, data: {
  patient_id: string
  start_time: string
  end_time: string
  service_name: string
  notes?: string
}) {
  const res = await authFetch(`${API_URL}/appointments/${orgId}`, {
    method: 'POST',
    body: JSON.stringify({
      patient_id: data.patient_id,
      start_time: data.start_time,
      end_time: data.end_time,
      service_name: data.service_name,
      notes: data.notes || '',
    }),
  })
  if (!res.ok) throw new Error(`Create appointment error: ${res.status}`)
  return res.json()
}

// ============================================================
// OPPORTUNITIES (via backend API)
// ============================================================

export async function fetchOpportunities(orgId: string, status?: string, branchId?: string | null) {
  const params = new URLSearchParams()
  if (status) params.set('status', status)

  let url = `${API_URL}/opportunities/${orgId}`
  const qs = params.toString()
  if (qs) url += `?${qs}`
  url = withBranch(url, branchId)

  const res = await authFetch(url)
  if (!res.ok) throw new Error(`Opportunities error: ${res.status}`)
  return res.json()
}

export async function updateOpportunity(opportunityId: string, data: Record<string, string>) {
  const res = await authFetch(`${API_URL}/opportunities/${opportunityId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Update opportunity error: ${res.status}`)
  return res.json()
}

// ============================================================
// ORGANIZATION (via backend API)
// ============================================================

export async function fetchOrganization(orgId: string) {
  const res = await authFetch(`${API_URL}/organizations/${orgId}`)
  if (!res.ok) throw new Error(`Organization error: ${res.status}`)
  return res.json()
}

/**
 * fetchUserOrganization — Auth bootstrapping.
 * Uses direct Supabase because we need user_id→org mapping BEFORE
 * we know the org_id for backend API auth.
 */
import { supabase } from './supabase'

export async function fetchUserOrganization(userId: string): Promise<{ organization: Organization | null; role: 'OWNER' | 'ADMIN' | 'STAFF' }> {
  const { data, error } = await supabase
    .from('org_members')
    .select('organization_id, role, is_active, organizations(id, name, status)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1)
    .single()

  if (error || !data) {
    return { organization: null, role: 'STAFF' }
  }

  const rawRole = data.role as string
  const role: 'OWNER' | 'ADMIN' | 'STAFF' =
    rawRole === 'OWNER' ? 'OWNER' :
    rawRole === 'ADMIN' ? 'ADMIN' : 'STAFF'
  return { organization: (data.organizations as unknown as Organization | null) || null, role }
}

// ============================================================
// WRITE OPERATIONS — PATIENTS (via backend API)
// ============================================================

export async function createPatient(orgId: string, data: {
  full_name: string
  phone: string
  email?: string
  city?: string
  service_interest?: string
  acquisition_channel?: string
}) {
  const res = await authFetch(`${API_URL}/patients/${orgId}`, {
    method: 'POST',
    body: JSON.stringify({
      full_name: data.full_name || 'Por identificar',
      phone: data.phone,
      email: data.email || null,
      city: data.city || 'Por identificar',
      service_interest: data.service_interest || 'Por identificar',
      acquisition_channel: data.acquisition_channel || 'PRESENCIAL',
    }),
  })
  if (!res.ok) throw new Error(`Create patient error: ${res.status}`)
  return res.json()
}

export async function updatePatient(patientId: string, data: Record<string, unknown>) {
  const res = await authFetch(`${API_URL}/patients/${patientId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Update patient error: ${res.status}`)
}

export async function updateOrganization(orgId: string, data: Record<string, unknown>) {
  const res = await authFetch(`${API_URL}/organizations/${orgId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Update organization error: ${res.status}`)
}

// ============================================================
// EXPORT PATIENTS CSV (via backend API)
// ============================================================

export async function exportPatientsCSV(orgId: string) {
  const res = await authFetch(`${API_URL}/patients/${orgId}/export-csv`)
  if (!res.ok) throw new Error(`Export CSV error: ${res.status}`)

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pacientes_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ============================================================
// SEND WHATSAPP FROM DASHBOARD (via backend API)
// ============================================================

export async function sendWhatsAppMessage(orgId: string, phone: string, message: string) {
  const res = await authFetch(`${API_URL}/dashboard/send-message`, {
    method: 'POST',
    body: JSON.stringify({ org_id: orgId, phone, message }),
  })
  if (!res.ok) throw new Error(`Send message error: ${res.status}`)
  return res.json()
}

// ============================================================
// PATIENT MEDIA/DOCS (via backend API)
// ============================================================

export async function fetchPatientMedia(patientId: string) {
  const res = await authFetch(`${API_URL}/patients/${patientId}/media`)
  if (!res.ok) return []
  return res.json()
}

// ============================================================
// TREATMENTS (via backend API)
// ============================================================

export async function fetchActiveTreatments(orgId: string) {
  const res = await authFetch(`${API_URL}/treatments/${orgId}`)
  if (!res.ok) return []
  return res.json()
}

export async function fetchPatientTreatments(patientId: string) {
  const res = await authFetch(`${API_URL}/patients/${patientId}/treatments`)
  if (!res.ok) return []
  return res.json()
}

export async function createTreatment(orgId: string, data: {
  patient_id: string
  appointment_id?: string
  treatment_name: string
  medication: string
  dosage: string
  frequency_hours: number
  start_date: string
  end_date: string
  notes?: string
}) {
  const res = await authFetch(`${API_URL}/treatments/${orgId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Create treatment error: ${res.status}`)
  return res.json()
}

export async function updateTreatmentStatus(treatmentId: string, status: string) {
  const res = await authFetch(`${API_URL}/treatments/${treatmentId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
  if (!res.ok) throw new Error(`Update treatment error: ${res.status}`)
}

// ============================================================
// STAFF NOTES (via backend API)
// ============================================================

export async function fetchStaffNotes(patientId: string) {
  const res = await authFetch(`${API_URL}/patients/${patientId}/staff-notes`)
  if (!res.ok) return []
  return res.json()
}

export async function createStaffNote(patientId: string, content: string, _userId?: string) {
  const res = await authFetch(`${API_URL}/patients/${patientId}/staff-notes`, {
    method: 'POST',
    body: JSON.stringify({
      note_content: content,
      is_private: true,
    }),
  })
  if (!res.ok) throw new Error(`Create note error: ${res.status}`)
}

// ============================================================
// SERVICES CATALOG (via backend API)
// ============================================================

export async function fetchServicesCatalog(orgId: string) {
  const res = await authFetch(`${API_URL}/services/${orgId}`)
  if (!res.ok) return []
  return res.json()
}

export async function createService(orgId: string, data: {
  name: string; description?: string; price: number; currency?: string
  duration_minutes?: number; category?: string; requires_deposit?: boolean; deposit_amount?: number
}) {
  const res = await authFetch(`${API_URL}/services/${orgId}`, {
    method: 'POST',
    body: JSON.stringify({
      name: data.name,
      description: data.description || '',
      price: data.price,
      currency: data.currency || 'COP',
      duration_minutes: data.duration_minutes || 60,
      category: data.category || 'GENERAL',
      requires_deposit: data.requires_deposit || false,
      deposit_amount: data.deposit_amount || 0,
    }),
  })
  if (!res.ok) throw new Error(`Create service error: ${res.status}`)
}

export async function updateService(serviceId: string, data: Record<string, unknown>) {
  const res = await authFetch(`${API_URL}/services/${serviceId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Update service error: ${res.status}`)
}

export async function deleteService(serviceId: string) {
  const res = await authFetch(`${API_URL}/services/${serviceId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(`Delete service error: ${res.status}`)
}

// ============================================================
// BUSINESS HOURS (via backend API)
// ============================================================

export async function fetchBusinessHours(orgId: string) {
  const res = await authFetch(`${API_URL}/business-hours/${orgId}`)
  if (!res.ok) return []
  return res.json()
}

export async function updateBusinessHour(hourId: string, data: Record<string, unknown>) {
  const res = await authFetch(`${API_URL}/business-hours/${hourId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Update business hour error: ${res.status}`)
}

// ============================================================
// DATA LAKE (via backend API)
// ============================================================

export async function fetchDataLakeDaily(orgId: string, days: number = 30): Promise<{ date: string; count: number }[]> {
  const res = await authFetch(`${API_URL}/data-lake/${orgId}/daily?dias=${days}`)
  if (!res.ok) return []
  return res.json()
}

export async function fetchTrainingReadyCount(orgId: string): Promise<number> {
  const res = await authFetch(`${API_URL}/data-lake/${orgId}/training-ready-count`)
  if (!res.ok) return 0
  return res.json()
}

// ============================================================
// VOICE AI METRICS (via backend API)
// ============================================================

import type { PipelinePatient, VoiceMetrics } from '@/types'

export async function fetchVoiceMetrics(orgId: string, days: number = 30, _branchId?: string | null): Promise<VoiceMetrics> {
  const res = await authFetch(`${API_URL}/voice/${orgId}/metrics?dias=${days}`)
  if (!res.ok) {
    return {
      total_calls: 0,
      total_whatsapp: 0,
      avg_duration_seconds: 0,
      appointments_by_voice: 0,
      appointments_by_whatsapp: 0,
      voice_pct: 0,
    }
  }
  return res.json()
}

// ============================================================
// INTERACTIONS / CONVERSATIONS (via backend API)
// ============================================================

export interface InteractionLog {
  id: string
  organization_id: string
  patient_id: string
  channel: string
  direction: 'INBOUND' | 'OUTBOUND'
  message_content: string
  intent?: string
  sentiment_score?: number
  sentiment_label?: string
  tools_used?: string[]
  tokens_used?: number
  cost_usd?: number
  response_time_ms?: number
  conversation_id?: string
  created_at: string
  // Joined from patients table (if backend returns it)
  patients?: { full_name: string; phone: string }
}

export async function fetchInteractions(orgId: string, opts?: {
  limit?: number
  offset?: number
  patient_id?: string
  channel?: string
  from?: string
  to?: string
  branchId?: string | null
}): Promise<InteractionLog[]> {
  const params = new URLSearchParams()
  if (opts?.limit) params.set('limit', String(opts.limit))
  if (opts?.offset) params.set('offset', String(opts.offset))
  if (opts?.patient_id) params.set('patient_id', opts.patient_id)
  if (opts?.channel) params.set('channel', opts.channel)
  if (opts?.from) params.set('from', opts.from)
  if (opts?.to) params.set('to', opts.to)

  let url = `${API_URL}/interactions/${orgId}?${params.toString()}`
  url = withBranch(url, opts?.branchId)

  const res = await authFetch(url)
  if (!res.ok) return []
  const data = await res.json()
  // Backend may return { interactions: [...] } or raw array
  return Array.isArray(data) ? data : (data.interactions || data.data || [])
}

// ============================================================
// PIPELINE (via backend API)
// ============================================================

export async function fetchPipelineData(orgId: string, branchId?: string | null): Promise<PipelinePatient[]> {
  let url = `${API_URL}/pipeline/${orgId}`
  url = withBranch(url, branchId)
  const res = await authFetch(url)
  if (!res.ok) return []
  return res.json()
}

// ============================================================
// HELPERS
// ============================================================

export function formatCOP(n: number): string {
  if (n == null || Number.isNaN(n)) return '$0'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toLocaleString('es-CO')}`
}

export function formatUSD(n: number): string {
  return `$${n.toFixed(2)}`
}

export function formatNumber(n: number): string {
  return (n || 0).toLocaleString('es-CO')
}

export function formatPercent(n: number): string {
  return `${(n || 0).toFixed(1)}%`
}

export function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diff < 60) return 'ahora'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `hace ${Math.floor(diff / 86400)}d`
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}
