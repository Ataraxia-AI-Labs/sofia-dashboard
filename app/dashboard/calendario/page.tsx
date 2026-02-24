'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useOrg } from '@/lib/org-context'
import { fetchAppointments, updateAppointmentStatus, createAppointment, fetchPatients, fetchServicesCatalog, fetchPatientMLFeatures, timeAgo } from '@/lib/api'
import type { Appointment, Patient, ServiceCatalog, PatientMLFeatures } from '@/types'
import {
  ChevronLeft, ChevronRight, Calendar as CalIcon, Clock,
  User, RefreshCw, Eye, X, CheckCircle, XCircle, AlertTriangle, HelpCircle, Plus, TrendingDown
} from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  CONFIRMED: { label: 'Confirmada', color: 'text-status-info', bg: 'bg-status-info/10 border-status-info/20', icon: CheckCircle },
  COMPLETED: { label: 'Completada', color: 'text-status-success', bg: 'bg-status-success/10 border-status-success/20', icon: CheckCircle },
  CANCELLED: { label: 'Cancelada', color: 'text-status-danger', bg: 'bg-status-danger/10 border-status-danger/20', icon: XCircle },
  NO_SHOW: { label: 'No asistió', color: 'text-status-warning', bg: 'bg-status-warning/10 border-status-warning/20', icon: AlertTriangle },
  REQUESTED: { label: 'Solicitada', color: 'text-brand-purple', bg: 'bg-brand-purple/10 border-brand-purple/20', icon: HelpCircle },
  RESCHEDULED: { label: 'Reagendada', color: 'text-brand-gold', bg: 'bg-brand-gold/10 border-brand-gold/20', icon: CalIcon },
  SCHEDULED: { label: 'Programada', color: 'text-brand-cyan', bg: 'bg-brand-cyan/10 border-brand-cyan/20', icon: CalIcon },
}

const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

type ViewMode = 'week' | 'month'

