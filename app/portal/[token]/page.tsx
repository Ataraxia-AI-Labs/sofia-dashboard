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

const TIER_CONFIG: Record<string, { gradient: string; text: string; bg: string; border: string; icon: string }> = {
  PLATINUM: { gradient: 'from-slate-200 via-white to-slate-300', text: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-300', icon: '\u2B50' },
  GOLD: { gradient: 'from-amber-200 via-yellow-100 to-amber-300', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-300', icon: '\uD83C\uDFC6' },
  SILVER: { gradient: 'from-gray-200 via-gray-100 to-gray-300', text: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-300', icon: '\uD83E\uDD48' },
  BRONZE: { gradient: 'from-orange-200 via-orange-100 to-orange-300', text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-300', icon: '\uD83E\uDD49' },
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
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-gray-500 text-sm">Cargando tu portal...</p>
        </div>
      </div>
    )
  }

  // ERROR STATE
  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">Enlace no disponible</h2>
          <p className="text-gray-500 text-sm mb-4">{error || 'Este enlace no es valido o ha expirado.'}</p>
          <button
            onClick={loadData}
            className="px-6 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-gray-50">
      <div className="max-w-lg mx-auto px-4 py-6 pb-24">

        {/* ======== WELCOME HEADER ======== */}
        <div className="text-center mb-6">
          <p className="text-xs text-blue-400 font-medium uppercase tracking-wider mb-1">{data.clinic_name}</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Hola, {data.patient_info.name.split(' ')[0]}
          </h1>

          {/* Tier Badge */}
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r ${tierCfg.gradient} border ${tierCfg.border} shadow-sm`}>
            <span className="text-lg">{tierCfg.icon}</span>
            <span className={`text-sm font-bold ${tierCfg.text}`}>{data.gamification.tier}</span>
            <span className="text-xs text-gray-500 font-medium">{data.gamification.total_points.toLocaleString()} pts</span>
          </div>

          {/* Progress to next tier */}
          {data.gamification.next_tier && data.gamification.points_to_next_tier > 0 && (
            <div className="mt-3 max-w-xs mx-auto">
              <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                <span>{data.gamification.tier}</span>
                <span>{data.gamification.next_tier}</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-700"
                  style={{
                    width: `${Math.max(5, Math.min(95, (data.gamification.total_points / (data.gamification.total_points + data.gamification.points_to_next_tier)) * 100))}%`,
                  }}
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1 text-center">
                {data.gamification.points_to_next_tier} pts para {data.gamification.next_tier}
              </p>
            </div>
          )}
        </div>

        {/* ======== NEXT APPOINTMENT (HERO) ======== */}
        {nextAppointment && (
          <div className="mb-4 p-5 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/20">
            <p className="text-[10px] uppercase tracking-wider text-blue-100 font-medium mb-2">Proxima cita</p>
            <p className="text-lg font-bold capitalize mb-0.5">{formatDate(nextAppointment.date)}</p>
            <div className="flex items-center gap-3 text-sm text-blue-100">
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{nextAppointment.time}</span>
              <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{nextAppointment.doctor}</span>
            </div>
            <p className="text-sm font-medium mt-2">{nextAppointment.service}</p>
            <div className="flex gap-2 mt-3">
              {confirmCancel === nextAppointment.id ? (
                <>
                  <button
                    onClick={() => handleCancel(nextAppointment.id)}
                    disabled={cancellingId === nextAppointment.id}
                    className="flex-1 py-2 rounded-xl bg-red-500/20 text-white text-xs font-medium backdrop-blur-sm disabled:opacity-50"
                  >
                    {cancellingId === nextAppointment.id ? 'Cancelando...' : 'Si, cancelar'}
                  </button>
                  <button
                    onClick={() => setConfirmCancel(null)}
                    className="flex-1 py-2 rounded-xl bg-white/10 text-white text-xs font-medium backdrop-blur-sm"
                  >
                    No, mantener
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setConfirmCancel(nextAppointment.id)}
                    className="flex-1 py-2 rounded-xl bg-white/10 text-white text-xs font-medium backdrop-blur-sm hover:bg-white/20 transition-colors"
                  >
                    Cancelar cita
                  </button>
                  <button
                    onClick={() => setRescheduleId(rescheduleId === nextAppointment.id ? null : nextAppointment.id)}
                    className="flex-1 py-2 rounded-xl bg-white/20 text-white text-xs font-medium backdrop-blur-sm hover:bg-white/30 transition-colors"
                  >
                    Reagendar
                  </button>
                </>
              )}
            </div>
            {/* Reschedule date picker */}
            {rescheduleId === nextAppointment.id && (
              <div className="mt-3 flex gap-2">
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={e => setRescheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="flex-1 px-3 py-2 rounded-xl bg-white/10 text-white text-xs border border-white/20 placeholder:text-blue-200 focus:outline-none"
                />
                <button
                  onClick={() => handleReschedule(nextAppointment.id)}
                  disabled={!rescheduleDate}
                  className="px-4 py-2 rounded-xl bg-white text-blue-600 text-xs font-semibold disabled:opacity-50"
                >
                  Enviar
                </button>
              </div>
            )}
          </div>
        )}

        {/* Other upcoming appointments */}
        {otherAppointments.length > 0 && (
          <div className="mb-4 space-y-2">
            {otherAppointments.map(apt => (
              <div key={apt.id} className="p-4 rounded-xl bg-white border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800 capitalize">{formatDate(apt.date)}</p>
                    <p className="text-xs text-gray-500">{apt.time} - {apt.service} con {apt.doctor}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setConfirmCancel(confirmCancel === apt.id ? null : apt.id)}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {confirmCancel === apt.id && (
                  <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => handleCancel(apt.id)}
                      disabled={cancellingId === apt.id}
                      className="flex-1 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium disabled:opacity-50"
                    >
                      {cancellingId === apt.id ? 'Cancelando...' : 'Confirmar cancelacion'}
                    </button>
                    <button
                      onClick={() => setConfirmCancel(null)}
                      className="flex-1 py-1.5 rounded-lg bg-gray-50 text-gray-500 text-xs font-medium"
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
          <div className="mb-4 p-6 rounded-2xl bg-white border border-gray-100 text-center shadow-sm">
            <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-600">Sin citas pendientes</p>
            <p className="text-xs text-gray-400 mt-1">Contacta a la clinica para agendar tu proxima visita</p>
          </div>
        )}

        {/* ======== GAMIFICATION ======== */}
        <div className="mb-4 p-5 rounded-2xl bg-white border border-gray-100 shadow-sm">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-amber-500" />
            Mis puntos y logros
          </h2>

          {/* Points & streak */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3 rounded-xl bg-blue-50">
              <Star className="w-4 h-4 text-blue-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-800">{data.gamification.total_points.toLocaleString()}</p>
              <p className="text-[10px] text-gray-500">Puntos</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-amber-50">
              <Award className="w-4 h-4 text-amber-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-800">{data.gamification.tier}</p>
              <p className="text-[10px] text-gray-500">Nivel</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-orange-50">
              <Flame className="w-4 h-4 text-orange-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-800">{data.gamification.streak_months}</p>
              <p className="text-[10px] text-gray-500">Meses racha</p>
            </div>
          </div>

          {/* Recent activity */}
          {data.gamification.recent_actions.length > 0 && (
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-2">Actividad reciente</p>
              <div className="space-y-1.5">
                {data.gamification.recent_actions.slice(0, 6).map((a, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-gray-50">
                    <span className="text-xs text-gray-600">{a.action.replace(/_/g, ' ').toLowerCase()}</span>
                    <span className="text-xs font-bold text-green-600">+{a.points}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ======== PENDING PAYMENTS ======== */}
        {pendingPayments.length > 0 && (
          <div className="mb-4 p-5 rounded-2xl bg-amber-50 border border-amber-200 shadow-sm">
            <h2 className="text-sm font-bold text-amber-800 flex items-center gap-2 mb-3">
              <CreditCard className="w-4 h-4" />
              Pagos pendientes
            </h2>
            <div className="space-y-2">
              {pendingPayments.map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-white border border-amber-100">
                  <div>
                    <p className="text-xs font-medium text-gray-800">{p.description}</p>
                    <p className="text-[10px] text-gray-500">{formatShortDate(p.date)}</p>
                  </div>
                  <span className="text-sm font-bold text-amber-700">{formatCOP(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======== PAYMENT HISTORY ======== */}
        {paidPayments.length > 0 && (
          <div className="mb-4 p-5 rounded-2xl bg-white border border-gray-100 shadow-sm">
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-3">
              <CreditCard className="w-4 h-4 text-gray-500" />
              Historial de pagos
            </h2>
            <div className="space-y-1.5">
              {paidPayments.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50">
                  <div>
                    <p className="text-xs text-gray-700">{p.description}</p>
                    <p className="text-[10px] text-gray-400">{formatShortDate(p.date)}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-gray-700">{formatCOP(p.amount)}</span>
                    <p className="text-[10px] text-green-500 font-medium">Pagado</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======== APPOINTMENT HISTORY ======== */}
        {data.appointment_history.length > 0 && (
          <div className="mb-4 p-5 rounded-2xl bg-white border border-gray-100 shadow-sm">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between"
            >
              <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <History className="w-4 h-4 text-gray-500" />
                Historial de visitas
              </h2>
              {showHistory ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {showHistory && (
              <div className="mt-3 space-y-2">
                {data.appointment_history.map((h, i) => (
                  <div key={i} className="flex items-center gap-3 py-2">
                    <div className="w-2 h-2 rounded-full bg-blue-300 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-700">{h.service}</p>
                      <p className="text-[10px] text-gray-400">{formatShortDate(h.date)} - Dr. {h.doctor}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======== REFERRAL ======== */}
        <div className="mb-4 p-5 rounded-2xl bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-100 shadow-sm">
          <h2 className="text-sm font-bold text-purple-800 flex items-center gap-2 mb-2">
            <Gift className="w-4 h-4" />
            Refiere un amigo
          </h2>
          <p className="text-xs text-purple-600 mb-3">
            Comparte tu codigo y ambos reciben descuento en su proxima visita.
          </p>

          {/* Referral code */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-purple-200 text-center">
              <span className="text-sm font-mono font-bold text-purple-700 tracking-wider">{data.referral.code}</span>
            </div>
            <button
              onClick={copyCode}
              className="w-10 h-10 rounded-xl bg-white border border-purple-200 flex items-center justify-center text-purple-500 hover:bg-purple-50 transition-colors"
            >
              {copiedCode ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={shareWhatsApp}
              className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center text-white hover:bg-green-600 transition-colors shadow-sm"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          {/* Referral stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-2 rounded-lg bg-white/70">
              <p className="text-lg font-bold text-purple-700">{data.referral.referrals_made}</p>
              <p className="text-[10px] text-purple-500">Referidos</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-white/70">
              <p className="text-lg font-bold text-purple-700">{data.referral.discounts_earned}</p>
              <p className="text-[10px] text-purple-500">Descuentos ganados</p>
            </div>
          </div>
        </div>

        {/* ======== FOOTER ======== */}
        <div className="text-center pt-4 pb-8 space-y-3">
          {/* WhatsApp contact */}
          {data.patient_info.phone && (
            <a
              href={`https://wa.me/${data.patient_info.phone.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors shadow-sm"
            >
              <MessageCircle className="w-4 h-4" />
              Contactar clinica por WhatsApp
            </a>
          )}

          <p className="text-[10px] text-gray-300">
            Powered by{' '}
            <a href="https://ataraxiaialabs.ai" className="text-blue-300 hover:underline" target="_blank" rel="noopener noreferrer">
              SofIA
            </a>
            {' '}| Ataraxia IA Labs
          </p>
        </div>
      </div>
    </div>
  )
}
