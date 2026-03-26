import { API_URL, authFetch } from './helpers'
import type {
  VoiceMetrics, CallRecord, TranscriptionSegment,
  CallEvent, VoiceAnalytics,
} from '@/types'

// ============================================================
// VOICE METRICS (existing)
// ============================================================

export async function fetchVoiceMetrics(orgId: string, days: number = 30, _branchId?: string | null): Promise<VoiceMetrics> {
  const res = await authFetch(`${API_URL}/voice/${orgId}/metrics?dias=${days}`)
  if (!res.ok) {
    return {
      total_calls: 0,
      total_whatsapp: 0,
      avg_duration_seconds: 0,
      appointments_by_voice: 0,
      appointments_by_whatsapp: 0,
      voice_pct: 0,
    }
  }
  return res.json()
}

// ============================================================
// VOICE AI MULTIMODAL (P5-10)
// ============================================================

export async function sendCrossModal(
  orgId: string,
  data: { patient_id: string; call_id: string; content_type: string; content: string }
): Promise<{ success: boolean } | null> {
  const res = await authFetch(`${API_URL}/voice/${orgId}/cross-modal`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) return null
  return res.json()
}

export async function getCallHistory(
  orgId: string,
  patientId?: string
): Promise<CallRecord[]> {
  let url = `${API_URL}/voice/${orgId}/calls`
  if (patientId) url += `?patient_id=${patientId}`
  const res = await authFetch(url)
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : data.calls || []
}

export async function getCallDetail(
  orgId: string,
  callId: string
): Promise<{ call: CallRecord; transcription: TranscriptionSegment[] } | null> {
  const res = await authFetch(`${API_URL}/voice/${orgId}/calls/${callId}`)
  if (!res.ok) return null
  return res.json()
}

export async function generateCallSummary(
  orgId: string,
  callId: string
): Promise<CallRecord | null> {
  const res = await authFetch(`${API_URL}/voice/${orgId}/calls/${callId}/summary`, {
    method: 'POST',
  })
  if (!res.ok) return null
  return res.json()
}

export async function getVoiceAnalytics(
  orgId: string,
  period?: string
): Promise<VoiceAnalytics | null> {
  let url = `${API_URL}/voice/${orgId}/analytics`
  if (period) url += `?period=${period}`
  const res = await authFetch(url)
  if (!res.ok) return null
  return res.json()
}

export async function getCallEvents(
  orgId: string,
  callId: string
): Promise<CallEvent[]> {
  const res = await authFetch(`${API_URL}/voice/${orgId}/calls/${callId}/events`)
  if (!res.ok) return []
  return res.json()
}
