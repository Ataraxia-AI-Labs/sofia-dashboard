'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import * as Sentry from '@sentry/nextjs'
import {
  Brain, RefreshCw, ChevronDown, Sparkles,
  ToggleLeft, ToggleRight, Loader2,
} from 'lucide-react'
import {
  getLearningProgress,
  getLearnedRules,
  getLearningStats,
  getCorrectionHistory,
  extractPatterns,
  suggestRule,
  deactivateRule,
} from '@/lib/api/doctor-learning'
import { ConfidenceMeter, ConfidenceBar } from '@/components/confidence-meter'
import type {
  LearningProgress,
  LearnedRule,
  LearningStats,
  DoctorCorrection,
  CorrectionType,
} from '@/types'

// ============================================================
// LEARNING PANEL (P5-13)
// Doctor learning progress, rules, corrections history
// ============================================================

interface LearningPanelProps {
  orgId: string
}

const CORRECTION_TYPE_CONFIG: Record<CorrectionType, { emoji: string; label: string; color: string }> = {
  APPOINTMENT_CHANGE: { emoji: '\uD83D\uDCC5', label: 'Cita', color: 'text-status-info' },
  RESPONSE_EDIT: { emoji: '\u270F\uFE0F', label: 'Respuesta', color: 'text-purple-400' },
  PRICE_OVERRIDE: { emoji: '\uD83D\uDCB0', label: 'Precio', color: 'text-amber-400' },
  TREATMENT_CORRECTION: { emoji: '\uD83D\uDC8A', label: 'Tratamiento', color: 'text-emerald-400' },
  SCHEDULE_PREFERENCE: { emoji: '\uD83D\uDD50', label: 'Horario', color: 'text-cyan-400' },
  REJECTION: { emoji: '\u274C', label: 'Rechazo', color: 'text-status-danger' },
}

