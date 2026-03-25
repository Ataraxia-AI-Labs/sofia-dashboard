import { API_URL, authFetch } from './helpers'

// ============================================================
// Marketplace Connectors
// ============================================================

export interface Connector {
  slug: string
  name: string
  description: string
  category: string
  icon_url: string | null
  author: string
  version: string
  avg_rating: number
  install_count: number
  is_official: boolean
  features: string[]
  pricing: string
}

export interface ConnectorReview {
  id: string
  user_name: string
  rating: number
  comment: string
  created_at: string
}

export interface InstalledConnector {
  id: string
  org_id: string
  connector_slug: string
  connector_name: string
  status: 'ACTIVE' | 'DISABLED' | 'ERROR'
  config: Record<string, unknown>
  installed_at: string
}

export async function browseConnectors(params?: { category?: string; search?: string; limit?: number }): Promise<Connector[]> {
  const q = new URLSearchParams()
  if (params?.category) q.set('category', params.category)
  if (params?.search) q.set('search', params.search)
  if (params?.limit) q.set('limit', String(params.limit))
  const qs = q.toString() ? `?${q}` : ''
  const res = await authFetch(`${API_URL}/api/marketplace/connectors${qs}`)
  if (!res.ok) return []
  return res.json()
}

export async function getConnectorDetail(slug: string): Promise<Connector | null> {
  const res = await authFetch(`${API_URL}/api/marketplace/connectors/${slug}`)
  if (!res.ok) return null
  return res.json()
}

export async function getCategories(): Promise<string[]> {
  const res = await authFetch(`${API_URL}/api/marketplace/categories`)
  if (!res.ok) return []
  return res.json()
}

export async function installConnector(orgId: string, slug: string, config?: Record<string, unknown>): Promise<InstalledConnector> {
  const res = await authFetch(`${API_URL}/api/marketplace/${orgId}/install`, {
    method: 'POST', body: JSON.stringify({ connector_slug: slug, config }),
  })
  if (!res.ok) throw new Error(`Install error: ${res.status}`)
  return res.json()
}

export async function uninstallConnector(orgId: string, installId: string): Promise<void> {
  const res = await authFetch(`${API_URL}/api/marketplace/${orgId}/uninstall/${installId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Uninstall error: ${res.status}`)
}

export async function listInstalled(orgId: string): Promise<InstalledConnector[]> {
  const res = await authFetch(`${API_URL}/api/marketplace/${orgId}/installed`)
  if (!res.ok) return []
  return res.json()
}

export async function getConnectorReviews(slug: string): Promise<ConnectorReview[]> {
  const res = await authFetch(`${API_URL}/api/marketplace/connectors/${slug}/reviews`)
  if (!res.ok) return []
  return res.json()
}

// ============================================================
// Plugins (Custom Extensions)
// ============================================================

export interface Plugin {
  id: string
  org_id: string
  name: string
  hook_point: string
  webhook_url: string
  is_active: boolean
  config: Record<string, unknown>
  created_at: string
}

export async function listPlugins(orgId: string, hookPoint?: string): Promise<Plugin[]> {
  const q = hookPoint ? `?hook_point=${hookPoint}` : ''
  const res = await authFetch(`${API_URL}/api/plugins/${orgId}${q}`)
  if (!res.ok) return []
  return res.json()
}

export async function createPlugin(orgId: string, data: {
  name: string; hook_point: string; webhook_url: string; config?: Record<string, unknown>
}): Promise<Plugin> {
  const res = await authFetch(`${API_URL}/api/plugins/${orgId}`, { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error(`Create plugin error: ${res.status}`)
  return res.json()
}

export async function updatePlugin(orgId: string, pluginId: string, data: Partial<{ name: string; is_active: boolean; config: Record<string, unknown> }>): Promise<Plugin> {
  const res = await authFetch(`${API_URL}/api/plugins/${orgId}/${pluginId}`, { method: 'PATCH', body: JSON.stringify(data) })
  if (!res.ok) throw new Error(`Update plugin error: ${res.status}`)
  return res.json()
}

export async function deletePlugin(orgId: string, pluginId: string): Promise<void> {
  const res = await authFetch(`${API_URL}/api/plugins/${orgId}/${pluginId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Delete plugin error: ${res.status}`)
}

export async function testPlugin(orgId: string, pluginId: string): Promise<{ success: boolean; response_time_ms: number }> {
  const res = await authFetch(`${API_URL}/api/plugins/${orgId}/${pluginId}/test`, { method: 'POST' })
  if (!res.ok) throw new Error(`Test plugin error: ${res.status}`)
  return res.json()
}
