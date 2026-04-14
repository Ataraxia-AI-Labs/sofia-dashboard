import { API_URL, authFetch } from './helpers'
import type {
  ChannelMetrics, ChannelComparison, InboxConversation,
  ConversationMessage, ChannelConfig, ChannelInsight,
} from '@/types'

// ============================================================
// CHANNEL STATUS (existing)
// ============================================================

export interface ChannelStatus {
  whatsapp: { connected: boolean; phone_id?: string }
  instagram: { connected: boolean }
  messenger: { connected: boolean }
  voice: { connected: boolean; phone_number?: string | null; per_clinic?: boolean }
}

export interface ConnectVoiceData {
  account_sid: string
  auth_token: string
  phone_number: string
  transfer_number?: string
}

export async function connectVoice(orgId: string, data: ConnectVoiceData) {
  const res = await authFetch(`${API_URL}/channels/${orgId}/voice`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
    throw new Error(err.detail || `Connect Voice failed: ${res.status}`)
  }
  return res.json()
}

export async function disconnectVoice(orgId: string) {
  const res = await authFetch(`${API_URL}/channels/${orgId}/voice`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
    throw new Error(err.detail || `Disconnect Voice failed: ${res.status}`)
  }
  return res.json()
}

export async function fetchChannelStatus(orgId: string): Promise<ChannelStatus> {
  const res = await authFetch(`${API_URL}/channels/${orgId}/status`)
  if (!res.ok) {
    return {
      whatsapp: { connected: false },
      instagram: { connected: false },
      messenger: { connected: false },
      voice: { connected: false },
    }
  }
  return res.json()
}

