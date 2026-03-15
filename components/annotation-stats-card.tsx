'use client'

import { useEffect, useState, useCallback } from 'react'
import { ThumbsUp, ThumbsDown, BarChart3, RefreshCw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { getAnnotationStats } from '@/lib/api/annotations'
import type { AnnotationStats } from '@/lib/api/annotations'

// ============================================================
// ANNOTATION STATS CARD (P4-06)
// Shows annotation statistics: total, positive/negative rate
// Designed to integrate into the Data Lake page
// ============================================================

interface AnnotationStatsCardProps {
  orgId: string
  className?: string
}

export function AnnotationStatsCard({ orgId, className = '' }: AnnotationStatsCardProps) {
  const t = useTranslations('annotations')
  const [stats, setStats] = useState<AnnotationStats | null>(null)
  const [loading, setLoading] = useState(true)

  const loadStats = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAnnotationStats(orgId)
      setStats(data)
    } catch {
      // Stats load failed -- show empty state
    }
    setLoading(false)
  }, [orgId])

  useEffect(() => { loadStats() }, [loadStats])

  const approvalPct = stats?.approval_rate ?? 0
  const rejectionPct = stats?.total ? ((stats.thumbs_down / stats.total) * 100) : 0

  return (
    <div className={`glass-card p-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
          <BarChart3 size={14} className="text-brand-purple" />
          {t('statsTitle')}
        </h3>
        <button
          onClick={loadStats}
          disabled={loading}
          className="w-6 h-6 rounded-md bg-surface-3 border border-border flex items-center justify-center text-text-dim hover:text-text-primary transition-colors disabled:opacity-50"
          aria-label={t('refresh')}
        >
          <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && !stats ? (
        /* Skeleton */
        <div className="space-y-3 animate-pulse">
          <div className="h-12 bg-surface-3 rounded-lg" />
          <div className="h-3 bg-surface-3 rounded w-3/4" />
          <div className="h-3 bg-surface-3 rounded w-1/2" />
        </div>
      ) : !stats || stats.total === 0 ? (
        /* Empty state */
        <div className="text-center py-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <ThumbsUp size={16} className="text-text-dim" />
            <ThumbsDown size={16} className="text-text-dim" />
          </div>
          <p className="text-text-dim text-xs">{t('noAnnotations')}</p>
          <p className="text-text-dim text-[10px] mt-1">{t('noAnnotationsHint')}</p>
        </div>
      ) : (
        <>
          {/* Total count */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-purple/15 to-brand-cyan/15 border border-brand-purple/10 flex items-center justify-center">
              <span className="text-lg font-bold text-brand-purple font-mono">{stats.total}</span>
            </div>
            <div>
              <div className="text-sm font-semibold text-text-primary">{t('totalAnnotations')}</div>
              <div className="text-[10px] text-text-dim">{t('humanFeedback')}</div>
            </div>
          </div>

          {/* Approval / Rejection bars */}
          <div className="space-y-3">
            {/* Thumbs up bar */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <ThumbsUp size={11} className="text-status-success" />
                  <span className="text-[11px] text-text-muted font-medium">{t('positive')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-status-success font-mono">{stats.thumbs_up}</span>
                  <span className="text-[10px] text-text-dim font-mono">({approvalPct.toFixed(1)}%)</span>
                </div>
              </div>
              <div className="h-2.5 bg-void rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-status-success/80 to-status-success rounded-full transition-all duration-500"
                  style={{ width: `${approvalPct}%` }}
                />
              </div>
            </div>

            {/* Thumbs down bar */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <ThumbsDown size={11} className="text-status-danger" />
                  <span className="text-[11px] text-text-muted font-medium">{t('negative')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-status-danger font-mono">{stats.thumbs_down}</span>
                  <span className="text-[10px] text-text-dim font-mono">({rejectionPct.toFixed(1)}%)</span>
                </div>
              </div>
              <div className="h-2.5 bg-void rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-status-danger/80 to-status-danger rounded-full transition-all duration-500"
                  style={{ width: `${rejectionPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Approval rate summary */}
          <div className="mt-4 pt-3 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-text-dim uppercase font-semibold tracking-wider">{t('approvalRate')}</span>
              <span className={`text-sm font-bold font-mono ${
                approvalPct >= 80 ? 'text-status-success' :
                approvalPct >= 50 ? 'text-status-warning' :
                'text-status-danger'
              }`}>
                {approvalPct.toFixed(1)}%
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
