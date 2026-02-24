'use client'

import { supabase, API_URL, authFetch } from './supabase'
import type { User } from '@supabase/supabase-js'

// ============================================================
// SUPER ADMIN CHECK
// ============================================================

export function isSuperAdmin(user: User): boolean {
  // Primary: Supabase app_metadata (set via Supabase dashboard or admin API)
  if (user.app_metadata?.is_super_admin === true) return true
  // Fallback: env var with comma-separated emails
  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
  return adminEmails.includes(user.email?.toLowerCase() || '')
}

// ============================================================
// ORGANIZATIONS — List all (via org_users join)
// ============================================================

export interface AdminOrgRow {
  id: string
  name: string
  status: string
  plan?: string
  created_at: string
  whatsapp_phone_id?: string
  config_settings?: Record<string, unknown>
  // Aggregated counts (fetched separately)
  patient_count?: number
  appointment_count?: number
  interaction_count?: number
  revenue?: number
}

export async function fetchAllOrganizations(): Promise<AdminOrgRow[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []

  // Get all orgs the user belongs to
  const { data: memberships, error } = await supabase
    .from('org_users')
    .select('organization_id, role, organizations(id, name, status, created_at, whatsapp_phone_id, config_settings)')
    .eq('user_id', session.user.id)

  if (error) {
    console.error('Error fetching admin orgs:', error.message)
    return []
  }

  const orgs = (memberships || [])
    .reduce<AdminOrgRow[]>((acc, m) => {
      const o = m.organizations as unknown as Record<string, unknown>
      if (!o) return acc
      acc.push({
        id: o.id as string,
        name: o.name as string,
        status: o.status as string,
        plan: ((o.config_settings as Record<string, unknown>)?.plan as string) || 'TRIAL',
        created_at: o.created_at as string,
        whatsapp_phone_id: o.whatsapp_phone_id as string | undefined,
        config_settings: o.config_settings as Record<string, unknown> | undefined,
      })
      return acc
    }, [])

  return orgs
}

// ============================================================
// ORGANIZATION — Full detail
// ============================================================

export async function fetchOrgFull(orgId: string) {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single()
  if (error) throw error
  return data
}

// ============================================================
// ORG STATS — Patient, appointment, interaction counts
// ============================================================

export async function fetchOrgStats(orgId: string) {
  const [patientsRes, appointmentsRes, interactionsRes, paymentsRes] = await Promise.all([
    supabase.from('patients').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('interaction_logs').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('payments').select('amount_cop').eq('organization_id', orgId).eq('status', 'PAID'),
  ])

  const revenue = (paymentsRes.data || []).reduce((sum, p) => sum + ((p as Record<string, number>).amount_cop || 0), 0)

  return {
    patients: patientsRes.count || 0,
    appointments: appointmentsRes.count || 0,
    interactions: interactionsRes.count || 0,
    revenue,
  }
}

// ============================================================
// GLOBAL METRICS — Across all orgs
// ============================================================

export async function fetchGlobalMetrics(orgIds: string[]) {
  if (orgIds.length === 0) return { patients: 0, appointments: 0, interactions: 0, revenue: 0, dataLake: 0 }

  const [patientsRes, appointmentsRes, interactionsRes, paymentsRes, dataLakeRes] = await Promise.all([
    supabase.from('patients').select('id', { count: 'exact', head: true }).in('organization_id', orgIds),
    supabase.from('appointments').select('id', { count: 'exact', head: true }).in('organization_id', orgIds),
    supabase.from('interaction_logs').select('id', { count: 'exact', head: true }).in('organization_id', orgIds),
    supabase.from('payments').select('amount_cop').in('organization_id', orgIds).eq('status', 'PAID'),
    supabase.from('data_lake_raw').select('id', { count: 'exact', head: true }).in('organization_id', orgIds),
  ])

  const revenue = (paymentsRes.data || []).reduce((sum, p) => sum + ((p as Record<string, number>).amount_cop || 0), 0)

  return {
    patients: patientsRes.count || 0,
    appointments: appointmentsRes.count || 0,
    interactions: interactionsRes.count || 0,
    revenue,
    dataLake: dataLakeRes.count || 0,
  }
}

