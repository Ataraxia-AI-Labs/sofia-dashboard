import { API_URL, authFetch, unwrapArray } from './helpers'
import type { Branch } from '@/types'

export async function fetchBranches(orgId: string): Promise<Branch[]> {
  try {
    const res = await authFetch(`${API_URL}/api/branches/${orgId}`)
    if (!res.ok) return []
    return unwrapArray<Branch>(await res.json(), 'branches')
  } catch {
    return []
  }
}
