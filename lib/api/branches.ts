import { API_URL, authFetch } from './helpers'
import type { Branch } from '@/types'

export async function fetchBranches(orgId: string): Promise<Branch[]> {
  try {
    const res = await authFetch(`${API_URL}/api/branches/${orgId}`)
    if (!res.ok) return []
    const data = await res.json()
    return data.branches || data || []
  } catch {
    return []
  }
}
