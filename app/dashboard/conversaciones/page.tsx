'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useOrg } from '@/lib/org-context'
import { supabase } from '@/lib/supabase'
import { fetchInteractions, fetchPatients, timeAgo, fetchActiveTakeovers, startTakeover, endTakeover, sendTakeoverMessage } from '@/lib/api'
import type { InteractionLog, ActiveTakeover } from '@/lib/api'
import type { Patient } from '@/types'
import { ChatInput } from '@/components/chat-input'
import { AnnotationButton } from '@/components/annotation-button'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'
import { ConvIntelligencePanel } from '@/components/conv-intelligence-panel'
import {
  Search, MessageSquare, Phone, ArrowLeft, RefreshCw, Filter,
  Bot, User, Wrench, Zap, X,
  MessageCircle, Instagram, PhoneCall, Calendar as CalendarIcon,
  Hash, Clock, Shield, Loader2, Inbox, Layers, Mic, Brain
} from 'lucide-react'

const ChannelsPanel = dynamic(() => import('./channels-panel'), {
  ssr: false,
  loading: () => <div className="glass-card p-5 animate-pulse"><div className="h-48 bg-surface-3 rounded-lg" /></div>,
})

const UnifiedInbox = dynamic(() => import('./unified-inbox'), {
  ssr: false,
  loading: () => <div className="glass-card p-5 animate-pulse"><div className="h-48 bg-surface-3 rounded-lg" /></div>,
})

const VoicePanel = dynamic(() => import('./voice-panel'), {
  ssr: false,
  loading: () => <div className="glass-card p-5 animate-pulse"><div className="h-48 bg-surface-3 rounded-lg" /></div>,
})

// ============================================================
// CONSTANTS & CONFIG
// ============================================================

const PLATFORM_STYLE: Record<string, { icon: typeof MessageCircle; color: string; bg: string }> = {
  WHATSAPP:   { icon: MessageCircle, color: 'text-status-success', bg: 'bg-status-success/10 border-status-success/20' },
  INSTAGRAM:  { icon: Instagram,     color: 'text-brand-purple',   bg: 'bg-brand-purple/10 border-brand-purple/20' },
  VOICE_CALL: { icon: PhoneCall,     color: 'text-brand-cyan',     bg: 'bg-brand-cyan/10 border-brand-cyan/20' },
  MESSENGER:  { icon: MessageCircle, color: 'text-status-info',    bg: 'bg-status-info/10 border-status-info/20' },
  WEB:        { icon: Hash,          color: 'text-status-warning',  bg: 'bg-status-warning/10 border-status-warning/20' },
}

const SENTIMENT_COLORS: Record<string, string> = {
  POSITIVE: 'bg-status-success',
  NEUTRAL:  'bg-status-warning',
  NEGATIVE: 'bg-status-danger',
}

/** Derive sentiment label from numeric score when label is absent */
function getSentimentLabel(score?: number, label?: string): string {
  if (label) return label.toUpperCase()
  if (score == null) return 'NEUTRAL'
  if (score >= 0.3) return 'POSITIVE'
  if (score <= -0.3) return 'NEGATIVE'
  return 'NEUTRAL'
}

