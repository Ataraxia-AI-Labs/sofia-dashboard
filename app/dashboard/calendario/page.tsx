'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useOrg } from '@/lib/org-context'
import {
  fetchAppointments, updateAppointmentStatus, createAppointment,
  fetchPatients, fetchServicesCatalog, fetchPatientMLFeatures,
  rescheduleAppointment, assignStaff, fetchStaffList, timeAgo,
} from '@/lib/api'
import type { Appointment, Patient, ServiceCatalog, PatientMLFeatures, StaffMember } from '@/types'
import { useTranslations } from 'next-intl'
import {
  ChevronLeft, ChevronRight, Calendar as CalIcon, Clock,
  User, RefreshCw, Eye, X, CheckCircle, XCircle, AlertTriangle, HelpCircle, Plus, TrendingDown,
  UserCheck, Repeat, ArrowRightLeft, Users,
} from 'lucide-react'
import dynamic from 'next/dynamic'

const WaitingRoomPanel = dynamic(() => import('./waiting-room-panel'), {
  ssr: false,
  loading: () => <div className="glass-card p-5 animate-pulse"><div className="h-48 bg-surface-3 rounded-lg" /></div>,
})

// 7 statuses, 7 visually distinct hues. REQUESTED (purple), SCHEDULED
// (teal/cyan-success) and RESCHEDULED (amber/gold) used to read as
// "purple variants" in the legend because cyan at low opacity drifts
// toward purple on the dark theme. Mapped each to its own color family.
const STATUS_STYLE: Record<string, { color: string; bg: string; icon: typeof CheckCircle }> = {
  CONFIRMED: { color: 'text-status-info', bg: 'bg-status-info/10 border-status-info/20', icon: CheckCircle },
  COMPLETED: { color: 'text-status-success', bg: 'bg-status-success/10 border-status-success/20', icon: CheckCircle },
  CANCELLED: { color: 'text-status-danger', bg: 'bg-status-danger/10 border-status-danger/20', icon: XCircle },
  NO_SHOW: { color: 'text-status-warning', bg: 'bg-status-warning/10 border-status-warning/20', icon: AlertTriangle },
  REQUESTED: { color: 'text-brand-purple', bg: 'bg-brand-purple/10 border-brand-purple/20', icon: HelpCircle },
  SCHEDULED: { color: 'text-brand-cyan', bg: 'bg-brand-cyan/15 border-brand-cyan/30', icon: CalIcon },
  RESCHEDULED: { color: 'text-brand-gold', bg: 'bg-brand-gold/15 border-brand-gold/30', icon: CalIcon },
}

