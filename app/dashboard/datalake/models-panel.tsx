'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  Brain, Rocket, FlaskConical, RefreshCw, Trophy,
  TrendingUp, Clock, Zap, BarChart3, ArrowLeftRight,
  CheckCircle, XCircle, Loader2, Sparkles
} from 'lucide-react'
import { getModels, deployModel, evaluateModel, getEvaluations, compareModels } from '@/lib/api/models'
import type { FineTuneModel, ModelEvaluation, ModelComparison, ModelStatus } from '@/types'

// ============================================================
// MODELS PANEL (P4-01)
// Fine-tuning model management: list, deploy, evaluate, compare
// ============================================================

interface ModelsPanelProps {
  orgId: string
  trainingReady: number
}

const STATUS_CONFIG: Record<ModelStatus, { color: string; bg: string; border: string }> = {
  TRAINING:  { color: 'text-status-warning', bg: 'bg-status-warning/10', border: 'border-status-warning/20' },
  COMPLETED: { color: 'text-status-info',    bg: 'bg-status-info/10',    border: 'border-status-info/20' },
  DEPLOYED:  { color: 'text-status-success', bg: 'bg-status-success/10', border: 'border-status-success/20' },
  FAILED:    { color: 'text-status-danger',  bg: 'bg-status-danger/10',  border: 'border-status-danger/20' },
}

const MIN_TRAINING_SAMPLES = 50

