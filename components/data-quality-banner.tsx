'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, X, RefreshCw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useOrg } from '@/lib/org-context'
import {
  fetchDataQualityAlerts,
  runDataQualityCheck,
  dismissDataQualityAlert,
  type DataQualityAlert,
} from '@/lib/api/zombies'
import * as Sentry from '@sentry/nextjs'

/**
 * Sentient Data Quality Banner
 * - Auto-loads on mount, polls every 5 min while open
 * - Hidden if no CRITICAL/WARN alerts
 * - One-click "recheck" runs a fresh check
 * - Per-row dismiss
 */
export function DataQualityBanner() {
  const { orgId, role } = useOrg()
  const t = useTranslations('dataQuality')
  const [alerts, setAlerts] = useState<DataQualityAlert[]>([])
  const [collapsed, setCollapsed] = useState(false)
  const [running, setRunning] = useState(false)

  const load = async () => {
    if (!orgId) return
    try {
      const res = await fetchDataQualityAlerts(orgId, { limit: 10 })
      setAlerts(res.alerts || [])
    } catch (err) {
      Sentry.captureException(err, { tags: { feature: 'data_quality_banner' } })
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  if (role === 'STAFF') return null
  if (!alerts.length || collapsed) return null

  const critical = alerts.filter(a => a.severity === 'CRITICAL')
  const warn = alerts.filter(a => a.severity === 'WARN')
  const tone = critical.length > 0 ? 'critical' : 'warn'

  const handleRecheck = async () => {
    if (!orgId || running) return
    setRunning(true)
    try {
      await runDataQualityCheck(orgId)
      await load()
    } catch (err) {
      Sentry.captureException(err, { tags: { feature: 'data_quality_banner', action: 'recheck' } })
    } finally {
      setRunning(false)
    }
  }

  const handleDismiss = async (id: string) => {
    if (!orgId) return
    setAlerts(prev => prev.filter(a => a.id !== id))
    try {
      await dismissDataQualityAlert(orgId, id)
    } catch (err) {
      Sentry.captureException(err, { tags: { feature: 'data_quality_banner', action: 'dismiss' } })
      load()
    }
  }

  const issueLabel = (a: DataQualityAlert): string => {
    const knownColumns = ['national_id', 'date_of_birth', 'full_name', 'email', 'phone']
    const colKey = a.column_name && knownColumns.includes(a.column_name) ? a.column_name : null
    const col = colKey ? t(`columns.${colKey}`) : (a.column_name || a.issue_type)

    if (a.issue_type === 'high_null_pct') {
      return t('highNullPct', {
        pct: a.pct_affected,
        col,
        affected: a.affected_rows,
        total: a.total_rows,
      })
    }
    if (a.issue_type === 'missing_aliases') {
      return t('missingAliases', { count: a.affected_rows })
    }
    return `${a.table_name}.${a.column_name || '—'} · ${a.issue_type}`
  }

  const colors = tone === 'critical'
    ? 'border-status-danger/30 bg-status-danger/[0.04]'
    : 'border-status-warning/30 bg-status-warning/[0.04]'
  const iconColor = tone === 'critical' ? 'text-status-danger' : 'text-status-warning'

  return (
    <div
      className={`glass-card mb-4 px-4 py-3 border ${colors} flex items-start gap-3`}
      style={{
        boxShadow: tone === 'critical'
          ? '0 0 0 1px rgba(239,68,68,0.10), 0 8px 28px -10px rgba(239,68,68,0.20)'
          : '0 0 0 1px rgba(245,200,66,0.10), 0 8px 28px -10px rgba(245,200,66,0.18)',
      }}
    >
      <AlertTriangle size={16} className={`${iconColor} mt-0.5 flex-shrink-0`} strokeWidth={1.8} />

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1.5">
          <h3 className="text-[12.5px] font-display font-semibold tracking-tight text-text-primary">
            {t('title')}
          </h3>
          <span className="text-[10.5px] font-mono text-text-dim">
            {critical.length > 0 && t(critical.length === 1 ? 'critical' : 'criticalPlural', { count: critical.length })}
            {critical.length > 0 && warn.length > 0 && ' · '}
            {warn.length > 0 && t(warn.length === 1 ? 'warn' : 'warnPlural', { count: warn.length })}
          </span>
        </div>

        <ul className="space-y-1">
          {alerts.slice(0, 5).map(a => (
            <li key={a.id} className="flex items-start gap-2 text-[12px] font-body leading-relaxed">
              <span className={`mt-1 w-1 h-1 rounded-full flex-shrink-0 ${
                a.severity === 'CRITICAL' ? 'bg-status-danger' : 'bg-status-warning'
              }`} />
              <span className="flex-1 text-text-muted">{issueLabel(a)}</span>
              <button
                onClick={() => handleDismiss(a.id)}
                className="text-text-dim hover:text-text-primary transition-colors text-[10.5px] font-mono uppercase tracking-wider"
                title={t('dismissTooltip')}
              >
                {t('dismiss')}
              </button>
            </li>
          ))}
          {alerts.length > 5 && (
            <li className="text-[11px] font-mono text-text-dim pl-3">
              {t('moreAlerts', { count: alerts.length - 5 })}
            </li>
          )}
        </ul>

        <div className="mt-2.5 flex items-center gap-3 pt-2 border-t border-border/30">
          <button
            onClick={handleRecheck}
            disabled={running}
            className="text-[11px] font-mono uppercase tracking-wider text-brand-purple hover:text-brand-purple-light transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw size={11} className={running ? 'animate-spin' : ''} strokeWidth={1.8} />
            {running ? t('checking') : t('recheck')}
          </button>
          <span className="text-text-dim text-[10.5px] font-mono">·</span>
          <span className="text-text-dim text-[10.5px] font-mono">
            {t('autoCapture')}
          </span>
        </div>
      </div>

      <button
        onClick={() => setCollapsed(true)}
        className="text-text-dim hover:text-text-primary transition-colors flex-shrink-0"
        aria-label={t('close')}
      >
        <X size={13} />
      </button>
    </div>
  )
}
