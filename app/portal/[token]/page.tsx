'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Calendar, Clock, User, Gift, Star, Trophy,
  ChevronDown, ChevronUp, Copy, Check, X, Share2,
  CreditCard, History, Loader2, AlertCircle, MessageCircle,
  Flame, Award,
} from 'lucide-react'
import {
  getPortalData, cancelAppointment, requestReschedule,
} from '@/lib/api/portal'
import type { PortalData } from '@/types'

// ============================================================
// TIER CONFIG — Patient-facing gamification tiers
// ============================================================

const TIER_CONFIG: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  PLATINUM: { bg: 'bg-brand-purple/10', text: 'text-brand-purple', border: 'border-brand-purple/30', icon: '\u2B50' },
  GOLD: { bg: 'bg-brand-gold/10', text: 'text-brand-gold', border: 'border-brand-gold/30', icon: '\uD83C\uDFC6' },
  SILVER: { bg: 'bg-text-muted/10', text: 'text-text-muted', border: 'border-text-muted/30', icon: '\uD83E\uDD48' },
  BRONZE: { bg: 'bg-brand-gold/5', text: 'text-brand-gold', border: 'border-brand-gold/20', icon: '\uD83E\uDD49' },
}

function getTierCfg(tier: string) {
  return TIER_CONFIG[tier] || TIER_CONFIG.BRONZE
}

// ============================================================
// FORMAT HELPERS (standalone — no dashboard imports)
// ============================================================

function formatCOP(n: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
  } catch {
    return dateStr
  }
}

function formatShortDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

// ============================================================
// PATIENT PORTAL PAGE — Public, mobile-first
// ============================================================