export default function ModelsPanel({ orgId, trainingReady }: ModelsPanelProps) {
  const t = useTranslations('models')
  const tCommon = useTranslations('common')

  const [models, setModels] = useState<FineTuneModel[]>([])
  const [evaluations, setEvaluations] = useState<ModelEvaluation[]>([])
  const [loading, setLoading] = useState(true)
  const [deploying, setDeploying] = useState<string | null>(null)
  const [evaluating, setEvaluating] = useState<string | null>(null)
  const [comparison, setComparison] = useState<ModelComparison | null>(null)
  const [compareA, setCompareA] = useState('')
  const [compareB, setCompareB] = useState('')
  const [comparing, setComparing] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [modelsData, evalsData] = await Promise.all([
        getModels(orgId),
        getEvaluations(orgId),
      ])
      setModels(modelsData)
      setEvaluations(evalsData)
    } catch {
      // Load failed — show empty state
    }
    setLoading(false)
  }, [orgId])

  useEffect(() => { loadData() }, [loadData])

  const handleDeploy = async (modelId: string) => {
    setDeploying(modelId)
    try {
      const result = await deployModel(orgId, modelId)
      if (result) {
        setModels(prev => prev.map(m =>
          m.id === modelId ? { ...m, status: 'DEPLOYED' as ModelStatus } : m
        ))
      }
    } catch {
      // Deploy failed — user can retry
    }
    setDeploying(null)
  }

  const handleEvaluate = async (modelId: string) => {
    setEvaluating(modelId)
    try {
      const result = await evaluateModel(orgId, modelId)
      if (result) {
        setEvaluations(prev => [...prev, result])
      }
    } catch {
      // Evaluation failed — user can retry
    }
    setEvaluating(null)
  }

  const handleCompare = async () => {
    if (!compareA || !compareB || compareA === compareB) return
    setComparing(true)
    try {
      const result = await compareModels(orgId, compareA, compareB)
      setComparison(result)
    } catch {
      // Comparison failed — user can retry
    }
    setComparing(false)
  }

  const getEvalForModel = (modelId: string) =>
    evaluations.find(e => e.model_id === modelId)

  const readinessPercent = Math.min(100, (trainingReady / MIN_TRAINING_SAMPLES) * 100)
  const isReady = trainingReady >= MIN_TRAINING_SAMPLES

  return (
    <div className="space-y-5">
      {/* Training Readiness */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold font-body text-text-muted uppercase tracking-wider flex items-center gap-2">
            <Sparkles size={14} className="text-brand-cyan" />
            {t('trainingReadiness')}
          </h3>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
            isReady
              ? 'bg-status-success/10 border-status-success/20 text-status-success'
              : 'bg-status-warning/10 border-status-warning/20 text-status-warning'
          }`}>
            {isReady ? t('readyForTraining') : t('notEnoughData')}
          </span>
        </div>
        <div className="mb-2">
          <div className="flex justify-between text-[10px] text-text-dim mb-1">
            <span>{trainingReady} {t('samplesReady')}</span>
            <span>{t('minimum')}: {MIN_TRAINING_SAMPLES}</span>
          </div>
          <div className="h-3 bg-void rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                isReady
                  ? 'bg-gradient-to-r from-status-success to-status-info'
                  : 'bg-gradient-to-r from-brand-purple to-brand-cyan'
              }`}
              style={{ width: `${readinessPercent}%` }}
            />
          </div>
        </div>
        <p className="text-[10px] text-text-dim mt-2">
          {isReady
            ? t('readyDescription')
            : t('notReadyDescription', { remaining: MIN_TRAINING_SAMPLES - trainingReady })
          }
        </p>
      </div>

      {/* Models List */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold font-body text-text-muted uppercase tracking-wider flex items-center gap-2">
            <Brain size={14} className="text-brand-purple" />
            {t('registeredModels')}
          </h3>
          <button
            onClick={loadData}
            disabled={loading}
            className="w-7 h-7 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-dim hover:text-text-primary transition-colors"
            aria-label={tCommon('refresh')}
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {loading && models.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-void/50 rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-surface-3 rounded w-40 mb-2" />
                <div className="h-3 bg-surface-3 rounded w-64" />
              </div>
            ))}
          </div>
        ) : models.length === 0 ? (
          <div className="text-center py-12">
            <Brain size={32} className="text-text-dim mx-auto mb-3" />
            <p className="text-text-dim text-sm">{t('noModels')}</p>
            <p className="text-text-dim text-xs mt-1">{t('noModelsHint')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {models.map(model => {
              const statusCfg = STATUS_CONFIG[model.status] || STATUS_CONFIG.TRAINING
              const evaluation = getEvalForModel(model.id)
              const isDeployed = model.status === 'DEPLOYED'

              return (
                <div
                  key={model.id}
                  className={`rounded-lg p-4 border transition-colors ${
                    isDeployed
                      ? 'bg-status-success/5 border-status-success/20'
                      : 'bg-void/50 border-border hover:border-border-2'
                  }`}
                >
                  {/* Model Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {isDeployed && <Trophy size={14} className="text-status-success" />}
                      <span className="text-sm font-semibold text-text-primary">{model.model_name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusCfg.bg} ${statusCfg.border} ${statusCfg.color}`}>
                        {t(`status.${model.status}`)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {/* Evaluate button */}
                      <button
                        onClick={() => handleEvaluate(model.id)}
                        disabled={evaluating === model.id || model.status === 'TRAINING'}
                        className="px-2.5 py-1 rounded-lg bg-brand-purple/10 border border-brand-purple/20 text-brand-purple text-[10px] font-semibold hover:bg-brand-purple/20 transition-colors disabled:opacity-40"
                      >
                        {evaluating === model.id ? (
                          <Loader2 size={10} className="animate-spin inline mr-1" />
                        ) : (
                          <FlaskConical size={10} className="inline mr-1" />
                        )}
                        {t('evaluate')}
                      </button>
                      {/* Deploy button (only for COMPLETED) */}
                      {model.status === 'COMPLETED' && (
                        <button
                          onClick={() => handleDeploy(model.id)}
                          disabled={deploying === model.id}
                          className="px-2.5 py-1 rounded-lg bg-status-success/10 border border-status-success/20 text-status-success text-[10px] font-semibold hover:bg-status-success/20 transition-colors disabled:opacity-40"
                        >
                          {deploying === model.id ? (
                            <Loader2 size={10} className="animate-spin inline mr-1" />
                          ) : (
                            <Rocket size={10} className="inline mr-1" />
                          )}
                          {t('deploy')}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Model Metadata */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-text-dim font-body">{t('baseModel')}</span>
                      <div className="text-text-muted font-body mt-0.5">{model.base_model}</div>
                    </div>
                    <div>
                      <span className="text-text-dim font-body">{t('trainingSamples')}</span>
                      <div className="text-text-muted font-body mt-0.5">{model.training_samples}</div>
                    </div>
                    <div>
                      <span className="text-text-dim font-body">{t('trainingLoss')}</span>
                      <div className="text-text-muted font-body mt-0.5">{model.training_loss?.toFixed(4) ?? 'N/A'}</div>
                    </div>
                    <div>
                      <span className="text-text-dim font-body">{t('createdAt')}</span>
                      <div className="text-text-muted font-body mt-0.5">
                        {new Date(model.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                  </div>

                  {/* Evaluation Results (if available) */}
                  {evaluation && (
                    <div className="mt-3 pt-3 border-t border-border/30">
                      <div className="flex items-center gap-1.5 mb-2">
                        <BarChart3 size={11} className="text-brand-cyan" />
                        <span className="text-[10px] font-semibold text-text-muted uppercase">{t('evaluationResults')}</span>
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        <EvalMetric
                          label={t('similarity')}
                          value={`${(evaluation.similarity_score * 100).toFixed(0)}%`}
                          good={evaluation.similarity_score >= 0.8}
                        />
                        <EvalMetric
                          label={t('tokenSavings')}
                          value={`${evaluation.token_savings_pct.toFixed(0)}%`}
                          good={evaluation.token_savings_pct >= 20}
                        />
                        <EvalMetric
                          label={t('responseTime')}
                          value={`${evaluation.response_time_ms}ms`}
                          good={evaluation.response_time_ms <= 500}
                        />
                        <EvalMetric
                          label={t('toneConsistency')}
                          value={`${(evaluation.tone_consistency * 100).toFixed(0)}%`}
                          good={evaluation.tone_consistency >= 0.85}
                        />
                        <EvalMetric
                          label={t('overallScore')}
                          value={`${(evaluation.overall_score * 100).toFixed(0)}%`}
                          good={evaluation.overall_score >= 0.8}
                          highlight
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Comparison View */}
      {models.length >= 2 && (
        <div className="glass-card p-4">
          <h3 className="text-xs font-semibold font-body text-text-muted uppercase tracking-wider flex items-center gap-2 mb-3">
            <ArrowLeftRight size={14} className="text-brand-gold" />
            {t('compareModels')}
          </h3>

          <div className="flex items-end gap-3 mb-3">
            <div className="flex-1">
              <label className="text-[12px] font-body text-text-dim uppercase font-semibold mb-1 block">{t('modelA')}</label>
              <select
                value={compareA}
                onChange={e => setCompareA(e.target.value)}
                className="w-full bg-void border border-border rounded-lg px-3 py-2 text-xs text-text-primary focus:border-brand-purple outline-none"
              >
                <option value="">{t('selectModel')}</option>
                {models.map(m => (
                  <option key={m.id} value={m.id}>{m.model_name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[12px] font-body text-text-dim uppercase font-semibold mb-1 block">{t('modelB')}</label>
              <select
                value={compareB}
                onChange={e => setCompareB(e.target.value)}
                className="w-full bg-void border border-border rounded-lg px-3 py-2 text-xs text-text-primary focus:border-brand-purple outline-none"
              >
                <option value="">{t('selectModel')}</option>
                {models.filter(m => m.id !== compareA).map(m => (
                  <option key={m.id} value={m.id}>{m.model_name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleCompare}
              disabled={!compareA || !compareB || comparing}
              className="px-4 py-2 rounded-md bg-brand-purple text-white text-xs font-body font-semibold disabled:opacity-40 flex items-center gap-1.5 hover:bg-brand-purple-dark transition-colors"
            >
              {comparing ? <Loader2 size={12} className="animate-spin" /> : <ArrowLeftRight size={12} />}
              {t('compare')}
            </button>
          </div>

          {/* Comparison Results */}
          {comparison && (
            <div className="grid grid-cols-2 gap-3">
              <ComparisonColumn
                label={models.find(m => m.id === compareA)?.model_name || t('modelA')}
                evaluation={comparison.model_a}
                t={t}
              />
              <ComparisonColumn
                label={models.find(m => m.id === compareB)?.model_name || t('modelB')}
                evaluation={comparison.model_b}
                t={t}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Sub-components
// ============================================================

function EvalMetric({ label, value, good, highlight }: {
  label: string
  value: string
  good: boolean
  highlight?: boolean
}) {
  return (
    <div className={`text-center p-2 rounded-lg ${highlight ? 'bg-brand-purple/5 border border-brand-purple/15' : 'bg-void/30'}`}>
      <div className={`text-sm font-bold font-mono ${
        highlight ? 'text-brand-purple' : good ? 'text-status-success' : 'text-status-warning'
      }`}>
        {value}
      </div>
      <div className="text-[11px] font-body text-text-dim mt-0.5">{label}</div>
    </div>
  )
}

function ComparisonColumn({ label, evaluation, t }: {
  label: string
  evaluation: ModelEvaluation
  t: (key: string) => string
}) {
  return (
    <div className="bg-void/50 rounded-lg p-4 border border-border">
      <h4 className="text-xs font-semibold text-text-primary mb-3 truncate">{label}</h4>
      <div className="space-y-2">
        <CompRow label={t('similarity')} value={`${(evaluation.similarity_score * 100).toFixed(1)}%`} />
        <CompRow label={t('tokenSavings')} value={`${evaluation.token_savings_pct.toFixed(1)}%`} />
        <CompRow label={t('responseTime')} value={`${evaluation.response_time_ms}ms`} />
        <CompRow label={t('toneConsistency')} value={`${(evaluation.tone_consistency * 100).toFixed(1)}%`} />
        <div className="pt-2 border-t border-border/30">
          <CompRow
            label={t('overallScore')}
            value={`${(evaluation.overall_score * 100).toFixed(1)}%`}
            bold
          />
        </div>
      </div>
    </div>
  )
}

function CompRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] font-body text-text-dim">{label}</span>
      <span className={`text-xs font-body ${bold ? 'font-bold text-brand-purple' : 'text-text-muted'}`}>{value}</span>
    </div>
  )
}
