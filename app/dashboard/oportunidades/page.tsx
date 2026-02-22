'use client'

import { useEffect, useState, useCallback } from 'react'
import { useOrg } from '@/lib/org-context'
import { fetchOpportunities, formatCOP, timeAgo } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import type { Opportunity } from '@/types'
import {
  Target, DollarSign, TrendingUp, Clock, User, Phone,
  RefreshCw, Filter, ChevronDown, Check, X, Zap, AlertTriangle,
  Heart, ArrowUpRight, UserPlus, ShoppingBag, Flame, RotateCcw
} from 'lucide-react'

const OPP_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  HOT_LEAD:           { label: 'Lead Caliente', icon: Flame, color: 'text-brand-purple', bg: 'bg-brand-purple/10 border-brand-purple/20' },
  UPSELL:             { label: 'Upsell', icon: ArrowUpRight, color: 'text-status-success', bg: 'bg-status-success/10 border-status-success/20' },
  WINBACK:            { label: 'Reactivación', icon: RotateCcw, color: 'text-status-info', bg: 'bg-status-info/10 border-status-info/20' },
  REFERRAL_POTENTIAL:  { label: 'Potencial Referido', icon: UserPlus, color: 'text-brand-gold', bg: 'bg-brand-gold/10 border-brand-gold/20' },
  CHURN_RISK:         { label: 'Riesgo de Abandono', icon: AlertTriangle, color: 'text-status-danger', bg: 'bg-status-danger/10 border-status-danger/20' },
  PRICE_OBJECTION:    { label: 'Objeción de Precio', icon: DollarSign, color: 'text-status-warning', bg: 'bg-status-warning/10 border-status-warning/20' },
  MULTI_PROCEDURE:    { label: 'Multi-procedimiento', icon: ShoppingBag, color: 'text-brand-cyan', bg: 'bg-brand-cyan/10 border-brand-cyan/20' },
  EMERGENCY_MEDICAL:  { label: 'Emergencia Médica', icon: Heart, color: 'text-status-danger', bg: 'bg-status-danger/10 border-status-danger/20' },
}

const STATUS_OPTIONS: Record<string, { label: string; color: string }> = {
  DETECTED:  { label: 'Detectada', color: 'text-brand-purple' },
  ACTED_ON:  { label: 'En acción', color: 'text-status-info' },
  CONVERTED: { label: 'Convertida', color: 'text-status-success' },
  EXPIRED:   { label: 'Expirada', color: 'text-text-dim' },
  DISMISSED: { label: 'Descartada', color: 'text-text-dim' },
}

