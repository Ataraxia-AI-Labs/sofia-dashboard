import { API_URL, authFetch } from './supabase'
import type { Organization, Branch } from '@/types'

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
// PATIENTS (direct Supabase queries)
// ============================================================

import { supabase } from './supabase'

export async function fetchPatients(orgId: string, opts?: {
  limit?: number
  offset?: number
  search?: string
  orderBy?: string
  orderDir?: 'asc' | 'desc'
  branchId?: string | null
}) {
  let query = supabase
    .from('patients')
    .select('id, full_name, phone, email, acquisition_channel, service_interest, city, created_at, updated_at', { count: 'exact' })
    .eq('organization_id', orgId)

  if (opts?.branchId) query = query.eq('preferred_branch_id', opts.branchId)

  if (opts?.search) {
    query = query.or(`full_name.ilike.%${opts.search}%,phone.ilike.%${opts.search}%`)
  }

  query = query
    .order(opts?.orderBy || 'created_at', { ascending: opts?.orderDir === 'asc' })
    .range(opts?.offset || 0, (opts?.offset || 0) + (opts?.limit || 25) - 1)

  const { data, error, count } = await query
  if (error) throw error
  return { patients: data || [], total: count || 0 }
}

export async function fetchPatientDetail(patientId: string) {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', patientId)
    .single()
  if (error) throw error
  return data
}

export async function fetchPatientMLFeatures(patientId: string) {
  const { data, error } = await supabase
    .from('patient_ml_features')
    .select('*')
    .eq('patient_id', patientId)
    .single()
  if (error) return null
  return data
}

// ============================================================
// APPOINTMENTS
// ============================================================

export async function fetchAppointments(orgId: string, opts?: {
  from?: string
  to?: string
  status?: string
  branchId?: string | null
}) {
  let query = supabase
    .from('appointments')
    .select('id, patient_id, start_time, end_time, service_name, status, created_at, patients(full_name, phone)')
    .eq('organization_id', orgId)

  if (opts?.branchId) query = query.eq('branch_id', opts.branchId)
  if (opts?.from) query = query.gte('start_time', opts.from)
  if (opts?.to) query = query.lte('start_time', opts.to)
  if (opts?.status) query = query.eq('status', opts.status)

  query = query.order('start_time', { ascending: true })

  const { data, error } = await query
  if (error) throw error
  return data || []
}

// ============================================================
// OPPORTUNITIES
// ============================================================

