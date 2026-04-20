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