// ============================================================
// ORG USERS — List members
// ============================================================

export async function fetchOrgUsers(orgId: string) {
  const { data, error } = await supabase
    .from('org_users')
    .select('id, user_id, role, created_at')
    .eq('organization_id', orgId)
  if (error) throw error
  return data || []
}

// ============================================================
// CREATE ORGANIZATION — Full wizard flow
// ============================================================

export interface CreateOrgInput {
  name: string
  slug?: string
  plan: string
  specialty: string
  owner_email: string
  owner_password: string
  owner_name?: string
  whatsapp_phone_id?: string
  city?: string
  address?: string
  phone?: string
}

export async function createOrganizationFull(input: CreateOrgInput): Promise<{ orgId: string; userId: string }> {
  // Step 1: Create auth user via backend (needs service role)
  // We'll try the backend endpoint first, fall back to client-side
  let userId: string

  try {
    const res = await authFetch(`${API_URL}/admin/create-user`, {
      method: 'POST',
      body: JSON.stringify({ email: input.owner_email, password: input.owner_password, name: input.owner_name }),
    })
    if (res.ok) {
      const data = await res.json()
      userId = data.user_id
    } else {
      throw new Error('Backend user creation failed')
    }
  } catch {
    // Fallback: create via Supabase Auth (only works if admin has rights)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: input.owner_email,
      password: input.owner_password,
      email_confirm: true,
      user_metadata: { full_name: input.owner_name },
    })
    if (authError) throw new Error(`Error creando usuario: ${authError.message}`)
    userId = authData.user.id
  }

  // Step 2: Create organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: input.name,
      status: 'SETUP',
      whatsapp_phone_id: input.whatsapp_phone_id || null,
      config_settings: {
        plan: input.plan,
        specialty: input.specialty,
        city: input.city || null,
        address: input.address || null,
        phone: input.phone || null,
      },
    })
    .select('id')
    .single()
  if (orgError) throw new Error(`Error creando organización: ${orgError.message}`)

  const orgId = org.id

  // Step 3: Create org_users mapping (owner)
  const { error: mappingError } = await supabase
    .from('org_users')
    .insert({ organization_id: orgId, user_id: userId, role: 'OWNER' })
  if (mappingError) throw new Error(`Error asignando rol: ${mappingError.message}`)

  // Step 4: Also add current super admin to org_users
  const { data: { session } } = await supabase.auth.getSession()
  if (session && session.user.id !== userId) {
    await supabase
      .from('org_users')
      .insert({ organization_id: orgId, user_id: session.user.id, role: 'ADMIN' })
  }

  // Step 5: Create default business hours (Mon-Fri 8-18, Sat 8-13)
  const defaultHours = [
    { day: 1, open: '08:00', close: '18:00', isOpen: true },
    { day: 2, open: '08:00', close: '18:00', isOpen: true },
    { day: 3, open: '08:00', close: '18:00', isOpen: true },
    { day: 4, open: '08:00', close: '18:00', isOpen: true },
    { day: 5, open: '08:00', close: '18:00', isOpen: true },
    { day: 6, open: '08:00', close: '13:00', isOpen: true },
    { day: 0, open: '00:00', close: '00:00', isOpen: false },
  ]

  await supabase.from('business_hours').insert(
    defaultHours.map(h => ({
      organization_id: orgId,
      day_of_week: h.day,
      open_time: h.open,
      close_time: h.close,
      slot_duration_minutes: 30,
      is_open: h.isOpen,
      is_active: true,
    }))
  )

  // Step 6: Generate default system prompt
  const defaultPrompt = generateSystemPrompt(input.name, input.specialty)
  await supabase
    .from('organizations')
    .update({ system_prompt: defaultPrompt })
    .eq('id', orgId)

  return { orgId, userId }
}

// ============================================================
// SYSTEM PROMPT GENERATOR
// ============================================================

