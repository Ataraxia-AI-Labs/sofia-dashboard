import { API_URL, authFetch } from './helpers'
import type { VoiceMetrics } from '@/types'

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
