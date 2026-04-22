import { API_URL, authFetch } from '../supabase'

export interface ConsoleHistoryItem {
  role: 'user' | 'assistant'
  content: string
}

export interface ConsoleAskRequest {
  org_id: string
  branch_id?: string | null
  message: string
  history?: ConsoleHistoryItem[]
  session_id?: string | null
  persist?: boolean
}

export interface ConsoleArtifact {
  type: 'metric_tiles' | 'table' | 'funnel' | 'list' | 'chart' | 'note'
  title?: string
  data: unknown
  meta?: Record<string, unknown>
}

export interface ConsoleAskResponse {
  narrative: string
  artifacts: ConsoleArtifact[]
  meta: {
    model: string
    iterations: number
    tools_used: string[]
    total_ms: number
    usage?: Record<string, unknown>
    truncated?: boolean
  }
  session_id?: string | null
}

export interface ConsoleSession {
  id: string
  organization_id: string
  user_id: string
  title: string | null
  branch_id: string | null
  last_message_at: string | null
  message_count: number
  hidden_for_user: boolean
  archived_at: string | null
  created_at: string
}

export interface ConsoleMessageRecord {
  id: string
  role: 'user' | 'assistant'
  content: string
  artifacts?: ConsoleArtifact[]
  tools_used?: string[]
  created_at: string
  actor_email?: string
  actor_role?: string
}

export async function askConsole(req: ConsoleAskRequest): Promise<ConsoleAskResponse> {
  const res = await authFetch(`${API_URL}/console/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Console ${res.status}${text ? `: ${text}` : ''}`)
  }
  return res.json()
}

export async function listConsoleSessions(params: {
  scope?: 'mine' | 'team'
  include_archived?: boolean
  limit?: number
} = {}): Promise<{ sessions: ConsoleSession[]; scope: 'mine' | 'team' }> {
  const qs = new URLSearchParams()
  if (params.scope) qs.set('scope', params.scope)
  if (params.include_archived) qs.set('include_archived', 'true')
  if (params.limit) qs.set('limit', String(params.limit))
  const url = `${API_URL}/console/sessions${qs.toString() ? `?${qs}` : ''}`
  const res = await authFetch(url)
  if (!res.ok) throw new Error(`Sessions ${res.status}`)
  return res.json()
}

export async function getConsoleMessages(sessionId: string): Promise<{ session: ConsoleSession; messages: ConsoleMessageRecord[] }> {
  const res = await authFetch(`${API_URL}/console/sessions/${sessionId}/messages`)
  if (!res.ok) throw new Error(`Messages ${res.status}`)
  return res.json()
}

export async function patchConsoleSession(
  sessionId: string,
  body: { org_id: string; title?: string; hidden_for_user?: boolean; archived?: boolean },
): Promise<ConsoleSession> {
  const res = await authFetch(`${API_URL}/console/sessions/${sessionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Patch session ${res.status}`)
  return res.json()
}

export async function deleteConsoleSession(sessionId: string): Promise<void> {
  const res = await authFetch(`${API_URL}/console/sessions/${sessionId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Delete session ${res.status}`)
}
