import { API_URL, authFetch } from './helpers'

export interface ApiKey {
  id: string
  org_id: string
  name: string
  key_prefix: string
  scopes: string[]
  is_active: boolean
  expires_at: string | null
  last_used_at: string | null
  created_at: string
}

export async function listApiKeys(orgId: string): Promise<ApiKey[]> {
  const res = await authFetch(`${API_URL}/admin/api-keys/${orgId}`)
  if (!res.ok) return []
  return res.json()
}

export async function createApiKey(orgId: string, data: {
  name: string; scopes: string[]; expires_days?: number
}): Promise<{ key: ApiKey; raw_key: string }> {
  const res = await authFetch(`${API_URL}/admin/api-keys`, {
    method: 'POST', body: JSON.stringify({ org_id: orgId, ...data }),
  })
  if (!res.ok) throw new Error(`Create API key error: ${res.status}`)
  return res.json()
}

export async function revokeApiKey(orgId: string, keyId: string): Promise<void> {
  const res = await authFetch(`${API_URL}/admin/api-keys/${orgId}/${keyId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Revoke API key error: ${res.status}`)
}
