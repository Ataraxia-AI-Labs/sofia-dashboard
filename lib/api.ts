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
    .select('id, opportunity_type, status, estimated_value, notes, created_at, patients(full_name, phone)')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

// ============================================================
// ORGANIZATION
// ============================================================

export async function fetchOrganization(orgId: string) {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, status, system_prompt, whatsapp_phone_id')
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
