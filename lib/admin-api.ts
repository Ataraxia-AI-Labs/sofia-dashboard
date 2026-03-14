'use client'

import { supabase, API_URL, authFetch } from './supabase'
import type { User } from '@supabase/supabase-js'

// ============================================================
// SUPER ADMIN CHECK
// ============================================================

export function isSuperAdmin(user: User): boolean {
  // C-02: Only trust server-side app_metadata (set via Supabase dashboard or admin API)
  // NEXT_PUBLIC_ADMIN_EMAILS was removed — it was exposed in the client bundle
  return user.app_metadata?.is_super_admin === true
}

// ============================================================
// ADMIN API HELPER — All admin queries go through backend
// ============================================================

async function adminFetch<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_URL}/admin${path}`
  const res = await authFetch(url, options)
  if (!res.ok) {
    const text = await res.text().catch(() => `Error ${res.status}`)
    throw new Error(text)
  }
  return res.json()
}

// ============================================================
// ORGANIZATIONS — List all (via backend)
// ============================================================

export interface AdminOrgRow {
  id: string
  name: string
  status: string
  plan?: string
  created_at: string
  whatsapp_phone_id?: string
  config_settings?: Record<string, unknown>
  // Aggregated counts (from backend)
  patient_count?: number
  appointment_count?: number
  interaction_count?: number
  revenue?: number
}

export async function fetchAllOrganizations(): Promise<AdminOrgRow[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []

  if (isSuperAdmin(session.user)) {
    // Route through backend — no direct Supabase queries
    const result = await adminFetch<{ data: AdminOrgRow[] }>('/organizations?limit=200')
    return result.data || []
  }

  // Regular user: get orgs through org_members (still via Supabase RLS)
  const { data: memberships, error } = await supabase
    .from('org_members')
    .select('organization_id, role, organizations(id, name, status, created_at, whatsapp_phone_id, config_settings)')
    .eq('user_id', session.user.id)
    .eq('is_active', true)

  if (error) return []

  return (memberships || []).reduce<AdminOrgRow[]>((acc, m) => {
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
}

// ============================================================
// ORGANIZATION — Full detail (via backend)
// ============================================================

export async function fetchOrgFull(orgId: string) {
  const result = await adminFetch<{ organization: Record<string, unknown>; members: unknown[]; services: unknown[] }>(
    `/organizations/${orgId}`
  )
  return result.organization
}

// ============================================================
// ORG STATS — Patient, appointment, interaction counts (via backend)
// ============================================================

export async function fetchOrgStats(orgId: string) {
  return adminFetch<{ patients: number; appointments: number; interactions: number; revenue: number }>(
    `/organizations/${orgId}/stats`
  )
}

// ============================================================
// GLOBAL METRICS — Across all orgs (via backend)
// ============================================================

export async function fetchGlobalMetrics(_orgIds?: string[]) {
  const result = await adminFetch<{
    total_organizations: number
    total_patients: number
    total_interactions: number
    total_revenue_cop: number
    total_cost_usd: number
  }>('/metrics')
  return {
    patients: result.total_patients,
    appointments: 0,
    interactions: result.total_interactions,
    revenue: result.total_revenue_cop,
    dataLake: 0,
  }
}

// ============================================================
// ORG MEMBERS — List members (via backend)
// ============================================================

export async function fetchOrgUsers(orgId: string) {
  const result = await adminFetch<{ organization: Record<string, unknown>; members: { id: string; user_id: string; role: string; created_at: string }[] }>(
    `/organizations/${orgId}`
  )
  return result.members || []
}

// ============================================================
// CREATE ORGANIZATION — Via backend (fully server-side)
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
  const result = await adminFetch<{ org_id: string; user_id: string }>('/organizations', {
    method: 'POST',
    body: JSON.stringify({
      clinic_name: input.name,
      owner_email: input.owner_email,
      owner_name: input.owner_name || '',
      phone: input.phone || '',
      city: input.city || '',
      specialty: input.specialty,
      whatsapp_phone_id: input.whatsapp_phone_id || '',
      plan: input.plan,
      password: input.owner_password,
    }),
  })
  return { orgId: result.org_id, userId: result.user_id }
}

// ============================================================
// SYSTEM PROMPT GENERATOR (kept client-side — used in org creation wizard)
// ============================================================

export function generateSystemPrompt(clinicName: string, specialty: string): string {
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
// LAST ACTIVITY — Most recent interaction per org (via backend)
// ============================================================

export async function fetchOrgLastActivity(orgId: string): Promise<string | null> {
  try {
    const result = await adminFetch<{ data: { created_at: string }[] }>(
      `/organizations/${orgId}/activity?limit=1`
    )
    return result.data?.[0]?.created_at || null
  } catch {
    return null
  }
}

// ============================================================
// ACTIVITY LOG — Recent interactions for an org (via backend)
// ============================================================

export interface ActivityLogEntry {
  id: string
  channel: string
  intent: string
  created_at: string
  patient_phone?: string
}

export async function fetchOrgActivityLog(orgId: string, limit: number = 50): Promise<ActivityLogEntry[]> {
  const result = await adminFetch<{ data: ActivityLogEntry[] }>(
    `/organizations/${orgId}/activity?limit=${limit}`
  )
  return result.data || []
}

// ============================================================
// BOT EXECUTION LOGS — Via backend
// ============================================================

export interface BotLogEntry {
  id: string
  bot_name: string
  status: string
  details: Record<string, unknown> | null
  error_message: string | null
  executed_at: string
}

export async function fetchBotLogs(limit: number = 50): Promise<BotLogEntry[]> {
  const result = await adminFetch<{ data: BotLogEntry[] }>(`/bot-logs?limit=${limit}`)
  return result.data || []
}

export async function fetchBotErrorCount24h(): Promise<number> {
  const result = await adminFetch<{ count: number }>('/bot-logs/error-count')
  return result.count || 0
}

// ============================================================
// UPDATE ORG STATUS (via backend)
// ============================================================

export async function updateOrgStatus(orgId: string, status: string) {
  return adminFetch(`/organizations/${orgId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  })
}

