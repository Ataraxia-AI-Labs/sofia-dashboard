'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import * as Sentry from '@sentry/nextjs'
import { useOrg } from '@/lib/org-context'
import { useToast } from '@/components/ui/toast'
import { fetchOpportunities, updateOpportunity, formatCOP, timeAgo } from '@/lib/api'
import type { Opportunity } from '@/types'

// S154: el `phone` de un paciente puede ser un session id de web chat
// (web_emergency1775727757) cuando el origen fue widget sin teléfono.
// El operador no puede llamar a ese string — lo escondemos con el
// mismo patrón que usamos en Personas (Lista + Segmentos + Duplicados).
function formatPhoneOrWebChat(phone: string | null | undefined): string {
  const v = (phone || '').trim()
  if (!v) return '—'
  if (/^web[_-]/i.test(v) || /^session[_-]/i.test(v)) return 'Web Chat · sin teléfono'
  return v
}
import {
  Target, DollarSign, TrendingUp, Clock, User, Phone,
  RefreshCw, Check, Zap, AlertTriangle,
  Heart, ArrowUpRight, UserPlus, ShoppingBag, Flame, RotateCcw,
  BarChart3, DollarSign as DollarSignIcon, Radar, Swords
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
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
  const toast = useToast()

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
  const searchParams = useSearchParams()
  const initialOppView = ((): 'list' | 'scoring' | 'predictions' | 'queue' | 'pricing' | 'outreach' | 'competitors' => {
    const v = searchParams.get('view')
    if (v === 'scoring' || v === 'predictions' || v === 'queue' || v === 'pricing' || v === 'outreach' || v === 'competitors' || v === 'list') return v
    return 'list'
  })()
  const [activeView, setActiveView] = useState<'list' | 'scoring' | 'predictions' | 'queue' | 'pricing' | 'outreach' | 'competitors'>(initialOppView)

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
    } catch (err) {
      // S154: antes el catch estaba vacío con sólo un comentario — si el
      // backend caía, el operador veía empty state ambiguo ("no hay
      // oportunidades") sin saber si era falla o ausencia. Toast +
      // Sentry para diagnóstico.
      Sentry.captureException(err, { tags: { context: 'oportunidades_load' } })
      toast.error('No pudimos cargar las oportunidades. Intenta de nuevo.')
    }
    setLoading(false)
  }, [orgId, statusFilter, branchId, toast])

  useEffect(() => { loadData() }, [loadData])

  const updateStatus = async (oppId: string, newStatus: string) => {
    try {
      const updateData: Record<string, string> = { status: newStatus }
      if (newStatus === 'ACTED_ON') updateData.notes = `Acción tomada el ${new Date().toLocaleDateString('es-CO')}`
      await updateOpportunity(oppId, updateData)
      // S154: faltaba await — el reload empezaba antes que el PATCH
      // terminara, mostrando estado stale por unos cientos de ms.
      await loadData()
    } catch (err) {
      Sentry.captureException(err, { tags: { context: 'oportunidades_update_status', oppId, newStatus } })
      toast.error('No pudimos actualizar la oportunidad. Intenta de nuevo.')
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

  const VIEW_TABS = [
    { id: 'list' as const, icon: Target, label: t('views.list') },
    { id: 'scoring' as const, icon: BarChart3, label: t('views.scoring') },
    { id: 'predictions' as const, icon: TrendingUp, label: t('views.predictions') },
    { id: 'queue' as const, icon: Phone, label: t('views.queue') },
    { id: 'pricing' as const, icon: DollarSign, label: t('views.pricing') },
    { id: 'outreach' as const, icon: Radar, label: t('views.outreach') },
    { id: 'competitors' as const, icon: Swords, label: t('views.competitors') },
  ]

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div>
        <h2 className="text-sm font-body font-bold uppercase tracking-wide text-text-primary flex items-center gap-2">
          <Target size={14} className="text-brand-purple" />
          {t('title')}
        </h2>
        <p className="text-text-dim text-[11px] font-body mt-0.5">{t('subtitle')}</p>
      </div>

      {/* Tabs row + refresh — own line, won't collide with floating topbar */}
      <div className="flex items-end justify-between gap-4 border-b border-brand-purple/10">
        <div className="flex gap-4 flex-wrap">
          {VIEW_TABS.map(tb => (
            <button
              key={tb.id}
              onClick={() => setActiveView(tb.id)}
              className={`flex items-center gap-1 text-[12px] font-body font-semibold pb-1.5 border-b-2 transition-colors ${
                activeView === tb.id ? 'text-brand-purple border-brand-purple' : 'text-text-dim border-transparent hover:text-text-muted'
              }`}
            >
              <tb.icon size={11} /> {tb.label}
            </button>
          ))}
        </div>
        <button
          onClick={loadData}
          aria-label={tCommon('refresh')}
          className="sentient-btn w-7 h-7 mb-1 rounded-md bg-surface/40 flex items-center justify-center text-text-muted hover:text-text-primary"
          style={{ boxShadow: '0 0 0 1px rgba(139,92,246,0.1)' }}
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
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
      <div className="space-y-1.5">
        <p className="text-[10px] text-text-dim font-semibold uppercase tracking-[0.14em]">Estado</p>
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setStatusFilter('')}
            className={`sentient-btn h-7 px-2.5 rounded-md text-[11.5px] font-body font-medium transition-all ${
              !statusFilter ? 'bg-brand-purple/18 text-brand-purple' : 'bg-surface/40 text-text-muted hover:text-text-primary'
            }`}
            style={{ boxShadow: !statusFilter ? '0 0 0 1px rgba(139,92,246,0.3), 0 2px 10px -3px rgba(139,92,246,0.3)' : '0 0 0 1px rgba(139,92,246,0.1)' }}
          >
            Todos
          </button>
          {Object.entries(STATUS_OPTIONS).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`sentient-btn h-7 px-2.5 rounded-md text-[11.5px] font-body font-medium transition-all ${
                statusFilter === key ? 'bg-brand-purple/18 text-brand-purple' : 'bg-surface/40 text-text-muted hover:text-text-primary'
              }`}
              style={{ boxShadow: statusFilter === key ? '0 0 0 1px rgba(139,92,246,0.3), 0 2px 10px -3px rgba(139,92,246,0.3)' : '0 0 0 1px rgba(139,92,246,0.1)' }}
            >
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* FILTERS — Type */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-text-dim font-semibold uppercase tracking-[0.14em]">Tipo</p>
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setTypeFilter('')}
            className={`sentient-btn h-7 px-2.5 rounded-md text-[11.5px] font-body font-medium transition-all ${
              !typeFilter ? 'bg-brand-purple/18 text-brand-purple' : 'bg-surface/40 text-text-muted hover:text-text-primary'
            }`}
            style={{ boxShadow: !typeFilter ? '0 0 0 1px rgba(139,92,246,0.3), 0 2px 10px -3px rgba(139,92,246,0.3)' : '0 0 0 1px rgba(139,92,246,0.1)' }}
          >
            Todos
          </button>
          {Object.entries(OPP_CONFIG).map(([key, cfg]) => {
            const count = typeCounts[key] || 0
            if (count === 0 && opportunities.length > 0) return null
            const active = typeFilter === key
            return (
              <button
                key={key}
                onClick={() => setTypeFilter(typeFilter === key ? '' : key)}
                className={`sentient-btn h-7 px-2.5 rounded-md text-[11.5px] font-body font-medium transition-all flex items-center gap-1.5 ${
                  active ? 'bg-brand-purple/18 text-brand-purple' : 'bg-surface/40 text-text-muted hover:text-text-primary'
                }`}
                style={{ boxShadow: active ? '0 0 0 1px rgba(139,92,246,0.3), 0 2px 10px -3px rgba(139,92,246,0.3)' : '0 0 0 1px rgba(139,92,246,0.1)' }}
              >
                {cfg.label}
                {count > 0 && (
                  <span className={`text-[10px] font-mono tabular-nums ${active ? 'text-brand-purple' : 'text-text-dim'}`}>
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
            <p className="text-text-muted text-[12px] font-body">
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
                        <span className={`text-[12px] font-body font-semibold ${cfg.color}`}>{cfg.label}</span>
                        <span className={`text-[11px] font-body font-semibold px-2 py-0.5 rounded-md border ${
                          opp.status === 'DETECTED' ? 'bg-brand-purple/10 border-brand-purple/20 text-brand-purple'
                          : opp.status === 'CONVERTED' ? 'bg-status-success/10 border-status-success/20 text-status-success'
                          : opp.status === 'ACTED_ON' ? 'bg-status-info/10 border-status-info/20 text-status-info'
                          : 'bg-surface-3 border-border text-text-dim'
                        }`}>{statusCfg.label}</span>
                      </div>

                      {/* Patient info + Lead Score */}
                      {opp.patients && (
                        <div className="flex items-center gap-3 text-[12px] font-body text-text-muted mb-2">
                          <span className="flex items-center gap-1">
                            <User size={11} />
                            {opp.patients?.full_name || 'Sin nombre'}
                          </span>
                          <span className={`flex items-center gap-1 ${/^web[_-]|^session[_-]/i.test(opp.patients?.phone || '') ? 'italic text-text-dim' : ''}`}>
                            <Phone size={11} />
                            {formatPhoneOrWebChat(opp.patients?.phone)}
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
                        <p className="text-[12px] font-body text-text-muted leading-relaxed line-clamp-2">{opp.notes}</p>
                      )}

                      <div className="flex items-center gap-3 mt-2 text-[11px] font-body text-text-dim">
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
                      <div className="text-[11px] font-body text-text-dim">Valor estimado</div>
                      <div className="text-sm font-bold font-mono text-text-primary">{formatCOP(opp.estimated_value)}</div>
                    </div>

                    {/* Action buttons */}
                    {opp.status === 'DETECTED' && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => updateStatus(opp.id, 'ACTED_ON')}
                          className="px-2.5 py-1 rounded-md bg-status-info/10 border border-status-info/20 text-status-info text-[11px] font-body font-semibold hover:bg-status-info/20 transition-colors"
                        >
                          En acción
                        </button>
                        <button
                          onClick={() => updateStatus(opp.id, 'CONVERTED')}
                          className="px-2.5 py-1 rounded-md bg-status-success/10 border border-status-success/20 text-status-success text-[11px] font-body font-semibold hover:bg-status-success/20 transition-colors"
                        >
                          Convertida
                        </button>
                        <button
                          onClick={() => updateStatus(opp.id, 'DISMISSED')}
                          className="px-2.5 py-1 rounded-md bg-surface-3 border border-border text-text-dim text-[11px] font-body font-semibold hover:text-text-muted transition-colors"
                        >
                          Descartar
                        </button>
                      </div>
                    )}
                    {opp.status === 'ACTED_ON' && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => updateStatus(opp.id, 'CONVERTED')}
                          className="px-2.5 py-1 rounded-md bg-status-success/10 border border-status-success/20 text-status-success text-[11px] font-body font-semibold hover:bg-status-success/20 transition-colors"
                        >
                          Convertida ✓
                        </button>
                        <button
                          onClick={() => updateStatus(opp.id, 'EXPIRED')}
                          className="px-2.5 py-1 rounded-md bg-surface-3 border border-border text-text-dim text-[11px] font-body font-semibold hover:text-text-muted transition-colors"
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
  void gradient
  return (
    <div className="rounded-xl p-3 bg-surface/40" style={{ boxShadow: '0 0 0 1px rgba(139,92,246,0.1), 0 2px 12px -4px rgba(139,92,246,0.12)' }}>
      <div className="flex items-start justify-between gap-2">
        <div className="w-7 h-7 rounded-md bg-brand-purple/10 flex items-center justify-center text-brand-purple flex-shrink-0" style={{ boxShadow: '0 0 0 1px rgba(139,92,246,0.15)' }}>
          <span className="[&>svg]:w-3.5 [&>svg]:h-3.5">{icon}</span>
        </div>
      </div>
      <div className="text-[18px] font-mono font-semibold text-text-primary mt-2 tabular-nums leading-none">{value}</div>
      <div className="text-[10.5px] font-body text-text-muted mt-1">{label}</div>
    </div>
  )
}
