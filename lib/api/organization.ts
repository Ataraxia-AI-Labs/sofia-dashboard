import { API_URL, authFetch } from './helpers'
import { supabase } from '../supabase'
import type { Organization } from '@/types'

export async function fetchOrganization(orgId: string) {
  const res = await authFetch(`${API_URL}/organizations/${orgId}`)
  if (!res.ok) throw new Error(`Organization error: ${res.status}`)
  return res.json()
}

/**
 * fetchUserOrganization — Auth bootstrapping.
 * Uses direct Supabase because we need user_id->org mapping BEFORE
 * we know the org_id for backend API auth.
 */
export async function fetchUserOrganization(userId: string): Promise<{ organization: Organization | null; role: 'OWNER' | 'ADMIN' | 'STAFF' }> {
  const { data, error } = await supabase
    .from('org_members')
    .select('organization_id, role, is_active, organizations(id, name, status, plan, trial_ends_at, plan_started_at, billing_cycle, config_settings, specialty, country)')
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
    (rawRole === 'ADMIN' || rawRole === 'DOCTOR') ? 'ADMIN' :
    (rawRole === 'STAFF' || rawRole === 'RECEPTIONIST') ? 'STAFF' : 'STAFF'
  return { organization: (data.organizations as unknown as Organization | null) || null, role }
}

export async function updateOrganization(orgId: string, data: Record<string, unknown>) {
  const res = await authFetch(`${API_URL}/organizations/${orgId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Update organization error: ${res.status}`)
}

// ============================================================
// White-Label / Branding (P3-01, P3-02, P3-03)
// ============================================================

export async function uploadOrgLogo(orgId: string, file: File): Promise<{ logo_url: string }> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await authFetch(`${API_URL}/white-label/${orgId}/logo`, {
    method: 'POST',
    body: formData,
    // Content-Type is NOT set — browser sets multipart boundary automatically
  })
  if (!res.ok) throw new Error(`Upload error: ${res.status}`)
  return res.json()
}

export async function deleteOrgLogo(orgId: string): Promise<void> {
  const res = await authFetch(`${API_URL}/white-label/${orgId}/logo`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Delete error: ${res.status}`)
}

export async function validateCustomDomain(orgId: string, domain: string): Promise<{ verified: boolean; cname_target?: string; dns_target?: string }> {
  const res = await authFetch(`${API_URL}/white-label/${orgId}/domain/validate`, {
    method: 'POST',
    body: JSON.stringify({ domain }),
  })
  if (!res.ok) throw new Error(`Domain validation error: ${res.status}`)
  return res.json()
}

export async function updateBrandColors(orgId: string, colors: { primary?: string; secondary?: string; accent?: string }): Promise<unknown> {
  const res = await authFetch(`${API_URL}/white-label/${orgId}/colors`, {
    method: 'PUT',
    body: JSON.stringify(colors),
  })
  if (!res.ok) throw new Error(`Colors update error: ${res.status}`)
  return res.json()
}

export async function generateSystemPrompt(orgId: string): Promise<{
  generated_prompt: string
  clinic_data: { name: string; specialty: string; services_count: number; has_hours: boolean }
  tokens_used: number
}> {
  const res = await authFetch(`${API_URL}/organizations/${orgId}/generate-prompt`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error(`Generate prompt error: ${res.status}`)
  return res.json()
}
