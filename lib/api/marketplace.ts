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

function mapConnector(r: Record<string, unknown>): Connector {
  return {
    slug: (r.slug ?? '') as string,
    name: (r.name ?? r.connector_name ?? '') as string,
    description: (r.description ?? '') as string,
    category: (r.category ?? '') as string,
    icon_url: (r.icon_url ?? null) as string | null,
    author: (r.developer_name ?? r.author ?? '') as string,
    version: (r.version ?? '') as string,
    avg_rating: (r.avg_rating ?? 0) as number,
    install_count: (r.install_count ?? 0) as number,
    is_official: (r.is_official ?? false) as boolean,
    features: (r.features ?? []) as string[],
    pricing: (r.pricing ?? 'free') as string,
  }
}

export async function browseConnectors(params?: { category?: string; search?: string; limit?: number }): Promise<Connector[]> {
  const q = new URLSearchParams()
  if (params?.category) q.set('category', params.category)
  if (params?.search) q.set('search', params.search)
  if (params?.limit) q.set('limit', String(params.limit))
  const qs = q.toString() ? `?${q}` : ''
  const res = await authFetch(`${API_URL}/api/marketplace/connectors${qs}`)
  if (!res.ok) return []
  const d = await res.json()
  const raw = Array.isArray(d) ? d : (d.connectors ?? [])
  return raw.map(mapConnector)
}

export async function getConnectorDetail(slug: string): Promise<Connector | null> {
  const res = await authFetch(`${API_URL}/api/marketplace/connectors/${slug}`)
  if (!res.ok) return null
  const d = await res.json()
  return mapConnector(d.connector ?? d)
}

export async function getCategories(): Promise<string[]> {
  const res = await authFetch(`${API_URL}/api/marketplace/categories`)
  if (!res.ok) return []
  const d = await res.json()
  if (Array.isArray(d)) return d
  return d.all_categories ?? d.categories?.map((c: Record<string, unknown>) => c.category ?? c) ?? []
}

export async function installConnector(orgId: string, slug: string, config?: Record<string, unknown>): Promise<InstalledConnector> {
  const res = await authFetch(`${API_URL}/api/marketplace/${orgId}/install`, {
    method: 'POST', body: JSON.stringify({ connector_slug: slug, config }),
  })
  if (!res.ok) throw new Error(`Install error: ${res.status}`)
  const d = await res.json()
  return (d.installed ?? d) as InstalledConnector
}

export async function uninstallConnector(orgId: string, installId: string): Promise<void> {
  const res = await authFetch(`${API_URL}/api/marketplace/${orgId}/uninstall/${installId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Uninstall error: ${res.status}`)
}

export async function listInstalled(orgId: string): Promise<InstalledConnector[]> {
  const res = await authFetch(`${API_URL}/api/marketplace/${orgId}/installed`)
  if (!res.ok) return []
  const d = await res.json()
  return Array.isArray(d) ? d : (d.installed ?? [])
}

export async function getConnectorReviews(slug: string): Promise<ConnectorReview[]> {
  const res = await authFetch(`${API_URL}/api/marketplace/connectors/${slug}/reviews`)
  if (!res.ok) return []
  const d = await res.json()
  return Array.isArray(d) ? d : (d.reviews ?? [])
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

function mapPlugin(r: Record<string, unknown>): Plugin {
  return {
    id: (r.id ?? '') as string,
    org_id: (r.org_id ?? r.organization_id ?? '') as string,
    name: (r.name ?? '') as string,
    hook_point: (r.hook_point ?? '') as string,
    webhook_url: (r.endpoint_url ?? r.webhook_url ?? '') as string,
    is_active: (r.is_active ?? false) as boolean,
    config: (r.config ?? {}) as Record<string, unknown>,
    created_at: (r.created_at ?? '') as string,
  }
}

export async function listPlugins(orgId: string, hookPoint?: string): Promise<Plugin[]> {
  const q = hookPoint ? `?hook_point=${hookPoint}` : ''
  const res = await authFetch(`${API_URL}/api/plugins/${orgId}${q}`)
  if (!res.ok) return []
  const d = await res.json()
  const raw = Array.isArray(d) ? d : (d.plugins ?? [])
  return raw.map(mapPlugin)
}

export async function createPlugin(orgId: string, data: {
  name: string; hook_point: string; webhook_url: string; config?: Record<string, unknown>
}): Promise<Plugin> {
  const res = await authFetch(`${API_URL}/api/plugins/${orgId}`, {
    method: 'POST',
    body: JSON.stringify({
      name: data.name,
      hook_point: data.hook_point,
      endpoint_url: data.webhook_url,
      config: data.config,
    }),
  })
  if (!res.ok) throw new Error(`Create plugin error: ${res.status}`)
  const d = await res.json()
  return mapPlugin(d.plugin ?? d)
}

export async function updatePlugin(orgId: string, pluginId: string, data: Partial<{ name: string; is_active: boolean; config: Record<string, unknown> }>): Promise<Plugin> {
  const res = await authFetch(`${API_URL}/api/plugins/${orgId}/${pluginId}`, { method: 'PATCH', body: JSON.stringify(data) })
  if (!res.ok) throw new Error(`Update plugin error: ${res.status}`)
  const d = await res.json()
  return mapPlugin(d.plugin ?? d)
}

export async function deletePlugin(orgId: string, pluginId: string): Promise<void> {
  const res = await authFetch(`${API_URL}/api/plugins/${orgId}/${pluginId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Delete plugin error: ${res.status}`)
}

export async function testPlugin(orgId: string, pluginId: string): Promise<{ success: boolean; response_time_ms: number }> {
  const res = await authFetch(`${API_URL}/api/plugins/${orgId}/${pluginId}/test`, { method: 'POST' })
  if (!res.ok) throw new Error(`Test plugin error: ${res.status}`)
  const d = await res.json()
  const result = d.test_result ?? d
  return {
    success: result.success ?? false,
    response_time_ms: result.response_time_ms ?? 0,
  }
}
