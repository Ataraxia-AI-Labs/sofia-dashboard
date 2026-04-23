import { API_URL, authFetch, unwrapArray } from './helpers'

export interface WebhookEndpoint {
  id: string
  org_id: string
  name: string
  url: string
  event_types: string[]
  is_active: boolean
  signing_secret: string
  custom_headers: Record<string, string>
  ip_allowlist: string[]
  batch_mode: boolean
  batch_interval_seconds: number
  created_at: string
  updated_at: string
}

export interface WebhookDelivery {
  id: string
  endpoint_id: string
  event_type: string
  payload: Record<string, unknown>
  status: 'PENDING' | 'SUCCESS' | 'FAILED'
  http_status: number | null
  attempts: number
  last_attempt_at: string | null
  created_at: string
}

function mapEndpoint(r: Record<string, unknown>): WebhookEndpoint {
  return {
    id: (r.id ?? '') as string,
    org_id: (r.org_id ?? r.organization_id ?? '') as string,
    name: (r.name ?? '') as string,
    url: (r.url ?? '') as string,
    event_types: (r.event_types ?? []) as string[],
    is_active: (r.is_active ?? false) as boolean,
    signing_secret: (r.signing_secret ?? '') as string,
    custom_headers: (r.custom_headers ?? {}) as Record<string, string>,
    ip_allowlist: (r.ip_allowlist ?? []) as string[],
    batch_mode: (r.batch_mode ?? false) as boolean,
    batch_interval_seconds: (r.batch_interval_seconds ?? 0) as number,
    created_at: (r.created_at ?? '') as string,
    updated_at: (r.updated_at ?? '') as string,
  }
}

function mapDelivery(r: Record<string, unknown>): WebhookDelivery {
  return {
    id: (r.id ?? '') as string,
    endpoint_id: (r.webhook_endpoint_id ?? r.endpoint_id ?? '') as string,
    event_type: (r.event_type ?? '') as string,
    payload: (r.payload ?? {}) as Record<string, unknown>,
    status: (r.status ?? 'PENDING') as WebhookDelivery['status'],
    http_status: (r.response_status ?? r.http_status ?? null) as number | null,
    attempts: (r.attempt_number ?? r.attempts ?? 0) as number,
    last_attempt_at: (r.last_attempt_at ?? null) as string | null,
    created_at: (r.created_at ?? '') as string,
  }
}

export async function listWebhookEndpoints(orgId: string): Promise<WebhookEndpoint[]> {
  const res = await authFetch(`${API_URL}/api/webhooks/${orgId}/endpoints`)
  if (!res.ok) return []
  const raw = unwrapArray<Record<string, unknown>>(await res.json(), 'endpoints', 'webhooks')
  return raw.map(mapEndpoint)
}

export async function getWebhookEndpoint(orgId: string, endpointId: string): Promise<WebhookEndpoint> {
  const res = await authFetch(`${API_URL}/api/webhooks/${orgId}/endpoints/${endpointId}`)
  if (!res.ok) throw new Error(`Webhook error: ${res.status}`)
  const d = await res.json()
  return mapEndpoint(d.endpoint ?? d)
}

export async function createWebhookEndpoint(orgId: string, data: {
  name: string; url: string; event_types: string[]
  custom_headers?: Record<string, string>; ip_allowlist?: string[]; batch_mode?: boolean; batch_interval_seconds?: number
}): Promise<WebhookEndpoint> {
  const res = await authFetch(`${API_URL}/api/webhooks/${orgId}/endpoints`, {
    method: 'POST', body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Create webhook error: ${res.status}`)
  const d = await res.json()
  return mapEndpoint(d.endpoint ?? d)
}

export async function updateWebhookEndpoint(orgId: string, endpointId: string, data: Partial<{
  name: string; url: string; is_active: boolean; event_types: string[]
  custom_headers: Record<string, string>; ip_allowlist: string[]; batch_mode: boolean; batch_interval_seconds: number
}>): Promise<WebhookEndpoint> {
  const res = await authFetch(`${API_URL}/api/webhooks/${orgId}/endpoints/${endpointId}`, {
    method: 'PATCH', body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Update webhook error: ${res.status}`)
  const d = await res.json()
  return mapEndpoint(d.endpoint ?? d)
}

export async function deleteWebhookEndpoint(orgId: string, endpointId: string): Promise<void> {
  const res = await authFetch(`${API_URL}/api/webhooks/${orgId}/endpoints/${endpointId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Delete webhook error: ${res.status}`)
}

export async function testWebhookEndpoint(orgId: string, endpointId: string): Promise<{ success: boolean; status_code: number }> {
  const res = await authFetch(`${API_URL}/api/webhooks/${orgId}/endpoints/${endpointId}/test`, { method: 'POST' })
  if (!res.ok) throw new Error(`Test webhook error: ${res.status}`)
  const d = await res.json()
  const result = d.test_result ?? d
  return {
    success: result.success ?? false,
    status_code: result.status_code ?? result.response_status ?? 0,
  }
}

export async function listWebhookDeliveries(orgId: string): Promise<WebhookDelivery[]> {
  const res = await authFetch(`${API_URL}/api/webhooks/${orgId}/deliveries`)
  if (!res.ok) return []
  const raw = unwrapArray<Record<string, unknown>>(await res.json(), 'deliveries')
  return raw.map(mapDelivery)
}

export async function retryWebhookDelivery(orgId: string, deliveryId: string): Promise<void> {
  const res = await authFetch(`${API_URL}/api/webhooks/${orgId}/deliveries/${deliveryId}/retry`, { method: 'POST' })
  if (!res.ok) throw new Error(`Retry error: ${res.status}`)
}

export async function getWebhookEventCatalog(orgId: string): Promise<string[]> {
  const res = await authFetch(`${API_URL}/api/webhooks/${orgId}/events`)
  if (!res.ok) return []
  return unwrapArray<string>(await res.json(), 'events', 'catalog')
}
