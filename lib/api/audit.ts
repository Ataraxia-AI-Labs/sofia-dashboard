import { API_URL, authFetch } from './helpers'

export interface AuditLogEntry {
  id: string
  organization_id?: string
  user_id: string | null
  user_display_name?: string | null
  user_email?: string | null
  action: string
  resource_type: string
  resource_id: string | null
  details: Record<string, unknown>
  ip_address: string | null
  user_agent?: string | null
  created_at: string
}

export interface AuditLogResponse {
  data: AuditLogEntry[]
  total: number
  limit: number
  offset: number
}

export interface AuditLogParams {
  action?: string
  from?: string
  to?: string
  q?: string
  limit?: number
  offset?: number
}

function buildQuery(params?: AuditLogParams): string {
  const q = new URLSearchParams()
  if (params?.action) q.set('action', params.action)
  if (params?.from) q.set('from', params.from)
  if (params?.to) q.set('to', params.to)
  if (params?.q) q.set('q', params.q)
  if (params?.limit) q.set('limit', String(params.limit))
  if (params?.offset) q.set('offset', String(params.offset))
  const s = q.toString()
  return s ? `?${s}` : ''
}

export async function fetchAuditLogs(
  orgId: string,
  params?: AuditLogParams
): Promise<AuditLogResponse> {
  const res = await authFetch(`${API_URL}/audit-logs/${orgId}${buildQuery(params)}`)
  if (!res.ok) throw new Error(`Audit logs error: ${res.status}`)
  return res.json()
}

/** Triggers a browser download of the filtered audit log as CSV. */
export async function downloadAuditLogsCsv(
  orgId: string,
  params?: AuditLogParams
): Promise<void> {
  const qs = buildQuery({ ...params, limit: undefined, offset: undefined })
  const sep = qs ? '&' : '?'
  const res = await authFetch(`${API_URL}/audit-logs/${orgId}${qs}${sep}format=csv`)
  if (!res.ok) throw new Error(`Audit export error: ${res.status}`)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const stamp = new Date().toISOString().slice(0, 16).replace(/[T:]/g, '')
  a.download = `auditoria_${stamp}.csv`
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 100)
}
