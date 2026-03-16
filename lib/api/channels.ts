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
  voice: { connected: boolean }
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
  return res.json()
}

export async function getChannelComparison(
  orgId: string
): Promise<ChannelComparison | null> {
  const res = await authFetch(`${API_URL}/channels/${orgId}/comparison`)
  if (!res.ok) return null
  return res.json()
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
  return res.json()
}

export async function getConversationDetail(
  orgId: string,
  patientId: string
): Promise<ConversationMessage[]> {
  const res = await authFetch(`${API_URL}/channels/${orgId}/conversation/${patientId}`)
  if (!res.ok) return []
  return res.json()
}

export async function getChannelConfig(
  orgId: string
): Promise<ChannelConfig[]> {
  const res = await authFetch(`${API_URL}/channels/${orgId}/config`)
  if (!res.ok) return []
  return res.json()
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
  return res.json()
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