export default function OportunidadesPage() {
  const { orgId } = useOrg()
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchOpportunities(orgId, statusFilter || undefined)
      setOpportunities(data as any[])
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }, [orgId, statusFilter])

  useEffect(() => { loadData() }, [loadData])

  const updateStatus = async (oppId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus }
      if (newStatus === 'ACTED_ON') updateData.acted_on_at = new Date().toISOString()
      if (newStatus === 'CONVERTED') updateData.converted_at = new Date().toISOString()

      await supabase.from('detected_opportunities').update(updateData).eq('id', oppId)
      loadData()
    } catch (e) {
      console.error(e)
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
    <div className="max-w-[1400px] space-y-5">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Oportunidades</h2>
          <p className="text-text-dim text-xs mt-0.5">Detectadas automáticamente por SofIA</p>
        </div>
        <button onClick={loadData} aria-label="Actualizar" className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <SummaryCard
          icon={<Target size={18} />}
          gradient="from-brand-purple to-brand-purple-dark"
          value={opportunities.length.toString()}
          label="Total detectadas"
        />
        <SummaryCard
          icon={<Zap size={18} />}
          gradient="from-status-warning to-amber-600"
          value={detected.toString()}
          label="Pendientes de acción"
        />
        <SummaryCard
          icon={<Check size={18} />}
          gradient="from-status-success to-emerald-600"
          value={converted.toString()}
          label="Convertidas"
        />
        <SummaryCard
          icon={<DollarSign size={18} />}
          gradient="from-brand-gold to-amber-500"
          value={formatCOP(totalValue)}
          label="Valor estimado total"
        />
        <SummaryCard
          icon={<TrendingUp size={18} />}
          gradient="from-brand-cyan to-emerald-500"
          value={formatCOP(convertedValue)}
          label="Revenue convertido"
        />
      </div>

      {/* FILTERS — Status */}
      <div className="space-y-2">
        <p className="text-[10px] text-text-dim font-semibold uppercase tracking-wider">Estado</p>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
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
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
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
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
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
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
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
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="h-5 bg-surface-3 rounded w-48 mb-3" />
              <div className="h-4 bg-surface-3 rounded w-72" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Target size={32} className="mx-auto text-text-dim mb-3" />
            <p className="text-text-muted text-sm">
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
              <div key={opp.id} className="glass-card p-5 hover:border-border-2 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  {/* Left */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                      <Icon size={18} className={cfg.color} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          opp.status === 'DETECTED' ? 'bg-brand-purple/10 border-brand-purple/20 text-brand-purple'
                          : opp.status === 'CONVERTED' ? 'bg-status-success/10 border-status-success/20 text-status-success'
                          : opp.status === 'ACTED_ON' ? 'bg-status-info/10 border-status-info/20 text-status-info'
                          : 'bg-surface-3 border-border text-text-dim'
                        }`}>{statusCfg.label}</span>
                      </div>

                      {/* Patient info */}
                      {opp.patients && (
                        <div className="flex items-center gap-3 text-xs text-text-muted mb-2">
                          <span className="flex items-center gap-1">
                            <User size={11} />
                            {(opp.patients as any).full_name || 'Sin nombre'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone size={11} />
                            {(opp.patients as any).phone}
                          </span>
                        </div>
                      )}

                      {/* Notes */}
                      {opp.notes && (
                        <p className="text-xs text-text-muted leading-relaxed line-clamp-2">{opp.notes}</p>
                      )}

                      <div className="flex items-center gap-4 mt-2 text-[11px] text-text-dim">
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
                      <div className="text-[10px] text-text-dim">Valor estimado</div>
                      <div className="text-lg font-bold font-mono gradient-text">{formatCOP(opp.estimated_value)}</div>
                    </div>

                    {/* Action buttons */}
                    {opp.status === 'DETECTED' && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => updateStatus(opp.id, 'ACTED_ON')}
                          className="px-2.5 py-1 rounded-lg bg-status-info/10 border border-status-info/20 text-status-info text-[10px] font-semibold hover:bg-status-info/20 transition-colors"
                        >
                          En acción
                        </button>
                        <button
                          onClick={() => updateStatus(opp.id, 'CONVERTED')}
                          className="px-2.5 py-1 rounded-lg bg-status-success/10 border border-status-success/20 text-status-success text-[10px] font-semibold hover:bg-status-success/20 transition-colors"
                        >
                          Convertida
                        </button>
                        <button
                          onClick={() => updateStatus(opp.id, 'DISMISSED')}
                          className="px-2.5 py-1 rounded-lg bg-surface-3 border border-border text-text-dim text-[10px] font-semibold hover:text-text-muted transition-colors"
                        >
                          Descartar
                        </button>
                      </div>
                    )}
                    {opp.status === 'ACTED_ON' && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => updateStatus(opp.id, 'CONVERTED')}
                          className="px-2.5 py-1 rounded-lg bg-status-success/10 border border-status-success/20 text-status-success text-[10px] font-semibold hover:bg-status-success/20 transition-colors"
                        >
                          Convertida ✓
                        </button>
                        <button
                          onClick={() => updateStatus(opp.id, 'EXPIRED')}
                          className="px-2.5 py-1 rounded-lg bg-surface-3 border border-border text-text-dim text-[10px] font-semibold hover:text-text-muted transition-colors"
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
    </div>
  )
}

function SummaryCard({ icon, gradient, value, label }: { icon: React.ReactNode; gradient: string; value: string; label: string }) {
  return (
    <div className="glass-card p-4">
      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white mb-2.5 shadow-lg`}>
        {icon}
      </div>
      <div className="text-xl font-bold font-mono text-text-primary">{value}</div>
      <div className="text-[11px] text-text-muted mt-0.5">{label}</div>
    </div>
  )
}