const STATUS_KEYS = ['CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'REQUESTED', 'RESCHEDULED', 'SCHEDULED']
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

type ViewMode = 'week' | 'month'
type ActiveTab = 'calendar' | 'waitingRoom'

export default function CalendarioPage() {
  const { orgId, branchId, org } = useOrg()
  // S154: Sin esto, toLocaleTimeString usa la TZ del browser (UTC en runners
  // headless, mountain/pacific en algunos clientes), no la TZ de la clínica.
  // Una cita 13:00 UTC para clínica Bogotá (08:00) aparecía como "06:00 a. m."
  // o cualquier hora dependiendo del browser del operador. Forzamos siempre
  // la TZ del org (cae a 'America/Bogota' si la config no la trae).
  const orgTz = ((org?.config_settings as { timezone?: string } | undefined)?.timezone) || 'America/Bogota'
  const t = useTranslations('calendar')
  const tCommon = useTranslations('common')
  const searchParams = useSearchParams()
  const initialTab: ActiveTab = (() => {
    const v = searchParams.get('tab')
    return v === 'waitingRoom' || v === 'waiting' || v === 'sala' ? 'waitingRoom' : 'calendar'
  })()
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [staffFilter, setStaffFilter] = useState<string>('')
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)
  const [selectedMLFeatures, setSelectedMLFeatures] = useState<PatientMLFeatures | null>(null)
  const [showNewAppt, setShowNewAppt] = useState(false)
  const [patients, setPatients] = useState<Patient[]>([])
  const [services, setServices] = useState<ServiceCatalog[]>([])
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [newAppt, setNewAppt] = useState({ patient_id: '', date: '', time: '09:00', service_name: '', duration: 60, staff_id: '' })

  // Reschedule state
  const [showReschedule, setShowReschedule] = useState(false)
  const [rescheduleData, setRescheduleData] = useState({ date: '', time: '09:00', reason: '' })
  const [rescheduleLoading, setRescheduleLoading] = useState(false)

  // Close modal on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSelectedAppt(null); setShowNewAppt(false); setShowReschedule(false) }
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [])

  // Load staff list on mount
  useEffect(() => {
    if (!orgId) return
    fetchStaffList(orgId).then((data) => setStaffList(data || [])).catch(() => {})
  }, [orgId])

  // Date range based on view
  const { fromDate, toDate } = useMemo(() => {
    const d = new Date(currentDate)
    if (viewMode === 'week') {
      const day = d.getDay()
      const diffToMonday = day === 0 ? 6 : day - 1
      const start = new Date(d)
      start.setDate(d.getDate() - diffToMonday)
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
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
        staffId: staffFilter || undefined,
      })
      setAppointments(data as unknown as Appointment[])
    } catch {
      // Appointments load failed
    }
    setLoading(false)
  }, [orgId, fromDate, toDate, statusFilter, staffFilter, branchId])

  useEffect(() => { loadAppointments() }, [loadAppointments])

  const handleSelectAppt = async (appt: Appointment) => {
    setSelectedAppt(appt)
    setSelectedMLFeatures(null)
    setShowReschedule(false)
    if (appt.patient_id) {
      try {
        const features = await fetchPatientMLFeatures(appt.patient_id)
        setSelectedMLFeatures(features as PatientMLFeatures | null)
      } catch { /* ML features may not exist */ }
    }
  }

  const openNewAppt = async () => {
    setShowNewAppt(true)
    if (orgId && patients.length === 0) {
      try {
        const [pats, svcs] = await Promise.all([
          fetchPatients(orgId, { limit: 100 }),
          fetchServicesCatalog(orgId),
        ])
        setPatients(pats.patients || [])
        setServices(svcs || [])
      } catch { /* Failed to load */ }
    }
  }

  const handleCreateAppt = async () => {
    if (!orgId || !newAppt.patient_id || !newAppt.date || !newAppt.service_name) return
    try {
      const start = `${newAppt.date}T${newAppt.time}:00`
      const endDate = new Date(`${newAppt.date}T${newAppt.time}:00`)
      endDate.setMinutes(endDate.getMinutes() + newAppt.duration)
      const end = endDate.toISOString()
      await createAppointment(orgId, {
        patient_id: newAppt.patient_id,
        start_time: start,
        end_time: end,
        service_name: newAppt.service_name,
        staff_id: newAppt.staff_id || undefined,
      })
      setShowNewAppt(false)
      setNewAppt({ patient_id: '', date: '', time: '09:00', service_name: '', duration: 60, staff_id: '' })
      loadAppointments()
    } catch { /* Create failed */ }
  }

  const handleReschedule = async () => {
    if (!selectedAppt || !rescheduleData.date || !rescheduleData.time) return
    setRescheduleLoading(true)
    try {
      const newStart = `${rescheduleData.date}T${rescheduleData.time}:00`
      await rescheduleAppointment(selectedAppt.id, {
        new_start_time: newStart,
        reason: rescheduleData.reason || t('rescheduledFromDashboard'),
      })
      setShowReschedule(false)
      setSelectedAppt(null)
      setRescheduleData({ date: '', time: '09:00', reason: '' })
      loadAppointments()
    } catch { /* Reschedule failed */ }
    setRescheduleLoading(false)
  }

  const handleAssignStaff = async (apptId: string, staffId: string | null) => {
    try {
      await assignStaff(apptId, staffId)
      loadAppointments()
      if (selectedAppt?.id === apptId) {
        setSelectedAppt({ ...selectedAppt, staff_id: staffId })
      }
    } catch { /* Assign failed */ }
  }

  const navigate = (dir: number) => {
    const d = new Date(currentDate)
    if (viewMode === 'week') d.setDate(d.getDate() + dir * 7)
    else d.setMonth(d.getMonth() + dir)
    setCurrentDate(d)
  }

  const goToday = () => setCurrentDate(new Date())

  // Staff name resolver
  const getStaffName = useCallback((staffId: string | null | undefined) => {
    if (!staffId) return null
    const staff = staffList.find((s) => s.id === staffId)
    return staff?.display_name || null
  }, [staffList])

  // Group appointments by date
  // S154: dateKey debe estar en la TZ del org. Sin esto, una cita 04 abril
  // 23:05 UTC (= 04 abril 18:05 Bogotá) sale clasificada como "05 abril"
  // por el toISOString. Operador ve la cita en el día equivocado.
  const dateKeyOf = (iso: string) => {
    const d = new Date(iso)
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: orgTz, year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(d)
    const y = parts.find(p => p.type === 'year')?.value
    const m = parts.find(p => p.type === 'month')?.value
    const day = parts.find(p => p.type === 'day')?.value
    return `${y}-${m}-${day}`
  }
  const groupedByDate = useMemo(() => {
    const groups: Record<string, Appointment[]> = {}
    appointments.forEach((a) => {
      const dateKey = dateKeyOf(a.start_time)
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(a)
    })
    return groups
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments, orgTz])

  // Generate day cells
  // S154: keys via componentes locales (getFullYear/getMonth/getDate) en vez
  // de toISOString. toISOString convierte la Date a UTC; para browsers al
  // este de UTC (ej. Tokyo +9), midnight local = previous day UTC → la cell
  // visualmente "4 abr" obtenía key "2026-04-03" y el match con appointments
  // fallaba. Componentes locales siempre matchean lo que se muestra.
  const dayKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const dayCells = useMemo(() => {
    const cells: { date: Date; key: string; isToday: boolean; isCurrentMonth: boolean }[] = []
    const todayDate = new Date()
    const today = dayKey(todayDate)

    if (viewMode === 'week') {
      for (let i = 0; i < 7; i++) {
        const d = new Date(fromDate)
        d.setDate(fromDate.getDate() + i)
        const key = dayKey(d)
        cells.push({ date: d, key, isToday: key === today, isCurrentMonth: true })
      }
    } else {
      const firstDay = new Date(fromDate)
      const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
      const start = new Date(firstDay)
      start.setDate(start.getDate() - startDay)

      for (let i = 0; i < 42; i++) {
        const d = new Date(start)
        d.setDate(start.getDate() + i)
        const key = dayKey(d)
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
    ? fromDate.getMonth() === toDate.getMonth()
      ? `${fromDate.getDate()} – ${toDate.getDate()} ${t(`months.${fromDate.getMonth()}`)} ${fromDate.getFullYear()}`
      : `${fromDate.getDate()} ${t(`months.${fromDate.getMonth()}`)} – ${toDate.getDate()} ${t(`months.${toDate.getMonth()}`)} ${toDate.getFullYear()}`
    : `${t(`months.${currentDate.getMonth()}`)} ${currentDate.getFullYear()}`

  return (
    <div className="max-w-[1200px] space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-mono font-bold uppercase tracking-wide text-text-primary">{t('title')}</h2>
          <p className="text-text-dim text-[11px] font-body mt-0.5">{t('appointmentsInPeriod', { count: appointments.length })}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Tab toggle */}
          <div className="flex bg-surface-2 rounded-lg border border-border p-0.5">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-3 py-1.5 rounded-md text-[12px] font-body font-semibold transition-colors flex items-center gap-1 ${
                activeTab === 'calendar' ? 'bg-brand-purple/15 text-brand-purple' : 'text-text-muted'
              }`}
            >
              <CalIcon size={11} />
              {t('title')}
            </button>
            <button
              onClick={() => setActiveTab('waitingRoom')}
              className={`px-3 py-1.5 rounded-md text-[12px] font-body font-semibold transition-colors flex items-center gap-1 ${
                activeTab === 'waitingRoom' ? 'bg-brand-purple/15 text-brand-purple' : 'text-text-muted'
              }`}
            >
              <Users size={11} />
              {t('waitingRoom')}
            </button>
          </div>

          {/* Staff filter */}
          {staffList.length > 0 && (
            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="px-3 py-1.5 rounded-md bg-surface-2 border border-border text-text-muted text-[12px] font-body outline-none"
            >
              <option value="">{t('allStaff')}</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>{s.display_name || s.role}</option>
              ))}
            </select>
          )}

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-md bg-surface-2 border border-border text-text-muted text-[12px] font-body outline-none"
          >
            <option value="">{t('allStatuses')}</option>
            {STATUS_KEYS.map((key) => (
              <option key={key} value={key}>{t(`statuses.${key}`)}</option>
            ))}
          </select>

          {/* View toggle */}
          {(['week', 'month'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 rounded-md text-[12px] font-body font-semibold transition-all ${
                viewMode === mode
                  ? 'bg-brand-purple/15 text-brand-purple border border-brand-purple/25'
                  : 'bg-surface-2 text-text-muted border border-border hover:border-border-2'
              }`}
            >
              {mode === 'week' ? t('week') : t('month')}
            </button>
          ))}

          <button onClick={loadAppointments} aria-label={tCommon('refresh')} className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          {/* CRUD removido: agendar cita vive SOLO en Pulso (SofIA). */}
        </div>
      </div>

      {/* WAITING ROOM VIEW */}
      {activeTab === 'waitingRoom' && (
        <WaitingRoomPanel orgId={orgId} />
      )}

      {/* CALENDAR VIEW — only when on calendar tab */}
      {activeTab !== 'calendar' ? null : (
      <>
      {/* NAV */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => navigate(1)} className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
            <ChevronRight size={16} />
          </button>
          <button onClick={goToday} className="px-3 py-1.5 rounded-md bg-surface-2 border border-border text-text-muted text-[12px] font-body font-semibold hover:text-text-primary transition-colors">
            {t('today')}
          </button>
        </div>
        <h3 className="text-xs font-body font-semibold text-text-primary">{headerLabel}</h3>
      </div>

      {/* NEW APPOINTMENT FORM */}
      {/* CALENDAR GRID */}
      <div className="glass-card overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {DAY_KEYS.map((d) => (
            <div key={d} className="text-center text-[11px] font-body font-semibold text-text-muted uppercase tracking-wider py-2 border-r border-border last:border-r-0">
              {t(`days.${d}`)}
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
                <div className={`text-[12px] font-body font-semibold mb-1 px-1 ${
                  cell.isToday ? 'text-brand-purple' : cell.isCurrentMonth ? 'text-text-secondary' : 'text-text-dim'
                }`}>
                  {cell.isToday && <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-purple mr-1 mb-0.5" />}
                  {cell.date.getDate()}
                </div>

                <div className="space-y-0.5">
                  {dayAppts.slice(0, viewMode === 'week' ? 20 : 3).map((appt) => {
                    const cfg = STATUS_STYLE[appt.status] || STATUS_STYLE.REQUESTED
                    const time = new Date(appt.start_time).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: orgTz })
                    const patientName = appt.patients?.full_name || t('noName')
                    const staffName = getStaffName(appt.staff_id)
                    return (
                      <button
                        key={appt.id}
                        onClick={() => handleSelectAppt(appt)}
                        className={`w-full text-left px-1.5 py-1 rounded-md border text-[10px] leading-tight truncate transition-all hover:scale-[1.02] ${cfg.bg}`}
                      >
                        <span className={`font-semibold ${cfg.color}`}>{time}</span>
                        <span className="text-text-muted ml-1 truncate">
                          {viewMode === 'week'
                            ? `${patientName}${staffName ? ` · ${staffName}` : ''} — ${appt.service_name || ''}`
                            : patientName
                          }
                        </span>
                      </button>
                    )
                  })}
                  {dayAppts.length > (viewMode === 'week' ? 20 : 3) && (
                    <div className="text-[9px] text-text-dim px-1">{t('more', { count: dayAppts.length - (viewMode === 'week' ? 20 : 3) })}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Status legend */}
      <div className="flex gap-3 flex-wrap justify-center">
        {STATUS_KEYS.map((key) => (
          <div key={key} className="flex items-center gap-1.5 text-[11px] font-body text-text-muted">
            <div className={`w-2 h-2 rounded-full ${STATUS_STYLE[key].color.replace('text-', 'bg-')}`} />
            {t(`statuses.${key}`)}
          </div>
        ))}
      </div>
      </>
      )}

      {/* ========== APPOINTMENT DETAIL MODAL ========== */}
      {selectedAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setSelectedAppt(null); setShowReschedule(false) }} />
          <div className="relative glass-card-elevated w-full max-w-md p-5 space-y-3 animate-fade-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-body font-semibold uppercase tracking-wide text-text-primary">{t('appointmentDetail')}</h3>
              <button onClick={() => { setSelectedAppt(null); setShowReschedule(false) }} className="w-7 h-7 rounded-lg bg-surface-3 flex items-center justify-center text-text-dim hover:text-text-primary transition-colors">
                <X size={14} />
              </button>
            </div>

            {/* Status + No-show badge */}
            {(() => {
              const cfg = STATUS_STYLE[selectedAppt.status] || STATUS_STYLE.REQUESTED
              const StatusIcon = cfg.icon
              return (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${cfg.bg}`}>
                    <StatusIcon size={11} className={cfg.color} />
                    <span className={`text-[12px] font-body font-semibold ${cfg.color}`}>{t(`statuses.${selectedAppt.status}`)}</span>
                  </div>
                  {selectedMLFeatures?.no_show_probability != null && selectedAppt.status !== 'COMPLETED' && selectedAppt.status !== 'CANCELLED' && (
                    <NoShowBadge probability={selectedMLFeatures.no_show_probability} />
                  )}
                  {selectedAppt.series_id && (
                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full border bg-brand-cyan/10 border-brand-cyan/20 text-brand-cyan text-[10px] font-semibold">
                      <Repeat size={10} /> {t('series')}
                    </div>
                  )}
                </div>
              )
            })()}

            <div className="space-y-3">
              <ApptRow icon={<User size={14} />} label={t('patientRequired').replace(' *', '')} value={selectedAppt.patients?.full_name || t('noName')} />
              <ApptRow icon={<CalIcon size={14} />} label={tCommon('date')} value={new Date(selectedAppt.start_time).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: orgTz })} />
              <ApptRow icon={<Clock size={14} />} label={t('timeRequired').replace(' *', '')} value={`${new Date(selectedAppt.start_time).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: orgTz })}${selectedAppt.end_time ? ` — ${new Date(selectedAppt.end_time).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: orgTz })}` : ''}`} />
              <ApptRow icon={<Eye size={14} />} label={t('service')} value={selectedAppt.service_name || '—'} />

              {/* Staff assignment */}
              <div className="flex items-start gap-3">
                <span className="text-text-dim mt-0.5"><UserCheck size={14} /></span>
                <div className="flex-1">
                  <div className="text-[10px] text-text-dim uppercase">{t('staff')}</div>
                  {staffList.length > 0 ? (
                    <select
                      value={selectedAppt.staff_id || ''}
                      onChange={(e) => handleAssignStaff(selectedAppt.id, e.target.value || null)}
                      className="mt-0.5 px-2 py-1 rounded-lg bg-void border border-border text-text-primary text-sm outline-none w-full"
                    >
                      <option value="">{t('unassigned')}</option>
                      {staffList.map((s) => (
                        <option key={s.id} value={s.id}>{s.display_name || s.role}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-xs font-body text-text-primary">{getStaffName(selectedAppt.staff_id) || t('unassigned')}</div>
                  )}
                </div>
              </div>

              {/* Previous time (if rescheduled) */}
              {selectedAppt.previous_start_time && (
                <div className="flex items-start gap-3">
                  <span className="text-text-dim mt-0.5"><ArrowRightLeft size={14} /></span>
                  <div>
                    <div className="text-[10px] text-text-dim uppercase">{t('previousTime')}</div>
                    <div className="text-xs font-body text-text-muted line-through">
                      {new Date(selectedAppt.previous_start_time).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: orgTz })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-border text-[11px] font-body text-text-dim">
              {t('created', { time: timeAgo(selectedAppt.created_at) })}
            </div>

            {/* RESCHEDULE FORM */}
            {showReschedule && (
              <div className="p-3 rounded-lg bg-brand-gold/5 border border-brand-gold/20 space-y-2">
                <h4 className="text-xs font-semibold text-brand-gold">{t('rescheduleTitle')}</h4>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={rescheduleData.date} onChange={(e) => setRescheduleData({...rescheduleData, date: e.target.value})} className="px-2 py-1.5 rounded-lg bg-void border border-border text-text-primary text-sm outline-none" />
                  <input type="time" value={rescheduleData.time} onChange={(e) => setRescheduleData({...rescheduleData, time: e.target.value})} className="px-2 py-1.5 rounded-lg bg-void border border-border text-text-primary text-sm outline-none" />
                </div>
                <input type="text" placeholder={t('reasonOptional')} value={rescheduleData.reason} onChange={(e) => setRescheduleData({...rescheduleData, reason: e.target.value})} className="w-full px-2 py-1.5 rounded-lg bg-void border border-border text-text-primary text-sm outline-none" />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowReschedule(false)} className="px-2 py-1 rounded-lg bg-surface-3 text-text-muted text-xs">{tCommon('cancel')}</button>
                  <button onClick={handleReschedule} disabled={!rescheduleData.date || rescheduleLoading} className="px-3 py-1 rounded-lg bg-brand-gold/15 text-brand-gold text-xs font-semibold disabled:opacity-50">
                    {rescheduleLoading ? t('rescheduling') : tCommon('confirm')}
                  </button>
                </div>
              </div>
            )}

            {/* STATUS ACTIONS */}
            {selectedAppt.status !== 'COMPLETED' && selectedAppt.status !== 'CANCELLED' && (
              <div className="pt-3 border-t border-border flex gap-2 flex-wrap">
                <button
                  onClick={async () => { await updateAppointmentStatus(selectedAppt.id, 'COMPLETED'); setSelectedAppt(null); loadAppointments() }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-status-success/10 border border-status-success/20 text-status-success text-[12px] font-body font-semibold hover:bg-status-success/20 transition-colors"
                >
                  <CheckCircle size={12} /> {t('completed')}
                </button>
                <button
                  onClick={() => { setShowReschedule(!showReschedule); setRescheduleData({ date: '', time: '09:00', reason: '' }) }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-[12px] font-body font-semibold hover:bg-brand-gold/20 transition-colors"
                >
                  <CalIcon size={12} /> {t('reschedule')}
                </button>
                <button
                  onClick={async () => { await updateAppointmentStatus(selectedAppt.id, 'NO_SHOW'); setSelectedAppt(null); loadAppointments() }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-status-warning/10 border border-status-warning/20 text-status-warning text-[12px] font-body font-semibold hover:bg-status-warning/20 transition-colors"
                >
                  <AlertTriangle size={12} /> {t('noShowAction')}
                </button>
                <button
                  onClick={async () => { await updateAppointmentStatus(selectedAppt.id, 'CANCELLED', t('cancelledFromDashboard')); setSelectedAppt(null); loadAppointments() }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-status-danger/10 border border-status-danger/20 text-status-danger text-[12px] font-body font-semibold hover:bg-status-danger/20 transition-colors"
                >
                  <XCircle size={12} /> {t('cancelAction')}
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
// No-Show Risk Badge
// ============================================================

function NoShowBadge({ probability }: { probability: number }) {
  const t = useTranslations('calendar')
  const pct = Math.round(probability * 100)
  const color = probability > 0.6
    ? 'text-status-danger bg-status-danger/10 border-status-danger/20'
    : probability > 0.3
      ? 'text-status-warning bg-status-warning/10 border-status-warning/20'
      : 'text-status-success bg-status-success/10 border-status-success/20'
  const label = probability > 0.6
    ? t('highRisk')
    : probability > 0.3
      ? t('mediumRisk')
      : t('lowRisk')

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] font-body font-semibold ${color}`}>
      <TrendingDown size={10} />
      {t('noShowRisk')}: {label} ({pct}%)
    </div>
  )
}

function ApptRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-text-dim mt-0.5">{icon}</span>
      <div>
        <div className="text-[11px] font-body text-text-dim uppercase tracking-wide">{label}</div>
        <div className="text-xs font-body text-text-primary">{value}</div>
      </div>
    </div>
  )
}
