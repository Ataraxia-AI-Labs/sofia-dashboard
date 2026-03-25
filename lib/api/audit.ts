import { API_URL, authFetch } from './helpers'

export interface AuditLogEntry {
  id: string
  org_id: string
  user_id: string | null
  user_email: string | null
  action: string
  resource_type: string
  resource_id: string | null
  details: Record<string, unknown>
  ip_address: string | null
  created_at: string
}

export interface AuditLogResponse {
  data: AuditLogEntry[]
  total: number
  limit: number
  offset: number
}

export async function fetchAuditLogs(
  orgId: string,
  params?: { action?: string; from?: string; to?: string; limit?: number; offset?: number }
): Promise<AuditLogResponse> {
  const q = new URLSearchParams()
  q.set('org_id', orgId)
  if (params?.action) q.set('action', params.action)
  if (params?.from) q.set('from', params.from)
  if (params?.to) q.set('to', params.to)
  if (params?.limit) q.set('limit', String(params.limit))
  if (params?.offset) q.set('offset', String(params.offset))
  const res = await authFetch(`${API_URL}/admin/audit-logs?${q}`)
  if (!res.ok) throw new Error(`Audit logs error: ${res.status}`)
  return res.json()
}
