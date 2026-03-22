'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import * as Sentry from '@sentry/nextjs'
import { useToast } from '@/components/ui/toast'
import {
  RefreshCw, Search, CheckCircle2, XCircle, GitMerge,
  ShieldCheck, AlertTriangle, Phone, User, Fingerprint, Activity, Clock,
} from 'lucide-react'
import { scanDuplicates, getDuplicates, confirmDuplicate, dismissDuplicate, getDuplicateStats } from '@/lib/api/duplicates'
import { SimilarityScoreBadge } from '@/components/similarity-score-badge'
import type { DuplicateCandidate, DuplicateStats } from '@/types'

// ============================================================
// DUPLICATES PANEL (P5-11)
// Detects and resolves duplicate patient records
// ============================================================

interface DuplicatesPanelProps {
  orgId: string
}

export default function DuplicatesPanel({ orgId }: DuplicatesPanelProps) {
  const t = useTranslations('duplicates')
  const toast = useToast()

  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([])
  const [stats, setStats] = useState<DuplicateStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [mergeConfirm, setMergeConfirm] = useState<DuplicateCandidate | null>(null)
  const [selectedPrimary, setSelectedPrimary] = useState<'a' | 'b'>('a')
  const [processingId, setProcessingId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const [dupes, st] = await Promise.all([
        getDuplicates(orgId, 'PENDING'),
        getDuplicateStats(orgId),
      ])
      setDuplicates(dupes)
      setStats(st)
    } catch (err) {
      Sentry.captureException(err)
    }
    setLoading(false)
  }, [orgId])

  useEffect(() => { loadData() }, [loadData])

  const handleScan = async () => {
    setScanning(true)
    try {
      const result = await scanDuplicates(orgId)
      if (result) {
        toast.success(t('scanComplete', { found: result.duplicates_found }))
      }
      loadData()
    } catch (err) {
      Sentry.captureException(err)
      toast.error(t('scanError'))
    }
    setScanning(false)
  }

  const handleMerge = async (dup: DuplicateCandidate) => {
    setProcessingId(dup.id)
    const primaryId = selectedPrimary === 'a' ? dup.patient_a_id : dup.patient_b_id
    try {
      await confirmDuplicate(orgId, dup.id, primaryId)
      toast.success(t('mergeSuccess'))
      setMergeConfirm(null)
      loadData()
    } catch (err) {
      Sentry.captureException(err)
      toast.error(t('mergeError'))
    }
    setProcessingId(null)
  }

  const handleDismiss = async (dup: DuplicateCandidate) => {
    setProcessingId(dup.id)
    try {
      await dismissDuplicate(orgId, dup.id)
      toast.success(t('dismissed'))
      loadData()
    } catch (err) {
      Sentry.captureException(err)
      toast.error(t('dismissError'))
    }
    setProcessingId(null)
  }

  const SIGNAL_ICONS: Record<string, typeof User> = {
    name_similarity: User,
    id_match: Fingerprint,
    phone_similarity: Phone,
    behavioral_score: Activity,
    temporal_proximity: Clock,
  }

  return (
    <div className="space-y-5">
      {/* STATS BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<Search size={16} />}
          color="text-brand-purple"
          value={stats?.total_detected ?? 0}
          label={t('stats.detected')}
        />
        <StatCard
          icon={<AlertTriangle size={16} />}
          color="text-status-warning"
          value={stats?.pending_review ?? 0}
          label={t('stats.pending')}
        />
        <StatCard
          icon={<GitMerge size={16} />}
          color="text-status-success"
          value={stats?.merged ?? 0}
          label={t('stats.merged')}
        />
        <StatCard
          icon={<XCircle size={16} />}
          color="text-text-dim"
          value={stats?.dismissed ?? 0}
          label={t('stats.dismissed')}
        />
      </div>

      {/* SCAN BUTTON */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-dim font-mono">{t('subtitle')}</p>
        <button
          onClick={handleScan}
          disabled={scanning}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-purple/8 border border-brand-purple/15 text-brand-purple text-xs font-mono font-semibold hover:bg-brand-purple/15 transition-all disabled:opacity-50"
        >
          <RefreshCw size={13} className={scanning ? 'animate-spin' : ''} />
          {scanning ? t('scanning') : t('scanNow')}
        </button>
      </div>

      {/* DUPLICATE CARDS */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card p-4 animate-pulse">
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-surface-3 rounded w-32" />
                  <div className="h-3 bg-surface-3 rounded w-24" />
                </div>
                <div className="w-16 h-16 bg-surface-3 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-surface-3 rounded w-32" />
                  <div className="h-3 bg-surface-3 rounded w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : duplicates.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <div className="w-16 h-16 rounded-lg bg-status-success/10 border border-status-success/20 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={28} className="text-status-success" />
          </div>
          <h3 className="text-sm font-mono font-semibold text-text-primary mb-1">{t('noDuplicates')}</h3>
          <p className="text-xs font-mono text-text-dim max-w-xs mx-auto">{t('noDuplicatesHint')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {duplicates.map((dup) => (
            <div
              key={dup.id}
              className="glass-card p-4 hover:border-border-2 transition-all group"
            >
              <div className="flex items-center gap-4">
                {/* Patient A */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-9 h-9 rounded-lg bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center text-brand-purple text-xs font-mono font-bold flex-shrink-0">
                      {dup.patient_a_name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-mono font-semibold text-text-primary truncate">
                        {dup.patient_a_name}
                      </p>
                      <p className="text-[11px] text-text-dim font-mono">{dup.patient_a_phone}</p>
                    </div>
                  </div>
                </div>

                {/* Similarity Score */}
                <SimilarityScoreBadge
                  score={dup.similarity_score}
                  signals={dup.signals}
                  size="md"
                />

                {/* Patient B */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 justify-end">
                    <div className="min-w-0 text-right">
                      <p className="text-sm font-mono font-semibold text-text-primary truncate">
                        {dup.patient_b_name}
                      </p>
                      <p className="text-[11px] text-text-dim font-mono">{dup.patient_b_phone}</p>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-status-warning/8 border border-status-warning/15 flex items-center justify-center text-status-warning text-xs font-mono font-bold flex-shrink-0">
                      {dup.patient_b_name?.[0]?.toUpperCase() || '?'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Signal breakdown bar */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                <div className="flex gap-1.5 flex-1">
                  {Object.entries(dup.signals).map(([key, val]) => {
                    if (val === undefined || val === null) return null
                    const isActive = typeof val === 'boolean' ? val : val > 0.3
                    if (!isActive) return null
                    const Icon = SIGNAL_ICONS[key] || Activity
                    const displayVal = typeof val === 'boolean' ? '100' : Math.round(val as number * 100)
                    return (
                      <div
                        key={key}
                        className="flex items-center gap-0.5 px-2 py-1 rounded-md bg-surface-3 border border-border"
                        title={key}
                      >
                        <Icon size={10} className="text-text-muted" />
                        <span className="text-[9px] font-mono text-text-muted">{displayVal}%</span>
                      </div>
                    )
                  })}
                </div>

                {/* Actions */}
                <div className="flex gap-1.5">
                  <button
                    onClick={() => { setMergeConfirm(dup); setSelectedPrimary('a') }}
                    disabled={processingId === dup.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-status-success/10 border border-status-success/20 text-status-success text-[10px] font-semibold hover:bg-status-success/20 transition-colors disabled:opacity-50"
                  >
                    <GitMerge size={11} />
                    {t('merge')}
                  </button>
                  <button
                    onClick={() => handleDismiss(dup)}
                    disabled={processingId === dup.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-3 border border-border text-text-dim text-[10px] font-semibold hover:text-text-muted transition-colors disabled:opacity-50"
                  >
                    <XCircle size={11} />
                    {t('dismiss')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MERGE CONFIRMATION MODAL */}
      {mergeConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card p-4 max-w-md w-full space-y-4 border-brand-purple/20">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-status-success/10 border border-status-success/20 flex items-center justify-center">
                <GitMerge size={18} className="text-status-success" />
              </div>
              <div>
                <h3 className="text-sm font-mono font-bold text-text-primary">{t('mergeConfirmTitle')}</h3>
                <p className="text-[11px] font-mono text-text-dim">{t('mergeConfirmDesc')}</p>
              </div>
            </div>

            {/* Select primary patient */}
            <div className="space-y-2">
              <p className="text-[10px] text-text-dim font-mono font-semibold uppercase tracking-wider">
                {t('selectPrimary')}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedPrimary('a')}
                  className={`flex-1 p-3 rounded-lg border text-left transition-all ${
                    selectedPrimary === 'a'
                      ? 'border-brand-purple/40 bg-brand-purple/5 ring-1 ring-brand-purple/20'
                      : 'border-border hover:border-border-2'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-brand-purple/10 flex items-center justify-center text-brand-purple text-[10px] font-bold">
                      {mergeConfirm.patient_a_name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-mono font-semibold text-text-primary truncate">{mergeConfirm.patient_a_name}</p>
                      <p className="text-[10px] text-text-dim font-mono">{mergeConfirm.patient_a_phone}</p>
                    </div>
                  </div>
                  {selectedPrimary === 'a' && (
                    <div className="mt-2 flex items-center gap-1">
                      <CheckCircle2 size={10} className="text-brand-purple" />
                      <span className="text-[9px] font-semibold text-brand-purple">{t('primaryRecord')}</span>
                    </div>
                  )}
                </button>
                <button
                  onClick={() => setSelectedPrimary('b')}
                  className={`flex-1 p-3 rounded-lg border text-left transition-all ${
                    selectedPrimary === 'b'
                      ? 'border-brand-purple/40 bg-brand-purple/5 ring-1 ring-brand-purple/20'
                      : 'border-border hover:border-border-2'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-status-warning/10 flex items-center justify-center text-status-warning text-[10px] font-bold">
                      {mergeConfirm.patient_b_name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-mono font-semibold text-text-primary truncate">{mergeConfirm.patient_b_name}</p>
                      <p className="text-[10px] text-text-dim font-mono">{mergeConfirm.patient_b_phone}</p>
                    </div>
                  </div>
                  {selectedPrimary === 'b' && (
                    <div className="mt-2 flex items-center gap-1">
                      <CheckCircle2 size={10} className="text-brand-purple" />
                      <span className="text-[9px] font-semibold text-brand-purple">{t('primaryRecord')}</span>
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* What gets merged */}
            <div className="bg-surface-2 rounded-lg p-3 border border-border">
              <p className="text-[10px] text-text-dim font-mono font-semibold uppercase tracking-wider mb-2">
                {t('willConsolidate')}
              </p>
              <ul className="space-y-1 text-xs font-mono text-text-muted">
                <li className="flex items-center gap-1.5"><CheckCircle2 size={10} className="text-status-success" /> {t('consolidateHistory')}</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 size={10} className="text-status-success" /> {t('consolidateAppointments')}</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 size={10} className="text-status-success" /> {t('consolidateNotes')}</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 size={10} className="text-status-success" /> {t('consolidatePayments')}</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setMergeConfirm(null)}
                className="flex-1 px-4 py-2 rounded-lg bg-surface-3 border border-border text-text-muted text-xs font-mono font-semibold hover:text-text-primary transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => handleMerge(mergeConfirm)}
                disabled={processingId === mergeConfirm.id}
                className="flex-1 px-4 py-2 rounded-lg bg-status-success/15 border border-status-success/25 text-status-success text-xs font-mono font-semibold hover:bg-status-success/25 transition-colors disabled:opacity-50"
              >
                {processingId === mergeConfirm.id ? t('merging') : t('confirmMerge')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, color, value, label }: {
  icon: React.ReactNode
  color: string
  value: number
  label: string
}) {
  return (
    <div className="glass-card p-3">
      <div className={`w-8 h-8 rounded-md bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center ${color} mb-2`}>
        {icon}
      </div>
      <div className="text-lg font-bold font-mono text-text-primary">{value}</div>
      <div className="text-[10px] font-mono text-text-muted mt-0.5">{label}</div>
    </div>
  )
}
