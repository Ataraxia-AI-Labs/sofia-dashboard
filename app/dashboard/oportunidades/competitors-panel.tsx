'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import * as Sentry from '@sentry/nextjs'
import {
  listCompetitors, registerCompetitor, updateCompetitor, deleteCompetitor,
  getPricingComparison, getMarketPosition, getCompetitiveInsights,
  getBenchmarks, generateReport, getPriceChanges,
} from '@/lib/api/competitors'
import { formatCurrency } from '@/lib/api/helpers'
import type {
  Competitor, PricingComparison, MarketPosition,
  CompetitiveInsights, MarketBenchmark, PriceChange, CompetitorReport,
} from '@/types'
import {
  Swords, Plus, Trash2, Pencil, X, TrendingUp, TrendingDown,
  FileText, AlertTriangle, Shield, Lightbulb, Target,
  ArrowUp, ArrowDown, Building2, Loader2, RefreshCw, Sparkles,
  ChevronDown, ChevronUp,
} from 'lucide-react'

interface CompetitorsPanelProps {
  orgId: string
}

// ============================================================
// COMPETITOR FORM MODAL
// ============================================================

function CompetitorFormModal({
  competitor,
  onSave,
  onClose,
  saving,
}: {
  competitor: Competitor | null
  onSave: (data: { name: string; city: string; specialty: string; services_prices: Record<string, number>; website?: string; notes?: string }) => void
  onClose: () => void
  saving: boolean
}) {
  const t = useTranslations('competitors')
  const tCommon = useTranslations('common')

  const [name, setName] = useState(competitor?.name || '')
  const [city, setCity] = useState(competitor?.city || '')
  const [specialty, setSpecialty] = useState(competitor?.specialty || '')
  const [website, setWebsite] = useState(competitor?.website || '')
  const [notes, setNotes] = useState(competitor?.notes || '')
  const [services, setServices] = useState<Array<{ key: string; value: string }>>(
    competitor?.services_prices
      ? Object.entries(competitor.services_prices).map(([k, v]) => ({ key: k, value: String(v) }))
      : [{ key: '', value: '' }]
  )

  const addService = () => setServices(s => [...s, { key: '', value: '' }])
  const removeService = (idx: number) => setServices(s => s.filter((_, i) => i !== idx))
  const updateService = (idx: number, field: 'key' | 'value', val: string) =>
    setServices(s => s.map((item, i) => i === idx ? { ...item, [field]: val } : item))

  const handleSubmit = () => {
    if (!name.trim() || !city.trim()) return
    const servicesPrices: Record<string, number> = {}
    for (const s of services) {
      if (s.key.trim() && s.value.trim()) {
        servicesPrices[s.key.trim()] = Number(s.value)
      }
    }
    onSave({ name: name.trim(), city: city.trim(), specialty: specialty.trim(), services_prices: servicesPrices, website: website.trim() || undefined, notes: notes.trim() || undefined })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card p-4 w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold font-mono text-text-primary">
            {competitor ? t('editCompetitor') : t('addCompetitor')}
          </h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="space-y-3">
          <input
            value={name} onChange={e => setName(e.target.value)}
            placeholder={t('namePlaceholder')}
            className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-xs text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand-purple/40"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              value={city} onChange={e => setCity(e.target.value)}
              placeholder={t('cityPlaceholder')}
              className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-xs text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand-purple/40"
            />
            <input
              value={specialty} onChange={e => setSpecialty(e.target.value)}
              placeholder={t('specialtyPlaceholder')}
              className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-xs text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand-purple/40"
            />
          </div>
          <input
            value={website} onChange={e => setWebsite(e.target.value)}
            placeholder={t('websitePlaceholder')}
            className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-xs text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand-purple/40"
          />

          {/* Service prices */}
          <div>
            <p className="text-[12px] font-body text-text-dim font-semibold uppercase tracking-wider mb-2">{t('servicePrices')}</p>
            <div className="space-y-2">
              {services.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={s.key} onChange={e => updateService(i, 'key', e.target.value)}
                    placeholder={t('serviceNamePlaceholder')}
                    className="flex-1 px-3 py-2 rounded-lg bg-surface-2 border border-border text-xs text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand-purple/40"
                  />
                  <input
                    value={s.value} onChange={e => updateService(i, 'value', e.target.value)}
                    placeholder={t('pricePlaceholder')}
                    type="number"
                    className="w-28 px-3 py-2 rounded-lg bg-surface-2 border border-border text-xs text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand-purple/40"
                  />
                  {services.length > 1 && (
                    <button onClick={() => removeService(i)} className="w-7 h-7 rounded-lg bg-surface-3 border border-border flex items-center justify-center text-text-dim hover:text-status-danger transition-colors">
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={addService} className="mt-2 text-[10px] text-brand-purple font-semibold hover:text-brand-purple-dark transition-colors flex items-center gap-1">
              <Plus size={10} /> {t('addService')}
            </button>
          </div>

          <textarea
            value={notes} onChange={e => setNotes(e.target.value)}
            placeholder={t('notesPlaceholder')}
            rows={2}
            className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-xs text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand-purple/40 resize-none"
          />

          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg bg-surface-2 border border-border text-xs font-semibold text-text-muted hover:text-text-primary transition-colors">
              {tCommon('cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !name.trim() || !city.trim()}
              className="flex-1 px-4 py-2 rounded-lg bg-brand-purple text-white text-xs font-semibold hover:bg-brand-purple-dark transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin mx-auto" /> : tCommon('save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// REPORT MODAL
// ============================================================

function ReportModal({ report, onClose }: { report: CompetitorReport; onClose: () => void }) {
  const t = useTranslations('competitors')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card p-4 w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold font-mono text-text-primary flex items-center gap-2">
            <FileText size={14} className="text-brand-purple" />
            {t('fullReport')}
          </h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Position Summary */}
        <div className="mb-3 p-4 rounded-lg bg-surface-2 border border-border">
          <p className="text-xs font-semibold text-text-primary mb-1">{t('marketPosition')}</p>
          <p className="text-xs text-text-muted">
            {t('competitiveIn', { count: report.market_position.competitive_services, total: report.market_position.total_services })}
          </p>
          <p className="text-[10px] text-text-dim mt-1">Score: {report.market_position.overall_score.toFixed(0)}/100</p>
        </div>

        {/* SWOT */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <SwotCard type="strength" items={report.insights.strengths} />
          <SwotCard type="weakness" items={report.insights.weaknesses} />
          <SwotCard type="opportunity" items={report.insights.opportunities} />
          <SwotCard type="threat" items={report.insights.threats} />
        </div>

        {/* AI Summary */}
        {report.insights.summary && (
          <div className="p-4 rounded-lg bg-surface-2 border border-border">
            <p className="text-xs font-semibold text-text-primary mb-2 flex items-center gap-1.5">
              <Sparkles size={12} className="text-brand-purple" />
              {t('aiSummary')}
            </p>
            <p className="text-xs text-text-muted leading-relaxed whitespace-pre-line">{report.insights.summary}</p>
          </div>
        )}

        <p className="text-[10px] text-text-dim mt-3 text-right">
          {new Date(report.generated_at).toLocaleString('es-CO')}
        </p>
      </div>
    </div>
  )
}

// ============================================================
// SWOT CARD
// ============================================================

const SWOT_CONFIG = {
  strength: { icon: Shield, color: 'text-status-success', bg: 'bg-status-success/10', border: 'border-status-success/20', labelKey: 'swotStrengths' },
  weakness: { icon: AlertTriangle, color: 'text-status-danger', bg: 'bg-status-danger/10', border: 'border-status-danger/20', labelKey: 'swotWeaknesses' },
  opportunity: { icon: Lightbulb, color: 'text-status-info', bg: 'bg-status-info/10', border: 'border-status-info/20', labelKey: 'swotOpportunities' },
  threat: { icon: Target, color: 'text-status-warning', bg: 'bg-status-warning/10', border: 'border-status-warning/20', labelKey: 'swotThreats' },
} as const

function SwotCard({ type, items }: { type: keyof typeof SWOT_CONFIG; items: string[] }) {
  const cfg = SWOT_CONFIG[type]
  const Icon = cfg.icon
  const t = useTranslations('competitors')
  return (
    <div className={`p-3 rounded-lg ${cfg.bg} border ${cfg.border}`}>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={12} className={cfg.color} />
        <span className={`text-[10px] font-bold font-body uppercase tracking-wider ${cfg.color}`}>{t(cfg.labelKey)}</span>
      </div>
      {items.length > 0 ? (
        <ul className="space-y-1">
          {items.map((item, i) => (
            <li key={i} className="text-[11px] text-text-muted leading-relaxed">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[10px] text-text-dim italic">Sin datos</p>
      )}
    </div>
  )
}

// ============================================================
// POSITION BADGE
// ============================================================

function PositionBadge({ position }: { position: PricingComparison['position'] }) {
  const config = {
    CHEAPER: { label: 'Economico', color: 'text-status-success', bg: 'bg-status-success/10 border-status-success/20' },
    SIMILAR: { label: 'Similar', color: 'text-status-warning', bg: 'bg-status-warning/10 border-status-warning/20' },
    EXPENSIVE: { label: 'Caro', color: 'text-status-danger', bg: 'bg-status-danger/10 border-status-danger/20' },
  }
  const cfg = config[position]
  return (
    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

// ============================================================
// MAIN PANEL
// ============================================================

export default function CompetitorsPanel({ orgId }: CompetitorsPanelProps) {
  const t = useTranslations('competitors')

  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [pricing, setPricing] = useState<PricingComparison[]>([])
  const [position, setPosition] = useState<MarketPosition | null>(null)
  const [insights, setInsights] = useState<CompetitiveInsights | null>(null)
  const [benchmarks, setBenchmarks] = useState<MarketBenchmark[]>([])
  const [priceChanges, setPriceChanges] = useState<PriceChange[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [report, setReport] = useState<CompetitorReport | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingCompetitor, setEditingCompetitor] = useState<Competitor | null>(null)
  const [showReport, setShowReport] = useState(false)
  const [expandedPricing, setExpandedPricing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [comp, prc, pos, ins, bm, pc] = await Promise.all([
        listCompetitors(orgId),
        getPricingComparison(orgId),
        getMarketPosition(orgId),
        getCompetitiveInsights(orgId),
        getBenchmarks(orgId),
        getPriceChanges(orgId),
      ])
      setCompetitors(comp)
      setPricing(prc)
      setPosition(pos)
      setInsights(ins)
      setBenchmarks(bm)
      setPriceChanges(pc)
    } catch (e) {
      Sentry.captureException(e)
    }
    setLoading(false)
  }, [orgId])

  useEffect(() => { loadData() }, [loadData])

  const handleSaveCompetitor = async (data: Parameters<typeof registerCompetitor>[1]) => {
    setSaving(true)
    try {
      if (editingCompetitor) {
        await updateCompetitor(orgId, editingCompetitor.id, data)
      } else {
        await registerCompetitor(orgId, data)
      }
      setShowForm(false)
      setEditingCompetitor(null)
      await loadData()
    } catch (e) {
      Sentry.captureException(e)
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteCompetitor(orgId, id)
      setConfirmDelete(null)
      await loadData()
    } catch (e) {
      Sentry.captureException(e)
    }
  }

  const handleGenerateReport = async () => {
    setGenerating(true)
    try {
      const r = await generateReport(orgId)
      if (r) {
        setReport(r)
        setShowReport(true)
      }
    } catch (e) {
      Sentry.captureException(e)
    }
    setGenerating(false)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="glass-card p-4 animate-pulse">
            <div className="h-5 bg-surface-3 rounded w-48 mb-3" />
            <div className="h-20 bg-surface-3 rounded" />
          </div>
        ))}
      </div>
    )
  }

  const pricingToShow = expandedPricing ? pricing : pricing.slice(0, 8)

  return (
    <div className="space-y-5">
      {/* HEADER ACTIONS */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center text-brand-purple">
            <Swords size={14} />
          </div>
          <div>
            <h3 className="text-sm font-bold font-mono text-text-primary">{t('title')}</h3>
            <p className="text-[12px] font-body text-text-dim">{t('subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateReport}
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-purple/10 border border-brand-purple/20 text-brand-purple text-xs font-semibold hover:bg-brand-purple/20 transition-colors disabled:opacity-50"
          >
            {generating ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
            {t('generateReport')}
          </button>
          {/* CRUD removido: agregar competidor vive SOLO en Pulso (SofIA). */}
          <button onClick={loadData} className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* PRICE CHANGE ALERTS */}
      {priceChanges.length > 0 && (
        <div className="space-y-2">
          {priceChanges.map((pc, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-status-warning/5 border border-status-warning/15">
              <div className="w-7 h-7 rounded-lg bg-status-warning/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={13} className="text-status-warning" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-text-primary">{pc.competitor_name}</span>
                <span className="text-[11px] text-text-muted ml-2">{pc.service}</span>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-[10px] text-text-dim line-through">{formatCurrency(pc.old_price)}</span>
                <span className="text-xs font-bold text-text-primary ml-1.5">{formatCurrency(pc.new_price)}</span>
                <span className={`text-[12px] font-body font-semibold ml-1 ${pc.change_pct > 0 ? 'text-status-danger' : 'text-status-success'}`}>
                  {pc.change_pct > 0 ? '+' : ''}{pc.change_pct.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MARKET POSITION SUMMARY */}
      {position && (
        <div className="glass-card p-4">
          <h4 className="text-xs font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Target size={13} className="text-brand-purple" />
            {t('marketPosition')}
          </h4>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold font-mono text-text-primary">
                  {position.competitive_services}/{position.total_services}
                </span>
                <span className="text-xs text-text-muted">{t('servicesCompetitive')}</span>
              </div>
              {/* Visual gauge */}
              <div className="h-2.5 rounded-full bg-surface-3 overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand-purple transition-all duration-500"
                  style={{ width: `${position.total_services > 0 ? (position.competitive_services / position.total_services) * 100 : 0}%` }}
                />
              </div>
              <p className="text-[10px] text-text-dim mt-1.5">
                Score: <span className="font-body font-semibold text-text-muted">{position.overall_score.toFixed(0)}</span>/100
              </p>
            </div>
            <div className="w-px h-16 bg-border" />
            <div className="space-y-1.5">
              {position.cheap_services.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <ArrowDown size={10} className="text-status-success" />
                  <span className="text-[10px] text-text-muted">{position.cheap_services.slice(0, 3).join(', ')}</span>
                </div>
              )}
              {position.expensive_services.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <ArrowUp size={10} className="text-status-danger" />
                  <span className="text-[10px] text-text-muted">{position.expensive_services.slice(0, 3).join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PRICING COMPARISON TABLE */}
      {pricing.length > 0 && (
        <div className="glass-card p-4">
          <h4 className="text-xs font-semibold text-text-primary mb-3">{t('pricingComparison')}</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-text-dim font-semibold">{t('service')}</th>
                  <th className="text-right py-2 text-text-dim font-semibold">{t('yourPrice')}</th>
                  <th className="text-right py-2 text-text-dim font-semibold">{t('competitorAvg')}</th>
                  <th className="text-right py-2 text-text-dim font-semibold">{t('marketAvg')}</th>
                  <th className="text-right py-2 text-text-dim font-semibold">{t('diff')}</th>
                  <th className="text-center py-2 text-text-dim font-semibold">{t('position')}</th>
                </tr>
              </thead>
              <tbody>
                {pricingToShow.map((p, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-surface-2/50 transition-colors">
                    <td className="py-2.5 font-medium text-text-primary">{p.service}</td>
                    <td className="py-2.5 text-right font-body text-text-primary">{formatCurrency(p.your_price)}</td>
                    <td className="py-2.5 text-right font-body text-text-muted">{formatCurrency(p.competitor_avg)}</td>
                    <td className="py-2.5 text-right font-body text-text-muted">{formatCurrency(p.market_avg)}</td>
                    <td className="py-2.5 text-right">
                      <span className={`font-body font-semibold ${
                        p.difference_pct > 5 ? 'text-status-danger' : p.difference_pct < -5 ? 'text-status-success' : 'text-status-warning'
                      }`}>
                        {p.difference_pct > 0 ? '+' : ''}{p.difference_pct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2.5 text-center"><PositionBadge position={p.position} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pricing.length > 8 && (
            <button
              onClick={() => setExpandedPricing(!expandedPricing)}
              className="mt-2 text-[10px] text-brand-purple font-semibold hover:text-brand-purple-dark transition-colors flex items-center gap-1 mx-auto"
            >
              {expandedPricing ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              {expandedPricing ? t('showLess') : t('showAll', { count: pricing.length })}
            </button>
          )}
        </div>
      )}

      {/* BENCHMARKS VS MARKET */}
      {benchmarks.length > 0 && (
        <div className="glass-card p-4">
          <h4 className="text-xs font-semibold text-text-primary mb-3">{t('benchmarksTitle')}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {benchmarks.map((bm, i) => (
              <div key={i} className="px-4 py-3.5 rounded-lg bg-surface-2 border border-border">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-text-primary">{bm.metric}</span>
                  {bm.is_better ? (
                    <TrendingUp size={13} className="text-status-success" />
                  ) : (
                    <TrendingDown size={13} className="text-status-danger" />
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold font-mono text-text-primary">
                    {typeof bm.your_value === 'number' && bm.your_value < 100 ? `${bm.your_value.toFixed(1)}%` : formatCurrency(bm.your_value)}
                  </span>
                  <span className="text-[10px] text-text-dim">
                    vs {typeof bm.market_avg === 'number' && bm.market_avg < 100 ? `${bm.market_avg.toFixed(1)}%` : formatCurrency(bm.market_avg)}
                  </span>
                </div>
                <span className={`text-[12px] font-body font-semibold ${bm.is_better ? 'text-status-success' : 'text-status-danger'}`}>
                  {bm.difference_pct > 0 ? '+' : ''}{bm.difference_pct.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI COMPETITIVE INSIGHTS (SWOT) */}
      {insights && (
        <div className="glass-card p-4">
          <h4 className="text-xs font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Sparkles size={13} className="text-brand-purple" />
            {t('aiInsights')}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SwotCard type="strength" items={insights.strengths} />
            <SwotCard type="weakness" items={insights.weaknesses} />
            <SwotCard type="opportunity" items={insights.opportunities} />
            <SwotCard type="threat" items={insights.threats} />
          </div>
          {insights.summary && (
            <p className="text-xs text-text-muted leading-relaxed mt-3 p-3 rounded-lg bg-surface-2 border border-border whitespace-pre-line">
              {insights.summary}
            </p>
          )}
        </div>
      )}

      {/* REGISTERED COMPETITORS */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-text-primary flex items-center gap-2">
            <Building2 size={13} className="text-text-muted" />
            {t('registeredCompetitors')} ({competitors.length})
          </h4>
        </div>
        {competitors.length === 0 ? (
          <div className="text-center py-8">
            <Building2 size={28} className="mx-auto text-text-dim mb-2" />
            <p className="text-xs text-text-muted">{t('noCompetitors')}</p>
            <p className="text-[10px] text-text-dim mt-1">{t('noCompetitorsHint')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {competitors.map(comp => (
              <div key={comp.id} className="px-4 py-3 rounded-lg bg-surface-2 border border-border hover:border-border-2 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-text-primary">{comp.name}</p>
                    <p className="text-[10px] text-text-dim">{comp.city} {comp.specialty && `- ${comp.specialty}`}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setEditingCompetitor(comp); setShowForm(true) }}
                      className="w-6 h-6 rounded-md bg-surface-3 border border-border flex items-center justify-center text-text-dim hover:text-brand-purple transition-colors"
                    >
                      <Pencil size={10} />
                    </button>
                    {confirmDelete === comp.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(comp.id)}
                          className="px-2 py-1 rounded-md bg-status-danger/10 text-status-danger text-[9px] font-semibold"
                        >
                          Si
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="px-2 py-1 rounded-md bg-surface-3 text-text-dim text-[9px] font-semibold"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(comp.id)}
                        className="w-6 h-6 rounded-md bg-surface-3 border border-border flex items-center justify-center text-text-dim hover:text-status-danger transition-colors"
                      >
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>
                </div>
                {Object.keys(comp.services_prices).length > 0 && (
                  <p className="text-[10px] text-text-dim mt-1.5">
                    {Object.keys(comp.services_prices).length} {t('servicesRegistered')}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EMPTY STATE — no data at all */}
      {!position && pricing.length === 0 && competitors.length === 0 && (
        <div className="glass-card p-8 text-center">
          <Swords size={36} className="mx-auto text-text-dim mb-3" />
          <p className="text-sm font-semibold text-text-primary mb-1">{t('emptyTitle')}</p>
          <p className="text-xs text-text-muted">{t('emptyHint')}</p>
        </div>
      )}

      {/* MODALS */}
      {showForm && (
        <CompetitorFormModal
          competitor={editingCompetitor}
          onSave={handleSaveCompetitor}
          onClose={() => { setShowForm(false); setEditingCompetitor(null) }}
          saving={saving}
        />
      )}

      {showReport && report && (
        <ReportModal report={report} onClose={() => setShowReport(false)} />
      )}
    </div>
  )
}
