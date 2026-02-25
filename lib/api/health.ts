import { API_URL, authFetch } from './helpers'
import type { SystemHealth } from '@/types'

export async function fetchSystemHealth(): Promise<SystemHealth> {
  const res = await authFetch(`${API_URL}/health`)
  if (!res.ok) {
    return { status: 'CRITICAL', error: 'No se pudo conectar con el backend' }
  }
  return res.json()
}
