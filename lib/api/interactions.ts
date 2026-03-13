import { API_URL, authFetch, withBranch } from './helpers'
import type { InteractionLog, InteractionAnnotation } from '@/types'

export async function fetchInteractions(orgId: string, opts?: {
  limit?: number
  offset?: number
  patient_id?: string
  channel?: string
  from?: string
  to?: string
  branchId?: string | null
}): Promise<InteractionLog[]> {
  const params = new URLSearchParams()
  if (opts?.limit) params.set('limit', String(opts.limit))
  if (opts?.offset) params.set('offset', String(opts.offset))
  if (opts?.patient_id) params.set('patient_id', opts.patient_id)
  if (opts?.channel) params.set('channel', opts.channel)
  if (opts?.from) params.set('from', opts.from)
  if (opts?.to) params.set('to', opts.to)

  let url = `${API_URL}/interactions/${orgId}?${params.toString()}`
  url = withBranch(url, opts?.branchId)

  const res = await authFetch(url)
  if (!res.ok) return []
  const data = await res.json()
  // Backend may return { interactions: [...] } or raw array
  const raw: Record<string, unknown>[] = Array.isArray(data) ? data : (data.interactions || data.data || [])

  // Transform backend fields to match InteractionLog type.
  // Backend returns: platform, raw_content, ai_response, sentiment
  // Frontend expects: channel, message_content, sentiment_score
  // Each DB row may contain both patient message (raw_content) and AI response (ai_response).
  // We split into separate INBOUND/OUTBOUND messages for the conversation view.
  const messages: InteractionLog[] = []
  for (const item of raw) {
    const base = {
      id: item.id as string,
      organization_id: (item.organization_id || '') as string,
      patient_id: (item.patient_id || '') as string,
      channel: (item.channel || item.platform || 'WHATSAPP') as string,
      intent: (item.intent || '') as string,
      sentiment_score: (item.sentiment_score ?? item.sentiment ?? 0) as number,
      sentiment_label: (item.sentiment_label || 'NEUTRAL') as string,
      tools_used: (item.tools_used || []) as string[],
      tokens_used: (item.tokens_used || 0) as number,
      cost_usd: (item.cost_usd || 0) as number,
      response_time_ms: (item.response_time_ms || 0) as number,
      conversation_id: (item.conversation_id || '') as string,
      created_at: (item.created_at || '') as string,
      annotation: (item.annotation || null) as InteractionAnnotation | null,
      patients: item.patients as InteractionLog['patients'],
    }

    // If backend already returns message_content + direction, use as-is
    if (item.message_content != null) {
      messages.push({
        ...base,
        direction: (item.direction || 'INBOUND') as 'INBOUND' | 'OUTBOUND',
        message_content: item.message_content as string,
      })
      continue
    }

    // Otherwise split raw_content (patient) and ai_response (bot) into separate messages
    const rawContent = (item.raw_content || '') as string
    const aiResponse = (item.ai_response || '') as string

    if (rawContent) {
      messages.push({
        ...base,
        direction: 'INBOUND',
        message_content: rawContent,
      })
    }
    if (aiResponse) {
      messages.push({
        ...base,
        id: `${item.id}-ai`,
        direction: 'OUTBOUND',
        message_content: aiResponse,
        response_time_ms: (item.response_time_ms || 0) as number,
      })
    }
    // If neither exists, still add a placeholder
    if (!rawContent && !aiResponse) {
      messages.push({
        ...base,
        direction: (item.direction || 'INBOUND') as 'INBOUND' | 'OUTBOUND',
        message_content: '',
      })
    }
  }
  return messages
}

// ============================================================
// ANNOTATIONS (P4-06)
// ============================================================

export async function annotateInteraction(
  orgId: string,
  interactionId: string,
  rating: 'thumbs_up' | 'thumbs_down',
  notes?: string,
): Promise<{ ok: boolean }> {
  const res = await authFetch(`${API_URL}/interactions/${orgId}/${interactionId}/annotate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating, notes }),
  })
  if (!res.ok) return { ok: false }
  return res.json()
}

export async function removeAnnotation(
  orgId: string,
  interactionId: string,
): Promise<{ ok: boolean }> {
  const res = await authFetch(`${API_URL}/interactions/${orgId}/${interactionId}/annotate`, {
    method: 'DELETE',
  })
  if (!res.ok) return { ok: false }
  return res.json()
}

export async function fetchAnnotationStats(orgId: string): Promise<{
  total: number
  thumbs_up: number
  thumbs_down: number
  approval_rate: number
}> {
  const res = await authFetch(`${API_URL}/interactions/${orgId}/annotations/stats`)
  if (!res.ok) return { total: 0, thumbs_up: 0, thumbs_down: 0, approval_rate: 0 }
  return res.json()
}

// Re-export the type from types/index.ts for backward compatibility
export type { InteractionLog } from '@/types'
