'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import * as Sentry from '@sentry/nextjs'
import {
  getQueue, getLatePatients, getWaitingStats,
  checkIn, notifyLate, offerReschedule, notifyNext, completeVisit,
} from '@/lib/api/waiting-room'
import { fetchPatients } from '@/lib/api'
import type { WaitingRoomEntry, WaitingRoomStats, LatePatient, Patient } from '@/types'
import {
  Clock, Users, AlertTriangle, Search, UserPlus, PhoneCall,
  CheckCircle, CalendarX, Bell, Timer, TrendingDown, X, Loader2,
} from 'lucide-react'

interface WaitingRoomPanelProps {
  orgId: string
}

export default function WaitingRoomPanel({ orgId }: WaitingRoomPanelProps) {
  const t = useTranslations('waitingRoom')

  const [queue, setQueue] = useState<WaitingRoomEntry[]>([])
  const [latePatients, setLatePatients] = useState<LatePatient[]>([])
  const [stats, setStats] = useState<WaitingRoomStats | null>(null)
  const [loading, setLoading] = useState(true)

  // Quick check-in state
  const [showCheckIn, setShowCheckIn] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Patient[]>([])
  const [searching, setSearching] = useState(false)
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [q, late, st] = await Promise.all([
        getQueue(orgId),
        getLatePatients(orgId),
        getWaitingStats(orgId),
      ])
      setQueue(q)
      setLatePatients(late)
      setStats(st)
    } catch (err) {
      Sentry.captureException(err)
    }
    setLoading(false)
  }, [orgId])

  useEffect(() => { loadData() }, [loadData])

  // Auto-refresh every 30 seconds for live feel
  useEffect(() => {
    const interval = setInterval(loadData, 30_000)
    return () => clearInterval(interval)
  }, [loadData])

  // Search patients for check-in
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      try {
        const { patients } = await fetchPatients(orgId, { search: searchQuery, limit: 5 })
        setSearchResults(patients)
      } catch (err) {
        Sentry.captureException(err)
      }
      setSearching(false)
    }, 300)
  }, [searchQuery, orgId])

  const handleCheckIn = async (patientId: string) => {
    try {
      await checkIn(orgId, patientId)
      setShowCheckIn(false)
      setSearchQuery('')
      loadData()
    } catch (err) {
      Sentry.captureException(err)
    }
  }

  const handleNotifyLate = async (patientId: string) => {
    try {
      await notifyLate(orgId, patientId)
      loadData()
    } catch (err) {
      Sentry.captureException(err)
    }
  }

  const handleOfferReschedule = async (appointmentId: string) => {
    try {
      await offerReschedule(orgId, appointmentId)
      loadData()
    } catch (err) {
      Sentry.captureException(err)
    }
  }

  const handleCallNext = async (patientId: string) => {
    try {
      await notifyNext(orgId, patientId)
      loadData()
    } catch (err) {
      Sentry.captureException(err)
    }
  }

  const handleComplete = async (appointmentId: string) => {
    try {
      await completeVisit(orgId, appointmentId)
      loadData()
    } catch (err) {
      Sentry.captureException(err)
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'WAITING': return { color: 'text-status-info', bg: 'bg-status-info/10 border-status-info/20', label: t('statusWaiting') }
      case 'CALLED': return { color: 'text-status-warning', bg: 'bg-status-warning/10 border-status-warning/20', label: t('statusCalled') }
      case 'IN_PROGRESS': return { color: 'text-status-success', bg: 'bg-status-success/10 border-status-success/20', label: t('statusInProgress') }
      default: return { color: 'text-text-dim', bg: 'bg-surface-3 border-border', label: status }
    }
  }

  const getEscalationColor = (minutes: number) => {
    if (minutes >= 30) return 'text-status-danger'
    if (minutes >= 15) return 'text-status-warning'
    return 'text-brand-gold'
  }

  return (
    <div className="space-y-5">
      {/* STATS BAR */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard
            icon={<Users size={16} />}
            value={stats.currently_waiting.toString()}
            label={t('statsWaiting')}
            gradient="from-brand-purple to-brand-purple-dark"
          />
          <StatCard
            icon={<Timer size={16} />}
            value={`${stats.avg_wait_today}m`}
            label={t('statsAvgWait')}
            gradient="from-brand-purple to-brand-purple-dark"
          />
          <StatCard
            icon={<AlertTriangle size={16} />}
            value={stats.late_count.toString()}
            label={t('statsLate')}
            gradient="from-status-warning to-brand-gold"
          />
          <StatCard
            icon={<TrendingDown size={16} />}
            value={`${(stats.no_show_rate * 100).toFixed(0)}%`}
            label={t('statsNoShowRate')}
            gradient="from-status-danger to-status-danger"
          />
          <StatCard
            icon={<CheckCircle size={16} />}
            value={stats.completed_today.toString()}
            label={t('statsCompleted')}
            gradient="from-status-success to-status-success"
          />
        </div>
      )}

      {/* CRUD removido: check-in paciente vive SOLO en Pulso (SofIA). */}

      {/* LATE PATIENTS ALERT */}
      {latePatients.length > 0 && (
        <div className="glass-card p-4 border-status-danger/20 bg-status-danger/5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-status-danger" />
            <h3 className="text-sm font-semibold font-mono text-status-danger">{t('lateTitle')}</h3>
            <span className="text-[12px] font-body text-status-danger/70">{latePatients.length}</span>
          </div>
          <div className="space-y-2">
            {latePatients.map(lp => (
              <div key={lp.patient_id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-surface border border-status-danger/10">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`text-sm font-bold font-mono ${getEscalationColor(lp.minutes_late)}`}>
                    +{lp.minutes_late}m
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-text-primary truncate">{lp.patient_name}</div>
                    <div className="text-[10px] text-text-dim">
                      {t('appointmentAt')} {new Date(lp.appointment_time).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </div>
                  </div>
                  {/* Escalation dots */}
                  <div className="flex gap-0.5">
                    {[5, 15, 30].map(threshold => (
                      <div
                        key={threshold}
                        className={`w-2 h-2 rounded-full ${lp.minutes_late >= threshold ? 'bg-status-danger' : 'bg-surface-3'}`}
                        title={`${threshold}min`}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleNotifyLate(lp.patient_id)}
                    className="px-2.5 py-1 rounded-lg bg-status-info/10 border border-status-info/20 text-status-info text-[10px] font-semibold hover:bg-status-info/20 transition-colors flex items-center gap-1"
                    title={t('sendWhatsApp')}
                  >
                    <PhoneCall size={10} />
                    WhatsApp
                  </button>
                  <button
                    onClick={() => handleOfferReschedule(lp.appointment_id)}
                    className="px-2.5 py-1 rounded-lg bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-[10px] font-semibold hover:bg-brand-gold/20 transition-colors"
                  >
                    {t('offerReschedule')}
                  </button>
                  <button
                    className="px-2.5 py-1 rounded-lg bg-surface-3 border border-border text-text-dim text-[10px] font-semibold hover:text-text-muted transition-colors"
                  >
                    {t('markNoShow')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LIVE QUEUE */}
      <div className="space-y-2">
        {loading && queue.length === 0 ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card p-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-surface-3 rounded-lg" />
                <div className="flex-1">
                  <div className="h-4 bg-surface-3 rounded w-32 mb-2" />
                  <div className="h-3 bg-surface-3 rounded w-48" />
                </div>
              </div>
            </div>
          ))
        ) : queue.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <Clock size={36} className="mx-auto text-text-dim mb-3 opacity-40" />
            <p className="text-text-muted text-sm">{t('emptyQueue')}</p>
            <p className="text-text-dim text-xs mt-1">{t('emptyQueueHint')}</p>
          </div>
        ) : (
          queue.map(entry => {
            const statusStyle = getStatusStyle(entry.status)
            const waitColor = entry.wait_duration_minutes >= 30 ? 'text-status-danger'
              : entry.wait_duration_minutes >= 15 ? 'text-status-warning'
              : 'text-status-info'

            return (
              <div key={entry.id} className="glass-card p-4 hover:border-border-2 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    {/* Queue position */}
                    <div className="w-10 h-10 rounded-md bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold font-mono text-brand-purple">#{entry.queue_position}</span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold font-mono text-text-primary truncate">{entry.patient_name}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusStyle.bg}`}>
                          <span className={statusStyle.color}>{statusStyle.label}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[11px] text-text-dim">
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {t('checkInAt')} {new Date(entry.check_in_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </span>
                        <span className={`font-body font-semibold ${waitColor}`}>
                          {entry.wait_duration_minutes}min {t('waiting')}
                        </span>
                        <span className="text-text-dim">
                          ~{entry.estimated_wait_minutes}min {t('estimated')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 flex-shrink-0">
                    {entry.status === 'WAITING' && (
                      <button
                        onClick={() => handleCallNext(entry.patient_id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-status-success/10 border border-status-success/20 text-status-success text-[10px] font-semibold hover:bg-status-success/20 transition-colors"
                      >
                        <Bell size={11} />
                        {t('callNext')}
                      </button>
                    )}
                    {(entry.status === 'CALLED' || entry.status === 'IN_PROGRESS') && entry.appointment_id && (
                      <button
                        onClick={() => handleComplete(entry.appointment_id!)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-status-success/10 border border-status-success/20 text-status-success text-[10px] font-semibold hover:bg-status-success/20 transition-colors"
                      >
                        <CheckCircle size={11} />
                        {t('markComplete')}
                      </button>
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

function StatCard({ icon, value, label, gradient }: { icon: React.ReactNode; value: string; label: string; gradient: string }) {
  return (
    <div className="glass-card p-3.5">
      <div className="w-8 h-8 rounded-md bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center text-brand-purple mb-2">
        {icon}
      </div>
      <div className="text-xl font-bold font-mono text-text-primary">{value}</div>
      <div className="text-[12px] font-body text-text-muted mt-0.5">{label}</div>
    </div>
  )
}
