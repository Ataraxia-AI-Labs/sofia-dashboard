import { API_URL, authFetch } from './helpers'

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
