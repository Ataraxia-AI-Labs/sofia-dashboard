import { API_URL, authFetch } from './helpers'

export interface WorkflowStep {
  id?: string
  action_type: string
  config: Record<string, unknown>
  delay_minutes?: number
  condition?: Record<string, unknown>
  order: number
}

export interface Workflow {
  id: string
  org_id: string
  name: string
  description: string | null
  trigger_type: string
  trigger_config: Record<string, unknown>
  steps: WorkflowStep[]
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED'
  ab_test_config: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: string
  trigger_type: string
  steps: WorkflowStep[]
}

export interface WorkflowEnrollment {
  id: string
  workflow_id: string
  patient_id: string
  current_step: number
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'FAILED'
  enrolled_at: string
  completed_at: string | null
}

function ensureSteps(w: Record<string, unknown>): Workflow {
  return {
    ...w,
    steps: Array.isArray(w.steps) ? w.steps : [],
  } as Workflow
}

export async function listWorkflows(orgId: string, status?: string): Promise<Workflow[]> {
  const q = status ? `?status=${status}` : ''
  const res = await authFetch(`${API_URL}/api/workflows/${orgId}${q}`)
  if (!res.ok) return []
  const d = await res.json()
  const raw = Array.isArray(d) ? d : (d.workflows ?? [])
  return raw.map(ensureSteps)
}

export async function getWorkflow(orgId: string, workflowId: string): Promise<Workflow> {
  const res = await authFetch(`${API_URL}/api/workflows/${orgId}/${workflowId}`)
  if (!res.ok) throw new Error(`Workflow error: ${res.status}`)
  const d = await res.json()
  return ensureSteps(d.workflow ?? d)
}

export async function createWorkflow(orgId: string, data: {
  name: string; description?: string; trigger_type: string; trigger_config: Record<string, unknown>; steps: WorkflowStep[]
}): Promise<Workflow> {
  const res = await authFetch(`${API_URL}/api/workflows/${orgId}`, { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error(`Create workflow error: ${res.status}`)
  const d = await res.json()
  return ensureSteps(d.workflow ?? d)
}

export async function updateWorkflow(orgId: string, workflowId: string, data: Partial<{
  name: string; description: string; trigger_config: Record<string, unknown>; steps: WorkflowStep[]
}>): Promise<Workflow> {
  const res = await authFetch(`${API_URL}/api/workflows/${orgId}/${workflowId}`, { method: 'PATCH', body: JSON.stringify(data) })
  if (!res.ok) throw new Error(`Update workflow error: ${res.status}`)
  const d = await res.json()
  return ensureSteps(d.workflow ?? d)
}

export async function activateWorkflow(orgId: string, workflowId: string): Promise<void> {
  const res = await authFetch(`${API_URL}/api/workflows/${orgId}/${workflowId}/activate`, { method: 'POST' })
  if (!res.ok) throw new Error(`Activate error: ${res.status}`)
}

export async function pauseWorkflow(orgId: string, workflowId: string): Promise<void> {
  const res = await authFetch(`${API_URL}/api/workflows/${orgId}/${workflowId}/pause`, { method: 'POST' })
  if (!res.ok) throw new Error(`Pause error: ${res.status}`)
}

export async function archiveWorkflow(orgId: string, workflowId: string): Promise<void> {
  const res = await authFetch(`${API_URL}/api/workflows/${orgId}/${workflowId}/archive`, { method: 'POST' })
  if (!res.ok) throw new Error(`Archive error: ${res.status}`)
}

export async function listTemplates(orgId: string, category?: string): Promise<WorkflowTemplate[]> {
  const q = category ? `?category=${category}` : ''
  const res = await authFetch(`${API_URL}/api/workflows/${orgId}/templates${q}`)
  if (!res.ok) return []
  const d = await res.json()
  const raw = Array.isArray(d) ? d : (d.templates ?? [])
  return raw.map((t: Record<string, unknown>) => ({ ...t, steps: Array.isArray(t.steps) ? t.steps : [] })) as WorkflowTemplate[]
}

export async function createFromTemplate(orgId: string, templateId: string, nameOverride?: string): Promise<Workflow> {
  const res = await authFetch(`${API_URL}/api/workflows/${orgId}/from-template`, {
    method: 'POST', body: JSON.stringify({ template_id: templateId, name_override: nameOverride }),
  })
  if (!res.ok) throw new Error(`Template error: ${res.status}`)
  const d = await res.json()
  return ensureSteps(d.workflow ?? d)
}

export async function enrollPatients(orgId: string, workflowId: string, patientIds: string[]): Promise<void> {
  const res = await authFetch(`${API_URL}/api/workflows/${orgId}/${workflowId}/enroll`, {
    method: 'POST', body: JSON.stringify({ patient_ids: patientIds }),
  })
  if (!res.ok) throw new Error(`Enroll error: ${res.status}`)
}

export async function listEnrollments(orgId: string, workflowId: string): Promise<WorkflowEnrollment[]> {
  const res = await authFetch(`${API_URL}/api/workflows/${orgId}/${workflowId}/enrollments`)
  if (!res.ok) return []
  const d = await res.json()
  return Array.isArray(d) ? d : (d.enrollments ?? [])
}

export async function getWorkflowAnalytics(orgId: string, workflowId: string): Promise<Record<string, unknown>> {
  const res = await authFetch(`${API_URL}/api/workflows/${orgId}/${workflowId}/analytics`)
  if (!res.ok) return {}
  const d = await res.json()
  return d.analytics ?? d
}

export async function getWorkflowComparison(orgId: string): Promise<Record<string, unknown>[]> {
  const res = await authFetch(`${API_URL}/api/workflows/${orgId}/comparison`)
  if (!res.ok) return []
  const d = await res.json()
  return Array.isArray(d) ? d : (d.comparison ?? [])
}
