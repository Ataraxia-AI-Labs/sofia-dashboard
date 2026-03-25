'use client'

import { useEffect, useState, useCallback } from 'react'
import { useOrg } from '@/lib/org-context'
import { getGrowthDashboard, getAttribution, getChannelROI, listAdCampaigns, getSEOHealth } from '@/lib/api/growth'
import type { GrowthMetrics, AttributionData, AdCampaign } from '@/lib/api/growth'
import { useTranslations } from 'next-intl'
import { formatCurrency } from '@/lib/api/helpers'
import { TrendingUp, ArrowRight, BarChart3, Target, Megaphone, Search } from 'lucide-react'

type Tab = 'funnel' | 'attribution' | 'ads' | 'seo'

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
    { label: t('leads'), value: metrics.funnel.leads, color: 'text-blue-400' },
    { label: t('appointments'), value: metrics.funnel.appointments, color: 'text-brand-purple' },
    { label: t('completed'), value: metrics.funnel.completed, color: 'text-status-success' },
    { label: t('revenue'), value: formatCurrency(metrics.funnel.revenue), color: 'text-status-success' },
  ] : []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-mono font-bold text-text-primary tracking-wide flex items-center gap-2">
            <TrendingUp size={16} className="text-brand-purple" />
            {t('title')}
          </h1>
          <p className="text-[10px] font-mono text-text-dim mt-0.5">{t('subtitle')}</p>
        </div>
        <select value={days} onChange={e => setDays(Number(e.target.value))}
          className="text-[10px] font-mono bg-surface-2 border border-border rounded px-2 py-1 text-text-secondary">
          <option value={7}>7 dias</option>
          <option value={30}>30 dias</option>
          <option value={90}>90 dias</option>
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border">
        {([
          { id: 'funnel' as Tab, icon: BarChart3, label: t('funnel') },
          { id: 'attribution' as Tab, icon: Target, label: t('attribution') },
          { id: 'ads' as Tab, icon: Megaphone, label: t('adCampaigns') },
          { id: 'seo' as Tab, icon: Search, label: t('seoHealth') },
        ]).map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)}
            className={`flex items-center gap-1 text-[10px] font-mono font-semibold pb-1.5 border-b-2 transition-colors ${
              tab === tb.id ? 'text-brand-purple border-brand-purple' : 'text-text-dim border-transparent hover:text-text-muted'
            }`}><tb.icon size={12} /> {tb.label}</button>
        ))}
      </div>

      {loading ? (
        <p className="text-[10px] font-mono text-text-dim py-12 text-center">...</p>
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
                      <p className="text-[8px] font-mono text-text-dim uppercase tracking-wider">{step.label}</p>
                    </div>
                    {i < funnelSteps.length - 1 && <ArrowRight size={14} className="text-text-dim/30" />}
                  </div>
                ))}
              </div>

              {/* KPIs */}
              {metrics.kpis && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(metrics.kpis).map(([k, v]) => (
                    <div key={k} className="border border-border rounded-lg p-3">
                      <p className="text-[8px] font-mono text-text-dim uppercase tracking-wider">{k.replace(/_/g, ' ')}</p>
                      <p className="text-sm font-mono font-bold text-text-primary mt-0.5">{typeof v === 'number' && v > 1000 ? formatCurrency(v) : String(v)}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Anomalies */}
              {metrics.anomalies?.length > 0 && (
                <div>
                  <p className="text-[9px] font-mono text-text-dim uppercase tracking-wider mb-2">{t('anomalies')}</p>
                  {metrics.anomalies.map((a, i) => (
                    <div key={i} className="text-[10px] font-mono text-status-warning bg-status-warning/5 border border-status-warning/15 rounded px-3 py-1.5 mb-1">
                      {JSON.stringify(a)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Attribution */}
          {tab === 'attribution' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                {['first_touch', 'last_touch', 'linear', 'time_decay', 'position'].map(m => (
                  <button key={m} onClick={() => setAttrModel(m)}
                    className={`text-[9px] font-mono px-2 py-1 rounded border transition-colors ${
                      attrModel === m ? 'bg-brand-purple/10 border-brand-purple/30 text-brand-purple font-semibold' : 'border-border text-text-dim hover:text-text-muted'
                    }`}>{t(m === 'first_touch' ? 'firstTouch' : m === 'last_touch' ? 'lastTouch' : m === 'time_decay' ? 'timeDecay' : m as 'linear')}</button>
                ))}
              </div>

              {attribution && (
                <div className="space-y-2">
                  {Object.entries(attribution.channels || {}).map(([channel, data]) => {
                    const d = data as { conversions: number; revenue: number; weight: number }
                    return (
                      <div key={channel} className="border border-border rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <span className="text-[11px] font-mono font-semibold text-text-primary">{channel}</span>
                          <span className="text-[9px] font-mono text-text-dim ml-2">{d.conversions} conversiones</span>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] font-mono font-bold text-status-success">{formatCurrency(d.revenue)}</p>
                          <div className="w-20 h-1.5 bg-surface-2 rounded-full mt-1">
                            <div className="h-full bg-brand-purple rounded-full" style={{ width: `${(d.weight || 0) * 100}%` }} />
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
                <p className="text-[10px] font-mono text-text-dim py-8 text-center">{t('noData')}</p>
              ) : ads.map(ad => (
                <div key={ad.id} className="border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-mono bg-surface-2 border border-border rounded px-1.5 py-0.5 text-text-dim uppercase">{ad.platform}</span>
                      <span className="text-[11px] font-mono font-semibold text-text-primary">{ad.name}</span>
                    </div>
                    <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${ad.status === 'ACTIVE' ? 'bg-status-success/8 text-status-success' : 'bg-surface-2 text-text-dim'}`}>{ad.status}</span>
                  </div>
                  <div className="grid grid-cols-5 gap-3 mt-2">
                    {[
                      { l: 'Spend', v: formatCurrency(ad.spend) },
                      { l: 'Impr', v: ad.impressions.toLocaleString() },
                      { l: 'Clicks', v: ad.clicks.toLocaleString() },
                      { l: 'Conv', v: ad.conversions },
                      { l: 'ROI', v: ad.roi ? `${(ad.roi * 100).toFixed(0)}%` : '—' },
                    ].map(m => (
                      <div key={m.l}>
                        <p className="text-[8px] font-mono text-text-dim">{m.l}</p>
                        <p className="text-[10px] font-mono font-bold text-text-primary">{m.v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SEO Health */}
          {tab === 'seo' && (
            <div className="space-y-3">
              {Object.keys(seo).length === 0 ? (
                <p className="text-[10px] font-mono text-text-dim py-8 text-center">{t('noData')}</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(seo).map(([k, v]) => (
                    <div key={k} className="border border-border rounded-lg p-3">
                      <p className="text-[8px] font-mono text-text-dim uppercase tracking-wider">{k.replace(/_/g, ' ')}</p>
                      <p className="text-sm font-mono font-bold text-text-primary mt-0.5">{String(v)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!metrics && tab === 'funnel' && (
            <div className="text-center py-12">
              <TrendingUp size={24} className="mx-auto text-text-dim/30 mb-2" />
              <p className="text-[10px] font-mono text-text-dim">{t('noData')}</p>
              <p className="text-[9px] font-mono text-text-dim/70 mt-1">{t('noDataHint')}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
