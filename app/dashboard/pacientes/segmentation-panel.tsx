'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import * as Sentry from '@sentry/nextjs'
import {
  Users, Sparkles, Loader2, RefreshCw, ChevronLeft,
  Copy, Check, Wand2, User, Phone, DollarSign,
  Search as SearchIcon, Layers, ArrowRight
} from 'lucide-react'
import {
  getSegments, runClustering, generateEmbeddings,
  getCampaignSuggestion, findSimilarPatients,
} from '@/lib/api/segments'
import { formatCOP } from '@/lib/api/helpers'
import { useToast } from '@/components/ui/toast'
import type {
  PatientSegment, SegmentPatient, CampaignSuggestion, SimilarPatient,
} from '@/types'

// ============================================================
// SEGMENTATION PANEL (P4-04)
// Overview of patient segments, detail view, campaign suggestions
// ============================================================

interface SegmentationPanelProps {
  orgId: string
}

// Predefined segment colors for visual differentiation
const SEGMENT_COLORS = [
  { bg: 'bg-brand-purple/10', border: 'border-brand-purple/25', text: 'text-brand-purple', dot: 'bg-brand-purple' },
  { bg: 'bg-status-success/10', border: 'border-status-success/25', text: 'text-status-success', dot: 'bg-status-success' },
  { bg: 'bg-brand-cyan/10', border: 'border-brand-cyan/25', text: 'text-brand-cyan', dot: 'bg-brand-cyan' },
  { bg: 'bg-status-warning/10', border: 'border-status-warning/25', text: 'text-status-warning', dot: 'bg-status-warning' },
  { bg: 'bg-brand-gold/10', border: 'border-brand-gold/25', text: 'text-brand-gold', dot: 'bg-brand-gold' },
  { bg: 'bg-status-info/10', border: 'border-status-info/25', text: 'text-status-info', dot: 'bg-status-info' },
  { bg: 'bg-status-danger/10', border: 'border-status-danger/25', text: 'text-status-danger', dot: 'bg-status-danger' },
  { bg: 'bg-brand-purple/10', border: 'border-brand-purple/25', text: 'text-brand-purple', dot: 'bg-brand-purple' },
]

function getSegmentColor(index: number) {
  return SEGMENT_COLORS[index % SEGMENT_COLORS.length]
}