export async function connectWhatsApp(orgId: string, data: { phone_number_id: string; api_key: string }) {
  const res = await authFetch(`${API_URL}/channels/${orgId}/whatsapp`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Connect WhatsApp failed: ${res.status}`)
  return res.json()
}

export async function connectWhatsAppEmbedded(orgId: string, code: string) {
  const res = await authFetch(`${API_URL}/channels/${orgId}/whatsapp-embedded`, {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
    throw new Error(errorData.detail || `Embedded signup failed: ${res.status}`)
  }
  return res.json()
}

// ============================================================
// CHANNEL MANAGEMENT (P5-07)
// ============================================================

export async function getChannelMetrics(
  orgId: string,
  period?: string
): Promise<ChannelMetrics[]> {
  let url = `${API_URL}/channels/${orgId}/metrics`
  if (period) url += `?period=${period}`
  const res = await authFetch(url)
  if (!res.ok) return []
  const data = await res.json()
  // Backend returns {channels: {WHATSAPP: {...}, ...}} — convert to array
  if (Array.isArray(data)) return data
  if (data?.channels && typeof data.channels === 'object') {
    return Object.values(data.channels) as ChannelMetrics[]
  }
  return []
}

export async function getChannelComparison(
  orgId: string
): Promise<ChannelComparison | null> {
  const res = await authFetch(`${API_URL}/channels/${orgId}/comparison`)
  if (!res.ok) return null
  const data = await res.json()
  // Backend returns {comparison: [...], top_channel: ...} — normalize to frontend type
  if (data?.comparison) {
    return {
      channels: data.comparison,
      best_by_messages: data.top_channel || '',
      best_by_conversion: data.top_channel || '',
      best_by_revenue: data.top_channel || '',
    }
  }
  return data
}

export async function getUnifiedInbox(
  orgId: string,
  filters?: { channel?: string; unread_only?: boolean }
): Promise<InboxConversation[]> {
  let url = `${API_URL}/channels/${orgId}/inbox`
  const params = new URLSearchParams()
  if (filters?.channel) params.set('channel', filters.channel)
  if (filters?.unread_only) params.set('unread_only', 'true')
  const qs = params.toString()
  if (qs) url += `?${qs}`
  const res = await authFetch(url)
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : data.conversations || []
}

export async function getConversationDetail(
  orgId: string,
  patientId: string
): Promise<ConversationMessage[]> {
  const res = await authFetch(`${API_URL}/channels/${orgId}/conversation/${patientId}`)
  if (!res.ok) return []
  const data = await res.json()

  // Backend returns { messages: [{id, channel, direction, content, ai_response, ...}] }
  // Frontend expects ConversationMessage[] with message_content field
  const rawMessages = Array.isArray(data) ? data : data.messages || []
  const result: ConversationMessage[] = []

  for (const msg of rawMessages) {
    const channel = msg.channel || 'WHATSAPP'
    const direction = msg.direction || 'INBOUND'
    const content = msg.content || msg.raw_content || ''
    const aiResponse = msg.ai_response || ''
    const senderType = msg.sender_type || ''
    const aiAnalysis = msg.ai_analysis || {}
    const isAutomatedBot = senderType === 'BOT' || aiAnalysis?.is_automated === true || !!aiAnalysis?.bot
    const base = { id: msg.id, channel, created_at: msg.created_at || '' }

    const isTakeover = aiResponse?.includes('[Human takeover]')
    const isFailed = aiResponse?.includes('[MENSAJE FALLIDO')

    // Human takeover or failed message: show raw content as single OUTBOUND
    if (direction === 'OUTBOUND' && content && (isTakeover || isFailed)) {
      result.push({
        ...base,
        direction: 'OUTBOUND',
        message_content: content,
        is_human_takeover: true,
        is_failed: !!isFailed,
      })
      continue
    }

    // Bot-initiated OUTBOUND (reminder, hunter, nurse, birthday): show as single OUTBOUND.
    // These messages have direction=OUTBOUND with no preceding patient input.
    if (direction === 'OUTBOUND' && isAutomatedBot) {
      const text = aiResponse || content
      if (text) {
        result.push({ ...base, direction: 'OUTBOUND', message_content: text })
      }
      continue
    }

    // Patient message (INBOUND) — only push if direction is INBOUND OR direction missing
    if (content && direction !== 'OUTBOUND') {
      result.push({ ...base, direction: 'INBOUND', message_content: content })
    }
    // SofIA response (OUTBOUND) — skip internal markers
    if (aiResponse && !isTakeover && !isFailed) {
      result.push({ ...base, id: `${msg.id}-ai`, direction: 'OUTBOUND', message_content: aiResponse })
    }
    // Edge case: OUTBOUND with content but no aiResponse (legacy bot logs that wrote raw_content)
    if (direction === 'OUTBOUND' && content && !aiResponse) {
      result.push({ ...base, direction: 'OUTBOUND', message_content: content })
    }
    // Fallback: empty message
    if (!content && !aiResponse) {
      result.push({ ...base, direction: direction as 'INBOUND' | 'OUTBOUND', message_content: '' })
    }
  }

  return result
}

export async function getChannelConfig(
  orgId: string
): Promise<ChannelConfig[]> {
  const res = await authFetch(`${API_URL}/channels/${orgId}/config`)
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : data.channels || []
}

export async function updateChannelConfig(
  orgId: string,
  channel: string,
  config: Partial<ChannelConfig>
): Promise<ChannelConfig | null> {
  const res = await authFetch(`${API_URL}/channels/${orgId}/config/${channel}`, {
    method: 'PATCH',
    body: JSON.stringify(config),
  })
  if (!res.ok) return null
  return res.json()
}

export async function getChannelInsights(
  orgId: string
): Promise<ChannelInsight | null> {
  const res = await authFetch(`${API_URL}/channels/${orgId}/insights`)
  if (!res.ok) return null
  const data = await res.json()
  if (data?.error) return null

  // Backend returns { insights: [{title, observation, recommendation, impact}], generated_at }
  // Frontend needs { insight: string, insights: [...], generated_at }
  const items = data.insights || []
  const insight = items.map((i: { title: string; observation: string; recommendation: string; impact: string }) =>
    `**${i.title}**\n${i.observation}\n→ ${i.recommendation}${i.impact ? ` (${i.impact})` : ''}`
  ).join('\n\n') || data.insight || ''

  return {
    insight,
    insights: items,
    generated_at: data.generated_at || new Date().toISOString(),
  }
}

export async function suggestRedirect(
  orgId: string,
  data: { patient_id: string; from_channel: string; reason: string }
): Promise<{ suggestion: string } | null> {
  const res = await authFetch(`${API_URL}/channels/${orgId}/suggest-redirect`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) return null
  return res.json()
}
