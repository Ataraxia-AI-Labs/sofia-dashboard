'use client'

import { useEffect, useState, useCallback } from 'react'
import { useOrg } from '@/lib/org-context'
import { getGrowthDashboard, getAttribution, getChannelROI, listAdCampaigns, getSEOHealth } from '@/lib/api/growth'
import type { GrowthMetrics, AttributionData, AdCampaign } from '@/lib/api/growth'
import { useTranslations } from 'next-intl'
import { formatCurrency } from '@/lib/api/helpers'
import { TrendingUp, ArrowRight, BarChart3, Target, Megaphone, Search, Sparkles, Clock } from 'lucide-react'

type Tab = 'funnel' | 'attribution' | 'ads' | 'seo'

const HIDDEN_KEYS = new Set(['org_id', 'id'])
const FACTOR_LABELS: Record<string, string> = {
  technical: 'Técnico',
  content: 'Contenido',
  backlinks: 'Backlinks',
  performance: 'Performance',
  local_seo: 'SEO Local',
  mobile: 'Móvil',
  ux: 'UX',
}

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return 'hace un momento'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}

const KPI_LABELS: Record<string, string> = {
  conversion_rate: 'Tasa de conversión',
  avg_order_value: 'Ticket promedio',
  customer_acquisition_cost: 'CAC',
  lifetime_value: 'LTV',
  return_on_ad_spend: 'ROAS',
  click_through_rate: 'CTR',
  cost_per_click: 'CPC',
  cost_per_lead: 'CPL',
  bounce_rate: 'Rebote',
  session_duration: 'Duración sesión',
}

function formatKpiLabel(k: string): string {
  return KPI_LABELS[k] || k.replace(/_/g, ' ')
}

function formatKpiValue(k: string, v: unknown): string {
  if (v === null || v === undefined) return '—'
  const n = typeof v === 'number' ? v : Number(v)
  if (Number.isNaN(n)) return String(v)
  if (k.includes('rate') || k.includes('ratio') || k === 'bounce_rate') {
    return n <= 1 ? `${(n * 100).toFixed(1)}%` : `${n.toFixed(1)}%`
  }
  if (k.includes('cost') || k.includes('value') || k.includes('spend') || k.includes('revenue') || n > 1000) {
    return formatCurrency(n)
  }
  if (k === 'return_on_ad_spend' || k === 'roas') {
    return `${n.toFixed(2)}x`
  }
  return n.toLocaleString('es-CO')
}

function formatAnomaly(a: unknown): string {
  if (typeof a === 'string') return a
  if (a && typeof a === 'object') {
    const obj = a as Record<string, unknown>
    if (obj.description) return String(obj.description)
    if (obj.message) return String(obj.message)
    const metric = obj.metric ? String(obj.metric) : 'Métrica'
    const change = obj.change ? String(obj.change) : ''
    const reason = obj.reason ? ` — ${obj.reason}` : ''
    return `${metric}${change ? ` cambió ${change}` : ' tuvo un cambio inusual'}${reason}`
  }
  return String(a)
}

function formatChannelName(channel: string): string {
  const map: Record<string, string> = {
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    facebook: 'Facebook',
    google_ads: 'Google Ads',
    meta_ads: 'Meta Ads',
    organic: 'Búsqueda orgánica',
    direct: 'Directo',
    referral: 'Referencia',
    email: 'Email',
    sms: 'SMS',
    voice: 'Voz / Llamadas',
    webchat: 'Chat web',
  }
  return map[channel] || channel.charAt(0).toUpperCase() + channel.slice(1).replace(/_/g, ' ')
}

function gradeColor(grade: string | undefined): string {
  if (!grade) return 'text-text-dim'
  if (grade === 'A' || grade === 'A+') return 'text-status-success'
  if (grade === 'B') return 'text-brand-purple'
  if (grade === 'C') return 'text-status-warning'
  return 'text-status-danger'
}

