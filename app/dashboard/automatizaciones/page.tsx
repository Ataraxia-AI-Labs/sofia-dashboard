'use client'

import { useEffect, useState, useCallback } from 'react'
import { useOrg } from '@/lib/org-context'
import { listWorkflows, activateWorkflow, pauseWorkflow, archiveWorkflow, listTemplates, createFromTemplate, listEnrollments, getWorkflowAnalytics } from '@/lib/api/workflows'
import type { Workflow, WorkflowTemplate, WorkflowEnrollment } from '@/lib/api/workflows'
import { useTranslations } from 'next-intl'
import { Zap, Plus, Play, Pause, Archive, Users, BarChart3, Copy, ChevronRight } from 'lucide-react'

type Tab = 'workflows' | 'templates'

export default function AutomatizacionesPage() {
  const { orgId, role } = useOrg()
  const t = useTranslations('workflows')
  const isReadOnly = role === 'STAFF'

  const [tab, setTab] = useState<Tab>('workflows')
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Workflow | null>(null)
  const [enrollments, setEnrollments] = useState<WorkflowEnrollment[]>([])
  const [analytics, setAnalytics] = useState<Record<string, unknown>>({})
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [wfs, tmps] = await Promise.all([
        listWorkflows(orgId),
        listTemplates(orgId),
      ])
      setWorkflows(wfs)
      setTemplates(tmps)
    } catch { /* */ }
    setLoading(false)
  }, [orgId])

  useEffect(() => { load() }, [load])

  const selectWorkflow = async (wf: Workflow) => {
    setSelected(wf)
    const [en, an] = await Promise.all([
      listEnrollments(orgId, wf.id),
      getWorkflowAnalytics(orgId, wf.id),
    ])
    setEnrollments(en)
    setAnalytics(an)
  }

  const handleAction = async (wf: Workflow, action: 'activate' | 'pause' | 'archive') => {
    try {
      if (action === 'activate') await activateWorkflow(orgId, wf.id)
      else if (action === 'pause') await pauseWorkflow(orgId, wf.id)
      else await archiveWorkflow(orgId, wf.id)
      load()
      setMsg(`Workflow ${action}d`)
    } catch { setMsg('Error') }
    setTimeout(() => setMsg(''), 2000)
  }

  const handleCreateFromTemplate = async (tmpl: WorkflowTemplate) => {
    try {
      await createFromTemplate(orgId, tmpl.id)
      setTab('workflows')
      load()
      setMsg('Automatizacion creada desde plantilla')
    } catch { setMsg('Error al crear') }
    setTimeout(() => setMsg(''), 2000)
  }

  const statusColor = (s: string) => {
    switch (s) {
      case 'ACTIVE': return 'text-status-success bg-status-success/8'
      case 'PAUSED': return 'text-status-warning bg-status-warning/8'
      case 'DRAFT': return 'text-text-dim bg-surface-2'
      default: return 'text-text-dim bg-surface-2'
    }
  }

  const triggerLabel = (type: string) => {
    const key = type as keyof typeof t
    try { return t(`triggerTypes.${type}`) } catch { return type }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-mono font-bold text-text-primary tracking-wide flex items-center gap-2">
            <Zap size={16} className="text-brand-purple" />
            {t('title')}
          </h1>
          <p className="text-[10px] font-mono text-text-dim mt-0.5">{t('subtitle')}</p>
        </div>
      </div>

      {msg && <div className="text-[10px] font-mono text-status-success bg-status-success/8 px-3 py-1.5 rounded border border-status-success/15">{msg}</div>}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border">
        {(['workflows', 'templates'] as Tab[]).map(tb => (
          <button key={tb} onClick={() => setTab(tb)}
            className={`text-[10px] font-mono font-semibold pb-1.5 border-b-2 transition-colors ${
              tab === tb ? 'text-brand-purple border-brand-purple' : 'text-text-dim border-transparent hover:text-text-muted'
            }`}>{tb === 'workflows' ? t('title') : t('templates')}</button>
        ))}
      </div>

      {tab === 'workflows' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Workflow list */}
          <div className="lg:col-span-2 space-y-2">
            {loading ? (
              <p className="text-[10px] font-mono text-text-dim py-8 text-center">...</p>
            ) : workflows.length === 0 ? (
              <div className="text-center py-12">
                <Zap size={24} className="mx-auto text-text-dim/30 mb-2" />
                <p className="text-[10px] font-mono text-text-dim">{t('noWorkflows')}</p>
                <p className="text-[9px] font-mono text-text-dim/70 mt-1">{t('noWorkflowsHint')}</p>
                <button onClick={() => setTab('templates')}
                  className="mt-3 px-3 py-1 rounded bg-brand-purple/10 border border-brand-purple/20 text-brand-purple text-[10px] font-mono font-semibold">
                  {t('fromTemplate')}
                </button>
              </div>
            ) : workflows.map(wf => (
              <button key={wf.id} onClick={() => selectWorkflow(wf)}
                className={`w-full text-left border rounded-lg p-3 transition-colors ${
                  selected?.id === wf.id ? 'border-brand-purple/30 bg-brand-purple/5' : 'border-border hover:bg-surface-2/50'
                }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-semibold text-text-primary">{wf.name}</span>
                    <span className={`text-[8px] font-mono font-semibold px-1.5 py-0.5 rounded ${statusColor(wf.status)}`}>
                      {t(`${wf.status.toLowerCase()}` as 'active')}
                    </span>
                  </div>
                  <ChevronRight size={14} className="text-text-dim" />
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[9px] font-mono text-text-dim">{triggerLabel(wf.trigger_type)}</span>
                  <span className="text-[9px] font-mono text-text-dim">{wf.steps.length} {t('steps').toLowerCase()}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="border border-border rounded-lg p-4 space-y-4">
              <div>
                <h3 className="text-[11px] font-mono font-bold text-text-primary">{selected.name}</h3>
                {selected.description && <p className="text-[9px] font-mono text-text-dim mt-0.5">{selected.description}</p>}
              </div>

              {!isReadOnly && (
                <div className="flex gap-1">
                  {selected.status !== 'ACTIVE' && (
                    <button onClick={() => handleAction(selected, 'activate')}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-status-success/10 text-status-success text-[9px] font-mono">
                      <Play size={10} /> {t('activate')}
                    </button>
                  )}
                  {selected.status === 'ACTIVE' && (
                    <button onClick={() => handleAction(selected, 'pause')}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-status-warning/10 text-status-warning text-[9px] font-mono">
                      <Pause size={10} /> {t('pause')}
                    </button>
                  )}
                  <button onClick={() => handleAction(selected, 'archive')}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-surface-2 text-text-dim text-[9px] font-mono">
                    <Archive size={10} /> {t('archive')}
                  </button>
                </div>
              )}

              {/* Steps visualization */}
              <div>
                <p className="text-[9px] font-mono text-text-dim uppercase tracking-wider mb-2">{t('steps')}</p>
                <div className="space-y-1">
                  {selected.steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-brand-purple/10 text-brand-purple text-[8px] font-mono font-bold flex items-center justify-center">{i + 1}</span>
                      <span className="text-[10px] font-mono text-text-secondary">
                        {(() => { try { return t(`actionTypes.${step.action_type}`) } catch { return step.action_type } })()}
                      </span>
                      {step.delay_minutes ? <span className="text-[8px] font-mono text-text-dim">+{step.delay_minutes}min</span> : null}
                    </div>
                  ))}
                </div>
              </div>

              {/* Enrollments */}
              <div>
                <p className="text-[9px] font-mono text-text-dim uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Users size={10} /> {t('enrollments')}: {enrollments.length}
                </p>
              </div>

              {/* Analytics */}
              {Object.keys(analytics).length > 0 && (
                <div>
                  <p className="text-[9px] font-mono text-text-dim uppercase tracking-wider mb-1 flex items-center gap-1">
                    <BarChart3 size={10} /> {t('analytics')}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(analytics).slice(0, 6).map(([k, v]) => (
                      <div key={k} className="bg-surface-2 rounded p-2">
                        <p className="text-[8px] font-mono text-text-dim uppercase">{k.replace(/_/g, ' ')}</p>
                        <p className="text-[11px] font-mono font-bold text-text-primary">{String(v)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Templates */}
      {tab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {templates.length === 0 ? (
            <p className="text-[10px] font-mono text-text-dim py-8 col-span-2 text-center">Sin plantillas disponibles</p>
          ) : templates.map(tmpl => (
            <div key={tmpl.id} className="border border-border rounded-lg p-4 hover:bg-surface-2/30 transition-colors">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-mono font-bold text-text-primary">{tmpl.name}</h3>
                <span className="text-[8px] font-mono text-text-dim bg-surface-2 px-1.5 py-0.5 rounded">{tmpl.category}</span>
              </div>
              <p className="text-[9px] font-mono text-text-dim mt-1">{tmpl.description}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-[9px] font-mono text-text-dim">{tmpl.steps.length} pasos</span>
                {!isReadOnly && (
                  <button onClick={() => handleCreateFromTemplate(tmpl)}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-brand-purple/10 text-brand-purple text-[9px] font-mono font-semibold">
                    <Copy size={10} /> {t('fromTemplate')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
