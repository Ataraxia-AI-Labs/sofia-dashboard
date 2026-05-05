'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useOrg } from '@/lib/org-context'
import { supabase } from '@/lib/supabase'
import { fetchInteractions, fetchPatients, timeAgo, fetchActiveTakeovers, startTakeover, endTakeover, sendTakeoverMessage } from '@/lib/api'
import { intentLabel, normalizeIntent } from '@/lib/label-maps'
import type { InteractionLog, ActiveTakeover } from '@/lib/api'
import type { Patient } from '@/types'
import { ChatInput } from '@/components/chat-input'
import { AnnotationButton } from '@/components/annotation-button'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
// S145: ConvIntelligencePanel deleted from repo (was only wired here).
import {
  Search, MessageSquare, Phone, ArrowLeft, RefreshCw, Filter,
  Bot, User, Wrench, Zap, X,
  MessageCircle, Instagram, PhoneCall, Calendar as CalendarIcon,
  Hash, Clock, Shield, Loader2, Inbox, Layers
} from 'lucide-react'

const ChannelsPanel = dynamic(() => import('./channels-panel'), {
  ssr: false,
  loading: () => <div className="glass-card p-5 animate-pulse"><div className="h-48 bg-surface-3 rounded-lg" /></div>,
})

const UnifiedInbox = dynamic(() => import('./unified-inbox'), {
  ssr: false,
  loading: () => <div className="glass-card p-5 animate-pulse"><div className="h-48 bg-surface-3 rounded-lg" /></div>,
})

// S140: VoicePanel deleted. Voice calls now appear inline in the unified
// timeline below (Transmisiones) with the VOICE_CALL platform badge.
// Aggregate voice metrics live in the backend (/voice/{org_id}/analytics)
// — surface them in Pulso/Inteligencia when product needs them, not as
// a duplicate listing on top of the conversation feed.

// ============================================================
// CONSTANTS & CONFIG
// ============================================================

const PLATFORM_STYLE: Record<string, { icon: typeof MessageCircle; color: string; bg: string }> = {
  WHATSAPP:   { icon: MessageCircle, color: 'text-status-success', bg: 'bg-status-success/10 border-status-success/25' },
  INSTAGRAM:  { icon: Instagram,     color: 'text-brand-purple',  bg: 'bg-brand-purple/10 border-brand-purple/25' },
  VOICE_CALL: { icon: PhoneCall,     color: 'text-brand-gold',    bg: 'bg-brand-gold/10 border-brand-gold/25' },
  MESSENGER:  { icon: MessageCircle, color: 'text-brand-cyan',    bg: 'bg-brand-cyan/10 border-brand-cyan/25' },
  WEB:        { icon: Hash,          color: 'text-status-info',   bg: 'bg-status-info/10 border-status-info/25' },
}

const SENTIMENT_COLORS: Record<string, string> = {
  POSITIVE: 'bg-status-success',
  NEUTRAL:  'bg-brand-cyan',
  NEGATIVE: 'bg-status-danger',
  /** UNKNOWN: no inbound message yet (e.g., outbound followup before reply).
   *  Subtle dim color so the operator doesn't read meaning into a default. */
  UNKNOWN:  'bg-text-dim/40',
}

const SENTIMENT_LABEL_TEXT: Record<string, string> = {
  POSITIVE: 'positivo',
  NEUTRAL:  'neutral',
  NEGATIVE: 'negativo',
  UNKNOWN:  'sin datos del paciente',
}

/** Derive sentiment label from numeric score when label is absent */
function getSentimentLabel(score?: number, label?: string): string {
  if (label) {
    const upper = label.toUpperCase()
    // Normalize exotic labels to 3 canonical values
    if (upper.includes('POSITIVE') || upper === 'ENTHUSIASTIC') return 'POSITIVE'
    if (upper.includes('NEGATIVE') || upper === 'FRUSTRATED' || upper === 'URGENT' || upper === 'WORRIED') return 'NEGATIVE'
    if (upper === 'NEUTRAL' || upper === 'APOLOGETIC') return 'NEUTRAL'
    return 'NEUTRAL'
  }
  if (score == null) return 'NEUTRAL'
  if (score >= 0.3) return 'POSITIVE'
  if (score <= -0.3) return 'NEGATIVE'
  return 'NEUTRAL'
}

/** Group interactions by patient to build a conversation list */
interface ConversationThread {
  threadId: string  // composite: patientId::CHANNEL
  patientId: string
  patientName: string
  patientPhone: string
  channel: string
  lastMessage: string
  lastTimestamp: string
  sentimentLabel: string
  messageCount: number
  messages: InteractionLog[]
}