function SEOHealthView({ seo }: { seo: Record<string, unknown> }) {
  if (!seo || Object.keys(seo).length === 0) {
    return (
      <div className="text-center py-12">
        <Search size={24} className="mx-auto text-text-dim/30 mb-2" />
        <p className="text-[12px] font-body text-text-dim">Aún no hay análisis SEO disponible.</p>
        <p className="text-[11px] font-body text-text-dim/70 mt-1">El próximo crawl se ejecutará automáticamente.</p>
      </div>
    )
  }

  const score = Number(seo.score ?? 0)
  const maxScore = Number(seo.max_possible ?? 100)
  const grade = String(seo.grade ?? '—')
  const calculatedAt = seo.calculated_at as string | null
  const factors = seo.factors as Record<string, number> | null
  const pct = Math.min(100, Math.max(0, (score / (maxScore || 100)) * 100))

  return (
    <div className="space-y-5">
      {/* Hero — Score + Grade + Progress */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 bg-surface/50 backdrop-blur-sm"
        style={{ boxShadow: '0 0 0 1px rgba(139,92,246,0.12), 0 6px 28px -6px rgba(139,92,246,0.2)' }}
      >
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div>
            <div className="text-[11px] font-body font-semibold uppercase tracking-[0.18em] text-text-dim mb-1.5 flex items-center gap-1.5">
              <Sparkles size={11} className="text-brand-purple" />
              Salud SEO
            </div>
            <div className="flex items-baseline gap-3">
              <div className="text-[56px] font-display font-medium text-text-primary leading-none tabular-nums">{score}</div>
              <div className="text-[18px] font-body text-text-dim">/ {maxScore}</div>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className={`text-[64px] font-display font-medium leading-none ${gradeColor(grade)}`}>{grade}</div>
            <div className="text-[10px] font-body text-text-dim uppercase tracking-wider mt-1">Grade</div>
          </div>
        </div>

        <div className="mt-5">
          <div className="w-full h-2 rounded-full bg-surface-2 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${pct}%`,
                background: 'linear-gradient(90deg, #aa94ce, #8b5cf6)',
                boxShadow: '0 0 8px rgba(139,92,246,0.5)',
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-body text-text-dim mt-1.5">
            <span>0</span>
            <span>{maxScore}</span>
          </div>
        </div>

        {calculatedAt && (
          <div className="mt-4 flex items-center gap-1.5 text-[11px] font-body text-text-dim">
            <Clock size={10} />
            Calculado {formatRelative(calculatedAt)}
          </div>
        )}
      </div>

      {/* Factors breakdown */}
      {factors && typeof factors === 'object' && Object.keys(factors).length > 0 && (
        <div>
          <div className="text-[11px] font-body font-semibold uppercase tracking-[0.18em] text-text-dim mb-2.5">
            Factores analizados
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {Object.entries(factors).map(([k, v]) => {
              const numeric = typeof v === 'number' ? v : Number(v) || 0
              const factorPct = numeric <= 1 ? numeric * 100 : numeric
              return (
                <div
                  key={k}
                  className="rounded-lg p-3 bg-surface/40"
                  style={{ boxShadow: '0 0 0 1px rgba(139,92,246,0.08)' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] font-body text-text-primary">
                      {FACTOR_LABELS[k] || k.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[11px] font-mono font-semibold text-text-primary tabular-nums">
                      {factorPct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full h-1 rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, factorPct)}%`,
                        background:
                          factorPct >= 80 ? '#06d6a0' :
                          factorPct >= 50 ? '#8b5cf6' :
                          factorPct >= 25 ? '#f5c842' : '#ef4444',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Extra metadata (any other fields, filtered) */}
      {Object.entries(seo).filter(([k]) =>
        !HIDDEN_KEYS.has(k) &&
        !['score', 'grade', 'max_possible', 'calculated_at', 'factors'].includes(k)
      ).length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-[11px] font-body text-text-dim hover:text-text-muted transition-colors select-none">
            Ver detalles técnicos
          </summary>
          <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.entries(seo)
              .filter(([k]) =>
                !HIDDEN_KEYS.has(k) &&
                !['score', 'grade', 'max_possible', 'calculated_at', 'factors'].includes(k)
              )
              .map(([k, v]) => (
                <div key={k} className="rounded-lg p-2.5 bg-surface/30">
                  <div className="text-[9px] font-body uppercase tracking-wider text-text-dim">{k.replace(/_/g, ' ')}</div>
                  <div className="text-[12px] font-body text-text-primary mt-0.5 truncate">
                    {typeof v === 'object' ? JSON.stringify(v).slice(0, 80) : String(v)}
                  </div>
                </div>
              ))}
          </div>
        </details>
      )}
    </div>
  )
}

export default function CrecimientoPage() {
  const { orgId } = useOrg()
  const t = useTranslations('growthPage')

  const [tab, setTab] = useState<Tab>('funnel')
  const [metrics, setMetrics] = useState<GrowthMetrics | null>(null)
  const [attribution, setAttribution] = useState<AttributionData | null>(null)
  const [channelROI, setChannelROI] = useState<Record<string, unknown>>({})
  const [ads, setAds] = useState<AdCampaign[]>([])
  const [seo, setSeo] = useState<Record<string, unknown>>({})
  const [attrModel, setAttrModel] = useState('last_touch')
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [m, a, cr, ad, se] = await Promise.all([
        getGrowthDashboard(orgId, days),
        getAttribution(orgId, attrModel, days),
        getChannelROI(orgId, days),
        listAdCampaigns(orgId),
        getSEOHealth(orgId),
      ])
      setMetrics(m)
      setAttribution(a)
      setChannelROI(cr)
      setAds(ad)
      setSeo(se)
    } catch { /* */ }
    setLoading(false)
  }, [orgId, days, attrModel])

  useEffect(() => { load() }, [load])

  const funnelSteps = metrics ? [
    { label: t('visitors'), value: metrics.funnel.visitors, color: 'text-text-muted' },
    { label: t('leads'), value: metrics.funnel.leads, color: 'text-status-info' },
    { label: t('appointments'), value: metrics.funnel.appointments, color: 'text-brand-purple' },
    { label: t('completed'), value: metrics.funnel.completed, color: 'text-status-success' },
    { label: t('revenue'), value: formatCurrency(metrics.funnel.revenue), color: 'text-status-success' },
  ] : []

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-sm font-body font-bold text-text-primary tracking-wide flex items-center gap-2">
          <TrendingUp size={16} className="text-brand-purple" />
          {t('title')}
        </h1>
        <p className="text-[12px] font-body text-text-dim mt-0.5">{t('subtitle')}</p>
      </div>

      {/* Tabs + days filter on same row */}
      <div className="flex items-end justify-between gap-4 border-b border-brand-purple/10">
        <div className="flex gap-4">
          {([
            { id: 'funnel' as Tab, icon: BarChart3, label: t('funnel') },
            { id: 'attribution' as Tab, icon: Target, label: t('attribution') },
            { id: 'ads' as Tab, icon: Megaphone, label: t('adCampaigns') },
            { id: 'seo' as Tab, icon: Search, label: t('seoHealth') },
          ]).map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)}
              className={`flex items-center gap-1 text-[12px] font-body font-semibold pb-1.5 border-b-2 transition-colors ${
                tab === tb.id ? 'text-brand-purple border-brand-purple' : 'text-text-dim border-transparent hover:text-text-muted'
              }`}><tb.icon size={12} /> {tb.label}</button>
          ))}
        </div>
        <div className="flex gap-0.5 mb-1.5 bg-surface/40 rounded-md p-0.5" style={{ boxShadow: '0 0 0 1px rgba(139,92,246,0.1)' }}>
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`sentient-btn px-2 h-6 rounded text-[10.5px] font-body font-medium transition-colors ${
                days === d ? 'bg-brand-purple/20 text-brand-purple' : 'text-text-dim hover:text-text-primary'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-[12px] font-body text-text-dim py-12 text-center">...</p>
      ) : (
        <>
          {/* Funnel */}
          {tab === 'funnel' && metrics && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 py-6">
                {funnelSteps.map((step, i) => (
                  <div key={step.label} className="flex items-center gap-2">
                    <div className="text-center">
                      <p className={`text-lg font-mono font-bold ${step.color}`}>{step.value}</p>
                      <p className="text-[10px] font-body text-text-dim uppercase tracking-wider">{step.label}</p>
                    </div>
                    {i < funnelSteps.length - 1 && <ArrowRight size={14} className="text-text-dim/30" />}
                  </div>
                ))}
              </div>

              {/* KPIs */}
              {metrics.kpis && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(metrics.kpis).map(([k, v]) => (
                    <div key={k} className="rounded-xl p-3.5 bg-surface/40" style={{ boxShadow: '0 0 0 1px rgba(139,92,246,0.1), 0 2px 12px -4px rgba(139,92,246,0.12)' }}>
                      <p className="text-[10px] font-body text-text-dim uppercase tracking-[0.14em]">{formatKpiLabel(k)}</p>
                      <p className="text-xl font-mono font-semibold text-text-primary mt-1 tabular-nums">{formatKpiValue(k, v)}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Anomalies */}
              {metrics.anomalies?.length > 0 && (
                <div>
                  <div className="text-[11px] font-body font-semibold uppercase tracking-[0.18em] text-text-dim mb-2 flex items-center gap-1.5">
                    <Sparkles size={11} className="text-status-warning" />
                    {t('anomalies')}
                  </div>
                  <div className="space-y-1.5">
                    {metrics.anomalies.map((a, i) => (
                      <div key={i} className="rounded-lg px-3 py-2 bg-status-warning/5" style={{ boxShadow: '0 0 0 1px rgba(245,200,66,0.18)' }}>
                        <p className="text-[12.5px] font-body text-text-primary leading-relaxed">{formatAnomaly(a)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Attribution */}
          {tab === 'attribution' && (
            <div className="space-y-4">
              <div className="inline-flex gap-0.5 bg-surface/40 rounded-lg p-0.5" style={{ boxShadow: '0 0 0 1px rgba(139,92,246,0.1)' }}>
                {['first_touch', 'last_touch', 'linear', 'time_decay', 'position'].map(m => (
                  <button
                    key={m}
                    onClick={() => setAttrModel(m)}
                    className={`sentient-btn text-[11px] font-body font-medium px-2.5 h-7 rounded-md transition-colors ${
                      attrModel === m ? 'bg-brand-purple/18 text-brand-purple' : 'text-text-dim hover:text-text-primary'
                    }`}
                  >
                    {t(m === 'first_touch' ? 'firstTouch' : m === 'last_touch' ? 'lastTouch' : m === 'time_decay' ? 'timeDecay' : m as 'linear')}
                  </button>
                ))}
              </div>

              {attribution && (
                <div className="space-y-2">
                  {Object.entries(attribution.channels || {}).map(([channel, data]) => {
                    const d = data as { conversions: number; revenue: number; weight: number }
                    return (
                      <div key={channel} className="rounded-xl p-3.5 flex items-center justify-between bg-surface/40" style={{ boxShadow: '0 0 0 1px rgba(139,92,246,0.1)' }}>
                        <div className="min-w-0">
                          <div className="text-[13px] font-body font-semibold text-text-primary truncate">{formatChannelName(channel)}</div>
                          <div className="text-[11px] font-body text-text-dim mt-0.5">{d.conversions.toLocaleString()} conversiones</div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          <div className="text-[14px] font-mono font-semibold text-text-primary tabular-nums">{formatCurrency(d.revenue)}</div>
                          <div className="w-24 h-1 bg-surface-2 rounded-full mt-1.5 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${(d.weight || 0) * 100}%`,
                                background: 'linear-gradient(90deg, #aa94ce, #8b5cf6)',
                                boxShadow: '0 0 6px rgba(139,92,246,0.5)',
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Ads */}
          {tab === 'ads' && (
            <div className="space-y-2">
              {ads.length === 0 ? (
                <div className="text-center py-12">
                  <Megaphone size={24} className="mx-auto text-text-dim/30 mb-2" />
                  <p className="text-[12.5px] font-body text-text-dim">Aún no hay campañas activas.</p>
                  <p className="text-[11px] font-body text-text-dim/70 mt-1">Conecta Meta Ads o Google Ads desde Ajustes para ver tus campañas aquí.</p>
                </div>
              ) : ads.map(ad => (
                <div key={ad.id} className="rounded-xl p-4 bg-surface/40" style={{ boxShadow: '0 0 0 1px rgba(139,92,246,0.1), 0 2px 12px -4px rgba(139,92,246,0.12)' }}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex-shrink-0 text-[10px] font-body bg-surface-2 rounded px-1.5 py-0.5 text-text-dim uppercase tracking-wide" style={{ boxShadow: '0 0 0 1px rgba(139,92,246,0.1)' }}>{ad.platform}</span>
                      <span className="text-[13px] font-body font-semibold text-text-primary truncate">{ad.name}</span>
                    </div>
                    <span className={`flex-shrink-0 text-[10px] font-body font-semibold px-2 py-0.5 rounded-full ${ad.status === 'ACTIVE' ? 'bg-status-success/10 text-status-success' : 'bg-surface-2 text-text-dim'}`} style={{ boxShadow: ad.status === 'ACTIVE' ? '0 0 0 1px rgba(6,214,160,0.25)' : '0 0 0 1px rgba(139,92,246,0.08)' }}>{ad.status === 'ACTIVE' ? 'Activa' : ad.status}</span>
                  </div>
                  <div className="grid grid-cols-5 gap-3 mt-3 pt-3 border-t border-brand-purple/8">
                    {[
                      { l: 'Inversión', v: formatCurrency(ad.spend) },
                      { l: 'Impresiones', v: ad.impressions.toLocaleString() },
                      { l: 'Clicks', v: ad.clicks.toLocaleString() },
                      { l: 'Conversiones', v: ad.conversions.toLocaleString() },
                      { l: 'ROI', v: ad.roi ? `${(ad.roi * 100).toFixed(0)}%` : '—', highlight: ad.roi && ad.roi > 1 },
                    ].map(m => (
                      <div key={m.l}>
                        <p className="text-[10px] font-body text-text-dim">{m.l}</p>
                        <p className={`text-[13px] font-mono font-semibold tabular-nums mt-0.5 ${m.highlight ? 'text-status-success' : 'text-text-primary'}`}>{m.v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SEO Health */}
          {tab === 'seo' && (
            <SEOHealthView seo={seo} />
          )}

          {!metrics && tab === 'funnel' && (
            <div className="text-center py-12">
              <TrendingUp size={24} className="mx-auto text-text-dim/30 mb-2" />
              <p className="text-[12px] font-body text-text-dim">{t('noData')}</p>
              <p className="text-[11px] font-body text-text-dim/70 mt-1">{t('noDataHint')}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
