import { API_URL } from './supabase'

// ============================================================
// ANALYTICS
// ============================================================

export async function fetchFullAnalytics(orgId: string, dias: number = 30) {
  const res = await fetch(`${API_URL}/analytics/${orgId}/full?dias=${dias}`)
  if (!res.ok) throw new Error(`Analytics error: ${res.status}`)
  return res.json()
}

export async function fetchQuickMetrics(orgId: string) {
  const res = await fetch(`${API_URL}/analytics/${orgId}/quick`)
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
}) {
  let query = supabase
    .from('patients')
    .select('id, full_name, phone, email, acquisition_channel, service_interest, city, created_at, updated_at', { count: 'exact' })
    .eq('organization_id', orgId)

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
}) {
  let query = supabase
    .from('appointments')
    .select('id, patient_id, start_time, end_time, service_name, status, created_at, patients(full_name, phone)')
    .eq('organization_id', orgId)

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

export async function fetchOpportunities(orgId: string, status?: string) {
  let query = supabase
    .from('detected_opportunities')
    .select('id, opportunity_type, status, estimated_value, notes, created_at, patient_id, patients(full_name, phone)')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(50)

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

export async function fetchUserOrganization(userId: string) {
  // First get the user's org mapping
  const { data, error } = await supabase
    .from('org_users')
    .select('organization_id, role, organizations(id, name, status)')
    .eq('user_id', userId)
    .limit(1)
    .single()

  if (error) {
    // Fallback: try getting first active org (for admin/demo)
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, name, status')
      .eq('status', 'ACTIVE')
      .limit(1)
    return orgs?.[0] || null
  }

  return data?.organizations || null
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
