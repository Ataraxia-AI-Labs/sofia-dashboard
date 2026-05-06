import { API_URL, authFetch, unwrapArray, withBranch } from './helpers'
import type { InteractionLog, InteractionAnnotation } from '@/types'

// Backend ai_analysis.sentiment can be a number (-1.0 to 1.0) OR a string label
// ("NEUTRAL", "POSITIVE", "VERY_POSITIVE", "NEGATIVE", "URGENT", etc.)
const LABEL_TO_SCORE: Record<string, number> = {
  VERY_POSITIVE: 0.8, POSITIVE: 0.5, NEUTRAL: 0, NEGATIVE: -0.5,
  WORRIED: -0.3, APOLOGETIC: -0.2, URGENT: -0.6,
}

function parseSentimentScore(score: unknown, sentiment: unknown): number {
  if (typeof score === 'number' && !isNaN(score)) return score
  if (typeof sentiment === 'number' && !isNaN(sentiment)) return sentiment
  if (typeof sentiment === 'string') {
    const num = parseFloat(sentiment)
    if (!isNaN(num)) return num
    return LABEL_TO_SCORE[sentiment.toUpperCase()] ?? 0
  }
  return 0
}

function parseSentimentLabel(label: unknown, sentiment: unknown): string {
  if (typeof label === 'string' && label !== '' && label !== 'NEUTRAL') return label
  // Derive from sentiment value
  const score = parseSentimentScore(null, sentiment)
  if (score >= 0.3) return 'POSITIVE'
  if (score <= -0.3) return 'NEGATIVE'
  if (typeof sentiment === 'string' && sentiment !== '') return sentiment.toUpperCase()
  return 'NEUTRAL'
}

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
  // Backend may return { interactions: [...] } or raw array
  const raw = unwrapArray<Record<string, unknown>>(await res.json(), 'interactions', 'logs')

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
      sentiment_score: parseSentimentScore(item.sentiment_score, item.sentiment),
      sentiment_label: parseSentimentLabel(item.sentiment_label, item.sentiment),
      tools_used: (item.tools_used || []) as string[],
      tokens_used: (item.tokens_used || 0) as number,
      cost_usd: (item.cost_usd || 0) as number,
      response_time_ms: (item.response_time_ms || 0) as number,
      conversation_id: (item.conversation_id || '') as string,
      created_at: (item.created_at || '') as string,
      annotation: (item.annotation || null) as InteractionAnnotation | null,
      patients: (item.patients || (item.patient_name ? { full_name: item.patient_name, phone: item.patient_phone || '' } : undefined)) as InteractionLog['patients'],
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
    const rowDirection = (item.direction || 'INBOUND') as string

    // S153: voice calls (Vapi engine) store the full call transcript inside
    // raw_content as alternating "AI: ...\nUser: ..." lines. Split it into
    // proper AI/User bubbles so the operator sees the actual conversation
    // instead of the "[Vapi voice response]" placeholder.
    const aiAnalysis = (item.ai_analysis || {}) as Record<string, unknown>
    const isVoiceCall = (item.platform === 'VOICE_CALL' || item.content_type === 'AUDIO')
    const looksLikeVapiTranscript =
      isVoiceCall && /^(AI|User|sofia|paciente):\s/im.test(rawContent)
    if (looksLikeVapiTranscript) {
      const lines = rawContent.split(/\n+/)
      let buffer: { speaker: 'AI' | 'User'; text: string } | null = null
      let turnIdx = 0
      const flush = () => {
        if (buffer && buffer.text.trim()) {
          messages.push({
            ...base,
            id: `${item.id}-${turnIdx++}`,
            direction: buffer.speaker === 'User' ? 'INBOUND' : 'OUTBOUND',
            message_content: buffer.text.trim(),
          })
        }
        buffer = null
      }
      for (const line of lines) {
        const m = /^(AI|User|sofia|paciente):\s*(.*)$/i.exec(line)
        if (m) {
          flush()
          const sp = /user|paciente/i.test(m[1]) ? 'User' : 'AI'
          buffer = { speaker: sp, text: m[2] }
        } else if (buffer) {
          // Continuation line for the current speaker
          buffer.text += '\n' + line
        }
      }
      flush()
      // If we successfully extracted at least one turn we're done with this row
      if (turnIdx > 0) {
        // Tag the call duration on the first turn for the UI to render
        const dur = aiAnalysis.duration_seconds
        if (typeof dur === 'number' && messages.length > 0) {
          (messages[messages.length - turnIdx] as InteractionLog & { duration_seconds?: number }).duration_seconds = dur
        }
        continue
      }
      // Fallback: empty Vapi transcript -> render placeholder once
    }

    // Human takeover: direction is OUTBOUND and ai_response marks [Human takeover]
    // Failed outbound: direction is OUTBOUND and ai_response marks [MENSAJE FALLIDO]
    // Only takeover messages are labeled as "Doctor"; failed bot messages stay as "SofIA"
    const isTakeover = aiResponse?.includes('[Human takeover]')
    const isFailed = aiResponse?.includes('[MENSAJE FALLIDO')
    if (rowDirection === 'OUTBOUND' && rawContent && (isTakeover || isFailed)) {
      messages.push({
        ...base,
        direction: 'OUTBOUND',
        message_content: rawContent,
        is_human_takeover: !!isTakeover,
        is_failed: !!isFailed,
      })
    } else {
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