export async function fetchOpportunities(orgId: string, status?: string, branchId?: string | null) {
  let query = supabase
    .from('detected_opportunities')
    .select('id, opportunity_type, status, estimated_value, notes, created_at, patient_id, patients(full_name, phone)')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (branchId) query = query.eq('branch_id', branchId)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

// ============================================================
// PATIENT APPOINTMENTS (for detail view)
// ============================================================

export async function fetchPatientAppointments(patientId: string) {
  const { data, error } = await supabase
    .from('appointments')
    .select('id, start_time, end_time, service_name, status, created_at')
    .eq('patient_id', patientId)
    .order('start_time', { ascending: false })
    .limit(20)
  if (error) throw error
  return data || []
}

// ============================================================
// ORGANIZATION
// ============================================================

export async function fetchOrganization(orgId: string) {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, status, system_prompt, whatsapp_phone_id, config_settings')
    .eq('id', orgId)
    .single()
  if (error) throw error
  return data
}

export async function fetchUserOrganization(userId: string): Promise<{ organization: Organization | null; role: 'OWNER' | 'ADMIN' | 'VIEWER' }> {
  // Get user's org mapping + role
  const { data, error } = await supabase
    .from('org_users')
    .select('organization_id, role, organizations(id, name, status)')
    .eq('user_id', userId)
    .limit(1)
    .single()

  if (error) {
    console.error('No org_users mapping found for user:', userId, error.message)
    return { organization: null, role: 'VIEWER' }
  }

  const role = (data?.role as 'OWNER' | 'ADMIN' | 'VIEWER') || 'VIEWER'
  return { organization: (data?.organizations as unknown as Organization | null) || null, role }
}

// ============================================================
// WRITE OPERATIONS — PATIENTS
// ============================================================

export async function createPatient(orgId: string, data: {
  full_name: string
  phone: string
  email?: string
  city?: string
  service_interest?: string
  acquisition_channel?: string
}) {
  const { data: patient, error } = await supabase
    .from('patients')
    .insert({
      organization_id: orgId,
      full_name: data.full_name || 'Por identificar',
      phone: data.phone,
      email: data.email || null,
      city: data.city || 'Por identificar',
      service_interest: data.service_interest || 'Por identificar',
      acquisition_channel: data.acquisition_channel || 'PRESENCIAL',
    })
    .select()
    .single()
  if (error) throw error
  return patient
}

export async function updatePatient(patientId: string, data: Record<string, any>) {
  const { error } = await supabase
    .from('patients')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', patientId)
  if (error) throw error
}

// ============================================================
// WRITE OPERATIONS — APPOINTMENTS
// ============================================================

export async function updateAppointmentStatus(appointmentId: string, status: string, reason?: string) {
  const updateData: any = { status }
  if (reason) updateData.cancellation_reason = reason
  const { error } = await supabase
    .from('appointments')
    .update(updateData)
    .eq('id', appointmentId)
  if (error) throw error
}

export async function createAppointment(orgId: string, data: {
  patient_id: string
  start_time: string
  end_time: string
  service_name: string
  notes?: string
}) {
  const { data: appt, error } = await supabase
    .from('appointments')
    .insert({
      organization_id: orgId,
      patient_id: data.patient_id,
      start_time: data.start_time,
      end_time: data.end_time,
      service_name: data.service_name,
      status: 'CONFIRMED',
      notes: data.notes || '',
    })
    .select()
    .single()
  if (error) throw error
  return appt
}

// ============================================================
// EXPORT PATIENTS CSV
// ============================================================

export async function exportPatientsCSV(orgId: string) {
  const { data, error } = await supabase
    .from('patients')
    .select('full_name, phone, email, city, service_interest, acquisition_channel, created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
  if (error) throw error

  const headers = ['Nombre', 'Teléfono', 'Email', 'Ciudad', 'Interés', 'Canal', 'Fecha Registro']
  const rows = (data || []).map((p: any) => [
    p.full_name || '',
    p.phone || '',
    p.email || '',
    p.city || '',
    p.service_interest || '',
    p.acquisition_channel || '',
    p.created_at ? new Date(p.created_at).toLocaleDateString('es-CO') : '',
  ])

  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
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
// PATIENT MEDIA/DOCS
// ============================================================

export async function fetchPatientMedia(patientId: string) {
  const { data, error } = await supabase
    .from('interaction_logs')
    .select('id, content_type, media_url, transcription, raw_content, created_at')
    .eq('patient_id', patientId)
    .in('content_type', ['AUDIO', 'IMAGE', 'DOCUMENT'])
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw error
  return data || []
}

// ============================================================
// TREATMENTS
// ============================================================

export async function fetchActiveTreatments(orgId: string) {
  const { data, error } = await supabase
    .from('active_treatments')
    .select('id, patient_id, treatment_name, medication, dosage, frequency_hours, start_date, end_date, next_reminder_at, total_reminders_sent, status, notes, created_at, patients(full_name, phone)')
    .eq('organization_id', orgId)
    .in('status', ['ACTIVE', 'PAUSED'])
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function fetchPatientTreatments(patientId: string) {
  const { data, error } = await supabase
    .from('active_treatments')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
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
  const { data: treatment, error } = await supabase
    .from('active_treatments')
    .insert({
      organization_id: orgId,
      patient_id: data.patient_id,
      appointment_id: data.appointment_id || null,
      treatment_name: data.treatment_name,
      medication: data.medication,
      dosage: data.dosage,
      frequency_hours: data.frequency_hours,
      start_date: data.start_date,
      end_date: data.end_date,
      next_reminder_at: data.start_date,
      notes: data.notes || '',
      status: 'ACTIVE',
    })
    .select()
    .single()
  if (error) throw error
  return treatment
}

export async function updateTreatmentStatus(treatmentId: string, status: string) {
  const { error } = await supabase
    .from('active_treatments')
    .update({ status })
    .eq('id', treatmentId)
  if (error) throw error
}

// ============================================================
// STAFF NOTES
// ============================================================

export async function fetchStaffNotes(patientId: string) {
  const { data, error } = await supabase
    .from('staff_notes')
    .select('id, note_content, sentiment_label, is_private, created_at')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createStaffNote(patientId: string, content: string, userId?: string) {
  const { error } = await supabase
    .from('staff_notes')
    .insert({
      patient_id: patientId,
      staff_user_id: userId || null,
      note_content: content,
      is_private: true,
    })
  if (error) throw error
}

// ============================================================
// SERVICES CATALOG
// ============================================================

export async function fetchServicesCatalog(orgId: string) {
  const { data, error } = await supabase
    .from('services_catalog')
    .select('*')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .order('category', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createService(orgId: string, data: {
  name: string; description?: string; price: number; currency?: string
  duration_minutes?: number; category?: string; requires_deposit?: boolean; deposit_amount?: number
}) {
  const { error } = await supabase
    .from('services_catalog')
    .insert({
      organization_id: orgId,
      name: data.name,
      description: data.description || '',
      price: data.price,
      currency: data.currency || 'COP',
      duration_minutes: data.duration_minutes || 60,
      category: data.category || 'GENERAL',
      requires_deposit: data.requires_deposit || false,
      deposit_amount: data.deposit_amount || 0,
    })
  if (error) throw error
}

export async function updateService(serviceId: string, data: Record<string, any>) {
  const { error } = await supabase
    .from('services_catalog')
    .update(data)
    .eq('id', serviceId)
  if (error) throw error
}

export async function deleteService(serviceId: string) {
  const { error } = await supabase
    .from('services_catalog')
    .update({ is_active: false })
    .eq('id', serviceId)
  if (error) throw error
}

// ============================================================
// BUSINESS HOURS
// ============================================================

export async function fetchBusinessHours(orgId: string) {
  const { data, error } = await supabase
    .from('business_hours')
    .select('*')
    .eq('organization_id', orgId)
    .order('day_of_week', { ascending: true })
  if (error) throw error
  return data || []
}

export async function updateBusinessHour(hourId: string, data: Record<string, any>) {
  const { error } = await supabase
    .from('business_hours')
    .update(data)
    .eq('id', hourId)
  if (error) throw error
}

// ============================================================
// ORGANIZATION SETTINGS
// ============================================================

export async function updateOrganization(orgId: string, data: Record<string, any>) {
  const { error } = await supabase
    .from('organizations')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', orgId)
  if (error) throw error
}

// ============================================================
// DATA LAKE — Daily ingestion chart
// ============================================================

export async function fetchDataLakeDaily(orgId: string, days: number = 30): Promise<{ date: string; count: number }[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from('data_lake_raw')
    .select('created_at')
    .eq('organization_id', orgId)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true })

  if (error) throw error

  // Group by date
  const counts: Record<string, number> = {}
  for (const row of data || []) {
    const date = new Date(row.created_at).toISOString().split('T')[0]
    counts[date] = (counts[date] || 0) + 1
  }

  // Fill missing days with 0
  const result: { date: string; count: number }[] = []
  const cursor = new Date(since)
  const today = new Date()
  while (cursor <= today) {
    const key = cursor.toISOString().split('T')[0]
    result.push({ date: key, count: counts[key] || 0 })
    cursor.setDate(cursor.getDate() + 1)
  }

  return result
}

// ============================================================
// DATA LAKE — Training ready count
// ============================================================

export async function fetchTrainingReadyCount(orgId: string): Promise<number> {
  const { count, error } = await supabase
    .from('data_lake_raw')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('is_training_ready', true)

  if (error) return 0
  return count || 0
}

// ============================================================
// VOICE AI METRICS
// ============================================================

import type { PipelinePatient, PipelineStage, VoiceMetrics } from '@/types'

export async function fetchVoiceMetrics(orgId: string, days: number = 30, _branchId?: string | null): Promise<VoiceMetrics> {
  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceStr = since.toISOString()

  // Parallel: voice calls, whatsapp msgs, voice appointments, whatsapp appointments, voice durations
  const [voiceRes, whatsappRes, voiceApptsRes, waApptsRes, durationRes] = await Promise.all([
    // Total voice calls
    supabase
      .from('interaction_logs')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('platform', 'VOICE_CALL')
      .gte('created_at', sinceStr),
    // Total WhatsApp interactions
    supabase
      .from('interaction_logs')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('platform', 'WHATSAPP')
      .eq('direction', 'INBOUND')
      .gte('created_at', sinceStr),
    // Appointments that came via voice (check interaction_logs with intent AGENDAR + VOICE_CALL)
    supabase
      .from('interaction_logs')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('platform', 'VOICE_CALL')
      .ilike('ai_analysis->>intent', '%AGENDAR%')
      .gte('created_at', sinceStr),
    // Appointments via WhatsApp
    supabase
      .from('interaction_logs')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('platform', 'WHATSAPP')
      .ilike('ai_analysis->>intent', '%AGENDAR%')
      .gte('created_at', sinceStr),
    // Voice call durations from data_lake_raw
    supabase
      .from('data_lake_raw')
      .select('structured_data')
      .eq('organization_id', orgId)
      .eq('event_type', 'VOICE_CALL')
      .gte('created_at', sinceStr),
  ])

  const totalCalls = voiceRes.count || 0
  const totalWhatsapp = whatsappRes.count || 0
  const appointmentsByVoice = voiceApptsRes.count || 0
  const appointmentsByWhatsapp = waApptsRes.count || 0

  // Calculate avg duration from data_lake_raw structured_data
  let avgDuration = 0
  const durations = durationRes.data || []
  if (durations.length > 0) {
    let totalSeconds = 0
    let count = 0
    for (const d of durations) {
      const seconds = d.structured_data?.duration_seconds || d.structured_data?.call_duration || 0
      if (seconds > 0) {
        totalSeconds += seconds
        count++
      }
    }
    avgDuration = count > 0 ? Math.round(totalSeconds / count) : 0
  }

  const totalInteractions = totalCalls + totalWhatsapp
  const voicePct = totalInteractions > 0 ? Math.round((totalCalls / totalInteractions) * 100) : 0

  return {
    total_calls: totalCalls,
    total_whatsapp: totalWhatsapp,
    avg_duration_seconds: avgDuration,
    appointments_by_voice: appointmentsByVoice,
    appointments_by_whatsapp: appointmentsByWhatsapp,
    voice_pct: voicePct,
  }
}

// ============================================================
// PIPELINE (patient journey stages)
// ============================================================

export async function fetchPipelineData(orgId: string, branchId?: string | null): Promise<PipelinePatient[]> {
  // Parallel fetch: patients, appointments, payments, interaction counts
  let patientsQuery = supabase.from('patients').select('id, full_name, phone, service_interest, created_at').eq('organization_id', orgId).order('created_at', { ascending: false })
  let appointmentsQuery = supabase.from('appointments').select('patient_id, status').eq('organization_id', orgId)
  let paymentsQuery = supabase.from('payments').select('patient_id, status').eq('organization_id', orgId)

  if (branchId) {
    patientsQuery = patientsQuery.eq('preferred_branch_id', branchId)
    appointmentsQuery = appointmentsQuery.eq('branch_id', branchId)
  }

  const [patientsRes, appointmentsRes, paymentsRes, interactionsRes] = await Promise.all([
    patientsQuery,
    appointmentsQuery,
    paymentsQuery,
    supabase
      .from('patient_ml_features')
      .select('patient_id, total_interactions')
      .eq('organization_id', orgId),
  ])

  const patients = patientsRes.data || []
  const appointments = appointmentsRes.data || []
  const payments = paymentsRes.data || []
  const mlFeatures = interactionsRes.data || []

  // Index appointments by patient_id
  const apptsByPatient: Record<string, { scheduled: number; completed: number }> = {}
  for (const a of appointments) {
    if (!a.patient_id) continue
    if (!apptsByPatient[a.patient_id]) apptsByPatient[a.patient_id] = { scheduled: 0, completed: 0 }
    if (a.status === 'SCHEDULED' || a.status === 'CONFIRMED') apptsByPatient[a.patient_id].scheduled++
    if (a.status === 'COMPLETED') apptsByPatient[a.patient_id].completed++
  }

  // Index payments by patient_id
  const paidByPatient = new Set<string>()
  for (const p of payments) {
    if (p.patient_id && p.status === 'PAID') paidByPatient.add(p.patient_id)
  }

  // Index interactions by patient_id
  const interactionsByPatient: Record<string, number> = {}
  for (const m of mlFeatures) {
    if (m.patient_id) interactionsByPatient[m.patient_id] = m.total_interactions || 0
  }

  // Classify each patient into a pipeline stage
  return patients.map((p) => {
    const appts = apptsByPatient[p.id] || { scheduled: 0, completed: 0 }
    const interactions = interactionsByPatient[p.id] || 0
    const hasPaid = paidByPatient.has(p.id)

    let stage: PipelineStage = 'LEAD'

    // Highest priority first (a patient can only be in one stage)
    if (appts.completed > 1) {
      stage = 'RECURRENTE'
    } else if (hasPaid) {
      stage = 'PAGADO'
    } else if (appts.completed >= 1) {
      stage = 'CITA_COMPLETADA'
    } else if (appts.scheduled > 0) {
      stage = 'CITA_AGENDADA'
    } else if (interactions > 3) {
      stage = 'CONTACTADO'
    } else {
      stage = 'LEAD'
    }

    return {
      id: p.id,
      full_name: p.full_name,
      phone: p.phone,
      service_interest: p.service_interest,
      created_at: p.created_at,
      stage,
      interaction_count: interactions,
      appointment_count: appts.scheduled + appts.completed,
      completed_count: appts.completed,
      has_paid: hasPaid,
    }
  })
}

// ============================================================
// HELPERS
// ============================================================

export function formatCOP(n: number): string {
  if (!n && n !== 0) return '$0'
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
