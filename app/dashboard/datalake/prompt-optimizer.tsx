'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Sparkles, Play, Loader2, CheckCircle, XCircle, Clock,
  ChevronDown, ChevronUp, Lightbulb, AlertTriangle, BarChart3,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  triggerPromptAnalysis,
  getPromptSuggestions,
  updatePromptSuggestion,
} from '@/lib/api/prompt-optimizer'
import type { PromptSuggestion, SuggestionStatus } from '@/lib/api/prompt-optimizer'

// ============================================================
// PROMPT OPTIMIZER PANEL (P4-08)
// Analyze conversations and apply AI-suggested prompt improvements
// ============================================================

interface PromptOptimizerProps {
  orgId: string
}

const STATUS_CONFIG: Record<SuggestionStatus, { icon: typeof CheckCircle; color: string; bg: string; label: string }> = {
  PENDING:  { icon: Clock,       color: 'text-status-warning', bg: 'bg-status-warning/10 border-status-warning/20', label: 'pending' },
  APPLIED:  { icon: CheckCircle, color: 'text-status-success', bg: 'bg-status-success/10 border-status-success/20', label: 'applied' },
  REJECTED: { icon: XCircle,     color: 'text-status-danger',  bg: 'bg-status-danger/10 border-status-danger/20',   label: 'rejected' },
}

