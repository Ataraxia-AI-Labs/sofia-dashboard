import { API_URL, authFetch, unwrapArray } from './helpers'
import type {
  ChannelMetrics, ChannelComparison, InboxConversation,
  ConversationMessage, ChannelConfig,
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

// ── S134 WhatsApp number SMS migration / OTP verification ─────────
// Three-step Meta Cloud API flow to migrate a number INTO Cloud API:
//   1. requestWhatsAppOTP   → Meta sends SMS or VOICE OTP
//   2. verifyWhatsAppOTP    → submit the OTP back to Meta
//   3. registerWhatsAppCloud → register with Cloud API + 6-digit 2FA PIN
// Plus sendWhatsAppTestMessage to verify the registration end-to-end.

async function _postJson(url: string, body: unknown): Promise<Record<string, unknown>> {
  const res = await authFetch(url, { method: 'POST', body: JSON.stringify(body) })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
    throw new Error(errorData.detail || `Request failed: ${res.status}`)
  }
  return res.json()
}

export function requestWhatsAppOTP(
  orgId: string,
  data: { code_method: 'SMS' | 'VOICE'; language?: string },
) {
  return _postJson(`${API_URL}/channels/${orgId}/whatsapp/request-otp`, {
    code_method: data.code_method,
    language: data.language ?? 'es',
  })
}

export function verifyWhatsAppOTP(orgId: string, code: string) {
  return _postJson(`${API_URL}/channels/${orgId}/whatsapp/verify-otp`, { code })
}

export function registerWhatsAppCloud(orgId: string, pin: string) {
  return _postJson(`${API_URL}/channels/${orgId}/whatsapp/register-cloud`, { pin })
}

export function sendWhatsAppTestMessage(
  orgId: string,
  data: { to_phone: string; template_name?: string; template_language?: string },
) {
  return _postJson(`${API_URL}/channels/${orgId}/whatsapp/test-message`, {
    to_phone: data.to_phone,
    template_name: data.template_name ?? 'hello_world',
    template_language: data.template_language ?? 'en_US',
  })
}

// ============================================================
// INSTAGRAM + MESSENGER (manual connect — Meta TP approval pending)
// ============================================================

export interface ConnectMetaPageData {
  page_id: string
  page_access_token: string
  instagram_business_account_id?: string
}

async function connectMetaChannel(
  orgId: string,
  channel: 'instagram' | 'messenger',
  data: ConnectMetaPageData,
) {
  const res = await authFetch(`${API_URL}/channels/${orgId}/${channel}`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
    throw new Error(err.detail || `Connect ${channel} failed: ${res.status}`)
  }
  return res.json()
}

async function disconnectMetaChannel(orgId: string, channel: 'instagram' | 'messenger') {
  const res = await authFetch(`${API_URL}/channels/${orgId}/${channel}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
    throw new Error(err.detail || `Disconnect ${channel} failed: ${res.status}`)
  }
  return res.json()
}

export const connectInstagram = (orgId: string, data: ConnectMetaPageData) =>
  connectMetaChannel(orgId, 'instagram', data)
export const connectMessenger = (orgId: string, data: ConnectMetaPageData) =>
  connectMetaChannel(orgId, 'messenger', data)
export const disconnectInstagram = (orgId: string) => disconnectMetaChannel(orgId, 'instagram')
export const disconnectMessenger = (orgId: string) => disconnectMetaChannel(orgId, 'messenger')

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
  // Backend returns {comparison: [...], top_channel: ...} where top_channel
  // is a single composite winner (volume + reach + conversion blend).
  // S153: do NOT alias that one channel into all three best_by_* slots —
  // the channels-panel computes per-metric winners locally with a sample
  // size guard. Leave the slots empty here; the panel ignores them.
  if (data?.comparison) {
    return {
      channels: data.comparison,
      best_by_messages: '',
      best_by_conversion: '',
      best_by_revenue: '',
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
  return unwrapArray<InboxConversation>(await res.json(), 'conversations', 'inbox')
}

export async function getConversationDetail(
  orgId: string,
  patientId: string
): Promise<ConversationMessage[]> {
  const res = await authFetch(`${API_URL}/channels/${orgId}/conversation/${patientId}`)
  if (!res.ok) return []
  const data = await res.json()

  // Backend returns { messages: [{id, channel, direction, content, ai_response, ...}] }
  // Frontend expects ConversationMessage[] with message_content field.
  // Loose typing — each message has 10+ diagnostic fields transformed inline below.

  const rawMessages: any[] = unwrapArray<any>(data, 'messages')
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
  return unwrapArray<ChannelConfig>(await res.json(), 'channels', 'configs')
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

// S145: getChannelInsights removed (CEO directive). Generic GPT advice
// burned tokens without offering any clinical action. The patient-level
// proactive queue at /dashboard/inteligencia covers actionable signals.

export async function suggestRedirect(
  orgId: string,
  // Backend SuggestRedirectRequest expects `current_channel` (validated against
  // {WHATSAPP, INSTAGRAM, WEBCHAT, VOICE}) and `needed_action`. Renamed from
  // `from_channel`/`reason` to match models.py — S93 audit finding.
  data: { patient_id: string; current_channel: string; needed_action: string }
): Promise<{ suggestion: string } | null> {
  const res = await authFetch(`${API_URL}/channels/${orgId}/suggest-redirect`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) return null
  return res.json()
}