/** Group interactions by patient to build a conversation list */
interface ConversationThread {
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
    const key = log.patient_id
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(log)
  }

  const threads: ConversationThread[] = []

  for (const [patientId, msgs] of Array.from(map.entries())) {
    // Sort messages chronologically (oldest first)
    msgs.sort((a: InteractionLog, b: InteractionLog) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    const lastMsg = msgs[msgs.length - 1]
    const patient = patientsMap.get(patientId)
    const patientFromInteraction = lastMsg.patients

    threads.push({
      patientId,
      patientName: patient?.full_name || patientFromInteraction?.full_name || '',
      patientPhone: patient?.phone || patientFromInteraction?.phone || patientId.slice(0, 8),
      channel: lastMsg.channel || 'WHATSAPP',
      lastMessage: lastMsg.message_content || '',
      lastTimestamp: lastMsg.created_at,
      sentimentLabel: getSentimentLabel(lastMsg.sentiment_score, lastMsg.sentiment_label),
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

  // Tab state
  const [activeTab, setActiveTab] = useState<'conversations' | 'inbox' | 'channels' | 'voice'>('conversations')

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
        fetchPatients(orgId, { limit: 500, branchId }),
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
          const newLog = payload.new as InteractionLog
          // Attach patient info from the already-loaded patients list
          // so the thread card shows the correct name/phone
          setPatients(currentPatients => {
            const patient = currentPatients.find(p => p.id === newLog.patient_id)
            if (patient && !newLog.patients) {
              newLog.patients = { full_name: patient.full_name, phone: patient.phone }
            }
            return currentPatients
          })
          setInteractions(prev => [newLog, ...prev])
        }
      )
      .subscribe()

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
    () => filteredThreads.find((t) => t.patientId === selectedThreadId) || null,
    [filteredThreads, selectedThreadId]
  )

  // Stats
  const totalMessages = interactions.length
  const uniquePatients = threads.length

  return (
    <div className="h-[calc(100vh-5rem)] lg:h-[calc(100vh-5.5rem)] flex flex-col">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div>
          <h2 className="text-sm font-mono font-bold uppercase tracking-wide text-text-primary">{t('title')}</h2>
          <p className="text-text-dim text-[9px] font-mono mt-0.5">
            {t('conversationCount', { count: uniquePatients })}{totalMessages > 0 && <> &middot; {t('messageCount', { count: totalMessages })}</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Tab selector */}
          <div className="flex bg-surface-2 rounded-lg border border-border p-0.5">
            <button
              onClick={() => setActiveTab('conversations')}
              className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-semibold transition-colors flex items-center gap-1 ${
                activeTab === 'conversations' ? 'bg-brand-purple/15 text-brand-purple' : 'text-text-muted'
              }`}
            >
              <MessageSquare size={11} />
              <span className="hidden sm:inline">{t('tabs.conversations')}</span>
            </button>
            <button
              onClick={() => setActiveTab('inbox')}
              className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-semibold transition-colors flex items-center gap-1 ${
                activeTab === 'inbox' ? 'bg-brand-purple/15 text-brand-purple' : 'text-text-muted'
              }`}
            >
              <Inbox size={11} />
              <span className="hidden sm:inline">{t('tabs.inbox')}</span>
            </button>
            <button
              onClick={() => setActiveTab('channels')}
              className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-semibold transition-colors flex items-center gap-1 ${
                activeTab === 'channels' ? 'bg-brand-purple/15 text-brand-purple' : 'text-text-muted'
              }`}
            >
              <Layers size={11} />
              <span className="hidden sm:inline">{t('tabs.channels')}</span>
            </button>
            <button
              onClick={() => setActiveTab('voice')}
              className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-semibold transition-colors flex items-center gap-1 ${
                activeTab === 'voice' ? 'bg-brand-purple/15 text-brand-purple' : 'text-text-muted'
              }`}
            >
              <Mic size={11} />
              <span className="hidden sm:inline">{t('tabs.voice')}</span>
            </button>
          </div>

          {activeTab === 'conversations' && (
            <>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${
                  showFilters || platformFilter || dateFrom || dateTo
                    ? 'bg-brand-purple/10 border-brand-purple/25 text-brand-purple'
                    : 'bg-surface-2 border-border text-text-muted hover:text-text-primary'
                }`}
                aria-label={tCommon('filter')}
              >
                <Filter size={14} />
              </button>
              <button
                onClick={loadData}
                aria-label={tCommon('refresh')}
                className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </>
          )}
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

      {/* VOICE TAB */}
      {activeTab === 'voice' && (
        <div className="flex-1 overflow-y-auto">
          <VoicePanel orgId={orgId} />
        </div>
      )}

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
          <div className="p-3 border-b border-border flex-shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('searchByNameOrPhone')}
                className="w-full pl-9 pr-3 py-2 bg-surface-3 border border-border rounded-md font-mono text-[10px] text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand-purple/40 transition-colors"
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
                    key={thread.patientId}
                    thread={thread}
                    isSelected={selectedThreadId === thread.patientId}
                    onSelect={() => setSelectedThreadId(thread.patientId)}
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
                <p className="text-text-muted text-[10px] font-mono font-medium">{t('selectConversation')}</p>
                <p className="text-text-dim text-[9px] font-mono mt-1">
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
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${
              isSelected
                ? 'bg-brand-purple/8 border border-brand-purple/15 text-brand-purple'
                : 'bg-surface-3 text-text-muted group-hover:bg-brand-purple/8 group-hover:text-brand-purple'
            } transition-colors`}
          >
            {displayName[0]?.toUpperCase() || '?'}
          </div>
          {/* Sentiment dot */}
          <div
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface-2 ${sentimentColor}`}
            title={`${t('sentimentLabel')}: ${thread.sentimentLabel.toLowerCase()}`}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className={`text-[10px] font-mono font-semibold truncate ${
              isSelected ? 'text-brand-purple-light' : 'text-text-primary'
            }`}>
              {displayName}
            </span>
            <span className="text-[10px] text-text-dim flex-shrink-0">{timeLabel}</span>
          </div>

          <p className="text-[10px] font-mono text-text-muted leading-relaxed line-clamp-2 mb-1.5">
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
            <span className="text-[9px] text-text-dim font-mono">
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

  // Conv Intelligence panel
  const [showIntel, setShowIntel] = useState(false)

  // Takeover state
  const [isTakeover, setIsTakeover] = useState(false)
  const [takeoverLoading, setTakeoverLoading] = useState(false)
  const canTakeover = role === 'OWNER' || role === 'ADMIN'

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
    try {
      await sendTakeoverMessage(orgId, thread.patientId, text)
    } catch { /* ignore */ }
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
      <div className="px-4 py-3 border-b border-border flex items-center gap-3 flex-shrink-0">
        <button
          onClick={onBack}
          className="lg:hidden w-8 h-8 rounded-lg bg-surface-3 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
          aria-label="Back"
        >
          <ArrowLeft size={14} />
        </button>

        <div className="w-9 h-9 rounded-md bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center text-brand-purple text-xs font-mono font-bold flex-shrink-0">
          {displayName[0]?.toUpperCase() || '?'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-text-primary truncate">{displayName}</span>
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
          <span className="text-[9px] font-mono text-text-muted font-medium capitalize">
            {thread.sentimentLabel === 'POSITIVE' ? t('sentiment.positive') : thread.sentimentLabel === 'NEGATIVE' ? t('sentiment.negative') : t('sentiment.neutral')}
          </span>
        </div>

        {/* Conv Intelligence toggle */}
        <button
          onClick={() => setShowIntel(!showIntel)}
          className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${
            showIntel
              ? 'bg-brand-purple/10 border-brand-purple/25 text-brand-purple'
              : 'bg-surface-3 border-border text-text-muted hover:text-text-primary'
          }`}
          aria-label="Inteligencia Conversacional"
          title="Inteligencia Conversacional"
        >
          <Brain size={14} />
        </button>

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

      {/* Conv Intelligence Panel */}
      {showIntel && (
        <div className="px-4 py-3 border-b border-border flex-shrink-0 max-h-[350px] overflow-y-auto animate-fade-in">
          <ConvIntelligencePanel orgId={orgId} patientId={thread.patientId} patientName={displayName} />
        </div>
      )}

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
      <div className="px-4 py-2.5 border-t border-border flex-shrink-0">
        {isTakeover ? (
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
            <Bot size={11} className="text-brand-purple" />
          ) : (
            <User size={11} className="text-text-dim" />
          )}
          <span className={`text-[10px] font-semibold ${isOutbound ? 'text-brand-purple' : 'text-text-dim'}`}>
            {isOutbound ? 'SofIA' : t('role.patient')}
          </span>
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

          {/* Intent badge */}
          {message.intent && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-brand-purple/8 border border-brand-purple/15 text-[9px] font-semibold text-brand-purple-light">
              <Zap size={8} />
              {message.intent}
            </span>
          )}

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
            <span className="text-[9px] text-text-dim font-mono">
              {message.response_time_ms < 1000
                ? `${message.response_time_ms}ms`
                : `${(message.response_time_ms / 1000).toFixed(1)}s`}
            </span>
          )}

          {/* Annotation buttons -- only on AI responses */}
          {isOutbound && (
            <div className={`ml-auto transition-opacity ${
              currentRating ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}>
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
        <p className="text-text-muted text-[10px] font-mono font-medium">{title}</p>
        <p className="text-text-dim text-[9px] font-mono mt-1 max-w-xs mx-auto">{description}</p>
      </div>
    </div>
  )
}
