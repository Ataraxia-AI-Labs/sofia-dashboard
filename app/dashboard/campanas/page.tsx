'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useOrg } from '@/lib/org-context'
import * as Sentry from '@sentry/nextjs'
import {
  listCampaigns, createCampaign, previewCampaign, scheduleCampaign,
  executeCampaign, cancelCampaign, getCampaignAnalytics, suggestSegment,
} from '@/lib/api/campaigns'
import { formatCOP } from '@/lib/api/helpers'
import { CampaignStatusBadge } from '@/components/campaign-status-badge'
import type { Campaign, CampaignPreview, CampaignAnalytics } from '@/types'
import {
  Megaphone, Plus, RefreshCw, Eye, Send, Calendar, XCircle,
  BarChart3, TrendingUp, DollarSign, Users, Sparkles, X,
  Loader2, Target, ArrowDown,
} from 'lucide-react'

type Modal = 'none' | 'create' | 'preview' | 'schedule' | 'results'

export default function CampanasPage() {
  const { orgId } = useOrg()
  const t = useTranslations('campaigns')
  const tCommon = useTranslations('common')

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<Modal>('none')
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [preview, setPreview] = useState<CampaignPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  // Create form state
  const [form, setForm] = useState({
    name: '',
    message_template: '',
    segment_criteria: {} as Record<string, unknown>,
  })
  const [aiGoal, setAiGoal] = useState('')
  const [suggesting, setSuggesting] = useState(false)
  const [aiExplanation, setAiExplanation] = useState('')

  // Schedule state
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('09:00')
  const [sendNow, setSendNow] = useState(false)

  // Segment criteria
  const [criteria, setCriteria] = useState({
    age_min: 18,
    age_max: 65,
    gender: '' as string,
    services: [] as string[],
    last_visit_days: 0,
    min_lead_score: '' as string,
    min_ltv_tier: '' as string,
    exclude_recent_days: 7,
    exclude_recent: false,
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [list, anal] = await Promise.all([
        listCampaigns(orgId),
        getCampaignAnalytics(orgId),
      ])
      setCampaigns(list ?? [])
      setAnalytics(anal ?? null)
    } catch (err) {
      Sentry.captureException(err)
    }
    setLoading(false)
  }, [orgId])

  useEffect(() => { loadData() }, [loadData])

  const handleCreate = async () => {
    if (!form.name || !form.message_template) return
    try {
      const segmentData: Record<string, unknown> = {}
      if (criteria.age_min > 18 || criteria.age_max < 65) segmentData.age_range = [criteria.age_min, criteria.age_max]
      if (criteria.gender) segmentData.gender = criteria.gender
      if (criteria.services.length > 0) segmentData.services = criteria.services
      if (criteria.last_visit_days > 0) segmentData.last_visit_days = criteria.last_visit_days
      if (criteria.min_lead_score) segmentData.min_lead_score = criteria.min_lead_score
      if (criteria.min_ltv_tier) segmentData.min_ltv_tier = criteria.min_ltv_tier
      if (criteria.exclude_recent) segmentData.exclude_recent_days = criteria.exclude_recent_days

      await createCampaign(orgId, {
        name: form.name,
        message_template: form.message_template,
        segment_criteria: segmentData,
      })
      setModal('none')
      resetForm()
      loadData()
    } catch (err) {
      Sentry.captureException(err)
    }
  }

  const resetForm = () => {
    setForm({ name: '', message_template: '', segment_criteria: {} })
    setCriteria({ age_min: 18, age_max: 65, gender: '', services: [], last_visit_days: 0, min_lead_score: '', min_ltv_tier: '', exclude_recent_days: 7, exclude_recent: false })
    setAiGoal('')
    setAiExplanation('')
  }

  const handlePreview = async (campaign: Campaign) => {
    setSelectedCampaign(campaign)
    setPreviewLoading(true)
    setModal('preview')
    try {
      const p = await previewCampaign(orgId, campaign.id)
      setPreview(p)
    } catch (err) {
      Sentry.captureException(err)
    }
    setPreviewLoading(false)
  }

  const handleSchedule = async () => {
    if (!selectedCampaign) return
    try {
      if (sendNow) {
        await executeCampaign(orgId, selectedCampaign.id)
      } else {
        if (!scheduleDate || !scheduleTime) return
        const sendAt = `${scheduleDate}T${scheduleTime}:00`
        await scheduleCampaign(orgId, selectedCampaign.id, sendAt)
      }
      setModal('none')
      loadData()
    } catch (err) {
      Sentry.captureException(err)
    }
  }

  const handleCancel = async (campaign: Campaign) => {
    try {
      await cancelCampaign(orgId, campaign.id)
      loadData()
    } catch (err) {
      Sentry.captureException(err)
    }
  }

  const handleSuggestSegment = async () => {
    if (!aiGoal.trim()) return
    setSuggesting(true)
    try {
      const result = await suggestSegment(orgId, aiGoal.trim())
      const c = result.criteria as Record<string, unknown>
      if (c.age_range) {
        const range = c.age_range as number[]
        setCriteria(prev => ({ ...prev, age_min: range[0] || 18, age_max: range[1] || 65 }))
      }
      if (c.gender) setCriteria(prev => ({ ...prev, gender: c.gender as string }))
      if (c.min_lead_score) setCriteria(prev => ({ ...prev, min_lead_score: c.min_lead_score as string }))
      if (c.min_ltv_tier) setCriteria(prev => ({ ...prev, min_ltv_tier: c.min_ltv_tier as string }))
      setAiExplanation(result.explanation)
    } catch (err) {
      Sentry.captureException(err)
    }
    setSuggesting(false)
  }

  const openScheduleModal = (campaign: Campaign) => {
    setSelectedCampaign(campaign)
    setScheduleDate('')
    setScheduleTime('09:00')
    setSendNow(false)
    setModal('schedule')
  }

  const openResults = (campaign: Campaign) => {
    setSelectedCampaign(campaign)
    setModal('results')
  }

  const VARIABLE_PILLS = ['{patient_name}', '{service}', '{clinica}', '{doctor}', '{fecha}']

  return (
    <div className="max-w-[1200px] space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center text-brand-purple">
            <Megaphone size={18} />
          </div>
          <div>
            <h2 className="text-sm font-mono font-bold uppercase tracking-wide text-text-primary">{t('title')}</h2>
            <p className="text-text-dim text-[9px] font-mono mt-0.5">{t('subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { resetForm(); setModal('create') }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-purple/15 text-brand-purple text-xs font-semibold hover:bg-brand-purple/25 transition-colors"
          >
            <Plus size={13} /> {t('newCampaign')}
          </button>
          <button onClick={loadData} aria-label={tCommon('refresh')} className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ANALYTICS — fall back to aggregating from the campaigns list when the
          backend analytics endpoint reports zero but individual campaigns have data */}
      {(() => {
        const listTotals = campaigns.reduce(
          (acc, camp) => {
            const stats = (camp?.stats || {}) as Record<string, number | undefined>
            const c = camp as unknown as Record<string, unknown>
            const sent = Number(stats.sent ?? c.sent_count ?? c.total_sent ?? 0) || 0
            const converted = Number(stats.converted ?? c.converted_count ?? c.total_converted ?? 0) || 0
            const revenue = Number(stats.revenue ?? c.revenue ?? c.revenue_cop ?? 0) || 0
            return {
              campaigns: acc.campaigns + 1,
              sent: acc.sent + sent,
              converted: acc.converted + converted,
              revenue: acc.revenue + revenue,
            }
          },
          { campaigns: 0, sent: 0, converted: 0, revenue: 0 },
        )
        const backend = analytics || { total_campaigns: 0, total_sent: 0, avg_conversion_rate: 0, total_revenue: 0 }
        const useFallback = (backend.total_campaigns ?? 0) === 0 && listTotals.campaigns > 0
        const totalCampaigns = useFallback ? listTotals.campaigns : (backend.total_campaigns ?? 0)
        const totalSent = useFallback ? listTotals.sent : (backend.total_sent ?? 0)
        const avgConv = useFallback
          ? (listTotals.sent > 0 ? listTotals.converted / listTotals.sent : 0)
          : (backend.avg_conversion_rate ?? 0)
        const totalRevenue = useFallback ? listTotals.revenue : (backend.total_revenue ?? 0)
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <AnalyticCard icon={<Megaphone size={16} />} value={totalCampaigns.toString()} label={t('totalCampaigns')} />
            <AnalyticCard icon={<Send size={16} />} value={totalSent.toLocaleString()} label={t('totalSent')} />
            <AnalyticCard icon={<TrendingUp size={16} />} value={`${(avgConv * 100).toFixed(1)}%`} label={t('avgConversion')} />
            <AnalyticCard icon={<DollarSign size={16} />} value={formatCOP(totalRevenue)} label={t('totalRevenue')} />
          </div>
        )
      })()}

      {/* CAMPAIGN LIST */}
      <div className="space-y-2">
        {loading && campaigns.length === 0 ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card p-4 animate-pulse">
              <div className="h-5 bg-surface-3 rounded w-48 mb-3" />
              <div className="h-4 bg-surface-3 rounded w-72 mb-2" />
              <div className="h-3 bg-surface-3 rounded w-56" />
            </div>
          ))
        ) : campaigns.length === 0 ? (
          <div className="glass-card p-5 text-center">
            <Megaphone size={36} className="mx-auto text-text-dim mb-3 opacity-40" />
            <p className="text-text-muted text-[10px] font-mono">{t('noCampaigns')}</p>
            <p className="text-text-dim text-[9px] font-mono mt-1">{t('noCampaignsHint')}</p>
          </div>
        ) : (
          campaigns.map(campaign => {
            const hasResults = campaign.status === 'COMPLETED' || campaign.status === 'ANALYZED'
            const segmentSummary = summarizeSegment(campaign.segment_criteria)

            return (
              <div key={campaign.id} className="glass-card p-4 hover:border-border-2 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-2">
                      <h3 className="text-xs font-mono font-semibold text-text-primary truncate">{campaign.name}</h3>
                      <CampaignStatusBadge status={campaign.status} />
                    </div>

                    {/* Segment summary */}
                    {segmentSummary && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <Target size={11} className="text-text-dim" />
                        <span className="text-[10px] font-mono text-text-muted">{segmentSummary}</span>
                      </div>
                    )}

                    {/* Stats preview for completed campaigns */}
                    {hasResults && campaign.stats && (
                      <div className="flex items-center gap-4 text-[11px]">
                        <span className="text-text-muted">{t('sent')}: <strong className="text-text-primary font-mono">{campaign.stats.sent || 0}</strong></span>
                        <span className="text-text-muted">{t('delivered')}: <strong className="text-text-primary font-mono">{campaign.stats.delivered || 0}</strong></span>
                        <span className="text-text-muted">{t('responded')}: <strong className="text-brand-cyan font-mono">{campaign.stats.responded || 0}</strong></span>
                        <span className="text-text-muted">{t('converted')}: <strong className="text-status-success font-mono">{campaign.stats.converted || 0}</strong></span>
                        {campaign.stats.revenue != null && campaign.stats.revenue > 0 && (
                          <span className="text-brand-gold font-mono font-semibold">{formatCOP(campaign.stats.revenue)}</span>
                        )}
                      </div>
                    )}

                    {campaign.scheduled_at && campaign.status === 'SCHEDULED' && (
                      <div className="flex items-center gap-1 text-[11px] text-status-info mt-1.5">
                        <Calendar size={10} />
                        {new Date(campaign.scheduled_at).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handlePreview(campaign)}
                      className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                      title={t('preview')}
                    >
                      <Eye size={14} />
                    </button>
                    {campaign.status === 'DRAFT' && (
                      <button
                        onClick={() => openScheduleModal(campaign)}
                        className="w-8 h-8 rounded-lg bg-status-info/10 border border-status-info/20 flex items-center justify-center text-status-info hover:bg-status-info/20 transition-colors"
                        title={t('schedule')}
                      >
                        <Calendar size={14} />
                      </button>
                    )}
                    {(campaign.status === 'DRAFT' || campaign.status === 'SCHEDULED') && (
                      <button
                        onClick={() => handleCancel(campaign)}
                        className="w-8 h-8 rounded-lg bg-status-danger/10 border border-status-danger/20 flex items-center justify-center text-status-danger hover:bg-status-danger/20 transition-colors"
                        title={t('cancel')}
                      >
                        <XCircle size={14} />
                      </button>
                    )}
                    {hasResults && (
                      <button
                        onClick={() => openResults(campaign)}
                        className="w-8 h-8 rounded-lg bg-status-success/10 border border-status-success/20 flex items-center justify-center text-status-success hover:bg-status-success/20 transition-colors"
                        title={t('viewResults')}
                      >
                        <BarChart3 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ========== CREATE CAMPAIGN MODAL ========== */}
      {modal === 'create' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModal('none')} />
          <div className="relative glass-card-elevated w-full max-w-2xl p-5 space-y-3 animate-fade-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wide text-text-primary">{t('createTitle')}</h3>
              <button onClick={() => setModal('none')} className="w-7 h-7 rounded-md bg-surface-3 flex items-center justify-center text-text-dim hover:text-text-primary transition-colors">
                <X size={14} />
              </button>
            </div>

            {/* Campaign name */}
            <div>
              <label className="block text-[10px] font-semibold text-text-dim uppercase mb-1">{t('campaignName')}</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t('campaignNamePlaceholder')}
                className="w-full px-3 py-2 rounded-lg bg-void border border-border text-text-primary text-sm outline-none focus:border-brand-purple/40 transition-colors"
              />
            </div>

            {/* Message template */}
            <div>
              <label className="block text-[10px] font-semibold text-text-dim uppercase mb-1">{t('messageTemplate')}</label>
              <textarea
                value={form.message_template}
                onChange={(e) => setForm({ ...form, message_template: e.target.value })}
                placeholder={t('messageTemplatePlaceholder')}
                rows={4}
                className="w-full px-3 py-2 rounded-lg bg-void border border-border text-text-primary text-sm outline-none focus:border-brand-purple/40 transition-colors resize-none"
              />
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                {VARIABLE_PILLS.map(v => (
                  <button
                    key={v}
                    onClick={() => setForm({ ...form, message_template: form.message_template + v })}
                    className="px-2 py-0.5 rounded-md bg-brand-purple/10 border border-brand-purple/20 text-brand-purple text-[10px] font-mono font-semibold hover:bg-brand-purple/20 transition-colors"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Segment criteria */}
            <div className="space-y-3 p-4 rounded-lg bg-surface-2 border border-border">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-semibold text-text-primary uppercase tracking-wide">{t('segmentCriteria')}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Age range */}
                <div>
                  <label className="block text-[10px] font-semibold text-text-dim uppercase mb-1">{t('ageRange')}</label>
                  <div className="flex items-center gap-2">
                    <input type="number" min={0} max={100} value={criteria.age_min} onChange={(e) => setCriteria({ ...criteria, age_min: +e.target.value })} className="w-16 px-2 py-1.5 rounded-lg bg-void border border-border text-text-primary text-sm outline-none text-center" />
                    <span className="text-text-dim text-xs">-</span>
                    <input type="number" min={0} max={100} value={criteria.age_max} onChange={(e) => setCriteria({ ...criteria, age_max: +e.target.value })} className="w-16 px-2 py-1.5 rounded-lg bg-void border border-border text-text-primary text-sm outline-none text-center" />
                  </div>
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-[10px] font-semibold text-text-dim uppercase mb-1">{t('gender')}</label>
                  <select value={criteria.gender} onChange={(e) => setCriteria({ ...criteria, gender: e.target.value })} className="w-full px-2 py-1.5 rounded-lg bg-void border border-border text-text-primary text-sm outline-none">
                    <option value="">{t('anyGender')}</option>
                    <option value="F">{t('female')}</option>
                    <option value="M">{t('male')}</option>
                  </select>
                </div>

                {/* Last visit range */}
                <div>
                  <label className="block text-[10px] font-semibold text-text-dim uppercase mb-1">{t('lastVisitDays')}</label>
                  <input type="number" min={0} value={criteria.last_visit_days} onChange={(e) => setCriteria({ ...criteria, last_visit_days: +e.target.value })} className="w-full px-2 py-1.5 rounded-lg bg-void border border-border text-text-primary text-sm outline-none" placeholder="0" />
                </div>

                {/* Lead score */}
                <div>
                  <label className="block text-[10px] font-semibold text-text-dim uppercase mb-1">{t('minLeadScore')}</label>
                  <select value={criteria.min_lead_score} onChange={(e) => setCriteria({ ...criteria, min_lead_score: e.target.value })} className="w-full px-2 py-1.5 rounded-lg bg-void border border-border text-text-primary text-sm outline-none">
                    <option value="">{t('any')}</option>
                    <option value="HOT">HOT</option>
                    <option value="WARM">WARM</option>
                    <option value="COLD">COLD</option>
                  </select>
                </div>

                {/* LTV tier */}
                <div>
                  <label className="block text-[10px] font-semibold text-text-dim uppercase mb-1">{t('minLTVTier')}</label>
                  <select value={criteria.min_ltv_tier} onChange={(e) => setCriteria({ ...criteria, min_ltv_tier: e.target.value })} className="w-full px-2 py-1.5 rounded-lg bg-void border border-border text-text-primary text-sm outline-none">
                    <option value="">{t('any')}</option>
                    <option value="DIAMOND">DIAMOND</option>
                    <option value="PLATINUM">PLATINUM</option>
                    <option value="GOLD">GOLD</option>
                    <option value="SILVER">SILVER</option>
                    <option value="BRONZE">BRONZE</option>
                  </select>
                </div>

                {/* Exclude recent */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={criteria.exclude_recent} onChange={(e) => setCriteria({ ...criteria, exclude_recent: e.target.checked })} className="rounded border-border" />
                    <span className="text-[10px] font-semibold text-text-dim uppercase">{t('excludeRecent')}</span>
                  </label>
                  {criteria.exclude_recent && (
                    <input type="number" min={1} value={criteria.exclude_recent_days} onChange={(e) => setCriteria({ ...criteria, exclude_recent_days: +e.target.value })} className="w-full mt-1 px-2 py-1.5 rounded-lg bg-void border border-border text-text-primary text-sm outline-none" />
                  )}
                </div>
              </div>

              {/* AI Suggest Segment */}
              <div className="pt-3 border-t border-border">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiGoal}
                    onChange={(e) => setAiGoal(e.target.value)}
                    placeholder={t('aiGoalPlaceholder')}
                    className="flex-1 px-3 py-2 rounded-lg bg-void border border-border text-text-primary text-sm outline-none focus:border-brand-purple/40 transition-colors"
                  />
                  <button
                    onClick={handleSuggestSegment}
                    disabled={suggesting || !aiGoal.trim()}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-brand-purple text-white text-[10px] font-mono font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {suggesting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {t('aiSuggest')}
                  </button>
                </div>
                {aiExplanation && (
                  <p className="text-xs text-text-muted mt-2 px-1 animate-fade-in">{aiExplanation}</p>
                )}
              </div>
            </div>

            {/* Create actions */}
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setModal('none')} className="px-4 py-2 rounded-lg bg-surface-3 text-text-muted text-xs font-semibold">{tCommon('cancel')}</button>
              <button
                onClick={handleCreate}
                disabled={!form.name || !form.message_template}
                className="px-4 py-2 rounded-lg bg-brand-purple text-white text-xs font-semibold disabled:opacity-50 hover:bg-brand-purple-dark transition-colors"
              >
                {t('createCampaign')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== PREVIEW MODAL ========== */}
      {modal === 'preview' && selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModal('none')} />
          <div className="relative glass-card-elevated w-full max-w-lg p-5 space-y-3 animate-fade-up max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wide text-text-primary">{t('previewTitle')}</h3>
              <button onClick={() => setModal('none')} className="w-7 h-7 rounded-md bg-surface-3 flex items-center justify-center text-text-dim hover:text-text-primary transition-colors">
                <X size={14} />
              </button>
            </div>

            {previewLoading ? (
              <div className="py-8 text-center">
                <Loader2 size={24} className="mx-auto text-brand-purple animate-spin mb-3" />
                <p className="text-text-dim text-xs">{tCommon('loading')}</p>
              </div>
            ) : preview ? (
              <>
                <div className="flex items-center gap-3 p-4 rounded-lg bg-brand-purple/8 border border-brand-purple/15">
                  <Users size={18} className="text-brand-purple" />
                  <div>
                    <div className="text-lg font-bold font-mono text-brand-purple">{preview.matching_patients}</div>
                    <div className="text-[10px] text-text-dim uppercase">{t('matchingPatients')}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-mono font-semibold uppercase tracking-wide text-text-primary">{t('sampleMessages')}</p>
                  {preview.sample_messages.map((sm, i) => (
                    <div key={i} className="px-3 py-2.5 rounded-lg bg-surface-2 border border-border">
                      <div className="text-[10px] text-text-dim mb-1">{sm.patient_name}</div>
                      <p className="text-xs text-text-muted leading-relaxed">{sm.message}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-text-dim text-[10px] font-mono text-center py-8">{t('previewUnavailable')}</p>
            )}
          </div>
        </div>
      )}

      {/* ========== SCHEDULE MODAL ========== */}
      {modal === 'schedule' && selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModal('none')} />
          <div className="relative glass-card-elevated w-full max-w-sm p-5 space-y-3 animate-fade-up">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wide text-text-primary">{t('scheduleTitle')}</h3>
              <button onClick={() => setModal('none')} className="w-7 h-7 rounded-md bg-surface-3 flex items-center justify-center text-text-dim hover:text-text-primary transition-colors">
                <X size={14} />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSendNow(false)}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  !sendNow ? 'bg-brand-purple/15 text-brand-purple border border-brand-purple/25' : 'bg-surface-2 text-text-muted border border-border'
                }`}
              >
                {t('scheduleFor')}
              </button>
              <button
                onClick={() => setSendNow(true)}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  sendNow ? 'bg-status-warning/15 text-status-warning border border-status-warning/25' : 'bg-surface-2 text-text-muted border border-border'
                }`}
              >
                {t('sendNow')}
              </button>
            </div>

            {!sendNow && (
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="px-3 py-2 rounded-lg bg-void border border-border text-text-primary text-sm outline-none" />
                <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="px-3 py-2 rounded-lg bg-void border border-border text-text-primary text-sm outline-none" />
              </div>
            )}

            {sendNow && (
              <p className="text-xs text-status-warning bg-status-warning/5 border border-status-warning/10 rounded-lg px-3 py-2">{t('sendNowWarning')}</p>
            )}

            <div className="flex gap-2 justify-end">
              <button onClick={() => setModal('none')} className="px-4 py-2 rounded-lg bg-surface-3 text-text-muted text-xs font-semibold">{tCommon('cancel')}</button>
              <button
                onClick={handleSchedule}
                disabled={!sendNow && (!scheduleDate || !scheduleTime)}
                className="px-4 py-2 rounded-lg bg-brand-purple text-white text-xs font-semibold disabled:opacity-50 hover:bg-brand-purple-dark transition-colors"
              >
                {sendNow ? t('sendNow') : t('scheduleCampaign')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== RESULTS MODAL ========== */}
      {modal === 'results' && selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModal('none')} />
          <div className="relative glass-card-elevated w-full max-w-md p-5 space-y-3 animate-fade-up">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-semibold text-text-primary">{selectedCampaign.name}</h3>
              <button onClick={() => setModal('none')} className="w-7 h-7 rounded-md bg-surface-3 flex items-center justify-center text-text-dim hover:text-text-primary transition-colors">
                <X size={14} />
              </button>
            </div>

            {/* Funnel visualization */}
            <div className="space-y-1">
              {[
                { label: t('sent'), value: selectedCampaign.stats?.sent || 0, color: 'bg-status-info', width: '100%' },
                { label: t('delivered'), value: selectedCampaign.stats?.delivered || 0, color: 'bg-brand-cyan', width: `${Math.round(((selectedCampaign.stats?.delivered || 0) / Math.max(1, selectedCampaign.stats?.sent || 1)) * 100)}%` },
                { label: t('responded'), value: selectedCampaign.stats?.responded || 0, color: 'bg-brand-purple', width: `${Math.round(((selectedCampaign.stats?.responded || 0) / Math.max(1, selectedCampaign.stats?.sent || 1)) * 100)}%` },
                { label: t('converted'), value: selectedCampaign.stats?.converted || 0, color: 'bg-status-success', width: `${Math.round(((selectedCampaign.stats?.converted || 0) / Math.max(1, selectedCampaign.stats?.sent || 1)) * 100)}%` },
              ].map((step, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs text-text-muted">{step.label}</span>
                    <span className="text-xs font-bold font-mono text-text-primary">{step.value}</span>
                  </div>
                  <div className="h-6 rounded-lg bg-surface-2 overflow-hidden">
                    <div className={`h-full rounded-lg ${step.color} transition-all duration-700`} style={{ width: step.width }} />
                  </div>
                  {i < 3 && <div className="flex justify-center py-0.5"><ArrowDown size={12} className="text-text-dim" /></div>}
                </div>
              ))}
            </div>

            {selectedCampaign.stats?.revenue != null && selectedCampaign.stats.revenue > 0 && (
              <div className="p-4 rounded-lg bg-status-success/5 border border-status-success/10 text-center">
                <div className="text-[10px] text-text-dim uppercase mb-1">{t('revenueGenerated')}</div>
                <div className="text-lg font-bold font-mono text-brand-purple">{formatCOP(selectedCampaign.stats.revenue)}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function AnalyticCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
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

function summarizeSegment(criteria: Record<string, unknown>): string {
  const parts: string[] = []
  if (criteria.age_range) {
    const range = criteria.age_range as number[]
    parts.push(`${range[0]}-${range[1]} anos`)
  }
  if (criteria.gender === 'F') parts.push('Mujeres')
  if (criteria.gender === 'M') parts.push('Hombres')
  if (criteria.min_lead_score) parts.push(`Score >= ${criteria.min_lead_score}`)
  if (criteria.min_ltv_tier) parts.push(`LTV >= ${criteria.min_ltv_tier}`)
  if (criteria.services) {
    const svcs = criteria.services as string[]
    parts.push(svcs.slice(0, 2).join(', ') + (svcs.length > 2 ? '...' : ''))
  }
  if (criteria.last_visit_days) parts.push(`Ultima visita > ${criteria.last_visit_days}d`)
  return parts.join(' | ')
}
