import { API_URL, authFetch } from './helpers'
import type {
  PatientSegment,
  CampaignSuggestion,
  ClusteringResult,
  EmbeddingsResult,
  SimilarPatient,
} from '@/types'

// ============================================================
// PATIENT SEGMENTATION API (P4-04)
// ============================================================

export async function generateEmbeddings(orgId: string): Promise<EmbeddingsResult | null> {
  const res = await authFetch(`${API_URL}/segments/${orgId}/generate-embeddings`, {
    method: 'POST',
  })
  if (!res.ok) return null
  return res.json()
}

export async function runClustering(orgId: string, nClusters?: number): Promise<ClusteringResult | null> {
  const url = nClusters
    ? `${API_URL}/segments/${orgId}/cluster?n_clusters=${nClusters}`
    : `${API_URL}/segments/${orgId}/cluster`
  const res = await authFetch(url, { method: 'POST' })
  if (!res.ok) return null
  return res.json()
}

export async function getSegments(orgId: string): Promise<PatientSegment[]> {
  const res = await authFetch(`${API_URL}/segments/${orgId}/segments`)
  if (!res.ok) return []
  const data = await res.json()
  // Backend wraps the list as { segments: [...], count: N }. Unwrap defensively.
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.segments)) return data.segments
  return []
}

export async function getPatientSegment(orgId: string, patientId: string): Promise<PatientSegment | null> {
  const res = await authFetch(`${API_URL}/segments/${orgId}/patient/${patientId}`)
  if (!res.ok) return null
  return res.json()
}

export async function findSimilarPatients(orgId: string, patientId: string, limit: number = 10): Promise<SimilarPatient[]> {
  const res = await authFetch(`${API_URL}/segments/${orgId}/similar/${patientId}?limit=${limit}`)
  if (!res.ok) return []
  return res.json()
}

export async function getCampaignSuggestion(orgId: string, segmentId: string): Promise<CampaignSuggestion | null> {
  const res = await authFetch(`${API_URL}/segments/${orgId}/campaign-suggestion/${segmentId}`, {
    method: 'POST',
  })
  if (!res.ok) return null
  return res.json()
}
