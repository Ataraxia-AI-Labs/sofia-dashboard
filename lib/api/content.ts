import { API_URL, authFetch, unwrapArray } from './helpers'

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

function mapContentItem(r: Record<string, unknown>): ContentItem {
  const perf = r.performance as Record<string, number> | null
  return {
    id: (r.id ?? '') as string,
    org_id: (r.org_id ?? r.organization_id ?? '') as string,
    platform: (r.platform ?? r.content_type ?? '') as string,
    content_type: (r.content_type ?? r.platform ?? '') as string,
    title: (r.title ?? r.topic ?? '') as string,
    body: (r.body ?? r.body_text ?? '') as string,
    media_url: (r.media_url ?? null) as string | null,
    status: (r.status ?? 'DRAFT') as ContentItem['status'],
    scheduled_at: (r.scheduled_at ?? null) as string | null,
    published_at: (r.published_at ?? null) as string | null,
    performance: perf ? {
      likes: perf.likes ?? 0,
      shares: perf.shares ?? 0,
      reach: perf.reach ?? 0,
      engagement_rate: perf.engagement_rate ?? 0,
    } : null,
    created_at: (r.created_at ?? '') as string,
  }
}

export async function listContent(orgId: string): Promise<ContentItem[]> {
  const res = await authFetch(`${API_URL}/api/growth/engagement/${orgId}/content`)
  if (!res.ok) return []
  const raw = unwrapArray<Record<string, unknown>>(await res.json(), 'content', 'posts')
  return raw.map(mapContentItem)
}

export async function createContent(orgId: string, data: {
  platform: string; content_type: string; title: string; body: string; media_url?: string; scheduled_at?: string
}): Promise<ContentItem> {
  const res = await authFetch(`${API_URL}/api/growth/engagement/${orgId}/content`, {
    method: 'POST',
    body: JSON.stringify({
      content_type: data.content_type || data.platform,
      topic: data.title,
      body_text: data.body,
      tone: 'professional',
      media_url: data.media_url,
      scheduled_at: data.scheduled_at,
    }),
  })
  if (!res.ok) throw new Error(`Create content error: ${res.status}`)
  const d = await res.json()
  return mapContentItem(d.content ?? d)
}

export async function updateContent(orgId: string, contentId: string, data: Partial<ContentItem>): Promise<ContentItem> {
  const res = await authFetch(`${API_URL}/api/growth/engagement/${orgId}/content/${contentId}`, {
    method: 'PATCH', body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Update content error: ${res.status}`)
  const d = await res.json()
  return mapContentItem(d.content ?? d)
}

export async function getContentAnalytics(orgId: string): Promise<Record<string, unknown>> {
  const res = await authFetch(`${API_URL}/api/growth/engagement/${orgId}/content/analytics`)
  if (!res.ok) return {}
  const d = await res.json()
  return d.analytics ?? d
}

export async function suggestTopics(orgId: string): Promise<string[]> {
  const res = await authFetch(`${API_URL}/api/growth/engagement/${orgId}/content/suggest-topics`, { method: 'POST' })
  if (!res.ok) return []
  const raw = unwrapArray<string | Record<string, unknown>>(await res.json(), 'topics', 'suggestions')
  // Backend may return [{topic, content_type, rationale}] — extract topic strings
  return raw.map((item: string | Record<string, unknown>) =>
    typeof item === 'string' ? item : ((item.topic ?? item.title ?? '') as string)
  )
}

export async function getContentCalendar(orgId: string): Promise<Record<string, unknown>> {
  const res = await authFetch(`${API_URL}/api/growth/engagement/${orgId}/content/calendar`, { method: 'POST' })
  if (!res.ok) return {}
  const d = await res.json()
  return d.calendar ?? d
}
