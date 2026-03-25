import { API_URL, authFetch } from './helpers'

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

export async function listWebhookEndpoints(orgId: string): Promise<WebhookEndpoint[]> {
  const res = await authFetch(`${API_URL}/api/webhooks/${orgId}/endpoints`)
  if (!res.ok) return []
  return res.json()
}

export async function getWebhookEndpoint(orgId: string, endpointId: string): Promise<WebhookEndpoint> {
  const res = await authFetch(`${API_URL}/api/webhooks/${orgId}/endpoints/${endpointId}`)
  if (!res.ok) throw new Error(`Webhook error: ${res.status}`)
  return res.json()
}

export async function createWebhookEndpoint(orgId: string, data: {
  name: string; url: string; event_types: string[]
  custom_headers?: Record<string, string>; ip_allowlist?: string[]; batch_mode?: boolean; batch_interval_seconds?: number
}): Promise<WebhookEndpoint> {
  const res = await authFetch(`${API_URL}/api/webhooks/${orgId}/endpoints`, {
    method: 'POST', body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Create webhook error: ${res.status}`)
  return res.json()
}

export async function updateWebhookEndpoint(orgId: string, endpointId: string, data: Partial<{
  name: string; url: string; is_active: boolean; event_types: string[]
  custom_headers: Record<string, string>; ip_allowlist: string[]; batch_mode: boolean; batch_interval_seconds: number
}>): Promise<WebhookEndpoint> {
  const res = await authFetch(`${API_URL}/api/webhooks/${orgId}/endpoints/${endpointId}`, {
    method: 'PATCH', body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Update webhook error: ${res.status}`)
  return res.json()
}

export async function deleteWebhookEndpoint(orgId: string, endpointId: string): Promise<void> {
  const res = await authFetch(`${API_URL}/api/webhooks/${orgId}/endpoints/${endpointId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Delete webhook error: ${res.status}`)
}

export async function testWebhookEndpoint(orgId: string, endpointId: string): Promise<{ success: boolean; status_code: number }> {
  const res = await authFetch(`${API_URL}/api/webhooks/${orgId}/endpoints/${endpointId}/test`, { method: 'POST' })
  if (!res.ok) throw new Error(`Test webhook error: ${res.status}`)
  return res.json()
}

export async function listWebhookDeliveries(orgId: string): Promise<WebhookDelivery[]> {
  const res = await authFetch(`${API_URL}/api/webhooks/${orgId}/deliveries`)
  if (!res.ok) return []
  return res.json()
}

export async function retryWebhookDelivery(orgId: string, deliveryId: string): Promise<void> {
  const res = await authFetch(`${API_URL}/api/webhooks/${orgId}/deliveries/${deliveryId}/retry`, { method: 'POST' })
  if (!res.ok) throw new Error(`Retry error: ${res.status}`)
}

export async function getWebhookEventCatalog(orgId: string): Promise<string[]> {
  const res = await authFetch(`${API_URL}/api/webhooks/${orgId}/events`)
  if (!res.ok) return []
  return res.json()
}
