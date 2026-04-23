'use client'

import { useEffect, useState, useCallback } from 'react'
import { useOrg } from '@/lib/org-context'
import { useToast } from '@/components/ui/toast'
import * as Sentry from '@sentry/nextjs'
import { getReferralProgram, updateReferralProgram, getReferralLeaderboard, getReferralAnalytics } from '@/lib/api/referrals'
import type { ReferralProgram, ReferralLeaderEntry, ReferralAnalytics } from '@/lib/api/referrals'
import { useTranslations } from 'next-intl'
import { formatCurrency } from '@/lib/api/helpers'
import { Gift, Users, BarChart3, Trophy, Settings } from 'lucide-react'

type Tab = 'overview' | 'leaderboard' | 'settings'

export default function ReferidosPage() {
  const { orgId, role } = useOrg()
  const toast = useToast()
  const t = useTranslations('referralsPage')
  const isReadOnly = role === 'STAFF'

  const [tab, setTab] = useState<Tab>('overview')
  const [program, setProgram] = useState<ReferralProgram | null>(null)
  const [leaderboard, setLeaderboard] = useState<ReferralLeaderEntry[]>([])
  const [analytics, setAnalytics] = useState<ReferralAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const [p, l, a] = await Promise.all([
        getReferralProgram(orgId),
        getReferralLeaderboard(orgId),
        getReferralAnalytics(orgId),
      ])
      setProgram(p && typeof p === 'object' ? p : null)
      setLeaderboard(Array.isArray(l) ? l : [])
      setAnalytics(a && typeof a === 'object' ? a : null)
    } catch (err) {
      Sentry.captureException(err)
      toast.error(t('loadError'))
    }
    setLoading(false)
  }, [orgId, toast, t])

  useEffect(() => {
    let cancelled = false
    load().then(() => { if (cancelled) return })
    return () => { cancelled = true }
  }, [load])

  const handleToggle = async () => {
    if (!program) return
    try {
      await updateReferralProgram(orgId, { is_active: !program.is_active })
      load()
    } catch (err) {
      Sentry.captureException(err)
      toast.error(t('toggleError'))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-mono font-bold text-text-primary tracking-wide flex items-center gap-2">
            <Gift size={16} className="text-brand-purple" />
            {t('title')}
          </h1>
          <p className="text-[12px] font-body text-text-dim mt-0.5">{t('subtitle')}</p>
        </div>
        {program && !isReadOnly && (
          <button onClick={handleToggle}
            className={`text-[12px] font-body font-semibold px-3 py-1 rounded border transition-colors ${
              program.is_active
                ? 'bg-status-success/8 border-status-success/20 text-status-success'
                : 'bg-surface-2 border-border text-text-dim'
            }`}>{program.is_active ? t('active') : t('inactive')}</button>
        )}
      </div>

      {msg && <div className="text-[12px] font-body text-status-success bg-status-success/8 px-3 py-1.5 rounded border border-status-success/15">{msg}</div>}

      {loading ? (
        <p className="text-[12px] font-body text-text-dim py-12 text-center">...</p>
      ) : !program ? (
        <div className="text-center py-12">
          <Gift size={24} className="mx-auto text-text-dim/30 mb-2" />
          <p className="text-[12px] font-body text-text-dim">{t('noProgram')}</p>
          <p className="text-[11px] font-body text-text-dim/70 mt-1 mb-4">{t('noProgramHint')}</p>
          {!isReadOnly && (
            <button
              onClick={async () => {
                try {
                  await updateReferralProgram(orgId, { is_active: true })
                  toast.success(t('createdToast') || 'Programa activado')
                  load()
                } catch (err) {
                  Sentry.captureException(err)
                  toast.error(t('toggleError'))
                }
              }}
              className="sentient-btn inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-brand-purple text-white text-[12px] font-body font-semibold hover:bg-brand-purple-dark transition-colors"
            >
              <Gift size={12} />
              {t('createProgram') || 'Configurar programa de referidos'}
            </button>
          )}
        </div>
      ) : (
        <>
          {/* KPIs */}
          {analytics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { l: t('totalReferrals'), v: analytics.total_referrals, icon: Users },
                { l: t('converted'), v: analytics.total_converted, icon: Trophy },
                { l: t('conversionRate'), v: `${(analytics.conversion_rate * 100).toFixed(1)}%`, icon: BarChart3 },
                { l: t('rewardsGiven'), v: formatCurrency(analytics.total_rewards_given), icon: Gift },
              ].map(kpi => (
                <div key={kpi.l} className="border border-border rounded-lg p-3">
                  <div className="flex items-center gap-1 mb-1">
                    <kpi.icon size={10} className="text-text-dim" />
                    <p className="text-[10px] font-body text-text-dim uppercase tracking-wider">{kpi.l}</p>
                  </div>
                  <p className="text-sm font-mono font-bold text-text-primary">{kpi.v}</p>
                </div>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-4 border-b border-brand-purple/10">
            {([
              { id: 'overview' as Tab, label: t('analytics') },
              { id: 'leaderboard' as Tab, label: t('leaderboard') },
              { id: 'settings' as Tab, label: t('program') },
            ]).map(tb => (
              <button key={tb.id} onClick={() => setTab(tb.id)}
                className={`text-[12px] font-body font-semibold pb-1.5 border-b-2 transition-colors ${
                  tab === tb.id ? 'text-brand-purple border-brand-purple' : 'text-text-dim border-transparent hover:text-text-muted'
                }`}>{tb.label}</button>
            ))}
          </div>

          {/* Leaderboard */}
          {tab === 'leaderboard' && (
            <div className="space-y-1">
              {leaderboard.length === 0 ? (
                <p className="text-[12px] font-body text-text-dim py-8 text-center">Sin referidores activos</p>
              ) : leaderboard.map((entry, i) => (
                <div
                  key={entry.patient_id}
                  className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-brand-purple/[0.04] transition-colors"
                  style={{ boxShadow: '0 0 0 1px rgba(139,92,246,0.1)' }}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-body font-bold ${
                      i === 0 ? 'bg-brand-gold/15 text-brand-gold' : i === 1 ? 'bg-text-muted/15 text-text-muted' : i === 2 ? 'bg-status-warning/15 text-status-warning' : 'bg-surface-2 text-text-dim'
                    }`}>{i + 1}</span>
                    <div>
                      <p className="text-[13px] font-body font-semibold text-text-primary">{entry.patient_name}</p>
                      <p className="text-[11px] font-body text-text-dim">{entry.referral_count} referidos · {entry.converted_count} convertidos</p>
                    </div>
                  </div>
                  <span className="text-[12px] font-body font-bold text-status-success">{formatCurrency(entry.reward_earned)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Settings */}
          {tab === 'settings' && (
            <div className="border border-border rounded-lg p-4 space-y-3">
              <div>
                <p className="text-[11px] font-body text-text-dim uppercase tracking-wider">{t('rewardType')}</p>
                <p className="text-[13px] font-body text-text-primary mt-0.5">{program.reward_type}</p>
              </div>
              <div>
                <p className="text-[11px] font-body text-text-dim uppercase tracking-wider">{t('rewardValue')}</p>
                <p className="text-[13px] font-body text-text-primary mt-0.5">{formatCurrency(program.reward_value)}</p>
              </div>
              <div>
                <p className="text-[11px] font-body text-text-dim uppercase tracking-wider">Descripcion</p>
                <p className="text-[13px] font-body text-text-primary mt-0.5">{program.reward_description}</p>
              </div>
            </div>
          )}

          {/* Overview / Channel breakdown */}
          {tab === 'overview' && analytics?.top_channels && (
            <div className="space-y-2">
              <p className="text-[11px] font-body text-text-dim uppercase tracking-wider">Canales de referido</p>
              {Object.entries(analytics.top_channels).map(([channel, count]) => (
                <div key={channel} className="flex items-center justify-between border border-border rounded-lg px-3 py-2">
                  <span className="text-[12px] font-body text-text-primary">{channel}</span>
                  <span className="text-[12px] font-body font-bold text-brand-purple">{count}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