export default function PatientPortalPage({ params }: { params: { token: string } }) {
  const { token } = params
  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [rescheduleId, setRescheduleId] = useState<string | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getPortalData(token)
      if (!result) {
        setError('No se pudo cargar tu informacion. El enlace puede haber expirado.')
        setLoading(false)
        return
      }
      setData(result)
    } catch {
      setError('Error de conexion. Intenta de nuevo.')
    }
    setLoading(false)
  }, [token])

  useEffect(() => { loadData() }, [loadData])

  const handleCancel = async (appointmentId: string) => {
    setCancellingId(appointmentId)
    const ok = await cancelAppointment(token, appointmentId)
    if (ok) {
      await loadData()
    }
    setCancellingId(null)
    setConfirmCancel(null)
  }

  const handleReschedule = async (appointmentId: string) => {
    if (!rescheduleDate) return
    const ok = await requestReschedule(token, appointmentId, [rescheduleDate])
    if (ok) {
      setRescheduleId(null)
      setRescheduleDate('')
      await loadData()
    }
  }

  const copyCode = () => {
    if (!data?.referral.code) return
    const portalUrl = `${window.location.origin}/portal/${token}`
    navigator.clipboard.writeText(`Usa mi codigo ${data.referral.code} - ${portalUrl}`)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const shareWhatsApp = () => {
    if (!data?.referral.code) return
    const msg = encodeURIComponent(`Te recomiendo esta clinica! Usa mi codigo ${data.referral.code} y ambos recibimos descuento.`)
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  // LOADING STATE
  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-brand-purple" />
          <p className="text-text-dim text-[10px] font-mono">Cargando tu portal...</p>
        </div>
      </div>
    )
  }

  // ERROR STATE
  if (error || !data) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-lg bg-status-danger/10 border border-status-danger/20 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6 text-status-danger" />
          </div>
          <h2 className="text-lg font-bold text-text-primary font-mono mb-1">Enlace no disponible</h2>
          <p className="text-text-muted text-xs font-mono mb-3">{error || 'Este enlace no es valido o ha expirado.'}</p>
          <button
            onClick={loadData}
            className="px-5 py-2 rounded-lg bg-brand-purple text-white text-xs font-mono font-medium hover:bg-brand-purple-dark transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  const tierCfg = getTierCfg(data.gamification.tier)
  const nextAppointment = data.upcoming_appointments[0]
  const otherAppointments = data.upcoming_appointments.slice(1)
  const pendingPayments = data.payments.filter(p => p.status === 'PENDING')
  const paidPayments = data.payments.filter(p => p.status === 'PAID')

  return (
    <div className="min-h-screen bg-void">
      <div className="max-w-lg mx-auto px-4 py-5 pb-20">

        {/* ======== WELCOME HEADER ======== */}
        <div className="text-center mb-5">
          <svg width="28" height="28" viewBox="0 0 48 48" className="mx-auto mb-2 animate-sentient-breathe">
            <ellipse cx="24" cy="24" rx="20" ry="12" fill="none" stroke="#8B5CF6" strokeWidth="1.5" opacity="0.4" />
            <circle cx="24" cy="24" r="5" fill="#8B5CF6" opacity="0.8" />
            <circle cx="24" cy="24" r="2" fill="#F5F3FF" />
          </svg>
          <p className="text-[10px] text-brand-purple font-mono font-medium uppercase tracking-wider mb-0.5">{data.clinic_name}</p>
          <h1 className="text-2xl font-bold text-white font-mono mb-2">
            Hola, {data.patient_info.name.split(' ')[0]}
          </h1>

          {/* Tier Badge */}
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${tierCfg.bg} border ${tierCfg.border}`}>
            <span className="text-lg">{tierCfg.icon}</span>
            <span className={`text-xs font-mono font-bold ${tierCfg.text}`}>{data.gamification.tier}</span>
            <span className="text-[10px] font-mono text-text-dim font-medium">{data.gamification.total_points.toLocaleString()} pts</span>
          </div>

          {/* Progress to next tier */}
          {data.gamification.next_tier && data.gamification.points_to_next_tier > 0 && (
            <div className="mt-2 max-w-xs mx-auto">
              <div className="flex items-center justify-between text-[10px] font-mono text-text-dim mb-0.5">
                <span>{data.gamification.tier}</span>
                <span>{data.gamification.next_tier}</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand-purple transition-all duration-700"
                  style={{
                    width: `${Math.max(5, Math.min(95, (data.gamification.total_points / (data.gamification.total_points + data.gamification.points_to_next_tier)) * 100))}%`,
                  }}
                />
              </div>
              <p className="text-[10px] font-mono text-text-dim mt-0.5 text-center">
                {data.gamification.points_to_next_tier} pts para {data.gamification.next_tier}
              </p>
            </div>
          )}
        </div>

        {/* ======== NEXT APPOINTMENT (HERO) ======== */}
        {nextAppointment && (
          <div className="mb-3 p-4 rounded-lg bg-brand-purple text-white">
            <p className="text-[10px] uppercase tracking-wider text-white/60 font-mono font-medium mb-1.5">Proxima cita</p>
            <p className="text-lg font-bold font-mono capitalize mb-0.5">{formatDate(nextAppointment.date)}</p>
            <div className="flex items-center gap-3 text-xs font-mono text-white/70">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{nextAppointment.time}</span>
              <span className="flex items-center gap-1"><User className="w-3 h-3" />{nextAppointment.doctor}</span>
            </div>
            <p className="text-xs font-mono font-medium mt-1.5">{nextAppointment.service}</p>
            <div className="flex gap-2 mt-2.5">
              {confirmCancel === nextAppointment.id ? (
                <>
                  <button
                    onClick={() => handleCancel(nextAppointment.id)}
                    disabled={cancellingId === nextAppointment.id}
                    className="flex-1 py-1.5 rounded-lg bg-status-danger/20 text-white text-[10px] font-mono font-medium disabled:opacity-50"
                  >
                    {cancellingId === nextAppointment.id ? 'Cancelando...' : 'Si, cancelar'}
                  </button>
                  <button
                    onClick={() => setConfirmCancel(null)}
                    className="flex-1 py-1.5 rounded-lg bg-white/10 text-white text-[10px] font-mono font-medium"
                  >
                    No, mantener
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setConfirmCancel(nextAppointment.id)}
                    className="flex-1 py-1.5 rounded-lg bg-white/10 text-white text-[10px] font-mono font-medium hover:bg-white/20 transition-colors"
                  >
                    Cancelar cita
                  </button>
                  <button
                    onClick={() => setRescheduleId(rescheduleId === nextAppointment.id ? null : nextAppointment.id)}
                    className="flex-1 py-1.5 rounded-lg bg-white/20 text-white text-[10px] font-mono font-medium hover:bg-white/30 transition-colors"
                  >
                    Reagendar
                  </button>
                </>
              )}
            </div>
            {/* Reschedule date picker */}
            {rescheduleId === nextAppointment.id && (
              <div className="mt-2.5 flex gap-2">
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={e => setRescheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-white/10 text-white text-[10px] font-mono border border-white/20 placeholder:text-white/40 focus:outline-none"
                />
                <button
                  onClick={() => handleReschedule(nextAppointment.id)}
                  disabled={!rescheduleDate}
                  className="px-3 py-1.5 rounded-lg bg-white text-brand-purple text-[10px] font-mono font-semibold disabled:opacity-50"
                >
                  Enviar
                </button>
              </div>
            )}
          </div>
        )}

        {/* Other upcoming appointments */}
        {otherAppointments.length > 0 && (
          <div className="mb-3 space-y-1.5">
            {otherAppointments.map(apt => (
              <div key={apt.id} className="p-3 rounded-lg bg-surface border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-mono font-medium text-text-primary capitalize">{formatDate(apt.date)}</p>
                    <p className="text-[10px] font-mono text-text-muted">{apt.time} - {apt.service} con {apt.doctor}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setConfirmCancel(confirmCancel === apt.id ? null : apt.id)}
                      className="p-1.5 rounded-md text-text-dim hover:text-status-danger hover:bg-status-danger/10 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {confirmCancel === apt.id && (
                  <div className="flex gap-2 mt-1.5 pt-1.5 border-t border-border">
                    <button
                      onClick={() => handleCancel(apt.id)}
                      disabled={cancellingId === apt.id}
                      className="flex-1 py-1 rounded-md bg-status-danger/10 text-status-danger text-[10px] font-mono font-medium disabled:opacity-50"
                    >
                      {cancellingId === apt.id ? 'Cancelando...' : 'Confirmar cancelacion'}
                    </button>
                    <button
                      onClick={() => setConfirmCancel(null)}
                      className="flex-1 py-1 rounded-md bg-surface-2 text-text-muted text-[10px] font-mono font-medium"
                    >
                      Mantener
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* No upcoming appointments */}
        {data.upcoming_appointments.length === 0 && (
          <div className="mb-3 p-5 rounded-lg bg-surface border border-border text-center">
            <Calendar className="w-6 h-6 text-text-dim mx-auto mb-1.5" />
            <p className="text-xs font-mono font-medium text-text-muted">Sin citas pendientes</p>
            <p className="text-[10px] font-mono text-text-dim mt-0.5">Contacta a la clinica para agendar tu proxima visita</p>
          </div>
        )}

        {/* ======== GAMIFICATION ======== */}
        <div className="mb-3 p-4 rounded-lg bg-surface border border-border">
          <h2 className="text-xs font-mono font-bold text-text-primary flex items-center gap-2 mb-2.5">
            <Trophy className="w-3.5 h-3.5 text-brand-gold" />
            Mis puntos y logros
          </h2>

          {/* Points & streak */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center p-2.5 rounded-lg bg-brand-purple/8 border border-brand-purple/15">
              <Star className="w-3.5 h-3.5 text-brand-purple mx-auto mb-0.5" />
              <p className="text-lg font-bold font-mono text-text-primary">{data.gamification.total_points.toLocaleString()}</p>
              <p className="text-[10px] font-mono text-text-dim">Puntos</p>
            </div>
            <div className="text-center p-2.5 rounded-lg bg-brand-gold/8 border border-brand-gold/15">
              <Award className="w-3.5 h-3.5 text-brand-gold mx-auto mb-0.5" />
              <p className="text-lg font-bold font-mono text-text-primary">{data.gamification.tier}</p>
              <p className="text-[10px] font-mono text-text-dim">Nivel</p>
            </div>
            <div className="text-center p-2.5 rounded-lg bg-status-warning/8 border border-status-warning/15">
              <Flame className="w-3.5 h-3.5 text-status-warning mx-auto mb-0.5" />
              <p className="text-lg font-bold font-mono text-text-primary">{data.gamification.streak_months}</p>
              <p className="text-[10px] font-mono text-text-dim">Meses racha</p>
            </div>
          </div>

          {/* Recent activity */}
          {data.gamification.recent_actions.length > 0 && (
            <div>
              <p className="text-[10px] font-mono text-text-dim font-semibold uppercase tracking-wider mb-1.5">Actividad reciente</p>
              <div className="space-y-1">
                {data.gamification.recent_actions.slice(0, 6).map((a, i) => (
                  <div key={i} className="flex items-center justify-between py-1 px-2.5 rounded-md bg-surface-2">
                    <span className="text-[10px] font-mono text-text-muted">{a.action.replace(/_/g, ' ').toLowerCase()}</span>
                    <span className="text-[10px] font-mono font-bold text-status-success">+{a.points}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ======== PENDING PAYMENTS ======== */}
        {pendingPayments.length > 0 && (
          <div className="mb-3 p-4 rounded-lg bg-status-warning/8 border border-status-warning/20">
            <h2 className="text-xs font-mono font-bold text-status-warning flex items-center gap-2 mb-2.5">
              <CreditCard className="w-3.5 h-3.5" />
              Pagos pendientes
            </h2>
            <div className="space-y-1.5">
              {pendingPayments.map(p => (
                <div key={p.id} className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-surface border border-border">
                  <div>
                    <p className="text-[10px] font-mono font-medium text-text-primary">{p.description}</p>
                    <p className="text-[10px] font-mono text-text-dim">{formatShortDate(p.date)}</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-status-warning">{formatCOP(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======== PAYMENT HISTORY ======== */}
        {paidPayments.length > 0 && (
          <div className="mb-3 p-4 rounded-lg bg-surface border border-border">
            <h2 className="text-xs font-mono font-bold text-text-primary flex items-center gap-2 mb-2.5">
              <CreditCard className="w-3.5 h-3.5 text-text-dim" />
              Historial de pagos
            </h2>
            <div className="space-y-1">
              {paidPayments.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between py-1.5 px-2.5 rounded-md bg-surface-2">
                  <div>
                    <p className="text-[10px] font-mono text-text-muted">{p.description}</p>
                    <p className="text-[10px] font-mono text-text-dim">{formatShortDate(p.date)}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono font-semibold text-text-primary">{formatCOP(p.amount)}</span>
                    <p className="text-[10px] font-mono font-medium text-status-success">Pagado</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======== APPOINTMENT HISTORY ======== */}
        {data.appointment_history.length > 0 && (
          <div className="mb-3 p-4 rounded-lg bg-surface border border-border">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between"
            >
              <h2 className="text-xs font-mono font-bold text-text-primary flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-text-dim" />
                Historial de visitas
              </h2>
              {showHistory ? <ChevronUp className="w-3.5 h-3.5 text-text-dim" /> : <ChevronDown className="w-3.5 h-3.5 text-text-dim" />}
            </button>
            {showHistory && (
              <div className="mt-2.5 space-y-1.5">
                {data.appointment_history.map((h, i) => (
                  <div key={i} className="flex items-center gap-2.5 py-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-purple flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-[10px] font-mono font-medium text-text-primary">{h.service}</p>
                      <p className="text-[10px] font-mono text-text-dim">{formatShortDate(h.date)} - Dr. {h.doctor}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======== REFERRAL ======== */}
        <div className="mb-3 p-4 rounded-lg bg-brand-purple/8 border border-brand-purple/15">
          <h2 className="text-xs font-mono font-bold text-brand-purple flex items-center gap-2 mb-1.5">
            <Gift className="w-3.5 h-3.5" />
            Refiere un amigo
          </h2>
          <p className="text-[10px] font-mono text-text-muted mb-2.5">
            Comparte tu codigo y ambos reciben descuento en su proxima visita.
          </p>

          {/* Referral code */}
          <div className="flex items-center gap-1.5 mb-2.5">
            <div className="flex-1 px-3 py-2 rounded-lg bg-surface border border-border text-center">
              <span className="text-xs font-mono font-bold text-brand-purple tracking-wider">{data.referral.code}</span>
            </div>
            <button
              onClick={copyCode}
              className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-text-dim hover:text-brand-purple hover:border-brand-purple/30 transition-colors"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-status-success" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={shareWhatsApp}
              className="w-8 h-8 rounded-lg bg-status-success flex items-center justify-center text-white hover:opacity-90 transition-opacity"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Referral stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center p-1.5 rounded-md bg-surface/70 border border-border">
              <p className="text-lg font-bold font-mono text-brand-purple">{data.referral.referrals_made}</p>
              <p className="text-[10px] font-mono text-text-dim">Referidos</p>
            </div>
            <div className="text-center p-1.5 rounded-md bg-surface/70 border border-border">
              <p className="text-lg font-bold font-mono text-brand-purple">{data.referral.discounts_earned}</p>
              <p className="text-[10px] font-mono text-text-dim">Descuentos ganados</p>
            </div>
          </div>
        </div>

        {/* ======== FOOTER ======== */}
        <div className="text-center pt-3 pb-6 space-y-2.5">
          {/* WhatsApp contact */}
          {data.patient_info.phone && (
            <a
              href={`https://wa.me/${data.patient_info.phone.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-status-success text-white text-xs font-mono font-medium hover:opacity-90 transition-opacity"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Contactar clinica por WhatsApp
            </a>
          )}

          <p className="text-[10px] font-mono text-text-dim">
            Powered by{' '}
            <a href="https://ataraxiaialabs.ai" className="text-brand-purple hover:underline" target="_blank" rel="noopener noreferrer">
              SofIA
            </a>
            {' '}| Ataraxia IA Labs
          </p>
        </div>
      </div>
    </div>
  )
}
