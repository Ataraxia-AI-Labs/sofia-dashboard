import { API_URL, authFetch, unwrapArray, withBranch } from './helpers'
import type { DataLakeStats, DataLakeExportResult } from '@/types'

export async function fetchDataLakeStats(orgId: string, branchId?: string | null): Promise<DataLakeStats | null> {
  let url = `${API_URL}/data-lake/${orgId}/stats`
  url = withBranch(url, branchId)
  const res = await authFetch(url)
  if (!res.ok) return null
  return res.json()
}

export async function fetchDataLakeDaily(orgId: string, days: number = 30): Promise<{ date: string; count: number }[]> {
  const res = await authFetch(`${API_URL}/data-lake/${orgId}/daily?dias=${days}`)
  if (!res.ok) return []
  return unwrapArray<{ date: string; count: number }>(await res.json(), 'daily', 'days')
}

export async function fetchTrainingReadyCount(orgId: string): Promise<number> {
  const res = await authFetch(`${API_URL}/data-lake/${orgId}/training-ready-count`)
  if (!res.ok) return 0
  return res.json()
}

export async function exportDataLakeJSONL(orgId: string, opts?: {
  product?: string
  min_quality?: number
  balance_intents?: boolean
}): Promise<DataLakeExportResult | null> {
  const res = await authFetch(`${API_URL}/data-lake/${orgId}/export-jsonl`, {
    method: 'POST',
    body: JSON.stringify({
      product: opts?.product || 'SOFIA',
      min_quality: opts?.min_quality ?? 0.7,
      balance_intents: opts?.balance_intents ?? true,
    }),
  })
  if (!res.ok) return null
  return res.json()
}