export default function LearningPanel({ orgId }: LearningPanelProps) {
  const t = useTranslations('doctorLearning')
  const [progress, setProgress] = useState<LearningProgress | null>(null)
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('')
  const [doctorRules, setDoctorRules] = useState<LearnedRule[]>([])
  const [doctorStats, setDoctorStats] = useState<LearningStats | null>(null)
  const [corrections, setCorrections] = useState<DoctorCorrection[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingDoctor, setLoadingDoctor] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [suggestedRule, setSuggestedRule] = useState<{ rule_description: string; rule_type: string; confidence: number } | null>(null)

  const loadProgress = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const data = await getLearningProgress(orgId)
      setProgress(data)
      // Auto-select first doctor
      if (data?.doctors?.length && !selectedDoctorId) {
        setSelectedDoctorId(data.doctors[0].doctor_id)
      }
    } catch (err) {
      Sentry.captureException(err)
    }
    setLoading(false)
  }, [orgId, selectedDoctorId])

  useEffect(() => { loadProgress() }, [loadProgress])

  // Load doctor-specific data when selected
  const loadDoctorData = useCallback(async () => {
    if (!orgId || !selectedDoctorId) return
    setLoadingDoctor(true)
    setSuggestedRule(null)
    try {
      const [rules, stats, hist] = await Promise.allSettled([
        getLearnedRules(orgId, selectedDoctorId),
        getLearningStats(orgId, selectedDoctorId),
        getCorrectionHistory(orgId, selectedDoctorId),
      ])
      if (rules.status === 'fulfilled') setDoctorRules(rules.value)
      if (stats.status === 'fulfilled') setDoctorStats(stats.value)
      if (hist.status === 'fulfilled') setCorrections(hist.value)
    } catch (err) {
      Sentry.captureException(err)
    }
    setLoadingDoctor(false)
  }, [orgId, selectedDoctorId])

  useEffect(() => { loadDoctorData() }, [loadDoctorData])

  const handleExtractPatterns = async () => {
    if (!orgId || !selectedDoctorId) return
    setExtracting(true)
    try {
      await extractPatterns(orgId, selectedDoctorId)
      await loadDoctorData()
    } catch (err) {
      Sentry.captureException(err)
    }
    setExtracting(false)
  }

  const handleSuggestRule = async () => {
    if (!orgId || !selectedDoctorId) return
    setSuggesting(true)
    try {
      const result = await suggestRule(orgId, selectedDoctorId)
      setSuggestedRule(result)
    } catch (err) {
      Sentry.captureException(err)
    }
    setSuggesting(false)
  }

  const handleToggleRule = async (ruleId: string) => {
    if (!orgId) return
    try {
      await deactivateRule(orgId, ruleId)
      setDoctorRules(prev => prev.map(r =>
        r.id === ruleId ? { ...r, is_active: !r.is_active } : r
      ))
    } catch (err) {
      Sentry.captureException(err)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass-card p-4 animate-pulse">
            <div className="h-28 bg-surface-3 rounded-lg" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center">
            <Brain size={20} className="text-brand-purple" />
          </div>
          <div>
            <h3 className="text-lg font-semibold font-mono text-text-primary">{t('title')}</h3>
            <p className="text-xs font-mono text-text-dim">{t('subtitle')}</p>
          </div>
        </div>
        <button
          onClick={loadProgress}
          className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Overview KPIs */}
      {progress && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-brand-purple/10 flex items-center justify-center">
                <Brain size={16} className="text-brand-purple" />
              </div>
              <span className="text-[10px] font-mono text-text-dim uppercase font-semibold">{t('totalCorrections')}</span>
            </div>
            <div className="text-xl font-bold text-brand-purple font-mono">
              {progress.org_total_corrections.toLocaleString()}
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-status-success/10 flex items-center justify-center">
                <Sparkles size={16} className="text-status-success" />
              </div>
              <span className="text-[10px] font-mono text-text-dim uppercase font-semibold">{t('activeRules')}</span>
            </div>
            <div className="text-xl font-bold text-status-success font-mono">
              {progress.org_total_rules}
            </div>
          </div>

          <div className="glass-card p-4 flex items-center justify-center">
            <ConfidenceMeter
              value={progress.org_avg_accuracy * 100}
              size={72}
              label={t('avgAccuracy')}
            />
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-brand-cyan/10 flex items-center justify-center">
                <Brain size={16} className="text-brand-cyan" />
              </div>
              <span className="text-[10px] font-mono text-text-dim uppercase font-semibold">{t('doctors')}</span>
            </div>
            <div className="text-xl font-bold text-brand-cyan font-mono">
              {progress.doctors.length}
            </div>
          </div>
        </div>
      )}

      {/* Doctor selector */}
      {progress && progress.doctors.length > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center gap-3 mb-3">
            <label className="text-xs font-semibold font-mono text-text-muted uppercase tracking-wider">
              {t('selectDoctor')}
            </label>
            <div className="relative flex-1 max-w-xs">
              <select
                value={selectedDoctorId}
                onChange={e => setSelectedDoctorId(e.target.value)}
                className="w-full appearance-none px-3 py-2 pr-8 rounded-lg bg-surface-2 border border-border text-text-primary text-sm outline-none focus:border-brand-purple/40 cursor-pointer"
              >
                {progress.doctors.map(doc => (
                  <option key={doc.doctor_id} value={doc.doctor_id}>
                    {doc.doctor_name} ({doc.corrections} {t('correctionsLabel')}, {doc.rules} {t('rulesLabel')})
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={handleExtractPatterns}
                disabled={extracting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-purple/15 text-brand-purple text-xs font-semibold hover:bg-brand-purple/25 transition-colors disabled:opacity-50"
              >
                {extracting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                {t('extractPatterns')}
              </button>
              <button
                onClick={handleSuggestRule}
                disabled={suggesting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-cyan/15 text-brand-cyan text-xs font-semibold hover:bg-brand-cyan/25 transition-colors disabled:opacity-50"
              >
                {suggesting ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
                {t('suggestRule')}
              </button>
            </div>
          </div>

          {/* Doctor stats */}
          {doctorStats && !loadingDoctor && (
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="bg-surface-3/50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-brand-purple font-mono">{doctorStats.total_corrections}</div>
                <div className="text-[10px] font-mono text-text-dim">{t('correctionsLabel')}</div>
              </div>
              <div className="bg-surface-3/50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-status-success font-mono">{doctorStats.active_rules}</div>
                <div className="text-[10px] font-mono text-text-dim">{t('rulesLabel')}</div>
              </div>
              <div className="bg-surface-3/50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-brand-cyan font-mono">{(doctorStats.accuracy_rate * 100).toFixed(1)}%</div>
                <div className="text-[10px] font-mono text-text-dim">{t('accuracy')}</div>
              </div>
            </div>
          )}

          {/* AI Suggested Rule */}
          {suggestedRule && (
            <div className="bg-brand-purple/8 border border-brand-purple/15 rounded-md p-4 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-brand-purple" />
                <span className="text-xs font-semibold text-brand-purple">{t('aiSuggestion')}</span>
              </div>
              <p className="text-sm text-text-primary mb-2">{suggestedRule.rule_description}</p>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-text-dim">{t('type')}: {suggestedRule.rule_type}</span>
                <ConfidenceBar value={suggestedRule.confidence * 100} className="w-24" />
              </div>
            </div>
          )}

          {/* Loading state for doctor data */}
          {loadingDoctor && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-brand-purple" />
            </div>
          )}

          {/* Learned Rules */}
          {!loadingDoctor && doctorRules.length > 0 && (
            <div className="mb-3">
              <h4 className="text-xs font-semibold font-mono text-text-muted uppercase tracking-wider mb-3">
                {t('learnedRules')} ({doctorRules.length})
              </h4>
              <div className="space-y-2">
                {doctorRules.map(rule => (
                  <div
                    key={rule.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      rule.is_active
                        ? 'bg-surface-3/40 border-border/50'
                        : 'bg-void/30 border-border/30 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary">{rule.rule_description}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-3 border border-border text-[10px] font-semibold text-text-muted">
                            {rule.rule_type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] font-mono text-text-dim">
                            {rule.times_applied} {t('applied')} / {rule.times_correct} {t('correct')}
                          </span>
                        </div>
                        <ConfidenceBar value={rule.confidence * 100} className="mt-2 max-w-[200px]" />
                      </div>

                      {/* Toggle */}
                      <button
                        onClick={() => handleToggleRule(rule.id)}
                        className="flex-shrink-0 mt-1"
                        title={rule.is_active ? t('deactivate') : t('activate')}
                      >
                        {rule.is_active ? (
                          <ToggleRight size={22} className="text-status-success" />
                        ) : (
                          <ToggleLeft size={22} className="text-text-dim" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loadingDoctor && doctorRules.length === 0 && selectedDoctorId && (
            <div className="text-center py-6 mb-3">
              <Brain size={28} className="text-text-dim mx-auto mb-2 opacity-30" />
              <p className="text-sm text-text-dim">{t('noRules')}</p>
              <p className="text-xs text-text-dim mt-1">{t('noRulesHint')}</p>
            </div>
          )}
        </div>
      )}

      {/* Correction History */}
      {!loadingDoctor && corrections.length > 0 && (
        <div className="glass-card p-4">
          <h4 className="text-xs font-semibold font-mono text-text-muted uppercase tracking-wider mb-3">
            {t('correctionHistory')} ({corrections.length})
          </h4>

          <div className="space-y-3">
            {corrections.slice(0, 20).map(correction => {
              const typeCfg = CORRECTION_TYPE_CONFIG[correction.correction_type] || {
                emoji: '\uD83D\uDD27',
                label: correction.correction_type,
                color: 'text-text-muted',
              }
              return (
                <div
                  key={correction.id}
                  className="p-3 rounded-lg bg-surface-3/30 border border-border/50"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">{typeCfg.emoji}</span>
                    <span className={`text-[11px] font-semibold ${typeCfg.color}`}>
                      {typeCfg.label}
                    </span>
                    <span className="text-[10px] text-text-dim ml-auto">
                      {new Date(correction.created_at).toLocaleDateString('es-CO', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Diff-style original vs corrected */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-status-danger/5 border border-status-danger/15 p-2">
                      <span className="text-[9px] text-status-danger font-semibold uppercase block mb-1">
                        {t('original')}
                      </span>
                      <pre className="text-[10px] text-text-muted font-mono whitespace-pre-wrap break-all max-h-16 overflow-y-auto">
                        {JSON.stringify(correction.original_value, null, 1)}
                      </pre>
                    </div>
                    <div className="rounded-lg bg-green-500/5 border border-green-500/15 p-2">
                      <span className="text-[9px] text-green-400 font-semibold uppercase block mb-1">
                        {t('corrected')}
                      </span>
                      <pre className="text-[10px] text-text-muted font-mono whitespace-pre-wrap break-all max-h-16 overflow-y-auto">
                        {JSON.stringify(correction.corrected_value, null, 1)}
                      </pre>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!progress?.doctors?.length && !loading && (
        <div className="glass-card p-8 text-center">
          <Brain size={48} className="text-text-dim mx-auto mb-3 opacity-20" />
          <h4 className="text-sm font-semibold text-text-muted mb-1">{t('noData')}</h4>
          <p className="text-xs text-text-dim max-w-sm mx-auto">{t('noDataHint')}</p>
        </div>
      )}
    </div>
  )
}
