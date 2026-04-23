import { API_URL, authFetch, unwrapArray } from './helpers'

export interface TeamMember {
  id: string
  user_id: string
  role: 'OWNER' | 'ADMIN' | 'STAFF'
  is_active: boolean
  created_at: string
  email?: string
  full_name?: string
}

export async function fetchTeamMembers(orgId: string): Promise<TeamMember[]> {
  const res = await authFetch(`${API_URL}/dashboard/team/${orgId}`)
  if (!res.ok) return []
  return unwrapArray<TeamMember>(await res.json(), 'members', 'team')
}

export async function inviteTeamMember(orgId: string, email: string, role: string): Promise<{ success: boolean; message?: string }> {
  const res = await authFetch(`${API_URL}/dashboard/team/${orgId}/invite`, {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return { success: false, message: err.detail || err.message || `Error ${res.status}` }
  }
  return { success: true }
}

export async function updateMemberRole(orgId: string, memberId: string, role: string): Promise<void> {
  const res = await authFetch(`${API_URL}/dashboard/team/${orgId}/members/${memberId}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  })
  if (!res.ok) throw new Error(`Error ${res.status}`)
}

export async function deactivateMember(orgId: string, memberId: string): Promise<void> {
  const res = await authFetch(`${API_URL}/dashboard/team/${orgId}/members/${memberId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(`Error ${res.status}`)
}
