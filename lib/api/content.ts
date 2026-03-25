import { API_URL, authFetch } from './helpers'

export interface ContentItem {
  id: string
  org_id: string
  platform: string
  content_type: string
  title: string
  body: string
  media_url: string | null
  status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED'
  scheduled_at: string | null
  published_at: string | null
  performance: { likes: number; shares: number; reach: number; engagement_rate: number } | null
  created_at: string
}

export async function listContent(orgId: string): Promise<ContentItem[]> {
  const res = await authFetch(`${API_URL}/api/growth/engagement/${orgId}/content`)
  if (!res.ok) return []
  return res.json()
}

export async function createContent(orgId: string, data: {
  platform: string; content_type: string; title: string; body: string; media_url?: string; scheduled_at?: string
}): Promise<ContentItem> {
  const res = await authFetch(`${API_URL}/api/growth/engagement/${orgId}/content`, {
    method: 'POST', body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Create content error: ${res.status}`)
  return res.json()
}

export async function updateContent(orgId: string, contentId: string, data: Partial<ContentItem>): Promise<ContentItem> {
  const res = await authFetch(`${API_URL}/api/growth/engagement/${orgId}/content/${contentId}`, {
    method: 'PATCH', body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Update content error: ${res.status}`)
  return res.json()
}

export async function getContentAnalytics(orgId: string): Promise<Record<string, unknown>> {
  const res = await authFetch(`${API_URL}/api/growth/engagement/${orgId}/content/analytics`)
  if (!res.ok) return {}
  return res.json()
}

export async function suggestTopics(orgId: string): Promise<string[]> {
  const res = await authFetch(`${API_URL}/api/growth/engagement/${orgId}/content/suggest-topics`, { method: 'POST' })
  if (!res.ok) return []
  return res.json()
}

export async function getContentCalendar(orgId: string): Promise<Record<string, unknown>> {
  const res = await authFetch(`${API_URL}/api/growth/engagement/${orgId}/content/calendar`, { method: 'POST' })
  if (!res.ok) return {}
  return res.json()
}
