import { API_URL, authFetch, unwrapArray } from './helpers'
import type {
  PatientSegment,
  SegmentPatient,
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
  const body = await res.json()
  // Backend wraps response as {result: {total, generated, errors, org_id}}. Unwrap + synthesize message.
  const data = (body && typeof body === 'object' && body.result) ? body.result : body
  if (data && typeof data === 'object' && !data.message) {
    const g = data.generated ?? 0, e = data.errors ?? 0, t = data.total ?? g
    data.message = e > 0
      ? `${g} de ${t} pacientes procesados (${e} errores)`
      : `${g} pacientes con huella generada`
  }
  return data
}

export async function runClustering(orgId: string, nClusters?: number): Promise<ClusteringResult | null> {
  const url = nClusters
    ? `${API_URL}/segments/${orgId}/cluster?n_clusters=${nClusters}`
    : `${API_URL}/segments/${orgId}/cluster`
  const res = await authFetch(url, { method: 'POST' })
  if (!res.ok) return null
  const body = await res.json()
  const data = (body && typeof body === 'object' && body.result) ? body.result : body
  if (data && typeof data === 'object' && !data.message) {
    const c = Array.isArray(data.clusters) ? data.clusters.length : (data.n_clusters ?? 0)
    const t = data.total ?? 0
    data.message = c > 0
      ? `${c} tribus detectadas sobre ${t} pacientes`
      : 'No hay embeddings aún — genera las huellas primero'
  }
  return data
}

export async function getSegments(orgId: string): Promise<PatientSegment[]> {
  const res = await authFetch(`${API_URL}/segments/${orgId}/segments`)
  if (!res.ok) return []
  return unwrapArray<PatientSegment>(await res.json(), 'segments')
}

// S154: el panel de Segmentos abría el detalle de un cluster pero
// nunca llamaba a una API para traer los pacientes — el endpoint
// no existía. Ahora vive en GET /segments/{org}/segment/{seg}/patients.
export async function getSegmentPatients(orgId: string, segmentId: string, limit: number = 100): Promise<SegmentPatient[]> {
  const res = await authFetch(`${API_URL}/segments/${orgId}/segment/${segmentId}/patients?limit=${limit}`)
  if (!res.ok) return []
  return unwrapArray<SegmentPatient>(await res.json(), 'patients')
}

export async function getPatientSegment(orgId: string, patientId: string): Promise<PatientSegment | null> {
  const res = await authFetch(`${API_URL}/segments/${orgId}/patient/${patientId}`)
  if (!res.ok) return null
  return res.json()
}

export async function findSimilarPatients(orgId: string, patientId: string, limit: number = 10): Promise<SimilarPatient[]> {
  const res = await authFetch(`${API_URL}/segments/${orgId}/similar/${patientId}?limit=${limit}`)
  if (!res.ok) return []
  return unwrapArray<SimilarPatient>(await res.json(), 'similar', 'patients', 'matches')
}

export async function getCampaignSuggestion(orgId: string, segmentId: string): Promise<CampaignSuggestion | null> {
  const res = await authFetch(`${API_URL}/segments/${orgId}/campaign-suggestion/${segmentId}`, {
    method: 'POST',
  })
  if (!res.ok) return null
  return res.json()
}
