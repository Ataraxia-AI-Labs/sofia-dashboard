'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import * as Sentry from '@sentry/nextjs'
import {
  scanOutreach, getOutreach, approveOutreach, approveBatch,
  rejectOutreach, getOutreachStats, generateMessage,
} from '@/lib/api/outreach'
import { OutreachTriggerBadge, TRIGGER_CONFIG } from '@/components/outreach-trigger-badge'
import { timeAgo } from '@/lib/api/helpers'
import type { OutreachMessage, OutreachStats, OutreachTriggerType } from '@/types'
import {
  Radar, Check, X, RefreshCw, Sparkles, Send, Clock,
  CheckCheck, MessageSquare, TrendingUp, User, Loader2,
} from 'lucide-react'

interface OutreachPanelProps {
  orgId: string
}

export default function OutreachPanel({ orgId }: OutreachPanelProps) {
  const t = useTranslations('outreach')

  const [messages, setMessages] = useState<OutreachMessage[]>([])
  const [stats, setStats] = useState<OutreachStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [triggerFilter, setTriggerFilter] = useState<string>('')
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [msgs, st] = await Promise.all([
        getOutreach(orgId, triggerFilter ? { trigger_type: triggerFilter } : undefined),
        getOutreachStats(orgId),
      ])
      setMessages(msgs)
      setStats(st)
    } catch (err) {
      Sentry.captureException(err)
    }
    setLoading(false)
  }, [orgId, triggerFilter])

  useEffect(() => { loadData() }, [loadData])

  const handleScan = async () => {
    setScanning(true)
    setScanResult(null)
    try {
      const result = await scanOutreach(orgId)
      setScanResult(t('scanFound', { count: result.found }))
      loadData()
    } catch (err) {
      Sentry.captureException(err)
    }
    setScanning(false)
  }

  const handleApprove = async (id: string) => {
    try {
      await approveOutreach(orgId, id)
      loadData()
    } catch (err) {
      Sentry.captureException(err)
    }
  }

  const handleReject = async (id: string) => {
    try {
      await rejectOutreach(orgId, id)
      loadData()
    } catch (err) {
      Sentry.captureException(err)
    }
  }

  const handleApproveAll = async () => {
    const pendingIds = messages.filter(m => m.status === 'PENDING').map(m => m.id)
    if (pendingIds.length === 0) return
    try {
      await approveBatch(orgId, pendingIds)
      loadData()
    } catch (err) {
      Sentry.captureException(err)
    }
  }

  const handleRegenerate = async (msg: OutreachMessage) => {
    setRegeneratingId(msg.id)
    try {
      await generateMessage(orgId, msg.patient_id, msg.trigger_type)
      loadData()
    } catch (err) {
      Sentry.captureException(err)
    }
    setRegeneratingId(null)
  }

  const pendingCount = messages.filter(m => m.status === 'PENDING').length
  const TRIGGER_TYPES: OutreachTriggerType[] = [
    'TREATMENT_CYCLE', 'LEAD_NURTURE', 'BIRTHDAY', 'PREVENTIVE',
    'REACTIVATION', 'POST_TREATMENT', 'SEASONAL',
  ]

  return (
    <div className="space-y-5">
      {/* STATS BAR */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <StatPill icon={<Clock size={13} />} value={stats.pending} label={t('statsPending')} color="text-status-warning" />
          <StatPill icon={<Check size={13} />} value={stats.approved} label={t('statsApproved')} color="text-status-info" />
          <StatPill icon={<Send size={13} />} value={stats.sent} label={t('statsSent')} color="text-brand-purple" />
          <StatPill icon={<CheckCheck size={13} />} value={stats.delivered} label={t('statsDelivered')} color="text-brand-cyan" />
          <StatPill icon={<MessageSquare size={13} />} value={stats.responded} label={t('statsResponded')} color="text-brand-gold" />
          <StatPill icon={<TrendingUp size={13} />} value={stats.converted} label={t('statsConverted')} color="text-status-success" />
          <StatPill icon={<X size={13} />} value={stats.rejected} label={t('statsRejected')} color="text-text-dim" />
        </div>
      )}

      {/* SCAN + BULK ACTIONS */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handleScan}
            disabled={scanning}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-purple to-brand-cyan text-white text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg"
          >
            {scanning ? <Loader2 size={14} className="animate-spin" /> : <Radar size={14} />}
            {scanning ? t('scanning') : t('scanOpportunities')}
          </button>
          {scanResult && (
            <span className="text-xs text-status-success font-medium animate-fade-in">{scanResult}</span>
          )}
        </div>

        {pendingCount > 0 && (
          <button
            onClick={handleApproveAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-status-success/10 border border-status-success/20 text-status-success text-xs font-semibold hover:bg-status-success/20 transition-colors"
          >
            <CheckCheck size={13} />
            {t('approveAllPending', { count: pendingCount })}
          </button>
        )}
      </div>

      {/* TRIGGER TYPE FILTERS */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setTriggerFilter('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            !triggerFilter
              ? 'bg-brand-purple/15 text-brand-purple border border-brand-purple/25'
              : 'bg-surface-2 text-text-muted border border-border hover:border-border-2'
          }`}
        >
          {t('allTriggers')}
        </button>
        {TRIGGER_TYPES.map(type => {
          const cfg = TRIGGER_CONFIG[type]
          const count = messages.filter(m => m.trigger_type === type).length
          return (
            <button
              key={type}
              onClick={() => setTriggerFilter(triggerFilter === type ? '' : type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                triggerFilter === type
                  ? `${cfg.bg} ${cfg.color} border ${cfg.border}`
                  : 'bg-surface-2 text-text-muted border border-border hover:border-border-2'
              }`}
            >
              <cfg.icon size={11} />
              {cfg.label}
              {count > 0 && (
                <span className="text-[9px] font-mono">{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* OUTREACH CARDS */}
      <div className="space-y-3">
        {loading && messages.length === 0 ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="h-5 bg-surface-3 rounded w-48 mb-3" />
              <div className="h-4 bg-surface-3 rounded w-72" />
            </div>
          ))
        ) : messages.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Radar size={32} className="mx-auto text-text-dim mb-3" />
            <p className="text-text-muted text-sm">{t('noOutreach')}</p>
            <p className="text-text-dim text-xs mt-1">{t('noOutreachHint')}</p>
          </div>
        ) : (
          messages.map(msg => {
            const isPending = msg.status === 'PENDING'
            const statusColor = msg.status === 'PENDING' ? 'text-status-warning'
              : msg.status === 'APPROVED' ? 'text-status-info'
              : msg.status === 'SENT' ? 'text-brand-purple'
              : msg.status === 'CONVERTED' ? 'text-status-success'
              : msg.status === 'REJECTED' ? 'text-status-danger'
              : 'text-text-muted'

            return (
              <div key={msg.id} className="glass-card p-5 hover:border-border-2 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <OutreachTriggerBadge triggerType={msg.trigger_type} compact />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="flex items-center gap-1 text-sm font-semibold text-text-primary">
                          <User size={12} className="text-text-dim" />
                          {msg.patient_name}
                        </span>
                        <OutreachTriggerBadge triggerType={msg.trigger_type} />
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-surface-2 border-border ${statusColor}`}>
                          {msg.status}
                        </span>
                      </div>

                      {/* AI Message preview */}
                      <div className="relative px-3 py-2.5 rounded-lg bg-surface-2 border border-border mb-2">
                        <Sparkles size={10} className="absolute top-2 right-2 text-brand-purple/40" />
                        <p className="text-xs text-text-muted leading-relaxed line-clamp-3 pr-4">
                          {msg.message}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-[11px] text-text-dim">
                        {msg.scheduled_at && (
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(msg.scheduled_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        )}
                        <span>{timeAgo(msg.created_at)}</span>
                        <span className="uppercase text-[9px] font-semibold">{msg.channel}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {isPending && (
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleApprove(msg.id)}
                        className="w-8 h-8 rounded-lg bg-status-success/10 border border-status-success/20 flex items-center justify-center text-status-success hover:bg-status-success/20 transition-colors"
                        title={t('approve')}
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => handleReject(msg.id)}
                        className="w-8 h-8 rounded-lg bg-status-danger/10 border border-status-danger/20 flex items-center justify-center text-status-danger hover:bg-status-danger/20 transition-colors"
                        title={t('reject')}
                      >
                        <X size={14} />
                      </button>
                      <button
                        onClick={() => handleRegenerate(msg)}
                        disabled={regeneratingId === msg.id}
                        className="w-8 h-8 rounded-lg bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple hover:bg-brand-purple/20 transition-colors disabled:opacity-50"
                        title={t('regenerate')}
                      >
                        <RefreshCw size={14} className={regeneratingId === msg.id ? 'animate-spin' : ''} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function StatPill({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) {
  return (
    <div className="glass-card px-3 py-2.5 flex items-center gap-2">
      <span className={color}>{icon}</span>
      <div>
        <div className={`text-lg font-bold font-mono ${color}`}>{value}</div>
        <div className="text-[9px] text-text-dim uppercase tracking-wider">{label}</div>
      </div>
    </div>
  )
}