// ============================================================
// UPDATE ORG (via backend PATCH)
// ============================================================

export async function updateOrganization(orgId: string, data: Record<string, unknown>) {
  return adminFetch(`/organizations/${orgId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
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

// ============================================================
// PIPELINE METRICS — From Supabase pipeline_metrics table
// ============================================================

export interface PipelineMetricsRow {
  id: string
  week_start: string
  repo: string
  prs_created: number
  prs_merged: number
  prs_open: number
  prs_closed_unmerged: number
  avg_time_to_merge_hours: number | null
  ci_pass_rate: number | null
  coderabbit_approved: number
  coderabbit_changes_requested: number
  issues_created: number
  issues_closed: number
  health_check_failures: number
  sentry_errors: number
  lines_added: number
  lines_removed: number
  collected_at: string
}

export async function fetchPipelineMetrics(limit: number = 20): Promise<PipelineMetricsRow[]> {
  const { data, error } = await supabase
    .from('pipeline_metrics')
    .select('*')
    .order('week_start', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return data || []
}

// ============================================================
// API KEYS — Create, list, revoke (via backend)
// ============================================================

export interface APIKeyRow {
  id: string
  name: string
  scopes: string[]
  key_hint: string // last 8 chars of the key
  status: 'active' | 'revoked'
  created_at: string
  last_used_at: string | null
  expires_at: string | null
  organization_id: string | null
  organization_name?: string
}

export interface CreateAPIKeyInput {
  name: string
  scopes: string[]
  expires_in_days?: number
  organization_id?: string
}

export interface CreateAPIKeyResponse {
  key: string // full key — shown ONCE
  api_key: APIKeyRow
}

export async function listAPIKeys(orgId?: string): Promise<APIKeyRow[]> {
  const qs = orgId ? `?organization_id=${encodeURIComponent(orgId)}` : ''
  const result = await adminFetch<{ data: APIKeyRow[] }>(`/api-keys${qs}`)
  return result.data || []
}

export async function createAPIKey(input: CreateAPIKeyInput): Promise<CreateAPIKeyResponse> {
  return adminFetch<CreateAPIKeyResponse>('/api-keys', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function revokeAPIKey(keyId: string): Promise<void> {
  await adminFetch(`/api-keys/${keyId}/revoke`, { method: 'POST' })
}

// ============================================================
// LATENCY METRICS — P50/P95/P99 per endpoint (via backend)
// ============================================================

export interface LatencyMetricRow {
  endpoint: string
  method: string
  p50_ms: number
  p95_ms: number
  p99_ms: number
  avg_ms: number
  request_count: number
  history?: number[] // Optional sparkline data points (recent p95 values)
}

export async function fetchLatencyMetrics(): Promise<LatencyMetricRow[]> {
  const result = await adminFetch<{ data: LatencyMetricRow[] }>('/latency')
  return result.data || []
}

// ============================================================
// GOD MODE — Ensure super admin has org_members access
// ============================================================

export async function ensureSuperAdminMembership(orgId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return

  const userId = session.user.id

  // Check if already a member
  const { data: existing } = await supabase
    .from('org_members')
    .select('id')
    .eq('organization_id', orgId)
    .eq('user_id', userId)
    .limit(1)

  if (existing && existing.length > 0) return

  // Add as ADMIN (not OWNER — only the real clinic owner is OWNER)
  await supabase
    .from('org_members')
    .insert({ organization_id: orgId, user_id: userId, role: 'ADMIN', is_active: true })
}
