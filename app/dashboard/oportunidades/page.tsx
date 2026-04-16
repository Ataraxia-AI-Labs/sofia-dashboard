'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useOrg } from '@/lib/org-context'
import { fetchOpportunities, updateOpportunity, formatCOP, timeAgo } from '@/lib/api'
import type { Opportunity } from '@/types'
import {
  Target, DollarSign, TrendingUp, Clock, User, Phone,
  RefreshCw, Check, Zap, AlertTriangle,
  Heart, ArrowUpRight, UserPlus, ShoppingBag, Flame, RotateCcw,
  BarChart3, DollarSign as DollarSignIcon, Radar, Swords
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { LeadScoreBadge } from '@/components/lead-score-badge'
import { getLeadScores } from '@/lib/api/leads'
import type { LeadScore } from '@/types'

const OutreachPanel = dynamic(() => import('./outreach-panel'), {
  ssr: false,
  loading: () => <div className="glass-card p-5 animate-pulse"><div className="h-48 bg-surface-3 rounded-lg" /></div>,
})

const PricingSuggestionsPanel = dynamic(() => import('./pricing-suggestions-panel'), {
  ssr: false,
  loading: () => <div className="glass-card p-5 animate-pulse"><div className="h-48 bg-surface-3 rounded-lg" /></div>,
})

const LeadScoringPanel = dynamic(() => import('./lead-scoring-panel'), {
  ssr: false,
  loading: () => <div className="glass-card p-5 animate-pulse"><div className="h-48 bg-surface-3 rounded-lg" /></div>,
})

const CompetitorsPanel = dynamic(() => import('./competitors-panel'), {
  ssr: false,
  loading: () => <div className="glass-card p-5 animate-pulse"><div className="h-48 bg-surface-3 rounded-lg" /></div>,
})

const ConversionPanel = dynamic(() => import('./conversion-panel').then(m => ({ default: m.default })), {
  ssr: false,
  loading: () => <div className="glass-card p-5 animate-pulse"><div className="h-48 bg-surface-3 rounded-lg" /></div>,
})

const FollowUpQueuePanel = dynamic(() => import('./conversion-panel').then(m => ({ default: m.FollowUpQueue })), {
  ssr: false,
  loading: () => <div className="glass-card p-5 animate-pulse"><div className="h-48 bg-surface-3 rounded-lg" /></div>,
})

export default function OportunidadesPage() {
  const { orgId, branchId } = useOrg()
  const t = useTranslations('opportunities')
  const tCommon = useTranslations('common')

  const OPP_CONFIG: Record<string, { label: string; icon: typeof Flame; color: string; bg: string }> = {
    HOT_LEAD:        { label: t('types.HOT_LEAD'), icon: Flame, color: 'text-brand-purple', bg: 'bg-brand-purple/10 border-brand-purple/20' },
    UPSELL:          { label: t('types.UPSELL'), icon: ArrowUpRight, color: 'text-status-success', bg: 'bg-status-success/10 border-status-success/20' },
    REACTIVATION:    { label: t('types.REACTIVATION'), icon: RotateCcw, color: 'text-status-info', bg: 'bg-status-info/10 border-status-info/20' },
    REFERRAL:        { label: t('types.REFERRAL'), icon: UserPlus, color: 'text-brand-gold', bg: 'bg-brand-gold/10 border-brand-gold/20' },
    CHURN_RISK:      { label: t('types.CHURN_RISK'), icon: AlertTriangle, color: 'text-status-danger', bg: 'bg-status-danger/10 border-status-danger/20' },
    PRICE_SENSITIVE: { label: t('types.PRICE_SENSITIVE'), icon: DollarSign, color: 'text-status-warning', bg: 'bg-status-warning/10 border-status-warning/20' },
    MULTI_PROCEDURE: { label: t('types.MULTI_PROCEDURE'), icon: ShoppingBag, color: 'text-brand-cyan', bg: 'bg-brand-cyan/10 border-brand-cyan/20' },
    HIGH_VALUE:      { label: t('types.HIGH_VALUE'), icon: Heart, color: 'text-status-success', bg: 'bg-status-success/10 border-status-success/20' },
    CROSS_SELL:      { label: t('types.CROSS_SELL'), icon: ShoppingBag, color: 'text-brand-purple-light', bg: 'bg-brand-purple/10 border-brand-purple/20' },
  }

  const STATUS_OPTIONS: Record<string, { label: string; color: string }> = {
    DETECTED:  { label: t('statuses.DETECTED'), color: 'text-brand-purple' },
    ACTED_ON:  { label: t('statuses.ACTED_ON'), color: 'text-status-info' },
    CONVERTED: { label: t('statuses.CONVERTED'), color: 'text-status-success' },
    EXPIRED:   { label: t('statuses.EXPIRED'), color: 'text-text-dim' },
    DISMISSED: { label: t('statuses.DISMISSED'), color: 'text-text-dim' },
  }
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [leadScores, setLeadScores] = useState<Record<string, LeadScore>>({})
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [activeView, setActiveView] = useState<'list' | 'scoring' | 'predictions' | 'queue' | 'pricing' | 'outreach' | 'competitors'>('list')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [data, scores] = await Promise.all([
        fetchOpportunities(orgId, statusFilter || undefined, branchId),
        getLeadScores(orgId),
      ])
      setOpportunities(data as unknown as Opportunity[])
      // Index lead scores by patient_id for fast lookup
      const scoreMap: Record<string, LeadScore> = {}
      for (const s of scores) {
        scoreMap[s.patient_id] = s
      }
      setLeadScores(scoreMap)
    } catch {
      // Opportunities load failed — UI will show empty state
    }
    setLoading(false)
  }, [orgId, statusFilter, branchId])

  useEffect(() => { loadData() }, [loadData])

  const updateStatus = async (oppId: string, newStatus: string) => {
    try {
      const updateData: Record<string, string> = { status: newStatus }
      if (newStatus === 'ACTED_ON') updateData.notes = `Acción tomada el ${new Date().toLocaleDateString('es-CO')}`
      await updateOpportunity(oppId, updateData)
      loadData()
    } catch {
      // Status update failed — user can retry
    }
  }

  // Apply type filter client-side
  const filtered = typeFilter
    ? opportunities.filter(o => o.opportunity_type === typeFilter)
    : opportunities

  // Summary stats (from all opportunities, not filtered)
  const totalValue = opportunities.reduce((sum, o) => sum + (o.estimated_value || 0), 0)
  const convertedValue = opportunities.filter(o => o.status === 'CONVERTED').reduce((sum, o) => sum + (o.estimated_value || 0), 0)
  const detected = opportunities.filter(o => o.status === 'DETECTED').length
  const converted = opportunities.filter(o => o.status === 'CONVERTED').length

  // Type breakdown counts (from all opportunities)
  const typeCounts: Record<string, number> = {}
  for (const o of opportunities) {
    typeCounts[o.opportunity_type] = (typeCounts[o.opportunity_type] || 0) + 1
  }

  return (
    <div className="max-w-[1200px] space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-mono font-bold uppercase tracking-wide text-text-primary">{t('title')}</h2>
          <p className="text-text-dim text-[9px] font-mono mt-0.5">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-surface-2 rounded-lg border border-border p-0.5">
            <button
              onClick={() => setActiveView('list')}
              className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-semibold transition-colors ${
                activeView === 'list' ? 'bg-brand-purple/15 text-brand-purple' : 'text-text-muted'
              }`}
            >
              {t('views.list')}
            </button>
            <button
              onClick={() => setActiveView('scoring')}
              className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-semibold transition-colors flex items-center gap-1 ${
                activeView === 'scoring' ? 'bg-brand-purple/15 text-brand-purple' : 'text-text-muted'
              }`}
            >
              <BarChart3 size={11} />
              {t('views.scoring')}
            </button>
            <button
              onClick={() => setActiveView('predictions')}
              className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-semibold transition-colors flex items-center gap-1 ${
                activeView === 'predictions' ? 'bg-brand-purple/15 text-brand-purple' : 'text-text-muted'
              }`}
            >
              <TrendingUp size={11} />
              {t('views.predictions')}
            </button>
            <button
              onClick={() => setActiveView('queue')}
              className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-semibold transition-colors flex items-center gap-1 ${
                activeView === 'queue' ? 'bg-brand-purple/15 text-brand-purple' : 'text-text-muted'
              }`}
            >
              <Phone size={11} />
              {t('views.queue')}
            </button>
            <button
              onClick={() => setActiveView('pricing')}
              className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-semibold transition-colors flex items-center gap-1 ${
                activeView === 'pricing' ? 'bg-brand-purple/15 text-brand-purple' : 'text-text-muted'
              }`}
            >
              <DollarSign size={11} />
              {t('views.pricing')}
            </button>
            <button
              onClick={() => setActiveView('outreach')}
              className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-semibold transition-colors flex items-center gap-1 ${
                activeView === 'outreach' ? 'bg-brand-purple/15 text-brand-purple' : 'text-text-muted'
              }`}
            >
              <Radar size={11} />
              {t('views.outreach')}
            </button>
            <button
              onClick={() => setActiveView('competitors')}
              className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-semibold transition-colors flex items-center gap-1 ${
                activeView === 'competitors' ? 'bg-brand-purple/15 text-brand-purple' : 'text-text-muted'
              }`}
            >
              <Swords size={11} />
              {t('views.competitors')}
            </button>
          </div>
          <button onClick={loadData} aria-label={tCommon('refresh')} className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <SummaryCard
          icon={<Target size={18} />}
          gradient="from-brand-purple to-brand-purple-dark"
          value={opportunities.length.toString()}
          label={t('totalDetected')}
        />
        <SummaryCard
          icon={<Zap size={18} />}
          gradient="from-status-warning to-brand-gold"
          value={detected.toString()}
          label={t('pendingAction')}
        />
        <SummaryCard
          icon={<Check size={18} />}
          gradient="from-status-success to-status-success"
          value={converted.toString()}
          label={t('converted')}
        />
        <SummaryCard
          icon={<DollarSign size={18} />}
          gradient="from-brand-gold to-brand-gold"
          value={formatCOP(totalValue)}
          label={t('estimatedValue')}
        />
        <SummaryCard
          icon={<TrendingUp size={18} />}
          gradient="from-brand-cyan to-brand-cyan"
          value={formatCOP(convertedValue)}
          label="Revenue convertido"
        />
      </div>

      {/* SCORING VIEW */}
      {activeView === 'scoring' && (
        <LeadScoringPanel orgId={orgId} />
      )}

      {/* PREDICTIONS VIEW */}
      {activeView === 'predictions' && (
        <ConversionPanel orgId={orgId} />
      )}

      {/* QUEUE VIEW */}
      {activeView === 'queue' && (
        <FollowUpQueuePanel orgId={orgId} />
      )}

      {/* PRICING VIEW */}
      {activeView === 'pricing' && (
        <PricingSuggestionsPanel orgId={orgId} />
      )}

      {/* OUTREACH VIEW */}
      {activeView === 'outreach' && (
        <OutreachPanel orgId={orgId} />
      )}

      {/* COMPETITORS VIEW */}
      {activeView === 'competitors' && (
        <CompetitorsPanel orgId={orgId} />
      )}

      {/* LIST VIEW — Filters and cards below only when in list mode */}
      {activeView !== 'list' ? null : (
      <>
      {/* FILTERS — Status */}
      <div className="space-y-2">
        <p className="text-[10px] text-text-dim font-semibold uppercase tracking-wider">Estado</p>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-semibold transition-all ${
              !statusFilter
                ? 'bg-brand-purple/15 text-brand-purple border border-brand-purple/25'
                : 'bg-surface-2 text-text-muted border border-border hover:border-border-2'
            }`}
          >
            Todos
          </button>
          {Object.entries(STATUS_OPTIONS).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-semibold transition-all ${
                statusFilter === key
                  ? 'bg-brand-purple/15 text-brand-purple border border-brand-purple/25'
                  : 'bg-surface-2 text-text-muted border border-border hover:border-border-2'
              }`}
            >
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* FILTERS — Type */}
      <div className="space-y-2">
        <p className="text-[10px] text-text-dim font-semibold uppercase tracking-wider">Tipo</p>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setTypeFilter('')}
            className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-semibold transition-all ${
              !typeFilter
                ? 'bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/25'
                : 'bg-surface-2 text-text-muted border border-border hover:border-border-2'
            }`}
          >
            Todos
          </button>
          {Object.entries(OPP_CONFIG).map(([key, cfg]) => {
            const count = typeCounts[key] || 0
            if (count === 0 && opportunities.length > 0) return null
            return (
              <button
                key={key}
                onClick={() => setTypeFilter(typeFilter === key ? '' : key)}
                className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-semibold transition-all flex items-center gap-1.5 ${
                  typeFilter === key
                    ? `${cfg.bg} ${cfg.color} border`
                    : 'bg-surface-2 text-text-muted border border-border hover:border-border-2'
                }`}
              >
                {cfg.label}
                {count > 0 && (
                  <span className={`text-[9px] font-mono ${typeFilter === key ? cfg.color : 'text-text-dim'}`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* OPPORTUNITY LIST */}
      <div className="space-y-3">
        {loading && filtered.length === 0 ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card p-4 animate-pulse">
              <div className="h-5 bg-surface-3 rounded w-48 mb-3" />
              <div className="h-4 bg-surface-3 rounded w-72" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <Target size={28} className="mx-auto text-text-dim mb-3" />
            <p className="text-text-muted text-[10px] font-mono">
              {statusFilter || typeFilter
                ? `No hay oportunidades con ${statusFilter ? `estado "${STATUS_OPTIONS[statusFilter]?.label}"` : ''}${statusFilter && typeFilter ? ' y ' : ''}${typeFilter ? `tipo "${OPP_CONFIG[typeFilter]?.label}"` : ''}`
                : 'No hay oportunidades detectadas aún'}
            </p>
          </div>
        ) : (
          filtered.map((opp) => {
            const cfg = OPP_CONFIG[opp.opportunity_type] || OPP_CONFIG.HOT_LEAD
            const Icon = cfg.icon
            const statusCfg = STATUS_OPTIONS[opp.status] || STATUS_OPTIONS.DETECTED

            return (
              <div key={opp.id} className="glass-card p-4 hover:border-border-2 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  {/* Left */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className={`w-9 h-9 rounded-md border flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                      <Icon size={18} className={cfg.color} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-mono font-semibold ${cfg.color}`}>{cfg.label}</span>
                        <span className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded-md border ${
                          opp.status === 'DETECTED' ? 'bg-brand-purple/10 border-brand-purple/20 text-brand-purple'
                          : opp.status === 'CONVERTED' ? 'bg-status-success/10 border-status-success/20 text-status-success'
                          : opp.status === 'ACTED_ON' ? 'bg-status-info/10 border-status-info/20 text-status-info'
                          : 'bg-surface-3 border-border text-text-dim'
                        }`}>{statusCfg.label}</span>
                      </div>

                      {/* Patient info + Lead Score */}
                      {opp.patients && (
                        <div className="flex items-center gap-3 text-[10px] font-mono text-text-muted mb-2">
                          <span className="flex items-center gap-1">
                            <User size={11} />
                            {opp.patients?.full_name || 'Sin nombre'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone size={11} />
                            {opp.patients?.phone}
                          </span>
                          {opp.patient_id && leadScores[opp.patient_id] && (
                            <LeadScoreBadge
                              score={leadScores[opp.patient_id].score}
                              classification={leadScores[opp.patient_id].classification}
                            />
                          )}
                        </div>
                      )}

                      {/* Notes */}
                      {opp.notes && (
                        <p className="text-[10px] font-mono text-text-muted leading-relaxed line-clamp-2">{opp.notes}</p>
                      )}

                      <div className="flex items-center gap-3 mt-2 text-[9px] font-mono text-text-dim">
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {timeAgo(opp.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right - Value + Actions */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-[9px] font-mono text-text-dim">Valor estimado</div>
                      <div className="text-sm font-bold font-mono text-text-primary">{formatCOP(opp.estimated_value)}</div>
                    </div>

                    {/* Action buttons */}
                    {opp.status === 'DETECTED' && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => updateStatus(opp.id, 'ACTED_ON')}
                          className="px-2.5 py-1 rounded-md bg-status-info/10 border border-status-info/20 text-status-info text-[9px] font-mono font-semibold hover:bg-status-info/20 transition-colors"
                        >
                          En acción
                        </button>
                        <button
                          onClick={() => updateStatus(opp.id, 'CONVERTED')}
                          className="px-2.5 py-1 rounded-md bg-status-success/10 border border-status-success/20 text-status-success text-[9px] font-mono font-semibold hover:bg-status-success/20 transition-colors"
                        >
                          Convertida
                        </button>
                        <button
                          onClick={() => updateStatus(opp.id, 'DISMISSED')}
                          className="px-2.5 py-1 rounded-md bg-surface-3 border border-border text-text-dim text-[9px] font-mono font-semibold hover:text-text-muted transition-colors"
                        >
                          Descartar
                        </button>
                      </div>
                    )}
                    {opp.status === 'ACTED_ON' && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => updateStatus(opp.id, 'CONVERTED')}
                          className="px-2.5 py-1 rounded-md bg-status-success/10 border border-status-success/20 text-status-success text-[9px] font-mono font-semibold hover:bg-status-success/20 transition-colors"
                        >
                          Convertida ✓
                        </button>
                        <button
                          onClick={() => updateStatus(opp.id, 'EXPIRED')}
                          className="px-2.5 py-1 rounded-md bg-surface-3 border border-border text-text-dim text-[9px] font-mono font-semibold hover:text-text-muted transition-colors"
                        >
                          Expirada
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
      </>
      )}
    </div>
  )
}

function SummaryCard({ icon, gradient, value, label }: { icon: React.ReactNode; gradient: string; value: string; label: string }) {
  return (
    <div className="glass-card p-4">
      <div className="w-8 h-8 rounded-md bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center text-brand-purple mb-2">
        {icon}
      </div>
      <div className="text-sm font-bold font-mono text-text-primary">{value}</div>
      <div className="text-[9px] font-mono text-text-muted mt-0.5">{label}</div>
    </div>
  )
}