function groupByPatient(interactions: InteractionLog[], patientsMap: Map<string, Patient>): ConversationThread[] {
  const map = new Map<string, InteractionLog[]>()

  for (const log of interactions) {
    // Group by patient + channel so WhatsApp and Voice are separate threads
    const ch = (log.channel || 'WHATSAPP').toUpperCase()
    const key = `${log.patient_id}::${ch}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(log)
  }

  const threads: ConversationThread[] = []

  for (const [compositeKey, msgs] of Array.from(map.entries())) {
    const patientId = compositeKey.split('::')[0]

    // Sort messages chronologically (oldest first)
    msgs.sort((a: InteractionLog, b: InteractionLog) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    const lastMsg = msgs[msgs.length - 1]
    const patient = patientsMap.get(patientId)
    const patientFromInteraction = lastMsg.patients

    // S153: aggregate sentiment from the patient's INBOUND messages, not
    // from the last message. The last message is usually a bot followup
    // (OUTBOUND, neutral 0), which made every thread show the cyan
    // "neutral" dot regardless of how the patient actually feels. The
    // dot now reflects the patient's expressed emotion.
    const inboundMsgs = msgs.filter(m => m.direction === 'INBOUND')
    const realScores = inboundMsgs
      .map(m => m.sentiment_score)
      .filter((s): s is number => typeof s === 'number' && !isNaN(s) && s !== 0)
    const avgInboundScore = realScores.length > 0
      ? realScores.reduce((acc, s) => acc + s, 0) / realScores.length
      : null

    threads.push({
      threadId: compositeKey,
      patientId,
      patientName: patient?.full_name || patientFromInteraction?.full_name || '',
      patientPhone: patient?.phone || patientFromInteraction?.phone || patientId.slice(0, 8),
      channel: lastMsg.channel || 'WHATSAPP',
      lastMessage: lastMsg.message_content || '',
      lastTimestamp: lastMsg.created_at,
      sentimentLabel: avgInboundScore == null
        ? 'UNKNOWN'
        : avgInboundScore >= 0.3 ? 'POSITIVE'
        : avgInboundScore <= -0.3 ? 'NEGATIVE'
        : 'NEUTRAL',
      messageCount: msgs.length,
      messages: msgs,
    })
  }

  // Sort threads by most recent message first
  threads.sort((a, b) => new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime())

  return threads
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function ConversacionesPage() {
  const { orgId, branchId } = useOrg()
  const t = useTranslations('conversations')
  const tCommon = useTranslations('common')

  // Tab state — read initial from URL (?tab=inbox|channels|voice|conversations)
  const searchParams = useSearchParams()
  const initialTab = ((): 'conversations' | 'inbox' | 'channels' => {
    const t = searchParams.get('tab')
    // S140: 'voice' alias kept so old bookmarks land on the unified timeline
    // instead of 404. Voice calls are inline rows now.
    if (t === 'voice') return 'conversations'
    if (t === 'inbox' || t === 'channels' || t === 'conversations') return t
    return 'conversations'
  })()
  const [activeTab, setActiveTab] = useState<'conversations' | 'inbox' | 'channels'>(initialTab)

  // Data state
  const [interactions, setInteractions] = useState<InteractionLog[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // UI state
  const [search, setSearch] = useState('')
  const [platformFilter, setPlatformFilter] = useState<string>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Build patients map for fast lookup
  const patientsMap = useMemo(() => {
    const m = new Map<string, Patient>()
    for (const p of patients) m.set(p.id, p)
    return m
  }, [patients])

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [interactionsData, patientsData] = await Promise.allSettled([
        fetchInteractions(orgId, {
          limit: 200,
          channel: platformFilter || undefined,
          from: dateFrom || undefined,
          to: dateTo || undefined,
          branchId,
        }),
        fetchPatients(orgId, { limit: 100, branchId }),
      ])

      if (interactionsData.status === 'fulfilled') {
        setInteractions(interactionsData.value)
      } else {
        setInteractions([])
        setError(t('loadError'))
      }

      if (patientsData.status === 'fulfilled') {
        const result = patientsData.value
        setPatients(Array.isArray(result) ? result : (result.patients || []))
      }
    } catch {
      setError(t('loadDataError'))
    }
    setLoading(false)
  }, [orgId, branchId, platformFilter, dateFrom, dateTo])

  useEffect(() => { loadData() }, [loadData])

  // S133 RT-003 (documented decision): conversaciones is the only page
  // that uses Supabase Realtime. Other lists (pipeline, appointments,
  // patients) deliberately rely on manual refresh because their query
  // shapes (joins, aggregates, RLS filters) make Realtime payload
  // reconstruction more error-prone than a 30s pull. Adding Realtime to
  // those surfaces is product work, not a bug — track via the roadmap.

  // Supabase Realtime: listen for new interaction_logs
  useEffect(() => {
    const channel = supabase
      .channel(`interactions-${orgId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'interaction_logs',
          filter: `organization_id=eq.${orgId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>

          // Parse the raw DB row the same way fetchInteractions does
          const rawContent = (row.raw_content || '') as string
          const aiResponse = (row.ai_response || '') as string
          const direction = (row.direction || 'INBOUND') as string
          const ai = (row.ai_analysis || {}) as Record<string, unknown>
          const isTakeover = aiResponse.includes('[Human takeover]')
          const isFailed = aiResponse.includes('[MENSAJE FALLIDO')

          const parsed: InteractionLog[] = []
          const base: Partial<InteractionLog> = {
            id: row.id as string,
            organization_id: (row.organization_id || '') as string,
            patient_id: (row.patient_id || '') as string,
            channel: (row.platform || 'WHATSAPP') as string,
            intent: (ai.intent || '') as string,
            sentiment_score: typeof ai.sentiment === 'number' ? ai.sentiment : 0,
            sentiment_label: (ai.sentiment_label || 'NEUTRAL') as string,
            tools_used: (ai.tools_called || []) as string[],
            tokens_used: (ai.tokens_used || 0) as number,
            cost_usd: (ai.estimated_cost_usd || 0) as number,
            response_time_ms: (ai.response_time_ms || 0) as number,
            created_at: (row.created_at || '') as string,
          }

          if (direction === 'OUTBOUND' && rawContent && (isTakeover || isFailed)) {
            parsed.push({ ...base, direction: 'OUTBOUND', message_content: rawContent, is_human_takeover: isTakeover, is_failed: isFailed } as InteractionLog)
          } else {
            if (rawContent) parsed.push({ ...base, direction: 'INBOUND', message_content: rawContent } as InteractionLog)
            if (aiResponse) parsed.push({ ...base, id: `${row.id}-ai`, direction: 'OUTBOUND', message_content: aiResponse } as InteractionLog)
            if (!rawContent && !aiResponse) parsed.push({ ...base, direction: direction as 'INBOUND' | 'OUTBOUND', message_content: '' } as InteractionLog)
          }

          // Attach patient info from the already-loaded patients list
          setPatients(currentPatients => {
            for (const msg of parsed) {
              const patient = currentPatients.find(p => p.id === msg.patient_id)
              if (patient && !msg.patients) {
                msg.patients = { full_name: patient.full_name, phone: patient.phone }
              }
            }
            return [...currentPatients]
          })
          setInteractions(prev => [...parsed, ...prev])
        }
      )
      .subscribe((status, err) => {
        // S133 RT-001/002: surface subscription failures so a Realtime
        // outage doesn't silently leave the page rendering stale data.
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          // CLOSED is normal on cleanup — only report unexpected failures.
          if (err) {
            try {
              import('@sentry/nextjs').then(Sentry => {
                Sentry.captureException(err, {
                  tags: { feature: 'realtime', channel: 'interactions' },
                  extra: { status, orgId },
                })
              })
            } catch { /* Sentry optional */ }
          }
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [orgId])

  // Build conversation threads
  const threads = useMemo(
    () => groupByPatient(interactions, patientsMap),
    [interactions, patientsMap]
  )

  // Filter threads by search
  const filteredThreads = useMemo(() => {
    if (!search.trim()) return threads
    const q = search.toLowerCase()
    return threads.filter(
      (t) =>
        t.patientName.toLowerCase().includes(q) ||
        t.patientPhone.toLowerCase().includes(q) ||
        t.lastMessage.toLowerCase().includes(q)
    )
  }, [threads, search])

  // Selected thread
  const selectedThread = useMemo(
    () => filteredThreads.find((t) => t.threadId === selectedThreadId) || null,
    [filteredThreads, selectedThreadId]
  )

  // Stats
  const totalMessages = interactions.length
  const uniquePatients = threads.length

  return (
    <div className="h-[calc(100vh-5rem)] lg:h-[calc(100vh-5.5rem)] flex flex-col">
      {/* HEADER — title + secondary actions only (tabs dropped to own row below) */}
      <div className="flex items-start justify-between mb-2 flex-shrink-0">
        <div>
          <h2 className="text-sm font-mono font-bold uppercase tracking-wide text-text-primary">{t('title')}</h2>
          <p className="text-text-dim text-[11px] font-body mt-0.5">
            {t('conversationCount', { count: uniquePatients })}{totalMessages > 0 && <> &middot; {t('messageCount', { count: totalMessages })}</>}
          </p>
        </div>
        {activeTab === 'conversations' && (
          <div className="flex items-center gap-1 max-w-[calc(100%-24rem)]">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`w-7 h-7 flex items-center justify-center rounded-md active:scale-[0.9] transition-all duration-150 ${
                showFilters || platformFilter || dateFrom || dateTo
                  ? 'text-brand-purple drop-shadow-[0_0_6px_rgba(139,92,246,0.5)]'
                  : 'text-text-dim hover:text-text-primary hover:drop-shadow-[0_0_4px_rgba(139,92,246,0.35)]'
              }`}
              aria-label={tCommon('filter')}
            >
              <Filter size={13} strokeWidth={1.6} />
            </button>
            <button
              onClick={loadData}
              aria-label={tCommon('refresh')}
              className="w-7 h-7 flex items-center justify-center rounded-md text-text-dim hover:text-text-primary hover:drop-shadow-[0_0_4px_rgba(139,92,246,0.35)] active:scale-[0.9] transition-all duration-150"
            >
              <RefreshCw size={13} strokeWidth={1.6} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        )}
      </div>

      {/* TABS — hyprland naked pills, smaller */}
      <div className="flex flex-shrink-0 mb-2">
        <div className="inline-flex gap-0.5">
          <button
            onClick={() => setActiveTab('conversations')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-body font-semibold transition-all flex items-center gap-1 ${
              activeTab === 'conversations'
                ? 'text-brand-purple drop-shadow-[0_0_6px_rgba(139,92,246,0.45)]'
                : 'text-text-dim hover:text-text-primary'
            }`}
          >
            <MessageSquare size={11} strokeWidth={1.6} />
            {t('tabs.conversations')}
          </button>
          <button
            onClick={() => setActiveTab('inbox')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-body font-semibold transition-all flex items-center gap-1 ${
              activeTab === 'inbox'
                ? 'text-brand-purple drop-shadow-[0_0_6px_rgba(139,92,246,0.45)]'
                : 'text-text-dim hover:text-text-primary'
            }`}
          >
            <Inbox size={11} strokeWidth={1.6} />
            {t('tabs.inbox')}
          </button>
          <button
            onClick={() => setActiveTab('channels')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-body font-semibold transition-all flex items-center gap-1 ${
              activeTab === 'channels'
                ? 'text-brand-purple drop-shadow-[0_0_6px_rgba(139,92,246,0.45)]'
                : 'text-text-dim hover:text-text-primary'
            }`}
          >
            <Layers size={11} strokeWidth={1.6} />
            {t('tabs.channels')}
          </button>
        </div>
      </div>

      {/* INBOX TAB */}
      {activeTab === 'inbox' && (
        <UnifiedInbox orgId={orgId} />
      )}

      {/* CHANNELS TAB */}
      {activeTab === 'channels' && (
        <div className="flex-1 overflow-y-auto">
          <ChannelsPanel orgId={orgId} />
        </div>
      )}

      {/* S140: VOICE TAB removed — voice calls appear inline as rows
          in the conversations timeline below with the VOICE_CALL badge. */}

      {/* CONVERSATIONS TAB — Original content */}
      {activeTab === 'conversations' && <>

      {/* FILTERS BAR (collapsible) */}
      {showFilters && (
        <div className="glass-card p-3 mb-3 flex-shrink-0 animate-fade-in">
          <div className="flex flex-wrap items-center gap-3">
            {/* Platform filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-text-dim font-semibold uppercase tracking-wider">{t('channel')}:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPlatformFilter('')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    !platformFilter
                      ? 'bg-brand-purple/15 text-brand-purple border border-brand-purple/25'
                      : 'bg-surface-3 text-text-muted border border-transparent hover:border-border'
                  }`}
                >
                  {tCommon('all')}
                </button>
                {Object.entries(PLATFORM_STYLE).map(([key, cfg]) => {
                  const Icon = cfg.icon
                  return (
                    <button
                      key={key}
                      onClick={() => setPlatformFilter(platformFilter === key ? '' : key)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 ${
                        platformFilter === key
                          ? `${cfg.bg} ${cfg.color} border`
                          : 'bg-surface-3 text-text-muted border border-transparent hover:border-border'
                      }`}
                    >
                      <Icon size={11} />
                      <span className="hidden sm:inline">{t(`platforms.${key}`)}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Date range */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-text-dim font-semibold uppercase tracking-wider">{t('since')}:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-surface-3 border border-border rounded-lg px-2 py-1 text-[11px] text-text-muted focus:outline-none focus:border-brand-purple/40"
              />
              <span className="text-[10px] text-text-dim font-semibold uppercase tracking-wider">{t('until')}:</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-surface-3 border border-border rounded-lg px-2 py-1 text-[11px] text-text-muted focus:outline-none focus:border-brand-purple/40"
              />
            </div>

            {/* Clear filters */}
            {(platformFilter || dateFrom || dateTo) && (
              <button
                onClick={() => { setPlatformFilter(''); setDateFrom(''); setDateTo('') }}
                className="text-[10px] text-status-danger/70 hover:text-status-danger flex items-center gap-1 transition-colors"
              >
                <X size={10} />
                {t('clearFilters')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* MAIN SPLIT LAYOUT */}
      <div className="flex-1 flex gap-3 min-h-0">
        {/* LEFT PANEL — Conversation list */}
        <div
          className={`${
            selectedThreadId ? 'hidden lg:flex' : 'flex'
          } flex-col w-full lg:w-[380px] xl:w-[420px] flex-shrink-0 glass-card overflow-hidden`}
        >
          {/* Search */}
          <div className="p-3 border-b border-border/30 flex-shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('searchByNameOrPhone')}
                className="w-full pl-9 pr-3 py-2 bg-surface-3 border border-border rounded-md font-body text-[10px] text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand-purple/40 transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-muted"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Thread list */}
          <div className="flex-1 overflow-y-auto">
            {loading && filteredThreads.length === 0 ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="p-3 rounded-lg animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-surface-3" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 bg-surface-3 rounded w-32" />
                        <div className="h-3 bg-surface-3 rounded w-48" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error && filteredThreads.length === 0 ? (
              <EmptyState
                icon={<MessageSquare size={32} className="text-text-dim" />}
                title={t('noDataAvailable')}
                description={error}
              />
            ) : filteredThreads.length === 0 ? (
              <EmptyState
                icon={<MessageSquare size={32} className="text-text-dim" />}
                title={search ? t('noResults') : t('noConversations')}
                description={
                  search
                    ? t('noResultsFor', { query: search })
                    : t('whenSofiaReceives')
                }
              />
            ) : (
              <div className="p-1.5 space-y-0.5">
                {filteredThreads.map((thread) => (
                  <ThreadCard
                    key={thread.threadId}
                    thread={thread}
                    isSelected={selectedThreadId === thread.threadId}
                    onSelect={() => setSelectedThreadId(thread.threadId)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL — Conversation detail */}
        <div
          className={`${
            selectedThreadId ? 'flex' : 'hidden lg:flex'
          } flex-col flex-1 glass-card overflow-hidden min-w-0`}
        >
          {selectedThread ? (
            <ConversationDetail
              thread={selectedThread}
              onBack={() => setSelectedThreadId(null)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center px-6">
                <div className="w-16 h-16 rounded-lg bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center mx-auto mb-3">
                  <MessageSquare size={28} className="text-brand-purple/40" />
                </div>
                <p className="text-text-muted text-[12px] font-body font-medium">{t('selectConversation')}</p>
                <p className="text-text-dim text-[11px] font-body mt-1">
                  {t('selectThreadHint')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      </>}
    </div>
  )
}

// ============================================================
// THREAD CARD (left panel item)
// ============================================================

function ThreadCard({
  thread,
  isSelected,
  onSelect,
}: {
  thread: ConversationThread
  isSelected: boolean
  onSelect: () => void
}) {
  const t = useTranslations('conversations')
  const platformCfg = PLATFORM_STYLE[thread.channel] || PLATFORM_STYLE.WHATSAPP
  const PlatformIcon = platformCfg.icon
  const sentimentColor = SENTIMENT_COLORS[thread.sentimentLabel] || SENTIMENT_COLORS.NEUTRAL
  const displayName = thread.patientName || thread.patientPhone

  // Truncate last message
  const preview =
    thread.lastMessage.length > 65
      ? thread.lastMessage.slice(0, 65) + '...'
      : thread.lastMessage || t('noMessages')

  let timeLabel: string
  try {
    timeLabel = formatDistanceToNow(new Date(thread.lastTimestamp), { addSuffix: true, locale: es })
  } catch {
    timeLabel = timeAgo(thread.lastTimestamp)
  }

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-3 py-3 rounded-lg transition-all duration-150 group ${
        isSelected
          ? 'bg-brand-purple/10 border border-brand-purple/20'
          : 'hover:bg-surface-3 border border-transparent'
      }`}
    >
      <div className="flex items-start gap-2.5">
        {/* Avatar — compact, hyprland-friendly */}
        <div className="relative flex-shrink-0">
          <div
            className={`w-8 h-8 rounded-md flex items-center justify-center text-[11px] font-mono font-bold ${
              isSelected
                ? 'bg-brand-purple/10 border border-brand-purple/25 text-brand-purple'
                : 'bg-surface-3/70 text-text-muted group-hover:bg-brand-purple/10 group-hover:text-brand-purple'
            } transition-colors`}
          >
            {displayName[0]?.toUpperCase() || '?'}
          </div>
          {/* Sentiment dot — derived from patient's INBOUND messages.
              UNKNOWN means we have no inbound data yet, render dimmer so
              the operator doesn't misread it as "neutral state". */}
          <div
            className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-surface-2 ${sentimentColor}`}
            title={`Sentimiento: ${SENTIMENT_LABEL_TEXT[thread.sentimentLabel] || thread.sentimentLabel.toLowerCase()}`}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className={`text-[11px] font-body font-semibold truncate ${
              isSelected ? 'text-brand-purple-light' : 'text-text-primary'
            }`}>
              {displayName}
            </span>
            <span className="text-[9.5px] text-text-dim flex-shrink-0 font-mono">{timeLabel}</span>
          </div>

          <p className="text-[11px] font-body text-text-muted leading-snug line-clamp-2 mb-1">
            {preview}
          </p>

          {/* Badges row */}
          <div className="flex items-center gap-1.5">
            {/* Platform badge */}
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold border ${platformCfg.bg} ${platformCfg.color}`}>
              <PlatformIcon size={9} />
              {t(`platforms.${thread.channel}`)}
            </span>
            {/* Message count */}
            <span className="text-[9px] text-text-dim font-body">
              {thread.messageCount} msg
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}

// ============================================================
// CONVERSATION DETAIL (right panel)
// ============================================================

function ConversationDetail({
  thread,
  onBack,
}: {
  thread: ConversationThread
  onBack: () => void
}) {
  const { orgId, role } = useOrg()
  const t = useTranslations('conversations')
  const scrollRef = useRef<HTMLDivElement>(null)
  const platformCfg = PLATFORM_STYLE[thread.channel] || PLATFORM_STYLE.WHATSAPP
  const PlatformIcon = platformCfg.icon
  const isVoiceCall = thread.channel === 'VOICE_CALL'

  // S142: Conv Intelligence panel removed by CEO directive — the
  // patient sentiment / topic surfaces it offered duplicate the data the
  // doctor already sees in the message thread + sentiment badge, and
  // there was no concrete clinical action a doctor would take after
  // pressing the Brain button. Component file kept for now but not wired.

  // Takeover state (not applicable for voice calls)
  const [isTakeover, setIsTakeover] = useState(false)
  const [takeoverLoading, setTakeoverLoading] = useState(false)
  const canTakeover = !isVoiceCall && (role === 'OWNER' || role === 'ADMIN')

  // Handle annotation change — update local message state
  const handleAnnotationChange = useCallback((msgId: string, annotation: InteractionLog['annotation']) => {
    const msg = thread.messages.find(m => m.id === msgId)
    if (msg) msg.annotation = annotation
  }, [thread.messages])

  // Check if this patient has an active takeover
  useEffect(() => {
    if (!canTakeover) return
    fetchActiveTakeovers(orgId).then((takeovers) => {
      const active = takeovers.some((t: ActiveTakeover) => t.patient_id === thread.patientId)
      setIsTakeover(active)
    }).catch(() => {})
  }, [orgId, thread.patientId, canTakeover])

  const handleStartTakeover = async () => {
    setTakeoverLoading(true)
    try {
      await startTakeover(orgId, thread.patientId)
      setIsTakeover(true)
    } catch { /* ignore */ }
    setTakeoverLoading(false)
  }

  const handleEndTakeover = async () => {
    setTakeoverLoading(true)
    try {
      await endTakeover(orgId, thread.patientId)
      setIsTakeover(false)
    } catch { /* ignore */ }
    setTakeoverLoading(false)
  }

  const handleSendMessage = async (text: string) => {
    // Optimistic: show message immediately as Doctor
    const optimisticMsg: InteractionLog = {
      id: `temp-${Date.now()}`,
      organization_id: orgId,
      patient_id: thread.patientId,
      channel: thread.channel,
      direction: 'OUTBOUND',
      message_content: text,
      sentiment_score: 0,
      sentiment_label: 'NEUTRAL',
      created_at: new Date().toISOString(),
      is_human_takeover: true,
    }
    thread.messages.push(optimisticMsg)
    thread.messageCount += 1
    // Force scroll after adding message
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }, 50)
    try {
      await sendTakeoverMessage(orgId, thread.patientId, text)
    } catch (e) {
      // Mark as failed if send fails
      optimisticMsg.is_failed = true
    }
  }

  // Auto-scroll to bottom on mount and when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [thread.patientId, thread.messages.length])

  const displayName = thread.patientName || thread.patientPhone

  // Group messages by date for dividers
  const messagesByDate = useMemo(() => {
    const groups: { date: string; messages: InteractionLog[] }[] = []
    let currentDate = ''

    for (const msg of thread.messages) {
      const msgDate = new Date(msg.created_at).toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
      if (msgDate !== currentDate) {
        currentDate = msgDate
        groups.push({ date: msgDate, messages: [] })
      }
      groups[groups.length - 1].messages.push(msg)
    }
    return groups
  }, [thread.messages])

  return (
    <>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/30 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={onBack}
          className="lg:hidden w-8 h-8 rounded-lg bg-surface-3 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
          aria-label="Back"
        >
          <ArrowLeft size={14} />
        </button>

        <div className="w-9 h-9 rounded-md bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center text-brand-purple text-xs font-body font-bold flex-shrink-0">
          {displayName[0]?.toUpperCase() || '?'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-body font-semibold text-text-primary truncate">{displayName}</span>
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold border ${platformCfg.bg} ${platformCfg.color}`}>
              <PlatformIcon size={9} />
              {t(`platforms.${thread.channel}`)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-text-dim">
            <Phone size={9} />
            <span>{thread.patientPhone}</span>
            <span>&middot;</span>
            <span>{t('messageCount', { count: thread.messageCount })}</span>
          </div>
        </div>

        {/* Sentiment indicator */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-3 border border-border">
          <div className={`w-2 h-2 rounded-full ${SENTIMENT_COLORS[thread.sentimentLabel] || 'bg-status-warning'}`} />
          <span className="text-[11px] font-body text-text-muted font-medium capitalize">
            {thread.sentimentLabel === 'POSITIVE' ? t('sentiment.positive') : thread.sentimentLabel === 'NEGATIVE' ? t('sentiment.negative') : t('sentiment.neutral')}
          </span>
        </div>

        {/* S142: Conv Intelligence toggle removed (see hook block above
            for rationale). */}

        {/* Takeover button */}
        {canTakeover && (
          <button
            onClick={isTakeover ? handleEndTakeover : handleStartTakeover}
            disabled={takeoverLoading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
              isTakeover
                ? 'bg-status-danger/10 border border-status-danger/20 text-status-danger hover:bg-status-danger/20'
                : 'bg-brand-purple/10 border border-brand-purple/20 text-brand-purple hover:bg-brand-purple/20'
            } disabled:opacity-50`}
          >
            {takeoverLoading ? (
              <Loader2 size={10} className="animate-spin" />
            ) : (
              <Shield size={10} />
            )}
            {isTakeover ? t('returnToSofia') : t('takeControl')}
          </button>
        )}
      </div>

      {/* S142: Conv Intelligence Panel removed (see hook block at the top
          of this component for rationale). */}

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messagesByDate.map((group) => (
          <div key={group.date}>
            {/* Date divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] text-text-dim font-medium flex items-center gap-1">
                <CalendarIcon size={9} />
                {group.date}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Messages */}
            <div className="space-y-2">
              {group.messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  orgId={orgId}
                  onAnnotationChange={handleAnnotationChange}
                />
              ))}
            </div>
          </div>
        ))}

        {thread.messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center py-12">
            <p className="text-text-dim text-xs">{t('noMessages')}</p>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="px-4 py-2.5 border-t border-border/30 flex-shrink-0">
        {isVoiceCall ? (
          <div className="flex items-center gap-2 text-[10px] text-text-dim">
            <PhoneCall size={12} className="text-brand-cyan/50" />
            <span>{t('voiceCallLog')}</span>
          </div>
        ) : isTakeover ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] text-status-warning">
              <Shield size={10} />
              <span className="font-semibold">{t('doctorMode')}</span>
            </div>
            <ChatInput onSend={handleSendMessage} placeholder={t('writeAsDoctor')} />
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[10px] text-text-dim">
            <Bot size={12} className="text-brand-purple/50" />
            <span>{t('aiAutoResponses')}</span>
          </div>
        )}
      </div>
    </>
  )
}

// ============================================================
// MESSAGE BUBBLE
// ============================================================

function MessageBubble({ message, orgId, onAnnotationChange }: {
  message: InteractionLog
  orgId: string
  onAnnotationChange?: (id: string, annotation: InteractionLog['annotation']) => void
}) {
  const t = useTranslations('conversations')
  const isOutbound = message.direction === 'OUTBOUND'
  const sentimentLabel = getSentimentLabel(message.sentiment_score, message.sentiment_label)

  // Format time
  let time: string
  try {
    const d = new Date(message.created_at)
    time = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  } catch {
    time = ''
  }

  // Tools used
  const tools = message.tools_used || []

  // Current annotation state
  const currentRating = message.annotation?.rating || null
  const currentNotes = message.annotation?.notes || ''

  // The real interaction_id (strip "-ai" suffix used for split messages)
  const realInteractionId = message.id.endsWith('-ai') ? message.id.slice(0, -3) : message.id

  const handleAnnotationChange = (rating: 'thumbs_up' | 'thumbs_down' | null, notes?: string) => {
    if (rating) {
      onAnnotationChange?.(message.id, { interaction_id: realInteractionId, rating, notes })
    } else {
      onAnnotationChange?.(message.id, null)
    }
  }

  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'} group`}>
      <div
        className={`max-w-[85%] sm:max-w-[75%] lg:max-w-[70%] ${
          isOutbound
            ? 'bg-brand-purple/15 border border-brand-purple/20 rounded-lg rounded-br-md'
            : 'bg-surface-3 border border-border rounded-lg rounded-bl-md'
        } px-3.5 py-2.5 transition-colors`}
      >
        {/* Sender label */}
        <div className="flex items-center gap-1.5 mb-1">
          {isOutbound ? (
            message.is_human_takeover
              ? <Shield size={11} className="text-brand-cyan" />
              : <Bot size={11} className="text-brand-purple" />
          ) : (
            <User size={11} className="text-text-dim" />
          )}
          <span className={`text-[10px] font-semibold ${
            message.is_human_takeover ? 'text-brand-cyan' : isOutbound ? 'text-brand-purple' : 'text-text-dim'
          }`}>
            {isOutbound ? (message.is_human_takeover ? 'Doctor' : 'SofIA') : t('role.patient')}
          </span>
          {message.is_failed && (
            <span className="text-[10px] font-body text-status-danger bg-status-danger/10 border border-status-danger/20 px-1 py-0.5 rounded">
              {t('notDelivered')}
            </span>
          )}
        </div>

        {/* Message content */}
        <p className={`text-xs leading-relaxed whitespace-pre-wrap break-words ${
          isOutbound ? 'text-text-secondary' : 'text-text-primary'
        }`}>
          {message.message_content || t('noContent')}
        </p>

        {/* Metadata row */}
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-2">
          {/* Time */}
          <span className="text-[9px] text-text-dim flex items-center gap-1">
            <Clock size={8} />
            {time}
          </span>

          {/* Intent badge — normalize + hide UNKNOWN / internal markers */}
          {(() => {
            if (!message.intent || message.intent === 'OUTBOUND_FAILED') return null
            const canon = normalizeIntent(message.intent)
            if (canon === 'UNKNOWN') return null
            return (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-brand-purple/8 border border-brand-purple/15 text-[9px] font-semibold text-brand-purple-light">
                <Zap size={8} />
                {intentLabel(message.intent)}
              </span>
            )
          })()}

          {/* Sentiment dot */}
          {sentimentLabel && (
            <div className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${SENTIMENT_COLORS[sentimentLabel] || 'bg-status-warning'}`} />
              <span className="text-[9px] text-text-dim capitalize">
                {sentimentLabel === 'POSITIVE' ? 'pos' : sentimentLabel === 'NEGATIVE' ? 'neg' : 'neu'}
              </span>
            </div>
          )}

          {/* Response time (for outbound only) */}
          {isOutbound && message.response_time_ms != null && message.response_time_ms > 0 && (
            <span className="text-[9px] text-text-dim font-body">
              {message.response_time_ms < 1000
                ? `${message.response_time_ms}ms`
                : `${(message.response_time_ms / 1000).toFixed(1)}s`}
            </span>
          )}

          {/* Annotation buttons -- only on SofIA AI responses, not doctor messages */}
          {isOutbound && !message.is_human_takeover && (
            <div className="ml-auto opacity-60 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
              <AnnotationButton
                orgId={orgId}
                interactionId={realInteractionId}
                currentRating={currentRating}
                currentNotes={currentNotes}
                onAnnotationChange={handleAnnotationChange}
                size="sm"
                showNotes={true}
              />
            </div>
          )}
        </div>

        {/* Tools used badges */}
        {tools.length > 0 && (
          <div className="flex items-center flex-wrap gap-1 mt-1.5">
            <Wrench size={9} className="text-brand-cyan/60" />
            {tools.map((tool, i) => (
              <span
                key={i}
                className="inline-flex items-center px-1.5 py-0.5 rounded bg-brand-cyan/8 border border-brand-cyan/15 text-[8px] font-semibold text-brand-cyan"
              >
                {tool.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// EMPTY STATE
// ============================================================

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex-1 flex items-center justify-center py-16 px-6">
      <div className="text-center">
        <div className="mb-3 flex justify-center">{icon}</div>
        <p className="text-text-muted text-[12px] font-body font-medium">{title}</p>
        <p className="text-text-dim text-[11px] font-body mt-1 max-w-xs mx-auto">{description}</p>
      </div>
    </div>
  )
}
