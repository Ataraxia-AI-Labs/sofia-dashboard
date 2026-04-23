import { API_URL, authFetch, unwrapArray } from './helpers'

// ============================================================
// PROMPT OPTIMIZER API (P4-08)
// Analyze conversations and suggest prompt improvements
// ============================================================

export type SuggestionStatus = 'PENDING' | 'APPLIED' | 'REJECTED'

export interface PromptSuggestion {
  id: string
  organization_id: string
  current_prompt: string
  suggested_prompt: string
  reasoning: string
  confidence_score: number
  patterns_analyzed: number
  status: SuggestionStatus
  applied_at?: string
  rejected_at?: string
  created_at: string
}

export interface AnalysisResult {
  message: string
  suggestions_count: number
  patterns_analyzed: number
}

/**
 * Trigger prompt analysis based on recent conversations.
 * POST /prompt-optimizer/{org_id}/analyze
 */
export async function triggerPromptAnalysis(orgId: string): Promise<AnalysisResult | null> {
  const res = await authFetch(`${API_URL}/prompt-optimizer/${orgId}/analyze`, {
    method: 'POST',
    timeoutMs: 60000, // Analysis can take longer
  })
  if (!res.ok) return null
  return res.json()
}

/**
 * Fetch all prompt suggestions for an organization.
 * GET /prompt-optimizer/{org_id}/suggestions
 */
export async function getPromptSuggestions(orgId: string): Promise<PromptSuggestion[]> {
  const res = await authFetch(`${API_URL}/prompt-optimizer/${orgId}/suggestions`)
  if (!res.ok) return []
  return unwrapArray<PromptSuggestion>(await res.json(), 'suggestions')
}

/**
 * Update a prompt suggestion's status (apply or reject).
 * PATCH /prompt-optimizer/{org_id}/suggestions/{suggestion_id}
 */
export async function updatePromptSuggestion(
  orgId: string,
  suggestionId: string,
  status: 'APPLIED' | 'REJECTED',
): Promise<{ ok: boolean }> {
  const res = await authFetch(`${API_URL}/prompt-optimizer/${orgId}/suggestions/${suggestionId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
  if (!res.ok) return { ok: false }
  return res.json()
}
