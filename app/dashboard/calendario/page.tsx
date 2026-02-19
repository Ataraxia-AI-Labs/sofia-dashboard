'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { fetchAppointments, timeAgo } from '@/lib/api'
import type { Appointment } from '@/types'
import {
  ChevronLeft, ChevronRight, Calendar as CalIcon, Clock,
  User, RefreshCw, Eye, X, CheckCircle, XCircle, AlertTriangle, HelpCircle
} from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  CONFIRMED: { label: 'Confirmada', color: 'text-status-info', bg: 'bg-status-info/10 border-status-info/20', icon: CheckCircle },
  COMPLETED: { label: 'Completada', color: 'text-status-success', bg: 'bg-status-success/10 border-status-success/20', icon: CheckCircle },
  CANCELLED: { label: 'Cancelada', color: 'text-status-danger', bg: 'bg-status-danger/10 border-status-danger/20', icon: XCircle },
  NO_SHOW: { label: 'No asistió', color: 'text-status-warning', bg: 'bg-status-warning/10 border-status-warning/20', icon: AlertTriangle },
  REQUESTED: { label: 'Solicitada', color: 'text-brand-purple', bg: 'bg-brand-purple/10 border-brand-purple/20', icon: HelpCircle },
  RESCHEDULED: { label: 'Reagendada', color: 'text-brand-gold', bg: 'bg-brand-gold/10 border-brand-gold/20', icon: CalIcon },
}

const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

type ViewMode = 'week' | 'month'

export default function CalendarioPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)

  useEffect(() => {
    const wrapper = document.querySelector('[data-org-id]')
    if (wrapper) setOrgId(wrapper.getAttribute('data-org-id'))
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
      })
      setAppointments(data as any[])
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }, [orgId, fromDate, toDate, statusFilter])

  useEffect(() => { loadAppointments() }, [loadAppointments])

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
          <p className="text-text-dim text-xs mt-0.5">{appointments.length} citas en este período</p>
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

          <button onClick={loadAppointments} className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
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
                    const patientName = (appt.patients as any)?.full_name || 'Sin nombre'
                    return (
                      <button
                        key={appt.id}
                        onClick={() => setSelectedAppt(appt)}
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
                    <div className="text-[9px] text-text-dim px-1">+{dayAppts.length - (viewMode === 'week' ? 20 : 3)} más</div>
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

            {(() => {
              const cfg = STATUS_CONFIG[selectedAppt.status] || STATUS_CONFIG.REQUESTED
              const StatusIcon = cfg.icon
              return (
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${cfg.bg}`}>
                  <StatusIcon size={12} className={cfg.color} />
                  <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                </div>
              )
            })()}

            <div className="space-y-3">
              <ApptRow icon={<User size={14} />} label="Paciente" value={(selectedAppt.patients as any)?.full_name || 'Sin nombre'} />
              <ApptRow icon={<CalIcon size={14} />} label="Fecha" value={new Date(selectedAppt.start_time).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} />
              <ApptRow icon={<Clock size={14} />} label="Hora" value={`${new Date(selectedAppt.start_time).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })} — ${new Date(selectedAppt.end_time).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}`} />
              <ApptRow icon={<Eye size={14} />} label="Servicio" value={selectedAppt.service_name || '—'} />
            </div>

            <div className="pt-2 border-t border-border text-xs text-text-dim">
              Creada {timeAgo(selectedAppt.created_at)}
            </div>
          </div>
        </div>
      )}
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
