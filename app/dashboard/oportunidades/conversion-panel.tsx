'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  TrendingUp, RefreshCw, Loader2, Zap, Phone,
  User, Clock, Calendar, Target, ArrowUpRight,
  ArrowDownRight, BarChart3,
} from 'lucide-react'
import {
  getConversionInsights, getFollowUpQueue, predictAll,
} from '@/lib/api/conversions'
import { ConversionProbabilityBadge } from '@/components/conversion-probability-badge'
import type { ConversionInsights, FollowUpItem } from '@/types'

// ============================================================
// CONVERSION PREDICTION PANEL (P4-05)
// Heatmap, quincena effect, follow-up queue, insights
// ============================================================

interface ConversionPanelProps {
  orgId: string
}

// Business hours range for the heatmap display
const BUSINESS_HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
const DAY_LABELS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

function getHeatColor(value: number): string {
  if (value >= 0.8) return 'bg-status-success/80'
  if (value >= 0.6) return 'bg-status-success/50'
  if (value >= 0.4) return 'bg-status-warning/50'
  if (value >= 0.2) return 'bg-status-warning/30'
  if (value > 0) return 'bg-status-danger/20'
  return 'bg-surface-3'
}

export default function ConversionPanel({ orgId }: ConversionPanelProps) {
  const t = useTranslations('conversions')
  const tCommon = useTranslations('common')

  const [insights, setInsights] = useState<ConversionInsights | null>(null)
  const [queue, setQueue] = useState<FollowUpItem[]>([])
  const [loading, setLoading] = useState(true)
  const [predictingAll, setPredictingAll] = useState(false)
  const [predictResult, setPredictResult] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [insightsData, queueData] = await Promise.all([
        getConversionInsights(orgId),
        getFollowUpQueue(orgId),
      ])
      setInsights(insightsData)
      setQueue(queueData)
    } catch {
      // Load failed
    }
    setLoading(false)
  }, [orgId])

  useEffect(() => { loadData() }, [loadData])

  const handlePredictAll = async () => {
    setPredictingAll(true)
    setPredictResult(null)
    try {
      const result = await predictAll(orgId)
      if (result) {
        setPredictResult(result.message)
        loadData()
      }
    } catch {
      // Predict all failed
    }
    setPredictingAll(false)
  }

  const avgRate = insights?.avg_conversion_rate ?? 0
  const quincenaBoost = insights?.quincena_boost ?? 0
  const topFactors = insights?.top_factors ?? []
  const heatmap = insights?.heatmap ?? {}
  const totalPredicted = insights?.total_predicted ?? 0

  return (
    <div className="space-y-4">
      {/* Header + Predict All */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
            <TrendingUp size={14} className="text-brand-purple" />
            {t('title')}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="w-7 h-7 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-dim hover:text-text-primary transition-colors"
              aria-label={tCommon('refresh')}
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handlePredictAll}
              disabled={predictingAll}
              className="px-3 py-1.5 rounded-md bg-brand-purple text-white text-xs font-body font-semibold flex items-center gap-1.5 disabled:opacity-50 hover:bg-brand-purple-dark transition-colors"
            >
              {predictingAll ? (
                <><Loader2 size={12} className="animate-spin" /> {t('predicting')}</>
              ) : (
                <><Zap size={12} /> {t('predictAll')}</>
              )}
            </button>
          </div>
        </div>

        {predictResult && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-status-success/10 border border-status-success/20 text-status-success text-xs">
            {predictResult}
          </div>
        )}

        {/* Summary Cards */}
        {loading && !insights ? (
          <div className="grid grid-cols-3 gap-3 animate-pulse">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-surface-3 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <div className="bg-void/50 rounded-lg p-3 border border-border">
              <div className="text-[11px] font-body text-text-dim uppercase">{t('avgConversionRate')}</div>
              <div className={`text-xl font-bold font-mono ${
                avgRate >= 0.7 ? 'text-status-success' : avgRate >= 0.4 ? 'text-status-warning' : 'text-status-danger'
              }`}>
                {Math.round(avgRate * 100)}%
              </div>
            </div>
            <div className="bg-void/50 rounded-lg p-3 border border-border">
              <div className="text-[11px] font-body text-text-dim uppercase">{t('quincenaEffect')}</div>
              <div className="flex items-center gap-1">
                <span className={`text-xl font-bold font-mono ${
                  quincenaBoost > 0 ? 'text-status-success' : 'text-text-muted'
                }`}>
                  {quincenaBoost > 0 ? '+' : ''}{Math.round(quincenaBoost * 100)}%
                </span>
                {quincenaBoost > 0 && <ArrowUpRight size={14} className="text-status-success" />}
              </div>
              <div className="text-[8px] text-text-dim mt-0.5">{t('quincenaHint')}</div>
            </div>
            <div className="bg-void/50 rounded-lg p-3 border border-border">
              <div className="text-[11px] font-body text-text-dim uppercase">{t('totalPredicted')}</div>
              <div className="text-xl font-bold font-mono text-text-primary">{totalPredicted}</div>
            </div>
            <div className="bg-void/50 rounded-lg p-3 border border-border">
              <div className="text-[11px] font-body text-text-dim uppercase">{t('queueSize')}</div>
              <div className="text-xl font-bold font-mono text-brand-purple">{queue.length}</div>
            </div>
          </div>
        )}

        {/* Heatmap */}
        {insights && Object.keys(heatmap).length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <BarChart3 size={12} className="text-brand-cyan" />
              <span className="text-[12px] font-body font-semibold text-text-muted uppercase">{t('heatmapTitle')}</span>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[500px]">
                {/* Hour labels */}
                <div className="flex gap-0.5 mb-0.5 pl-12">
                  {BUSINESS_HOURS.map(h => (
                    <div key={h} className="flex-1 text-center text-[8px] text-text-dim font-body">
                      {h}h
                    </div>
                  ))}
                </div>
                {/* Day rows */}
                {DAY_KEYS.map((dayKey, dayIdx) => (
                  <div key={dayKey} className="flex items-center gap-0.5 mb-0.5">
                    <div className="w-11 text-[9px] text-text-dim font-semibold text-right pr-1">
                      {DAY_LABELS[dayIdx]}
                    </div>
                    {BUSINESS_HOURS.map(hour => {
                      const value = heatmap[dayKey]?.[String(hour)] ?? 0
                      return (
                        <div
                          key={hour}
                          className={`flex-1 h-6 rounded-sm ${getHeatColor(value)} transition-colors cursor-default`}
                          title={`${DAY_LABELS[dayIdx]} ${hour}:00 — ${Math.round(value * 100)}%`}
                        />
                      )
                    })}
                  </div>
                ))}
                {/* Legend */}
                <div className="flex items-center justify-end gap-2 mt-2">
                  <span className="text-[10px] font-body text-text-dim">{t('low')}</span>
                  <div className="flex gap-0.5">
                    <div className="w-4 h-3 rounded-sm bg-status-danger/20" />
                    <div className="w-4 h-3 rounded-sm bg-status-warning/30" />
                    <div className="w-4 h-3 rounded-sm bg-status-warning/50" />
                    <div className="w-4 h-3 rounded-sm bg-status-success/50" />
                    <div className="w-4 h-3 rounded-sm bg-status-success/80" />
                  </div>
                  <span className="text-[10px] font-body text-text-dim">{t('high')}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top Converting Factors */}
        {topFactors.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border/30">
            <div className="flex items-center gap-1.5 mb-2">
              <Target size={11} className="text-status-success" />
              <span className="text-[12px] font-body font-semibold text-text-muted uppercase">{t('topFactors')}</span>
            </div>
            <div className="space-y-1.5">
              {topFactors.slice(0, 6).map((factor, i) => (
                <div key={i} className="flex items-center gap-2">
                  {factor.direction === 'positive' ? (
                    <ArrowUpRight size={10} className="text-status-success flex-shrink-0" />
                  ) : (
                    <ArrowDownRight size={10} className="text-status-danger flex-shrink-0" />
                  )}
                  <span className="text-xs text-text-muted flex-1">{factor.name}</span>
                  <span className={`text-[10px] font-bold font-body ${
                    factor.direction === 'positive' ? 'text-status-success' : 'text-status-danger'
                  }`}>
                    {(() => {
                      // S154: backend a veces devuelve impact=null/undefined.
                      // Math.round(null * 100) = NaN visible como "NaN%".
                      const n = Number(factor.impact)
                      if (!Number.isFinite(n)) return '—'
                      return `${factor.direction === 'positive' ? '+' : ''}${Math.round(n * 100)}%`
                    })()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// FOLLOW-UP QUEUE (exported separately for tab composition)
// ============================================================

interface FollowUpQueueProps {
  orgId: string
}

export function FollowUpQueue({ orgId }: FollowUpQueueProps) {
  const t = useTranslations('conversions')
  const tCommon = useTranslations('common')

  const [queue, setQueue] = useState<FollowUpItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadQueue = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getFollowUpQueue(orgId, 30)
      setQueue(data)
    } catch {
      // Load failed
    }
    setLoading(false)
  }, [orgId])

  useEffect(() => { loadQueue() }, [loadQueue])

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold font-body text-text-muted uppercase tracking-wider flex items-center gap-2">
          <Phone size={14} className="text-brand-cyan" />
          {t('followUpQueue')}
        </h3>
        <button
          onClick={loadQueue}
          disabled={loading}
          className="w-7 h-7 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-dim hover:text-text-primary transition-colors"
          aria-label={tCommon('refresh')}
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && queue.length === 0 ? (
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 bg-surface-3 rounded-lg" />
          ))}
        </div>
      ) : queue.length === 0 ? (
        <div className="text-center py-8">
          <Target size={24} className="text-text-dim mx-auto mb-2" />
          <p className="text-text-dim text-xs">{t('noFollowUps')}</p>
          <p className="text-text-dim text-[10px] mt-1">{t('noFollowUpsHint')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {queue.map((item, index) => (
            <div
              key={item.patient_id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-void/50 border border-border hover:border-border-2 transition-colors"
            >
              {/* Priority rank */}
              <span className={`text-xs font-bold font-body w-5 text-center ${
                index === 0 ? 'text-brand-gold' :
                index === 1 ? 'text-text-muted' :
                index === 2 ? 'text-brand-gold' :
                'text-text-dim'
              }`}>
                {index + 1}
              </span>

              {/* Conversion badge */}
              <ConversionProbabilityBadge probability={item.conversion_probability} />

              {/* Patient info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <User size={10} className="text-text-dim flex-shrink-0" />
                  <span className="text-xs text-text-primary font-medium truncate">
                    {item.full_name || t('unknownPatient')}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className={`flex items-center gap-1 text-[10px] font-body ${isSessionId(item.phone) ? 'italic text-text-dim' : 'text-text-dim'}`}>
                    <Phone size={9} />
                    {isSessionId(item.phone) ? 'Web Chat · sin teléfono' : (item.phone || '—')}
                  </span>
                </div>
              </div>

              {/* Best contact time */}
              <div className="text-right flex-shrink-0">
                <div className="flex items-center gap-1 text-[10px] text-text-muted">
                  <Clock size={9} />
                  {item.best_contact_time}
                </div>
                <div className="flex items-center gap-1 text-[9px] text-text-dim">
                  <Calendar size={8} />
                  {item.best_contact_day}
                </div>
              </div>

              {/* Contact button — S154: si el phone es session id (web chat),
                  el wa.me con replace(/\D/g) extraería los dígitos del
                  timestamp ("web_emergency1775727757" → "1775727757") y
                  abriría chat a un número basura. Ocultamos el botón en
                  ese caso para evitar el "click contacta a un random". */}
              {!isSessionId(item.phone) && item.phone ? (
                <a
                  href={`https://wa.me/${item.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-status-success/10 border border-status-success/20 text-status-success text-[10px] font-semibold hover:bg-status-success/20 transition-colors flex items-center gap-1"
                >
                  <Phone size={10} />
                  {t('contact')}
                </a>
              ) : (
                <span
                  className="px-2.5 py-1.5 rounded-lg bg-surface-3 border border-border text-text-dim text-[10px] font-semibold flex items-center gap-1 cursor-not-allowed"
                  title="Sin teléfono — pide al paciente que comparta uno"
                >
                  <Phone size={10} />
                  {t('contact')}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// S154: helper compartido — detecta los session ids generados por el
// web chat ("web_*", "session_*") que no son números marcables.
function isSessionId(phone: string | null | undefined): boolean {
  const v = (phone || '').trim()
  return /^web[_-]/i.test(v) || /^session[_-]/i.test(v)
}
