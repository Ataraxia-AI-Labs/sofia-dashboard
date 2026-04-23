import { API_URL, authFetch, unwrapArray, withBranch } from './helpers'
import type { PipelinePatient } from '@/types'

export async function fetchPipelineData(orgId: string, branchId?: string | null): Promise<PipelinePatient[]> {
  let url = `${API_URL}/pipeline/${orgId}`
  url = withBranch(url, branchId)
  const res = await authFetch(url)
  if (!res.ok) return []
  return unwrapArray<PipelinePatient>(await res.json(), 'pipeline', 'patients')
}
