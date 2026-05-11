import { API_URL, authFetch, unwrapArray } from './helpers'
import type { LeadScore, LeadInsights, LeadScoreAllResult, LeadClassification } from '@/types'

// ============================================================
// LEAD SCORING API (P4-02)
// ============================================================

export async function scorePatient(orgId: string, patientId: string): Promise<LeadScore | null> {
  const res = await authFetch(`${API_URL}/leads/${orgId}/score/${patientId}`, {
    method: 'POST',
  })
  if (!res.ok) return null
  return res.json()
}

export async function scoreAllLeads(orgId: string): Promise<LeadScoreAllResult | null> {
  const res = await authFetch(`${API_URL}/leads/${orgId}/score-all`, {
    method: 'POST',
  })
  if (!res.ok) return null
  return res.json()
}

// S154: el backend devuelve la fila de `patients` directo:
//   {id, full_name, phone, lead_score, lead_classification, lead_scored_at, lead_features}
// El tipo `LeadScore` del frontend espera otra forma:
//   {patient_id, score, classification, scored_at, patients: {full_name, phone}}
// Sin el mapeo, todos los reads (`lead.score`, `lead.patients?.full_name`)
// quedan undefined y la fila del panel sale con score 0 + "Sin nombre".
function mapLeadRow(raw: Record<string, unknown>): LeadScore {
  const features = (raw.lead_features ?? {}) as Record<string, number>
  return {
    patient_id: (raw.patient_id ?? raw.id ?? '') as string,
    score: (raw.score ?? raw.lead_score ?? 0) as number,
    classification: (raw.classification ?? raw.lead_classification ?? 'COLD') as LeadClassification,
    engagement_pct: (raw.engagement_pct ?? features.engagement_pct ?? 0) as number,
    intent_pct: (raw.intent_pct ?? features.intent_pct ?? 0) as number,
    behavioral_pct: (raw.behavioral_pct ?? features.behavioral_pct ?? 0) as number,
    negative_signals: (raw.negative_signals ?? features.negative_signals ?? 0) as number,
    scored_at: (raw.scored_at ?? raw.lead_scored_at ?? '') as string,
    patients: {
      full_name: (raw.full_name ?? '') as string,
      phone: (raw.phone ?? '') as string,
    },
  }
}

export async function getLeadScores(
  orgId: string,
  classification?: LeadClassification
): Promise<LeadScore[]> {
  let url = `${API_URL}/leads/${orgId}/scores`
  if (classification) url += `?classification=${classification}`
  const res = await authFetch(url)
  if (!res.ok) return []
  const rows = unwrapArray<Record<string, unknown>>(await res.json(), 'scores', 'leads')
  return rows.map(mapLeadRow)
}

export async function getLeadInsights(orgId: string): Promise<LeadInsights | null> {
  const res = await authFetch(`${API_URL}/leads/${orgId}/insights`)
  if (!res.ok) return null
  // S154: backend envuelve la respuesta como `{insights: {...}}` (patrón
  // consistente con stats, rankings, campaign, pricing). El helper devolvía
  // res.json() directo, así que el panel mostraba "Distribución 0 leads
  // puntuados" mientras los top 10 sí cargaban — incoherencia visible.
  const data = await res.json()
  return (data?.insights ?? data) as LeadInsights
}

export async function getTopLeads(orgId: string, limit: number = 10): Promise<LeadScore[]> {
  const res = await authFetch(`${API_URL}/leads/${orgId}/top?limit=${limit}`)
  if (!res.ok) return []
  const rows = unwrapArray<Record<string, unknown>>(await res.json(), 'leads', 'top')
  return rows.map(mapLeadRow)
}
