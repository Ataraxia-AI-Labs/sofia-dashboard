'use client'

import { useEffect, useState, useCallback } from 'react'
import { useOrg } from '@/lib/org-context'
import { fetchDataLakeStats, fetchDataLakeDaily, fetchTrainingReadyCount, exportDataLakeJSONL } from '@/lib/api/data-lake'
import type { DataLakeStats, DataLakeExportResult } from '@/types'
import dynamic from 'next/dynamic'
import {
  Database, Brain, Download, BarChart3, RefreshCw,
  Zap, Target, HardDrive, Layers,
  FileJson, CheckCircle, Clock, Sparkles
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { AnnotationStatsCard } from '@/components/annotation-stats-card'

const PromptOptimizer = dynamic(() => import('./prompt-optimizer'), {
  ssr: false,
  loading: () => <div className="glass-card p-8 animate-pulse"><div className="h-32 bg-surface-3 rounded-lg" /></div>,
})

const ModelsPanel = dynamic(() => import('./models-panel'), {
  ssr: false,
  loading: () => <div className="glass-card p-8 animate-pulse"><div className="h-32 bg-surface-3 rounded-lg" /></div>,
})

const IngestionChart = dynamic(() => import('./IngestionChart'), {
  ssr: false,
  loading: () => <div className="h-48 bg-surface-3 rounded-lg animate-pulse" />,
})

function formatNumber(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toString()
}

export default function DataLakePage() {
  const { orgId, branchId } = useOrg()
  const [stats, setStats] = useState<DataLakeStats | null>(null)
  const [dailyData, setDailyData] = useState<{ date: string; count: number }[]>([])
  const [trainingReady, setTrainingReady] = useState(0)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [exportResult, setExportResult] = useState<DataLakeExportResult | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'export' | 'models' | 'optimizer'>('overview')
  const t = useTranslations('datalake')
  const tCommon = useTranslations('common')

  const loadStats = useCallback(async () => {
    setLoading(true)
    try {
      const [statsRes, daily, ready] = await Promise.all([
        fetchDataLakeStats(orgId, branchId),
        fetchDataLakeDaily(orgId, 30),
        fetchTrainingReadyCount(orgId),
      ])
      setStats(statsRes)
      setDailyData(daily)
      setTrainingReady(ready)
    } catch {
      // Data lake stats load failed — UI will show empty state
    }
    setLoading(false)
  }, [orgId, branchId])

  useEffect(() => { loadStats() }, [loadStats])

  const handleExport = async () => {
    if (!orgId) return
    setExporting(true)
    try {
      const data = await exportDataLakeJSONL(orgId)
      setExportResult(data)
    } catch {
      // Export failed — user can retry
    }
    setExporting(false)
  }

  const handleDownload = () => {
    if (!exportResult?.jsonl_preview) return
    const content = exportResult.jsonl_preview.endsWith('...') 
      ? exportResult.jsonl_preview 
      : exportResult.jsonl_preview
    const blob = new Blob([content], { type: 'application/jsonl' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `training_${exportResult.export_batch || 'sofia'}.jsonl`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-purple to-brand-cyan flex items-center justify-center">
            <Database size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-text-primary">{t('title')}</h2>
            <p className="text-xs text-text-dim">Fine-tuning & Training Pipeline</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-surface-2 rounded-lg border border-border p-0.5">
            {(['overview', 'export', 'models', 'optimizer'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeTab === tab ? 'bg-brand-purple/15 text-brand-purple' : 'text-text-muted'}`}>
                {tab === 'overview' ? t('tabs.overview') : tab === 'export' ? t('tabs.export') : tab === 'models' ? t('tabs.models') : t('tabs.optimizer')}
              </button>
            ))}
          </div>
          <button onClick={loadStats} aria-label={tCommon('refresh')} className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-brand-purple/10 flex items-center justify-center">
              <HardDrive size={16} className="text-brand-purple" />
            </div>
            <span className="text-[10px] text-text-dim uppercase font-semibold">Raw Data</span>
          </div>
          <div className="text-xl font-bold text-brand-purple font-mono">{formatNumber(stats?.raw_data_total || 0)}</div>
          <div className="text-[10px] text-text-dim mt-1">Interacciones totales</div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-status-success/10 flex items-center justify-center">
              <Brain size={16} className="text-status-success" />
            </div>
            <span className="text-[10px] text-text-dim uppercase font-semibold">Training Data</span>
          </div>
          <div className="text-xl font-bold text-status-success font-mono">{formatNumber(stats?.training_data_total || 0)}</div>
          <div className="text-[10px] text-text-dim mt-1">Quality ≥ 0.7</div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-brand-cyan/10 flex items-center justify-center">
              <Sparkles size={16} className="text-brand-cyan" />
            </div>
            <span className="text-[10px] text-text-dim uppercase font-semibold">Training Ready</span>
          </div>
          <div className="text-xl font-bold text-brand-cyan font-mono">{formatNumber(trainingReady)}</div>
          <div className="text-[10px] text-text-dim mt-1">is_training_ready = true</div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-status-warning/10 flex items-center justify-center">
              <Target size={16} className="text-status-warning" />
            </div>
            <span className="text-[10px] text-text-dim uppercase font-semibold">Quality Score</span>
          </div>
          <div className="text-xl font-bold text-status-warning font-mono">{((stats?.quality_promedio || 0) * 100).toFixed(0)}%</div>
          <div className="text-[10px] text-text-dim mt-1">Promedio</div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-status-info/10 flex items-center justify-center">
              <Layers size={16} className="text-status-info" />
            </div>
            <span className="text-[10px] text-text-dim uppercase font-semibold">Modelos</span>
          </div>
          <div className="text-xl font-bold text-status-info font-mono">{stats?.modelos_entrenados || 0}</div>
          <div className="text-[10px] text-text-dim mt-1">Entrenados</div>
        </div>
      </div>

      {/* Fine-tuning Readiness */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Estado de Fine-tuning</h3>
          {stats?.listo_para_finetuning ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-status-success">
              <CheckCircle size={14} /> Listo para entrenar
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-semibold text-status-warning">
              <Clock size={14} /> Acumulando datos
            </span>
          )}
        </div>

        {/* Progress bar to 50 samples minimum */}
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-text-dim mb-1">
            <span>{stats?.training_data_total || 0} samples</span>
            <span>Meta: 50 mínimo</span>
          </div>
          <div className="h-3 bg-void rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                (stats?.training_data_total || 0) >= 50
                  ? 'bg-gradient-to-r from-status-success to-status-info'
                  : 'bg-gradient-to-r from-brand-purple to-brand-cyan'
              }`}
              style={{ width: `${Math.min(100, ((stats?.training_data_total || 0) / 50) * 100)}%` }}
            />
          </div>
        </div>

        {/* Milestones */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          {[
            { target: 50, label: 'Fine-tune básico', desc: 'gpt-4o-mini' },
            { target: 500, label: 'SofIA v1', desc: 'Tono colombiano' },
            { target: 10000, label: 'Modelo propio', desc: 'Llama 3 / Mistral' },
            { target: 100000, label: 'AGI LATAM', desc: 'Multi-producto' },
          ].map(milestone => {
            const current = stats?.training_data_total || 0
            const done = current >= milestone.target
            return (
              <div key={milestone.target} className={`text-center p-3 rounded-lg border ${done ? 'border-status-success/30 bg-status-success/5' : 'border-border bg-void/30'}`}>
                <div className={`text-lg font-bold font-mono ${done ? 'text-status-success' : 'text-text-dim'}`}>{formatNumber(milestone.target)}</div>
                <div className={`text-[10px] font-semibold ${done ? 'text-status-success' : 'text-text-muted'}`}>{milestone.label}</div>
                <div className="text-[9px] text-text-dim">{milestone.desc}</div>
              </div>
            )
          })}
        </div>

        <p className="text-xs text-text-muted mt-4 italic">{stats?.recomendacion || ''}</p>
      </div>

      {/* TAB: OVERVIEW — Daily ingestion chart */}
      {activeTab === 'overview' && dailyData.length > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
              <BarChart3 size={14} className="text-brand-purple" />
              Ingesta por Día (últimos 30 días)
            </h3>
            <span className="text-[10px] text-text-dim font-mono">
              {dailyData.reduce((s, d) => s + d.count, 0)} total
            </span>
          </div>
          <div className="h-48">
            <IngestionChart data={dailyData} />
          </div>
        </div>
      )}

      {/* TAB: OVERVIEW — Intent distribution + Pipeline + Annotations */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Intent distribution */}
          {stats?.por_intent && (
            <div className="glass-card p-5">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Distribución por Intent</h3>
              <div className="space-y-3">
                {Object.entries(stats.por_intent).sort(([, a], [, b]) => (b as number) - (a as number)).map(([intent, count]) => {
                  const max = Math.max(...Object.values(stats.por_intent) as number[])
                  const pct = max > 0 ? (count / max) * 100 : 0
                  return (
                    <div key={intent}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-text-muted">{intent}</span>
                        <span className="text-text-primary font-semibold font-mono">{count}</span>
                      </div>
                      <div className="h-2 bg-void rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-brand-purple to-brand-cyan rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Data pipeline status */}
          {stats?.por_intent && (
            <div className="glass-card p-5">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Pipeline Status</h3>
              <div className="space-y-4">
                <PipelineStep icon={<HardDrive size={16} />} label="Interacciones capturadas" value={`${formatNumber(stats.raw_data_total)} total`} status="active" />
                <PipelineStep icon={<Target size={16} />} label="Quality filtering" value={`${formatNumber(stats.training_data_total)} aprobadas`} status="active" />
                <PipelineStep icon={<FileJson size={16} />} label="Exportadas (JSONL)" value={`${formatNumber(stats.training_exported || 0)} samples`} status={(stats.training_exported || 0) > 0 ? 'active' : 'waiting'} />
                <PipelineStep icon={<Brain size={16} />} label="Modelos entrenados" value={`${stats.modelos_entrenados} modelos`} status={stats.modelos_entrenados > 0 ? 'active' : 'waiting'} />
                <PipelineStep icon={<Zap size={16} />} label="Modelo en producción" value={stats.ultimo_modelo?.model_name || 'GPT-4o (temporal)'} status={stats.ultimo_modelo ? 'active' : 'waiting'} />
              </div>
            </div>
          )}

          {/* Annotation stats card */}
          <AnnotationStatsCard orgId={orgId} className="lg:col-span-2" />
        </div>
      )}

      {/* TAB: EXPORT */}
      {activeTab === 'export' && (
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Exportar Training Data</h3>
            <p className="text-sm text-text-muted mb-4">
              Exporta conversaciones de alta calidad en formato JSONL compatible con OpenAI Fine-tuning API.
              Los intents se balancean automáticamente para evitar sesgo.
            </p>
            <button
              onClick={handleExport}
              disabled={exporting || (stats?.training_data_total || 0) < 10}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-purple to-brand-purple-dark text-white font-semibold text-sm flex items-center gap-2 disabled:opacity-50"
            >
              {exporting ? (
                <><RefreshCw size={14} className="animate-spin" /> Exportando...</>
              ) : (
                <><Download size={14} /> Exportar JSONL</>
              )}
            </button>
          </div>

          {exportResult && (
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Resultado del Export</h3>
                <button onClick={handleDownload} className="px-3 py-1.5 rounded-lg bg-status-success/10 border border-status-success/20 text-status-success text-xs font-semibold flex items-center gap-1">
                  <Download size={12} /> Descargar JSONL
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-void/50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-brand-purple font-mono">{exportResult.stats?.total || 0}</div>
                  <div className="text-[10px] text-text-dim">Samples</div>
                </div>
                <div className="bg-void/50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-status-info font-mono">{formatNumber(exportResult.stats?.tokens_estimados || 0)}</div>
                  <div className="text-[10px] text-text-dim">Tokens est.</div>
                </div>
                <div className="bg-void/50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-status-success font-mono">${exportResult.costo_estimado_usd || 0}</div>
                  <div className="text-[10px] text-text-dim">Costo fine-tune</div>
                </div>
              </div>

              <p className="text-xs text-text-muted italic">{exportResult.recomendacion}</p>

              {/* Preview */}
              <div className="mt-4">
                <h4 className="text-[10px] text-text-dim uppercase font-semibold mb-2">Preview JSONL</h4>
                <pre className="bg-void rounded-lg p-3 text-[10px] text-text-muted font-mono overflow-x-auto max-h-40 overflow-y-auto">
                  {exportResult.jsonl_preview?.slice(0, 1000) || 'Sin datos'}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: MODELS */}
      {activeTab === 'models' && (
        <ModelsPanel orgId={orgId} trainingReady={trainingReady} />
      )}

      {/* TAB: OPTIMIZER */}
      {activeTab === 'optimizer' && (
        <PromptOptimizer orgId={orgId} />
      )}
    </div>
  )
}

function PipelineStep({ icon, label, value, status }: { icon: React.ReactNode; label: string; value: string; status: 'active' | 'waiting' }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${status === 'active' ? 'bg-status-success/10 text-status-success' : 'bg-surface-3 text-text-dim'}`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-xs text-text-muted">{label}</div>
        <div className={`text-sm font-semibold ${status === 'active' ? 'text-text-primary' : 'text-text-dim'}`}>{value}</div>
      </div>
      <div className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-status-success' : 'bg-surface-3'}`} />
    </div>
  )
}