export default function CalendarioPage() {
  const { orgId, branchId } = useOrg()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)
  const [selectedMLFeatures, setSelectedMLFeatures] = useState<PatientMLFeatures | null>(null)
  const [showNewAppt, setShowNewAppt] = useState(false)
  const [patients, setPatients] = useState<Patient[]>([])
  const [services, setServices] = useState<ServiceCatalog[]>([])
  const [newAppt, setNewAppt] = useState({ patient_id: '', date: '', time: '09:00', service_name: '', duration: 60 })

  // Close modal on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSelectedAppt(null); setShowNewAppt(false) }
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [])

  // Date range based on view
  const { fromDate, toDate } = useMemo(() => {
    const d = new Date(currentDate)
    if (viewMode === 'week') {
      const day = d.getDay()
      const start = new Date(d)
      start.setDate(d.getDate() - day + 1) // Monday
      const end = new Date(start)
      end.setDate(start.getDate() + 6) // Sunday
      return { fromDate: start, toDate: end }
    } else {
      const start = new Date(d.getFullYear(), d.getMonth(), 1)
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      return { fromDate: start, toDate: end }
    }
  }, [currentDate, viewMode])

  const loadAppointments = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const data = await fetchAppointments(orgId, {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        status: statusFilter || undefined,
        branchId,
      })
      setAppointments(data as unknown as Appointment[])
    } catch {
      // Appointments load failed — UI will show empty calendar
    }
    setLoading(false)
  }, [orgId, fromDate, toDate, statusFilter, branchId])

  useEffect(() => { loadAppointments() }, [loadAppointments])

  // When selecting an appointment, fetch ML features for no-show badge
  const handleSelectAppt = async (appt: Appointment) => {
    setSelectedAppt(appt)
    setSelectedMLFeatures(null)
    if (appt.patient_id) {
      try {
        const features = await fetchPatientMLFeatures(appt.patient_id)
        setSelectedMLFeatures(features as PatientMLFeatures | null)
      } catch {
        // ML features may not exist yet
      }
    }
  }

  const openNewAppt = async () => {
    setShowNewAppt(true)
    if (orgId && patients.length === 0) {
      try {
        const [pats, svcs] = await Promise.all([
          fetchPatients(orgId, { limit: 500 }),
          fetchServicesCatalog(orgId),
        ])
        setPatients(pats.patients || [])
        setServices(svcs || [])
      } catch { /* Failed to load patients/services for form */ }
    }
  }

  const handleCreateAppt = async () => {
    if (!orgId || !newAppt.patient_id || !newAppt.date || !newAppt.service_name) return
    try {
      const start = `${newAppt.date}T${newAppt.time}:00`
      const endDate = new Date(`${newAppt.date}T${newAppt.time}:00`)
      endDate.setMinutes(endDate.getMinutes() + newAppt.duration)
      const end = endDate.toISOString()
      await createAppointment(orgId, { patient_id: newAppt.patient_id, start_time: start, end_time: end, service_name: newAppt.service_name })
      setShowNewAppt(false)
      setNewAppt({ patient_id: '', date: '', time: '09:00', service_name: '', duration: 60 })
      loadAppointments()
    } catch { /* Appointment creation failed */ }
  }

  const navigate = (dir: number) => {
    const d = new Date(currentDate)
    if (viewMode === 'week') d.setDate(d.getDate() + dir * 7)
    else d.setMonth(d.getMonth() + dir)
    setCurrentDate(d)
  }

  const goToday = () => setCurrentDate(new Date())

  // Group appointments by date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, Appointment[]> = {}
    appointments.forEach((a) => {
      const dateKey = new Date(a.start_time).toISOString().split('T')[0]
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(a)
    })
    return groups
  }, [appointments])

  // Generate day cells
  const dayCells = useMemo(() => {
    const cells: { date: Date; key: string; isToday: boolean; isCurrentMonth: boolean }[] = []
    const today = new Date().toISOString().split('T')[0]

    if (viewMode === 'week') {
      for (let i = 0; i < 7; i++) {
        const d = new Date(fromDate)
        d.setDate(fromDate.getDate() + i)
        const key = d.toISOString().split('T')[0]
        cells.push({ date: d, key, isToday: key === today, isCurrentMonth: true })
      }
    } else {
      // Start from Monday of the week containing the 1st
      const firstDay = new Date(fromDate)
      const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1 // Monday=0
      const start = new Date(firstDay)
      start.setDate(start.getDate() - startDay)

      for (let i = 0; i < 42; i++) {
        const d = new Date(start)
        d.setDate(start.getDate() + i)
        const key = d.toISOString().split('T')[0]
        cells.push({
          date: d,
          key,
          isToday: key === today,
          isCurrentMonth: d.getMonth() === currentDate.getMonth(),
        })
      }
    }
    return cells
  }, [fromDate, viewMode, currentDate])

  const headerLabel = viewMode === 'week'
    ? `${fromDate.getDate()} – ${toDate.getDate()} ${MONTHS_ES[fromDate.getMonth()]} ${fromDate.getFullYear()}`
    : `${MONTHS_ES[currentDate.getMonth()]} ${currentDate.getFullYear()}`

  return (
    <div className="max-w-[1400px] space-y-5">
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Calendario</h2>
          <p className="text-text-dim text-xs mt-0.5">{appointments.length} citas en este periodo</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-surface-2 border border-border text-text-muted text-xs outline-none"
          >
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>

          {/* View toggle */}
          {(['week', 'month'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === mode
                  ? 'bg-brand-purple/15 text-brand-purple border border-brand-purple/25'
                  : 'bg-surface-2 text-text-muted border border-border hover:border-border-2'
              }`}
            >
              {mode === 'week' ? 'Semana' : 'Mes'}
            </button>
          ))}

          <button onClick={loadAppointments} aria-label="Actualizar" className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={openNewAppt} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-purple/15 text-brand-purple text-xs font-semibold hover:bg-brand-purple/25 transition-colors">
            <Plus size={13} /> Nueva Cita
          </button>
        </div>
      </div>

      {/* NAV */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => navigate(1)} className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
            <ChevronRight size={16} />
          </button>
          <button onClick={goToday} className="px-3 py-1.5 rounded-lg bg-surface-2 border border-border text-text-muted text-xs font-semibold hover:text-text-primary transition-colors">
            Hoy
          </button>
        </div>
        <h3 className="text-base font-semibold text-text-primary">{headerLabel}</h3>
      </div>

      {/* NEW APPOINTMENT FORM */}
      {showNewAppt && (
        <div className="glass-card p-5 space-y-3 border-brand-purple/20 animate-fade-up">
          <h4 className="text-sm font-semibold text-text-primary">Nueva Cita Manual</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-text-dim uppercase mb-1">Paciente *</label>
              <select value={newAppt.patient_id} onChange={(e) => setNewAppt({...newAppt, patient_id: e.target.value})} className="w-full px-3 py-2 rounded-lg bg-void border border-border text-text-primary text-sm outline-none">
                <option value="">Seleccionar...</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name} — {p.phone}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-text-dim uppercase mb-1">Servicio *</label>
              <select value={newAppt.service_name} onChange={(e) => setNewAppt({...newAppt, service_name: e.target.value})} className="w-full px-3 py-2 rounded-lg bg-void border border-border text-text-primary text-sm outline-none">
                <option value="">Seleccionar...</option>
                {services.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-text-dim uppercase mb-1">Fecha *</label>
              <input type="date" value={newAppt.date} onChange={(e) => setNewAppt({...newAppt, date: e.target.value})} className="w-full px-3 py-2 rounded-lg bg-void border border-border text-text-primary text-sm outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-text-dim uppercase mb-1">Hora *</label>
              <input type="time" value={newAppt.time} onChange={(e) => setNewAppt({...newAppt, time: e.target.value})} className="w-full px-3 py-2 rounded-lg bg-void border border-border text-text-primary text-sm outline-none" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowNewAppt(false)} className="px-3 py-1.5 rounded-lg bg-surface-3 text-text-muted text-xs font-semibold">Cancelar</button>
            <button onClick={handleCreateAppt} disabled={!newAppt.patient_id || !newAppt.date || !newAppt.service_name} className="px-3 py-1.5 rounded-lg bg-brand-purple text-white text-xs font-semibold disabled:opacity-50">Crear Cita</button>
          </div>
        </div>
      )}

      {/* CALENDAR GRID */}
      <div className="glass-card overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {DAYS_ES.map((d, i) => (
            <div key={i} className="text-center text-[11px] font-semibold text-text-muted uppercase tracking-wider py-2.5 border-r border-border last:border-r-0">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className={`grid grid-cols-7 ${viewMode === 'week' ? '' : 'auto-rows-[120px]'}`}>
          {dayCells.map((cell) => {
            const dayAppts = groupedByDate[cell.key] || []
            return (
              <div
                key={cell.key}
                className={`border-r border-b border-border last:border-r-0 p-1.5 ${viewMode === 'week' ? 'min-h-[300px]' : 'min-h-[100px]'} ${
                  !cell.isCurrentMonth ? 'bg-void/30' : ''
                } ${cell.isToday ? 'bg-brand-purple/5' : ''}`}
              >
                {/* Date number */}
                <div className={`text-xs font-semibold mb-1 px-1 ${
                  cell.isToday ? 'text-brand-purple' : cell.isCurrentMonth ? 'text-text-secondary' : 'text-text-dim'
                }`}>
                  {cell.isToday && <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-purple mr-1 mb-0.5" />}
                  {cell.date.getDate()}
                </div>

                {/* Appointments */}
                <div className="space-y-0.5">
                  {dayAppts.slice(0, viewMode === 'week' ? 20 : 3).map((appt) => {
                    const cfg = STATUS_CONFIG[appt.status] || STATUS_CONFIG.REQUESTED
                    const time = new Date(appt.start_time).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })
                    const patientName = appt.patients?.full_name || 'Sin nombre'
                    return (
                      <button
                        key={appt.id}
                        onClick={() => handleSelectAppt(appt)}
                        className={`w-full text-left px-1.5 py-1 rounded-md border text-[10px] leading-tight truncate transition-all hover:scale-[1.02] ${cfg.bg}`}
                      >
                        <span className={`font-semibold ${cfg.color}`}>{time}</span>
                        <span className="text-text-muted ml-1 truncate">
                          {viewMode === 'week' ? `${patientName} — ${appt.service_name || ''}` : patientName}
                        </span>
                      </button>
                    )
                  })}
                  {dayAppts.length > (viewMode === 'week' ? 20 : 3) && (
                    <div className="text-[9px] text-text-dim px-1">+{dayAppts.length - (viewMode === 'week' ? 20 : 3)} mas</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Status legend */}
      <div className="flex gap-3 flex-wrap justify-center">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-text-muted">
            <div className={`w-2 h-2 rounded-full ${cfg.color.replace('text-', 'bg-')}`} />
            {cfg.label}
          </div>
        ))}
      </div>

      {/* ========== APPOINTMENT DETAIL MODAL ========== */}
      {selectedAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedAppt(null)} />
          <div className="relative glass-card-elevated w-full max-w-md p-6 space-y-4 animate-fade-up">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-text-primary">Detalle de Cita</h3>
              <button onClick={() => setSelectedAppt(null)} className="w-7 h-7 rounded-lg bg-surface-3 flex items-center justify-center text-text-dim hover:text-text-primary transition-colors">
                <X size={14} />
              </button>
            </div>

            {/* Status badge */}
            {(() => {
              const cfg = STATUS_CONFIG[selectedAppt.status] || STATUS_CONFIG.REQUESTED
              const StatusIcon = cfg.icon
              return (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${cfg.bg}`}>
                    <StatusIcon size={12} className={cfg.color} />
                    <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                  </div>
                  {/* No-Show risk badge (Sesion 18 — from patient_ml_features) */}
                  {selectedMLFeatures?.no_show_probability != null && selectedAppt.status !== 'COMPLETED' && selectedAppt.status !== 'CANCELLED' && (
                    <NoShowBadge probability={selectedMLFeatures.no_show_probability} />
                  )}
                </div>
              )
            })()}

            <div className="space-y-3">
              <ApptRow icon={<User size={14} />} label="Paciente" value={selectedAppt.patients?.full_name || 'Sin nombre'} />
              <ApptRow icon={<CalIcon size={14} />} label="Fecha" value={new Date(selectedAppt.start_time).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} />
              <ApptRow icon={<Clock size={14} />} label="Hora" value={`${new Date(selectedAppt.start_time).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}${selectedAppt.end_time ? ` — ${new Date(selectedAppt.end_time).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}` : ''}`} />
              <ApptRow icon={<Eye size={14} />} label="Servicio" value={selectedAppt.service_name || '—'} />
            </div>

            <div className="pt-2 border-t border-border text-xs text-text-dim">
              Creada {timeAgo(selectedAppt.created_at)}
            </div>

            {/* STATUS ACTIONS */}
            {selectedAppt.status !== 'COMPLETED' && selectedAppt.status !== 'CANCELLED' && (
              <div className="pt-3 border-t border-border flex gap-2 flex-wrap">
                <button
                  onClick={async () => { await updateAppointmentStatus(selectedAppt.id, 'COMPLETED'); setSelectedAppt(null); loadAppointments() }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-status-success/10 border border-status-success/20 text-status-success text-xs font-semibold hover:bg-status-success/20 transition-colors"
                >
                  <CheckCircle size={12} /> Completada
                </button>
                <button
                  onClick={async () => { await updateAppointmentStatus(selectedAppt.id, 'NO_SHOW'); setSelectedAppt(null); loadAppointments() }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-status-warning/10 border border-status-warning/20 text-status-warning text-xs font-semibold hover:bg-status-warning/20 transition-colors"
                >
                  <AlertTriangle size={12} /> No Asistio
                </button>
                <button
                  onClick={async () => { await updateAppointmentStatus(selectedAppt.id, 'CANCELLED', 'Cancelado desde dashboard'); setSelectedAppt(null); loadAppointments() }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-status-danger/10 border border-status-danger/20 text-status-danger text-xs font-semibold hover:bg-status-danger/20 transition-colors"
                >
                  <XCircle size={12} /> Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// No-Show Risk Badge (Sesion 18 — ML no_show_probability)
// ============================================================

function NoShowBadge({ probability }: { probability: number }) {
  const pct = Math.round(probability * 100)
  const color = probability > 0.6
    ? 'text-status-danger bg-status-danger/10 border-status-danger/20'
    : probability > 0.3
      ? 'text-status-warning bg-status-warning/10 border-status-warning/20'
      : 'text-status-success bg-status-success/10 border-status-success/20'
  const label = probability > 0.6
    ? 'Alto riesgo'
    : probability > 0.3
      ? 'Riesgo medio'
      : 'Bajo riesgo'

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-semibold ${color}`}>
      <TrendingDown size={10} />
      No-show: {label} ({pct}%)
    </div>
  )
}

function ApptRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-text-dim mt-0.5">{icon}</span>
      <div>
        <div className="text-[10px] text-text-dim uppercase">{label}</div>
        <div className="text-sm text-text-primary">{value}</div>
      </div>
    </div>
  )
}