export default function PromptOptimizer({ orgId }: PromptOptimizerProps) {
  const t = useTranslations('promptOptimizer')
  const [suggestions, setSuggestions] = useState<PromptSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisMessage, setAnalysisMessage] = useState<string | null>(null)

  const loadSuggestions = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getPromptSuggestions(orgId)
      setSuggestions(data)
    } catch {
      // Load failed -- show empty
    }
    setLoading(false)
  }, [orgId])

  useEffect(() => { loadSuggestions() }, [loadSuggestions])

  const handleAnalyze = async () => {
    setAnalyzing(true)
    setAnalysisMessage(null)
    try {
      const result = await triggerPromptAnalysis(orgId)
      if (result) {
        setAnalysisMessage(result.message)
        // Reload suggestions after analysis
        await loadSuggestions()
      } else {
        setAnalysisMessage(t('analysisError'))
      }
    } catch {
      setAnalysisMessage(t('analysisError'))
    }
    setAnalyzing(false)
  }

  const handleUpdateStatus = async (suggestionId: string, status: 'APPLIED' | 'REJECTED') => {
    try {
      const result = await updatePromptSuggestion(orgId, suggestionId, status)
      if (result.ok) {
        setSuggestions(prev => prev.map(s =>
          s.id === suggestionId
            ? {
                ...s,
                status,
                ...(status === 'APPLIED' ? { applied_at: new Date().toISOString() } : {}),
                ...(status === 'REJECTED' ? { rejected_at: new Date().toISOString() } : {}),
              }
            : s
        ))
      }
    } catch {
      // Update failed
    }
  }

  // Group suggestions by status
  const pendingCount = suggestions.filter(s => s.status === 'PENDING').length
  const appliedCount = suggestions.filter(s => s.status === 'APPLIED').length
  const rejectedCount = suggestions.filter(s => s.status === 'REJECTED').length

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center">
              <Sparkles size={18} className="text-brand-purple" />
            </div>
            <div>
              <h3 className="text-sm font-semibold font-mono text-text-primary">{t('title')}</h3>
              <p className="text-[10px] font-mono text-text-dim">{t('subtitle')}</p>
            </div>
          </div>

          {/* Analyze button */}
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-brand-purple text-white font-semibold font-mono text-xs transition-all hover:bg-brand-purple-dark disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {analyzing ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {t('analyzing')}
              </>
            ) : (
              <>
                <Play size={14} />
                {t('analyzeButton')}
              </>
            )}
          </button>
        </div>

        {/* Description */}
        <p className="text-xs text-text-muted leading-relaxed mb-3">
          {t('description')}
        </p>

        {/* Quick stats */}
        {suggestions.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-void/50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-status-warning font-mono">{pendingCount}</div>
              <div className="text-[10px] font-mono text-text-dim">{t('statusLabels.pending')}</div>
            </div>
            <div className="bg-void/50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-status-success font-mono">{appliedCount}</div>
              <div className="text-[10px] font-mono text-text-dim">{t('statusLabels.applied')}</div>
            </div>
            <div className="bg-void/50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-status-danger font-mono">{rejectedCount}</div>
              <div className="text-[10px] font-mono text-text-dim">{t('statusLabels.rejected')}</div>
            </div>
          </div>
        )}

        {/* Analysis result message */}
        {analysisMessage && (
          <div className="mt-4 px-3 py-2.5 rounded-lg bg-brand-purple/8 border border-brand-purple/15 text-xs text-brand-purple-light flex items-center gap-2 animate-fade-in">
            <Lightbulb size={14} className="flex-shrink-0" />
            {analysisMessage}
          </div>
        )}
      </div>

      {/* Suggestions list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card p-4 animate-pulse">
              <div className="h-4 bg-surface-3 rounded w-48 mb-3" />
              <div className="h-3 bg-surface-3 rounded w-full mb-2" />
              <div className="h-3 bg-surface-3 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : suggestions.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <div className="w-14 h-14 rounded-lg bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center mx-auto mb-3">
            <Sparkles size={24} className="text-brand-purple/40" />
          </div>
          <p className="text-text-muted text-sm font-medium">{t('noSuggestions')}</p>
          <p className="text-text-dim text-xs mt-1">{t('noSuggestionsHint')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map(suggestion => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              onApply={() => handleUpdateStatus(suggestion.id, 'APPLIED')}
              onReject={() => handleUpdateStatus(suggestion.id, 'REJECTED')}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// SUGGESTION CARD
// ============================================================

function SuggestionCard({
  suggestion,
  onApply,
  onReject,
}: {
  suggestion: PromptSuggestion
  onApply: () => void
  onReject: () => void
}) {
  const t = useTranslations('promptOptimizer')
  const [expandedCurrent, setExpandedCurrent] = useState(false)
  const [expandedSuggested, setExpandedSuggested] = useState(true)
  const [actionLoading, setActionLoading] = useState<'apply' | 'reject' | null>(null)

  const statusCfg = STATUS_CONFIG[suggestion.status]
  const StatusIcon = statusCfg.icon

  const handleAction = async (action: 'apply' | 'reject') => {
    setActionLoading(action)
    if (action === 'apply') await onApply()
    else await onReject()
    setActionLoading(null)
  }

  // Confidence color
  const confidenceColor = suggestion.confidence_score >= 0.8
    ? 'text-status-success bg-status-success/10 border-status-success/20'
    : suggestion.confidence_score >= 0.5
      ? 'text-status-warning bg-status-warning/10 border-status-warning/20'
      : 'text-status-danger bg-status-danger/10 border-status-danger/20'

  // Format timestamp
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return ''
    try {
      return new Date(dateStr).toLocaleDateString('es-CO', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    } catch { return '' }
  }

  return (
    <div className="glass-card p-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {/* Status badge */}
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusCfg.bg} ${statusCfg.color}`}>
            <StatusIcon size={10} />
            {t(`statusLabels.${statusCfg.label}`)}
          </span>

          {/* Confidence badge */}
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${confidenceColor}`}>
            <BarChart3 size={9} />
            {(suggestion.confidence_score * 100).toFixed(0)}%
          </span>

          {/* Patterns badge */}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-text-dim bg-surface-3 border border-border">
            {t('patternsAnalyzed', { count: suggestion.patterns_analyzed })}
          </span>
        </div>

        <span className="text-[10px] font-mono text-text-dim">
          {formatDate(suggestion.created_at)}
        </span>
      </div>

      {/* Reasoning */}
      <div className="mb-3 px-3 py-2.5 rounded-lg bg-surface-3 border border-border">
        <div className="flex items-start gap-2">
          <Lightbulb size={13} className="text-status-warning mt-0.5 flex-shrink-0" />
          <p className="text-xs text-text-muted leading-relaxed">{suggestion.reasoning}</p>
        </div>
      </div>

      {/* Current prompt (collapsible) */}
      <div className="mb-3">
        <button
          onClick={() => setExpandedCurrent(!expandedCurrent)}
          className="flex items-center gap-1.5 w-full text-left mb-1"
        >
          {expandedCurrent ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          <span className="text-[10px] text-text-dim uppercase font-semibold tracking-wider">
            {t('currentPrompt')}
          </span>
        </button>
        {expandedCurrent && (
          <div className="bg-void rounded-lg p-3 animate-fade-in">
            <pre className="text-[10px] text-text-dim font-mono whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
              {suggestion.current_prompt || t('noPromptSet')}
            </pre>
          </div>
        )}
      </div>

      {/* Suggested prompt (expanded by default) */}
      <div className="mb-3">
        <button
          onClick={() => setExpandedSuggested(!expandedSuggested)}
          className="flex items-center gap-1.5 w-full text-left mb-1"
        >
          {expandedSuggested ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          <span className="text-[10px] text-brand-purple uppercase font-semibold tracking-wider">
            {t('suggestedPrompt')}
          </span>
        </button>
        {expandedSuggested && (
          <div className="bg-brand-purple/5 border border-brand-purple/15 rounded-lg p-3 animate-fade-in">
            <pre className="text-[11px] text-text-secondary font-mono whitespace-pre-wrap break-words max-h-60 overflow-y-auto leading-relaxed">
              {suggestion.suggested_prompt}
            </pre>
          </div>
        )}
      </div>

      {/* Action buttons -- only for PENDING */}
      {suggestion.status === 'PENDING' ? (
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <button
            onClick={() => handleAction('reject')}
            disabled={actionLoading !== null}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-semibold text-status-danger bg-status-danger/8 border border-status-danger/20 hover:bg-status-danger/15 transition-colors disabled:opacity-50"
          >
            {actionLoading === 'reject' ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <XCircle size={11} />
            )}
            {t('reject')}
          </button>
          <button
            onClick={() => handleAction('apply')}
            disabled={actionLoading !== null}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[11px] font-semibold font-mono text-white bg-status-success hover:bg-status-success/80 transition-all disabled:opacity-50"
          >
            {actionLoading === 'apply' ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <CheckCircle size={11} />
            )}
            {t('apply')}
          </button>
        </div>
      ) : (
        /* Applied / Rejected timestamp */
        <div className="pt-3 border-t border-border">
          <div className="flex items-center gap-1.5 text-[10px] text-text-dim">
            <StatusIcon size={10} className={statusCfg.color} />
            <span>
              {suggestion.status === 'APPLIED'
                ? t('appliedAt', { date: formatDate(suggestion.applied_at) })
                : t('rejectedAt', { date: formatDate(suggestion.rejected_at) })}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