export default function SegmentationPanel({ orgId }: SegmentationPanelProps) {
  const t = useTranslations('segmentation')
  const toast = useToast()
  const tCommon = useTranslations('common')

  const [segments, setSegments] = useState<PatientSegment[]>([])
  const [loading, setLoading] = useState(true)
  const [clusteringInProgress, setClusteringInProgress] = useState(false)
  const [embeddingsInProgress, setEmbeddingsInProgress] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  // Detail view state
  const [selectedSegment, setSelectedSegment] = useState<PatientSegment | null>(null)
  const [segmentPatients, setSegmentPatients] = useState<SegmentPatient[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [campaign, setCampaign] = useState<CampaignSuggestion | null>(null)
  const [campaignLoading, setCampaignLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  // Similar patients state
  const [similarPatients, setSimilarPatients] = useState<SimilarPatient[]>([])
  const [similarLoading, setSimilarLoading] = useState(false)
  const [similarForPatient, setSimilarForPatient] = useState<string | null>(null)

  const loadSegments = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getSegments(orgId)
      setSegments(data)
    } catch {
      // Load failed
    }
    setLoading(false)
  }, [orgId])

  useEffect(() => { loadSegments() }, [loadSegments])

  const handleRunClustering = async () => {
    setClusteringInProgress(true)
    setStatusMessage(null)
    try {
      const result = await runClustering(orgId)
      if (result) {
        setStatusMessage(result.message)
        toast.success(result.message || 'Clustering completado')
        loadSegments()
      } else {
        toast.error('No se pudo ejecutar el clustering. Revisa la consola.')
      }
    } catch (err) {
      Sentry.captureException(err)
      toast.error('Error al ejecutar clustering: ' + (err instanceof Error ? err.message : 'desconocido'))
    }
    setClusteringInProgress(false)
  }

  const handleGenerateEmbeddings = async () => {
    setEmbeddingsInProgress(true)
    setStatusMessage(null)
    try {
      const result = await generateEmbeddings(orgId)
      if (result) {
        setStatusMessage(result.message)
        toast.success(result.message || 'Embeddings generados')
      } else {
        toast.error('No se pudo actualizar la inteligencia de pacientes. Intenta de nuevo.')
      }
    } catch (err) {
      Sentry.captureException(err)
      toast.error('Error al actualizar la inteligencia de pacientes. Intenta de nuevo.')
    }
    setEmbeddingsInProgress(false)
  }

  const openSegmentDetail = async (segment: PatientSegment) => {
    setSelectedSegment(segment)
    setDetailLoading(true)
    setCampaign(null)
    setSimilarPatients([])
    setSimilarForPatient(null)
    setSegmentPatients([])
    setDetailLoading(false)
  }

  const handleGenerateCampaign = async () => {
    if (!selectedSegment) return
    setCampaignLoading(true)
    try {
      const result = await getCampaignSuggestion(orgId, selectedSegment.id)
      setCampaign(result)
    } catch {
      // Campaign generation failed
    }
    setCampaignLoading(false)
  }

  const handleCopyMessage = async () => {
    if (!campaign?.message) return
    await navigator.clipboard.writeText(campaign.message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleFindSimilar = async (patientId: string) => {
    setSimilarForPatient(patientId)
    setSimilarLoading(true)
    try {
      const results = await findSimilarPatients(orgId, patientId)
      setSimilarPatients(results)
    } catch {
      setSimilarPatients([])
    }
    setSimilarLoading(false)
  }

  // Total patients across segments
  const totalPatients = segments.reduce((sum, s) => sum + s.patient_count, 0)

  // Detail view
  if (selectedSegment) {
    const segIdx = segments.findIndex(s => s.id === selectedSegment.id)
    const colors = getSegmentColor(segIdx)

    return (
      <div className="space-y-4">
        {/* Back + Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setSelectedSegment(null); setSimilarPatients([]); setSimilarForPatient(null) }}
            className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
            aria-label={tCommon('back')}
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className={`w-3 h-3 rounded-full ${colors.dot}`} />
            <h3 className="text-sm font-mono font-semibold text-text-primary">{selectedSegment.segment_label}</h3>
            <span className="text-[10px] text-text-dim font-body">
              {selectedSegment.patient_count} {t('patients')}
            </span>
          </div>
        </div>

        {/* Segment Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="glass-card p-3">
            <div className="text-[12px] font-body text-text-dim uppercase">{t('patientCount')}</div>
            <div className="text-lg font-bold font-mono text-text-primary">{selectedSegment.patient_count}</div>
          </div>
          <div className="glass-card p-3">
            <div className="text-[12px] font-body text-text-dim uppercase">{t('avgTicket')}</div>
            <div className="text-lg font-bold font-mono text-status-success">{formatCOP(selectedSegment.avg_ticket ?? 0)}</div>
          </div>
          <div className="glass-card p-3">
            <div className="text-[12px] font-body text-text-dim uppercase">{t('topServices')}</div>
            <div className="flex flex-wrap gap-1 mt-1">
              {selectedSegment.top_services.slice(0, 3).map((svc, i) => {
                const name = typeof svc === 'string' ? svc : svc.name
                return (
                  <span key={i} className="px-1.5 py-0.5 rounded-md bg-surface-3 text-[11px] font-body text-text-muted font-medium">
                    {name}
                  </span>
                )
              })}
            </div>
          </div>
        </div>

        {/* Patient List */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-body font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
              <Users size={13} className={colors.text} />
              {t('patientsInSegment')}
            </h4>
          </div>

          {detailLoading ? (
            <div className="space-y-2 animate-pulse">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-surface-3 rounded-lg" />
              ))}
            </div>
          ) : segmentPatients.length === 0 ? (
            <div className="text-center py-8">
              <Users size={24} className="text-text-dim mx-auto mb-2" />
              <p className="text-text-dim text-xs font-body">{t('noPatientsInSegment')}</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {segmentPatients.map((p) => (
                <div
                  key={p.patient_id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-void/50 border border-border hover:border-border-2 transition-colors"
                >
                  <div className="w-7 h-7 rounded-md bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center text-brand-purple text-[12px] font-body font-bold flex-shrink-0">
                    {p.full_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <User size={10} className="text-text-dim flex-shrink-0" />
                      <span className="text-xs font-body text-text-primary font-medium truncate">{p.full_name || t('unknownPatient')}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Phone size={9} className="text-text-dim flex-shrink-0" />
                      <span className="text-[10px] text-text-dim font-body">{p.phone}</span>
                    </div>
                  </div>
                  {p.avg_ticket != null && (
                    <span className="text-[12px] font-body text-text-muted">{formatCOP(p.avg_ticket)}</span>
                  )}
                  <button
                    onClick={() => handleFindSimilar(p.patient_id)}
                    className="px-2 py-1 rounded-md bg-brand-purple/10 border border-brand-purple/20 text-brand-purple text-[9px] font-semibold hover:bg-brand-purple/20 transition-colors flex items-center gap-1"
                    title={t('findSimilar')}
                  >
                    <SearchIcon size={9} />
                    {t('similar')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Similar Patients Results */}
        {similarForPatient && (
          <div className="glass-card p-4">
            <h4 className="text-xs font-body font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2 mb-3">
              <SearchIcon size={13} className="text-brand-cyan" />
              {t('similarPatients')}
            </h4>
            {similarLoading ? (
              <div className="space-y-2 animate-pulse">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-8 bg-surface-3 rounded-lg" />
                ))}
              </div>
            ) : similarPatients.length === 0 ? (
              <p className="text-text-dim text-xs font-body text-center py-4">{t('noSimilarFound')}</p>
            ) : (
              <div className="space-y-1.5">
                {similarPatients.map((sp) => (
                  <div key={sp.patient_id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-void/50 border border-border">
                    <User size={12} className="text-text-dim flex-shrink-0" />
                    <span className="text-xs font-body text-text-primary font-medium truncate flex-1">{sp.full_name}</span>
                    {sp.segment_label && (
                      <span className="px-1.5 py-0.5 rounded-md bg-surface-3 text-[9px] text-text-muted">{sp.segment_label}</span>
                    )}
                    <div className="text-right">
                      <span className="text-[10px] font-bold font-body text-brand-cyan">
                        {Math.round(sp.similarity_score * 100)}%
                      </span>
                      <span className="text-[8px] text-text-dim block">{t('similarity')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Campaign Suggestion */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-body font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
              <Wand2 size={13} className="text-brand-gold" />
              {t('campaignSuggestion')}
            </h4>
            <button
              onClick={handleGenerateCampaign}
              disabled={campaignLoading}
              className="px-3 py-1.5 rounded-lg bg-brand-purple/8 border border-brand-purple/15 text-brand-gold text-xs font-body font-semibold flex items-center gap-1.5 disabled:opacity-50"
            >
              {campaignLoading ? (
                <><Loader2 size={11} className="animate-spin" /> {t('generating')}</>
              ) : (
                <><Sparkles size={11} /> {t('generateCampaign')}</>
              )}
            </button>
          </div>

          {campaign ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-md bg-brand-purple/10 border border-brand-purple/20 text-brand-purple text-[10px] font-semibold">
                  {campaign.campaign_type}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-status-info/10 border border-status-info/20 text-status-info text-[10px] font-semibold">
                  {campaign.channel}
                </span>
                <span className="text-[10px] text-text-dim font-body">
                  ~{campaign.estimated_reach} {t('reach')}
                </span>
              </div>
              <div>
                <p className="text-[10px] text-text-dim uppercase tracking-wider mb-1">{t('subject')}</p>
                <p className="text-xs font-body text-text-primary font-medium">{campaign.subject}</p>
              </div>
              <div>
                <p className="text-[10px] text-text-dim uppercase tracking-wider mb-1">{t('message')}</p>
                <div className="bg-void/50 rounded-lg p-3 border border-border">
                  <p className="text-xs text-text-muted leading-relaxed whitespace-pre-wrap">{campaign.message}</p>
                </div>
              </div>
              <button
                onClick={handleCopyMessage}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 border border-border text-text-muted text-xs font-semibold hover:text-text-primary transition-colors"
              >
                {copied ? <Check size={12} className="text-status-success" /> : <Copy size={12} />}
                {copied ? t('copied') : t('copyMessage')}
              </button>
            </div>
          ) : (
            <p className="text-text-dim text-xs font-body text-center py-4">{t('noCampaignYet')}</p>
          )}
        </div>
      </div>
    )
  }

  // Overview — segment cards
  return (
    <div className="space-y-4">
      {/* Header + Actions */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-body font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
            <Layers size={14} className="text-brand-purple" />
            {t('title')}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={loadSegments}
              disabled={loading}
              className="w-7 h-7 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-dim hover:text-text-primary transition-colors"
              aria-label={tCommon('refresh')}
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleGenerateEmbeddings}
              disabled={embeddingsInProgress}
              className="px-3 py-1.5 rounded-lg bg-surface-2 border border-border text-text-muted text-xs font-semibold flex items-center gap-1.5 hover:text-text-primary transition-colors disabled:opacity-50"
            >
              {embeddingsInProgress ? (
                <><Loader2 size={11} className="animate-spin" /> {t('generatingEmb')}</>
              ) : (
                <><Sparkles size={11} /> {t('generateEmbeddings')}</>
              )}
            </button>
            <button
              onClick={handleRunClustering}
              disabled={clusteringInProgress}
              className="px-3 py-1.5 rounded-lg bg-brand-purple/8 border border-brand-purple/15 text-brand-purple text-xs font-body font-semibold flex items-center gap-1.5 disabled:opacity-50"
            >
              {clusteringInProgress ? (
                <><Loader2 size={11} className="animate-spin" /> {t('clustering')}</>
              ) : (
                <><Users size={11} /> {t('runClustering')}</>
              )}
            </button>
          </div>
        </div>

        {/* Status message */}
        {statusMessage && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-status-success/10 border border-status-success/20 text-status-success text-xs">
            {statusMessage}
          </div>
        )}

        {/* Summary */}
        <div className="flex items-center gap-6 text-[10px] text-text-dim mb-4">
          <span className="font-body">{segments.length} {t('segmentsCount')}</span>
          <span className="font-body">{totalPatients} {t('totalPatients')}</span>
        </div>

        {/* Segment Grid */}
        {loading && segments.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 bg-surface-3 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : segments.length === 0 ? (
          <div className="text-center py-12">
            <Layers size={32} className="text-text-dim mx-auto mb-3" />
            <p className="text-text-muted text-sm font-body">{t('noSegments')}</p>
            <p className="text-text-dim text-[12px] font-body mt-1">{t('noSegmentsHint')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {segments.map((seg, idx) => {
              const colors = getSegmentColor(idx)
              return (
                <button
                  key={seg.id}
                  onClick={() => openSegmentDetail(seg)}
                  className={`text-left p-3 rounded-lg border ${colors.border} ${colors.bg} hover:scale-[1.02] transition-all duration-200 group`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-3 h-3 rounded-full ${colors.dot}`} />
                    <span className={`text-sm font-mono font-semibold ${colors.text}`}>{seg.segment_label}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <div className="text-[11px] font-body text-text-dim">{t('patients')}</div>
                      <div className="text-base font-bold font-mono text-text-primary">{seg.patient_count}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-body text-text-dim">{t('avgTicket')}</div>
                      <div className="text-base font-bold font-mono text-text-primary">{formatCOP(seg.avg_ticket ?? 0)}</div>
                    </div>
                  </div>

                  {seg.top_services.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {seg.top_services.slice(0, 3).map((svc, i) => {
                        const name = typeof svc === 'string' ? svc : svc.name
                        return (
                          <span key={i} className="px-1.5 py-0.5 rounded-md bg-void/50 text-[9px] text-text-muted font-medium">
                            {name}
                          </span>
                        )
                      })}
                    </div>
                  )}

                  <div className="flex items-center gap-1 mt-3 text-[10px] text-text-dim group-hover:text-text-muted transition-colors">
                    {t('viewDetail')} <ArrowRight size={10} />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
