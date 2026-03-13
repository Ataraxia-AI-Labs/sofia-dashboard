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

export async function updateOrganization(orgId: string, data: Record<string, unknown>) {
  const res = await authFetch(`${API_URL}/organizations/${orgId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Update organization error: ${res.status}`)
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
