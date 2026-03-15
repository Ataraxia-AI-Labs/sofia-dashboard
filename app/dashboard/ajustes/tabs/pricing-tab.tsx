'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { getPricingRules, updatePricingRules } from '@/lib/api/pricing'
import type { PricingRules } from '@/types'
import { DollarSign, Save, X, Plus, Sliders } from 'lucide-react'

interface PricingTabProps {
  orgId: string
  isReadOnly: boolean
  onMessage: (msg: string) => void
}

export function PricingTab({ orgId, isReadOnly, onMessage }: PricingTabProps) {
  const t = useTranslations('pricing')
  const tCommon = useTranslations('common')

  const [rules, setRules] = useState<PricingRules>({
    max_discount_pct: 15,
    max_premium_pct: 20,
    demand_weight: 0.4,
    segment_weight: 0.35,
    temporal_weight: 0.25,
    excluded_services: [],
    auto_apply: false,
    min_prices: {},
    max_prices: {},
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newExcluded, setNewExcluded] = useState('')
  const [newMinService, setNewMinService] = useState('')
  const [newMinPrice, setNewMinPrice] = useState('')
  const [newMaxService, setNewMaxService] = useState('')
  const [newMaxPrice, setNewMaxPrice] = useState('')

  const loadRules = useCallback(async () => {
    setLoading(true)
    const data = await getPricingRules(orgId)
    if (data) setRules(data)
    setLoading(false)
  }, [orgId])

  useEffect(() => { loadRules() }, [loadRules])

  const handleSave = async () => {
    if (isReadOnly) return
    setSaving(true)
    const result = await updatePricingRules(orgId, rules)
    if (result) {
      onMessage(t('rulesSaved'))
    } else {
      onMessage('Error: ' + tCommon('errorUnknown'))
    }
    setSaving(false)
  }

  const updateWeight = (key: 'demand_weight' | 'segment_weight' | 'temporal_weight', value: number) => {
    const total = rules.demand_weight + rules.segment_weight + rules.temporal_weight
    const diff = value - rules[key]
    const otherKeys = (['demand_weight', 'segment_weight', 'temporal_weight'] as const).filter(k => k !== key)
    const otherTotal = otherKeys.reduce((s, k) => s + rules[k], 0)

    if (otherTotal === 0) return

    const newRules = { ...rules, [key]: value }
    for (const ok of otherKeys) {
      const proportion = rules[ok] / otherTotal
      newRules[ok] = Math.max(0, rules[ok] - diff * proportion)
    }
    // Normalize
    const newTotal = newRules.demand_weight + newRules.segment_weight + newRules.temporal_weight
    if (newTotal > 0) {
      newRules.demand_weight = Math.round((newRules.demand_weight / newTotal) * 100) / 100
      newRules.segment_weight = Math.round((newRules.segment_weight / newTotal) * 100) / 100
      newRules.temporal_weight = Math.round((1 - newRules.demand_weight - newRules.segment_weight) * 100) / 100
    }
    setRules(newRules)
  }

  const addExcluded = () => {
    if (!newExcluded.trim()) return
    setRules(r => ({ ...r, excluded_services: [...r.excluded_services, newExcluded.trim()] }))
    setNewExcluded('')
  }

  const removeExcluded = (idx: number) => {
    setRules(r => ({ ...r, excluded_services: r.excluded_services.filter((_, i) => i !== idx) }))
  }

  const addMinPrice = () => {
    if (!newMinService.trim() || !newMinPrice) return
    setRules(r => ({ ...r, min_prices: { ...r.min_prices, [newMinService.trim()]: Number(newMinPrice) } }))
    setNewMinService('')
    setNewMinPrice('')
  }

  const addMaxPrice = () => {
    if (!newMaxService.trim() || !newMaxPrice) return
    setRules(r => ({ ...r, max_prices: { ...r.max_prices, [newMaxService.trim()]: Number(newMaxPrice) } }))
    setNewMaxService('')
    setNewMaxPrice('')
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="glass-card p-6 animate-pulse">
            <div className="h-5 bg-surface-3 rounded w-40 mb-4" />
            <div className="h-12 bg-surface-3 rounded" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Auto Apply Toggle */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center">
              <Sliders size={16} className="text-brand-purple" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">{t('autoApply')}</h3>
              <p className="text-[11px] text-text-dim">{t('autoApplyDesc')}</p>
            </div>
          </div>
          <button
            onClick={() => !isReadOnly && setRules(r => ({ ...r, auto_apply: !r.auto_apply }))}
            disabled={isReadOnly}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              rules.auto_apply ? 'bg-brand-purple' : 'bg-surface-3'
            } ${isReadOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              rules.auto_apply ? 'translate-x-[22px]' : 'translate-x-0.5'
            }`} />
          </button>
        </div>
      </div>

      {/* Discount/Premium Sliders */}
      <div className="glass-card p-5 space-y-5">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <DollarSign size={14} className="text-brand-purple" />
          {t('limits')}
        </h3>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-text-muted">{t('maxDiscount')}</span>
              <span className="font-mono text-brand-purple font-semibold">{rules.max_discount_pct}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={50}
              step={1}
              value={rules.max_discount_pct}
              onChange={e => setRules(r => ({ ...r, max_discount_pct: Number(e.target.value) }))}
              disabled={isReadOnly}
              className="w-full accent-brand-purple"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-text-muted">{t('maxPremium')}</span>
              <span className="font-mono text-status-success font-semibold">{rules.max_premium_pct}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={50}
              step={1}
              value={rules.max_premium_pct}
              onChange={e => setRules(r => ({ ...r, max_premium_pct: Number(e.target.value) }))}
              disabled={isReadOnly}
              className="w-full accent-status-success"
            />
          </div>
        </div>
      </div>

      {/* Weight Sliders */}
      <div className="glass-card p-5 space-y-5">
        <h3 className="text-sm font-semibold text-text-primary">{t('weights')}</h3>
        <p className="text-[11px] text-text-dim">{t('weightsDesc')}</p>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-text-muted">{t('demandWeight')}</span>
              <span className="font-mono font-semibold">{(rules.demand_weight * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(rules.demand_weight * 100)}
              onChange={e => updateWeight('demand_weight', Number(e.target.value) / 100)}
              disabled={isReadOnly}
              className="w-full accent-brand-purple"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-text-muted">{t('segmentWeight')}</span>
              <span className="font-mono font-semibold">{(rules.segment_weight * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(rules.segment_weight * 100)}
              onChange={e => updateWeight('segment_weight', Number(e.target.value) / 100)}
              disabled={isReadOnly}
              className="w-full accent-brand-cyan"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-text-muted">{t('temporalWeight')}</span>
              <span className="font-mono font-semibold">{(rules.temporal_weight * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(rules.temporal_weight * 100)}
              onChange={e => updateWeight('temporal_weight', Number(e.target.value) / 100)}
              disabled={isReadOnly}
              className="w-full accent-brand-gold"
            />
          </div>

          {/* Visual weight bar */}
          <div className="flex h-2 rounded-full overflow-hidden">
            <div className="bg-brand-purple" style={{ width: `${rules.demand_weight * 100}%` }} />
            <div className="bg-brand-cyan" style={{ width: `${rules.segment_weight * 100}%` }} />
            <div className="bg-brand-gold" style={{ width: `${rules.temporal_weight * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Excluded Services */}
      <div className="glass-card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-text-primary">{t('excluded')}</h3>
        <div className="flex flex-wrap gap-2">
          {rules.excluded_services.map((svc, i) => (
            <span key={i} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-2 border border-border text-xs text-text-muted">
              {svc}
              {!isReadOnly && (
                <button onClick={() => removeExcluded(i)} className="text-text-dim hover:text-status-danger transition-colors">
                  <X size={12} />
                </button>
              )}
            </span>
          ))}
        </div>
        {!isReadOnly && (
          <div className="flex gap-2">
            <input
              value={newExcluded}
              onChange={e => setNewExcluded(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addExcluded()}
              placeholder={t('excludedPlaceholder')}
              className="flex-1 px-3 py-1.5 rounded-lg bg-surface-2 border border-border text-xs text-text-primary placeholder:text-text-dim"
            />
            <button onClick={addExcluded} className="px-3 py-1.5 rounded-lg bg-brand-purple/10 border border-brand-purple/20 text-brand-purple text-xs font-semibold">
              <Plus size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Min/Max Price Overrides */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-text-primary">{t('priceOverrides')}</h3>

        {/* Min prices */}
        <div className="space-y-2">
          <p className="text-[11px] text-text-dim font-semibold uppercase tracking-wider">{t('minPrices')}</p>
          {Object.entries(rules.min_prices).map(([svc, price]) => (
            <div key={svc} className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-surface-2 border border-border">
              <span className="text-text-muted">{svc}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-text-primary">${price.toLocaleString()}</span>
                {!isReadOnly && (
                  <button onClick={() => setRules(r => {
                    const newMin = { ...r.min_prices }
                    delete newMin[svc]
                    return { ...r, min_prices: newMin }
                  })} className="text-text-dim hover:text-status-danger"><X size={12} /></button>
                )}
              </div>
            </div>
          ))}
          {!isReadOnly && (
            <div className="flex gap-2">
              <input value={newMinService} onChange={e => setNewMinService(e.target.value)} placeholder={tCommon('name')} className="flex-1 px-3 py-1.5 rounded-lg bg-surface-2 border border-border text-xs text-text-primary placeholder:text-text-dim" />
              <input value={newMinPrice} onChange={e => setNewMinPrice(e.target.value)} type="number" placeholder="$" className="w-24 px-3 py-1.5 rounded-lg bg-surface-2 border border-border text-xs text-text-primary placeholder:text-text-dim" />
              <button onClick={addMinPrice} className="px-3 py-1.5 rounded-lg bg-brand-purple/10 border border-brand-purple/20 text-brand-purple text-xs"><Plus size={12} /></button>
            </div>
          )}
        </div>

        {/* Max prices */}
        <div className="space-y-2">
          <p className="text-[11px] text-text-dim font-semibold uppercase tracking-wider">{t('maxPrices')}</p>
          {Object.entries(rules.max_prices).map(([svc, price]) => (
            <div key={svc} className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-surface-2 border border-border">
              <span className="text-text-muted">{svc}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-text-primary">${price.toLocaleString()}</span>
                {!isReadOnly && (
                  <button onClick={() => setRules(r => {
                    const newMax = { ...r.max_prices }
                    delete newMax[svc]
                    return { ...r, max_prices: newMax }
                  })} className="text-text-dim hover:text-status-danger"><X size={12} /></button>
                )}
              </div>
            </div>
          ))}
          {!isReadOnly && (
            <div className="flex gap-2">
              <input value={newMaxService} onChange={e => setNewMaxService(e.target.value)} placeholder={tCommon('name')} className="flex-1 px-3 py-1.5 rounded-lg bg-surface-2 border border-border text-xs text-text-primary placeholder:text-text-dim" />
              <input value={newMaxPrice} onChange={e => setNewMaxPrice(e.target.value)} type="number" placeholder="$" className="w-24 px-3 py-1.5 rounded-lg bg-surface-2 border border-border text-xs text-text-primary placeholder:text-text-dim" />
              <button onClick={addMaxPrice} className="px-3 py-1.5 rounded-lg bg-brand-purple/10 border border-brand-purple/20 text-brand-purple text-xs"><Plus size={12} /></button>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      {!isReadOnly && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-purple text-white text-xs font-semibold hover:bg-brand-purple-dark transition-colors disabled:opacity-50"
        >
          <Save size={14} />
          {saving ? tCommon('loading') : tCommon('save')}
        </button>
      )}
    </div>
  )
}