function generateSystemPrompt(clinicName: string, specialty: string): string {
  const specialtyMap: Record<string, string> = {
    estetica: 'estética (botox, ácido hialurónico, lipoescultura, etc.)',
    odontologia: 'odontología (ortodoncia, implantes, blanqueamiento, etc.)',
    ambas: 'estética y odontología',
    general: 'servicios médicos generales',
  }
  const specialtyDesc = specialtyMap[specialty] || specialty

  return `Eres SofIA, la asistente virtual inteligente de ${clinicName}, una clínica especializada en ${specialtyDesc}.

PERSONALIDAD:
- Eres amable, profesional y empática
- Hablas en español colombiano (pero sin exceso de modismos)
- Tuteas a los pacientes
- Eres proactiva: si el paciente pregunta por un servicio, ofreces agendar cita

REGLAS:
- SIEMPRE consulta los horarios disponibles antes de sugerir una cita
- SIEMPRE confirma el servicio, fecha y hora antes de agendar
- Si no sabes algo, dilo honestamente y ofrece escalar a un humano
- No inventes precios ni servicios que no estén en el catálogo
- Para urgencias médicas, escala inmediatamente al personal

FLUJO TÍPICO:
1. Saludo cordial
2. Identificar necesidad del paciente
3. Consultar precios/disponibilidad
4. Ofrecer agendar cita
5. Confirmar datos
6. Despedida amable`
}

// ============================================================
// LAST ACTIVITY — Most recent interaction per org
// ============================================================

export async function fetchOrgLastActivity(orgId: string): Promise<string | null> {
  const { data } = await supabase
    .from('interaction_logs')
    .select('created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(1)
  return data?.[0]?.created_at || null
}

// ============================================================
// ACTIVITY LOG — Recent interactions for an org
// ============================================================

export interface ActivityLogEntry {
  id: string
  channel: string
  intent: string
  created_at: string
  patient_phone?: string
}

export async function fetchOrgActivityLog(orgId: string, limit: number = 50): Promise<ActivityLogEntry[]> {
  const { data, error } = await supabase
    .from('interaction_logs')
    .select('id, platform, ai_analysis, created_at, network_info')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return []
  return (data || []).map((d: Record<string, unknown>) => ({
    id: d.id as string,
    channel: (d.platform as string) || 'UNKNOWN',
    intent: (d.ai_analysis as Record<string, unknown>)?.intent as string || '',
    created_at: d.created_at as string,
    patient_phone: (d.network_info as Record<string, unknown>)?.phone as string || undefined,
  }))
}

// ============================================================
// BOT EXECUTION LOGS — For admin health
// ============================================================

export interface BotLogEntry {
  id: string
  bot_type: string
  status: string
  organization_id: string
  details: Record<string, unknown> | null
  created_at: string
}

export async function fetchBotLogs(limit: number = 50): Promise<BotLogEntry[]> {
  const { data, error } = await supabase
    .from('bot_execution_logs')
    .select('id, bot_type, status, organization_id, details, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return []
  return (data || []) as BotLogEntry[]
}

export async function fetchBotErrorCount24h(): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('bot_execution_logs')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'ERROR')
    .gte('created_at', since)
  return count || 0
}

// ============================================================
// UPDATE ORG STATUS
// ============================================================

export async function updateOrgStatus(orgId: string, status: string) {
  const { error } = await supabase
    .from('organizations')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orgId)
  if (error) throw error
}

// ============================================================
// POPULATE KNOWLEDGE BASE (via backend)
// ============================================================

export async function populateKnowledgeBase(orgId: string) {
  const res = await authFetch(`${API_URL}/admin/organizations/${orgId}/populate-kb`, { method: 'POST' })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Error: ${text}`)
  }
  return res.json()
}

// ============================================================
// TEST WHATSAPP (via backend)
// ============================================================

export async function testWhatsApp(orgId: string, phone: string) {
  const res = await authFetch(`${API_URL}/dashboard/send-message`, {
    method: 'POST',
    body: JSON.stringify({ organization_id: orgId, phone, message: '¡Hola! Este es un mensaje de prueba de SofIA. Si recibiste esto, la integración WhatsApp está funcionando correctamente.' }),
  })
  if (!res.ok) throw new Error(`Error: ${res.status}`)
  return res.json()
}
