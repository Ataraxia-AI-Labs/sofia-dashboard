'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { getUnifiedInbox, getConversationDetail } from '@/lib/api/channels'
import { ChannelBadge, CHANNEL_CONFIG } from '@/components/channel-badge'
import { timeAgo } from '@/lib/api/helpers'
import type { InboxConversation, ConversationMessage, ChannelType } from '@/types'
import {
  Search, X, ArrowLeft, Inbox, MessageCircle, Bot, User,
} from 'lucide-react'
import * as Sentry from '@sentry/nextjs'

// ============================================================
// UNIFIED INBOX (P5-07)
// Cross-channel conversation view
// ============================================================

interface UnifiedInboxProps {
  orgId: string
}

export default function UnifiedInbox({ orgId }: UnifiedInboxProps) {
  const t = useTranslations('channels')
  const tConv = useTranslations('conversations')

  const [conversations, setConversations] = useState<InboxConversation[]>([])
  const [loading, setLoading] = useState(true)
  const [channelFilter, setChannelFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ConversationMessage[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  const loadInbox = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getUnifiedInbox(orgId, {
        channel: channelFilter || undefined,
      })
      setConversations(data)
    } catch (err) {
      Sentry.captureException(err)
    }
    setLoading(false)
  }, [orgId, channelFilter])

  useEffect(() => { loadInbox() }, [loadInbox])

  const loadDetail = useCallback(async (patientId: string) => {
    setDetailLoading(true)
    try {
      const data = await getConversationDetail(orgId, patientId)
      setDetail(data)
    } catch (err) {
      Sentry.captureException(err)
    }
    setDetailLoading(false)
  }, [orgId])

  const handleSelectConversation = (patientId: string) => {
    setSelectedPatientId(patientId)
    loadDetail(patientId)
  }

  // Filter by search
  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations
    const q = search.toLowerCase()
    return conversations.filter(c =>
      c.patient_name.toLowerCase().includes(q) ||
      c.last_message.toLowerCase().includes(q)
    )
  }, [conversations, search])

  const selectedConversation = conversations.find(c => c.patient_id === selectedPatientId)
  const CHANNELS: (ChannelType | '')[] = ['', 'WHATSAPP', 'INSTAGRAM', 'WEBCHAT', 'VOICE']

  return (
    <div className="flex gap-3 h-[calc(100vh-16rem)] min-h-[400px]">
      {/* CONVERSATION LIST */}
      <div className={`${
        selectedPatientId ? 'hidden lg:flex' : 'flex'
      } flex-col w-full lg:w-[380px] xl:w-[420px] flex-shrink-0 glass-card overflow-hidden`}>
        {/* Channel filter tabs */}
        <div className="px-3 pt-3 pb-2 border-b border-border flex-shrink-0">
          <div className="flex gap-1 mb-2">
            {CHANNELS.map(ch => {
              const isActive = channelFilter === ch
              if (ch === '') {
                return (
                  <button
                    key="all"
                    onClick={() => setChannelFilter('')}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
                      isActive
                        ? 'bg-brand-purple/15 text-brand-purple border border-brand-purple/25'
                        : 'bg-surface-3 text-text-muted border border-transparent hover:border-border'
                    }`}
                  >
                    {t('allChannels')}
                  </button>
                )
              }
              const cfg = CHANNEL_CONFIG[ch]
              const Icon = cfg.icon
              return (
                <button
                  key={ch}
                  onClick={() => setChannelFilter(channelFilter === ch ? '' : ch)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all flex items-center gap-1 ${
                    isActive
                      ? `${cfg.bg} ${cfg.color} border ${cfg.border}`
                      : 'bg-surface-3 text-text-muted border border-transparent hover:border-border'
                  }`}
                >
                  <Icon size={10} />
                  <span className="hidden sm:inline">{cfg.label}</span>
                </button>
              )
            })}
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={tConv('searchByNameOrPhone')}
              className="w-full pl-8 pr-8 py-1.5 bg-surface-3 border border-border rounded-lg text-[11px] text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand-purple/40 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-muted">
                <X size={10} />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading && filteredConversations.length === 0 ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="p-3 rounded-lg animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-surface-3" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-surface-3 rounded w-28" />
                      <div className="h-2.5 bg-surface-3 rounded w-44" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-12 px-6">
              <div className="text-center">
                <Inbox size={28} className="mx-auto text-text-dim mb-2" />
                <p className="text-text-muted text-xs font-medium">{t('emptyInbox')}</p>
                <p className="text-text-dim text-[10px] mt-1">{t('emptyInboxHint')}</p>
              </div>
            </div>
          ) : (
            <div className="p-1.5 space-y-0.5">
              {filteredConversations.map(conv => {
                const isSelected = selectedPatientId === conv.patient_id
                const preview = conv.last_message.length > 60
                  ? conv.last_message.slice(0, 60) + '...'
                  : conv.last_message

                return (
                  <button
                    key={conv.patient_id}
                    onClick={() => handleSelectConversation(conv.patient_id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-all duration-150 group ${
                      isSelected
                        ? 'bg-brand-purple/10 border border-brand-purple/20'
                        : 'hover:bg-surface-3 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className={`w-9 h-9 rounded-md flex items-center justify-center text-[10px] font-bold font-mono ${
                          isSelected
                            ? 'bg-brand-purple/8 border border-brand-purple/15 text-brand-purple'
                            : 'bg-surface-3 text-text-muted group-hover:bg-brand-purple/10 group-hover:text-brand-purple'
                        } transition-colors`}>
                          {conv.patient_name[0]?.toUpperCase() || '?'}
                        </div>
                        {conv.unread && (
                          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-brand-purple border-2 border-surface" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className={`text-[11px] font-semibold font-mono truncate ${
                            isSelected ? 'text-brand-purple-light' : 'text-text-primary'
                          }`}>
                            {conv.patient_name}
                          </span>
                          <span className="text-[9px] text-text-dim flex-shrink-0">
                            {timeAgo(conv.last_message_at)}
                          </span>
                        </div>
                        <p className="text-[10px] text-text-muted line-clamp-1 mb-1">
                          {preview}
                        </p>
                        <ChannelBadge channel={conv.channel} />
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* CONVERSATION DETAIL */}
      <div className={`${
        selectedPatientId ? 'flex' : 'hidden lg:flex'
      } flex-col flex-1 glass-card overflow-hidden min-w-0`}>
        {selectedConversation ? (
          <>
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => setSelectedPatientId(null)}
                className="lg:hidden w-8 h-8 rounded-lg bg-surface-3 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                aria-label={t('back')}
              >
                <ArrowLeft size={14} />
              </button>
              <div className="w-8 h-8 rounded-md bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center text-brand-purple text-[10px] font-bold font-mono flex-shrink-0">
                {selectedConversation.patient_name[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold font-mono text-text-primary truncate block">
                  {selectedConversation.patient_name}
                </span>
                <span className="text-[10px] font-mono text-text-dim">
                  {t('crossChannelHistory')}
                </span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              {detailLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                      <div className="w-2/3 h-12 bg-surface-3 rounded-lg animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : detail.length === 0 ? (
                <div className="flex-1 flex items-center justify-center py-12">
                  <p className="text-text-dim text-xs">{tConv('noMessages')}</p>
                </div>
              ) : (
                detail.map((msg, idx) => {
                  const isOutbound = msg.direction === 'OUTBOUND'
                  const prevMsg = idx > 0 ? detail[idx - 1] : null
                  const channelChanged = prevMsg && prevMsg.channel !== msg.channel

                  return (
                    <div key={msg.id}>
                      {/* Channel switch indicator */}
                      {channelChanged && (
                        <div className="flex items-center gap-2 my-3">
                          <div className="flex-1 h-px bg-border" />
                          <span className="text-[9px] text-brand-purple font-semibold flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-purple/8 border border-brand-purple/15">
                            <MessageCircle size={8} />
                            {t('channelSwitch', { channel: CHANNEL_CONFIG[msg.channel]?.label || msg.channel })}
                          </span>
                          <div className="flex-1 h-px bg-border" />
                        </div>
                      )}

                      <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] ${
                          isOutbound
                            ? 'bg-brand-purple/15 border border-brand-purple/20 rounded-lg rounded-br-md'
                            : 'bg-surface-3 border border-border rounded-lg rounded-bl-md'
                        } px-3 py-2`}>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            {isOutbound ? (
                              <Bot size={9} className="text-brand-purple" />
                            ) : (
                              <User size={9} className="text-text-dim" />
                            )}
                            <span className={`text-[9px] font-semibold ${isOutbound ? 'text-brand-purple' : 'text-text-dim'}`}>
                              {isOutbound ? 'SofIA' : tConv('role.patient')}
                            </span>
                            <ChannelBadge channel={msg.channel} />
                          </div>
                          <p className={`text-[11px] leading-relaxed whitespace-pre-wrap break-words ${
                            isOutbound ? 'text-text-secondary' : 'text-text-primary'
                          }`}>
                            {msg.message_content}
                          </p>
                          <span className="text-[8px] text-text-dim mt-1 block">
                            {timeAgo(msg.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center px-6">
              <div className="w-14 h-14 rounded-lg bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center mx-auto mb-3">
                <Inbox size={24} className="text-brand-purple/40" />
              </div>
              <p className="text-text-muted text-sm font-medium font-mono">{t('selectConversation')}</p>
              <p className="text-text-dim text-[10px] font-mono mt-1">{t('selectConversationHint')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
