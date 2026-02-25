import { API_URL, authFetch } from './helpers'

export async function fetchBusinessHours(orgId: string) {
  const res = await authFetch(`${API_URL}/business-hours/${orgId}`)
  if (!res.ok) return []
  return res.json()
}

export async function updateBusinessHour(hourId: string, data: Record<string, unknown>) {
  const res = await authFetch(`${API_URL}/business-hours/${hourId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Update business hour error: ${res.status}`)
}
