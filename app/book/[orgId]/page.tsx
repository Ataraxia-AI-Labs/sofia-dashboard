'use client'

import { useState, useEffect, useCallback } from 'react'
import { Calendar, Clock, MapPin, Phone, ChevronLeft, ChevronRight, Check, Loader2, User } from 'lucide-react'
import { AtaraxiaLogo, AtaraxiaLogoCompact } from '@/components/ataraxia-logo'

const API = process.env.NEXT_PUBLIC_API_URL!

interface ClinicInfo { name: string; specialty: string; city: string; address: string; phone: string; booking_enabled: boolean }
interface Service { id: string; name: string; price: number; duration_minutes: number; category: string; description: string | null; requires_deposit: boolean; deposit_amount: number }
interface DayHours { day: number; day_name: string; open_time: string; close_time: string; is_open: boolean }

const DAYS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']

function formatCOP(n: number) { return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n) }

function getMonthDays(year: number, month: number) {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const days: (number | null)[] = []
  const startDay = first.getDay()
  for (let i = 0; i < startDay; i++) days.push(null)
  for (let d = 1; d <= last.getDate(); d++) days.push(d)
  return days
}

export default function BookingPage({ params }: { params: { orgId: string } }) {
  const { orgId } = params
  const [step, setStep] = useState(0)
  const [clinic, setClinic] = useState<ClinicInfo | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [hours, setHours] = useState<DayHours[]>([])
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState('')
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ appointment_id: string; message: string } | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calYear, setCalYear] = useState(new Date().getFullYear())

  useEffect(() => {
    Promise.all([
      fetch(`${API}/book/${orgId}/info`).then(r => r.ok ? r.json() : null),
      fetch(`${API}/book/${orgId}/services`).then(r => r.ok ? r.json() : null),
      fetch(`${API}/book/${orgId}/hours`).then(r => r.ok ? r.json() : null),
    ]).then(([info, svc, hrs]) => {
      setClinic(info)
      setServices(svc?.services || [])
      setHours(hrs?.hours || [])
      setLoading(false)
    }).catch(() => { setError('No se pudo cargar la información de la clínica'); setLoading(false) })
  }, [orgId])

  const fetchSlots = useCallback(async (date: string) => {
    setSlotsLoading(true)
    try {
      const res = await fetch(`${API}/book/${orgId}/availability?date=${date}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setAvailableSlots(data.available_slots || [])
    } catch { setAvailableSlots([]) }
    setSlotsLoading(false)
  }, [orgId])

  const handleDateSelect = (day: number) => {
    const date = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setSelectedDate(date)
    setSelectedSlot('')
    fetchSlots(date)
    setStep(2)
  }

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) { setError('Nombre y teléfono son obligatorios'); return }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`${API}/book/${orgId}/appointment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_name: name,
          patient_phone: phone,
          patient_email: email || null,
          service_name: selectedService!.name,
          start_time: `${selectedDate}T${selectedSlot}:00`,
          notes: notes || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'Error al reservar')
      }
      const data = await res.json()
      setResult(data)
      setStep(4)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al reservar')
    }
    setSubmitting(false)
  }

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const openDays = new Set(hours.filter(h => h.is_open).map(h => h.day))

  const isDayAvailable = (day: number) => {
    const d = new Date(calYear, calMonth, day)
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (dateStr < todayStr) return false
    const jsDow = d.getDay()
    const backendDow = jsDow === 0 ? 6 : jsDow - 1
    return openDays.has(backendDow)
  }

  if (loading) return (
    <div className="min-h-screen bg-void flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="w-5 h-5 border-2 border-brand-purple/30 border-t-brand-purple rounded-full animate-spin" />
        <p className="text-text-dim text-[12px] font-body">Cargando...</p>
      </div>
    </div>
  )

  if (!clinic || !clinic.booking_enabled) return (
    <div className="min-h-screen bg-void flex items-center justify-center px-4">
      <div className="text-center">
        <div className="mx-auto mb-3 opacity-50 flex justify-center">
          <AtaraxiaLogoCompact size={40} />
        </div>
        <p className="text-text-muted text-xs font-body">Esta clínica no tiene reservas en línea habilitadas.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-void py-6 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-5">
          <div className="mx-auto mb-2 flex justify-center">
            <AtaraxiaLogo size={40} ambient={false} />
          </div>
          <h1 className="text-xl font-bold text-white font-body">{clinic.name}</h1>
          {clinic.specialty && <p className="text-text-muted text-[12px] font-body mt-0.5">{clinic.specialty}</p>}
          {clinic.city && (
            <p className="text-text-dim text-[12px] font-body flex items-center justify-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" />{clinic.city}{clinic.address ? ` · ${clinic.address}` : ''}
            </p>
          )}
        </div>

        {/* Progress pipeline */}
        <div className="flex items-center justify-center gap-1 mb-5">
          {['Servicio', 'Fecha', 'Hora', 'Datos'].map((label, i) => (
            <div key={label} className="flex items-center gap-1">
              <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[12px] font-body font-medium transition-all ${
                step > i ? 'bg-brand-purple text-white'
                : step === i ? 'text-brand-purple border border-brand-purple' : 'bg-surface text-text-dim border border-border'
              }`} style={step === i ? { background: 'rgba(139, 92, 246, 0.08)' } : {}}>
                {step > i ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              {i < 3 && <div className={`w-4 h-0.5 transition-colors ${step > i ? 'bg-brand-purple' : 'bg-border'}`} />}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-3 p-2.5 rounded-md text-status-danger text-xs font-body"
            style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
            {error}
          </div>
        )}

        {/* Step 0: Services */}
        {step === 0 && (
          <div className="space-y-2" style={{ animation: 'fadeUp 0.3s ease-out' }}>
            <h2 className="text-sm font-semibold text-white font-body mb-1">Selecciona un servicio</h2>
            {services.map(svc => (
              <button key={svc.id} onClick={() => { setSelectedService(svc); setStep(1) }}
                className="w-full text-left p-3 bg-surface rounded-md border border-border hover:border-brand-purple/30 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium font-body text-xs text-white">{svc.name}</p>
                    <p className="text-[12px] font-body text-text-dim mt-0.5">{svc.duration_minutes} min · {svc.category}</p>
                    {svc.description && <p className="text-[12px] font-body text-text-dim mt-0.5">{svc.description}</p>}
                  </div>
                  <span className="text-brand-purple font-semibold text-xs font-body whitespace-nowrap">{formatCOP(svc.price)}</span>
                </div>
                {svc.requires_deposit && <p className="text-[12px] font-body text-status-warning mt-1.5">Requiere anticipo: {formatCOP(svc.deposit_amount)}</p>}
              </button>
            ))}
            {services.length === 0 && <p className="text-text-dim text-[12px] font-body text-center py-6">No hay servicios disponibles.</p>}
          </div>
        )}

        {/* Step 1: Calendar */}
        {step === 1 && (
          <div style={{ animation: 'fadeUp 0.3s ease-out' }}>
            <button onClick={() => setStep(0)} className="text-xs font-body text-brand-purple mb-2 flex items-center gap-1"><ChevronLeft className="w-3.5 h-3.5" />Cambiar servicio</button>
            <h2 className="text-sm font-semibold text-white font-body mb-2">Selecciona una fecha</h2>
            <div className="bg-surface rounded-md border border-border p-3">
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) } else setCalMonth(m => m - 1) }} className="p-1 hover:bg-surface-2 rounded-md transition-colors"><ChevronLeft className="w-4 h-4 text-text-muted" /></button>
                <span className="font-medium text-xs font-body text-white capitalize">{new Date(calYear, calMonth).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}</span>
                <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) } else setCalMonth(m => m + 1) }} className="p-1 hover:bg-surface-2 rounded-md transition-colors"><ChevronRight className="w-4 h-4 text-text-muted" /></button>
              </div>
              <div className="grid grid-cols-7 gap-0.5 text-center text-[12px] font-body text-text-dim mb-1.5">
                {DAYS.map(d => <div key={d}>{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {getMonthDays(calYear, calMonth).map((day, i) => (
                  <div key={i}>
                    {day ? (
                      <button disabled={!isDayAvailable(day)} onClick={() => handleDateSelect(day)}
                        className={`w-full aspect-square rounded-md text-xs font-body flex items-center justify-center transition-all ${
                          isDayAvailable(day) ? 'hover:text-brand-purple cursor-pointer text-text-muted' : 'text-text-dim/30 cursor-not-allowed'
                        } ${selectedDate === `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` ? 'bg-brand-purple text-white' : ''}`}
                        style={isDayAvailable(day) && selectedDate !== `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` ? {} : {}}>
                        {day}
                      </button>
                    ) : <div />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Time slots */}
        {step === 2 && (
          <div style={{ animation: 'fadeUp 0.3s ease-out' }}>
            <button onClick={() => { setStep(1); setSelectedSlot('') }} className="text-xs font-body text-brand-purple mb-2 flex items-center gap-1"><ChevronLeft className="w-3.5 h-3.5" />Cambiar fecha</button>
            <h2 className="text-sm font-semibold text-white font-body mb-0.5">Selecciona una hora</h2>
            <p className="text-xs font-body text-text-muted mb-2 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{selectedDate}</p>
            {slotsLoading ? (
              <div className="flex justify-center py-6">
                <div className="w-5 h-5 border-2 border-brand-purple/30 border-t-brand-purple rounded-full animate-spin" />
              </div>
            ) : availableSlots.length === 0 ? (
              <p className="text-text-dim text-[12px] font-body text-center py-6">No hay horarios disponibles para esta fecha.</p>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {availableSlots.map(slot => (
                  <button key={slot} onClick={() => { setSelectedSlot(slot); setStep(3) }}
                    className={`p-2.5 rounded-md border text-xs font-body font-medium flex items-center justify-center gap-1 transition-all ${
                      selectedSlot === slot ? 'bg-brand-purple text-white border-brand-purple' : 'bg-surface border-border hover:border-brand-purple/30 text-text-muted'
                    }`}>
                    <Clock className="w-3 h-3" />{slot}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Patient info */}
        {step === 3 && (
          <div style={{ animation: 'fadeUp 0.3s ease-out' }}>
            <button onClick={() => setStep(2)} className="text-xs font-body text-brand-purple mb-2 flex items-center gap-1"><ChevronLeft className="w-3.5 h-3.5" />Cambiar hora</button>
            <h2 className="text-sm font-semibold text-white font-body mb-2">Tus datos</h2>
            <div className="bg-surface rounded-md border border-border p-3 mb-3">
              <p className="text-xs font-body text-white font-medium">{selectedService?.name}</p>
              <p className="text-[12px] font-body text-text-dim">{selectedDate} a las {selectedSlot}</p>
            </div>
            <div className="space-y-2">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre completo *"
                className="w-full p-2.5 border border-border bg-surface rounded-md text-xs font-body text-white placeholder:text-text-dim focus:outline-none focus:border-brand-purple/50 transition-colors" />
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Teléfono / WhatsApp *"
                className="w-full p-2.5 border border-border bg-surface rounded-md text-xs font-body text-white placeholder:text-text-dim focus:outline-none focus:border-brand-purple/50 transition-colors" />
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email (opcional)" type="email"
                className="w-full p-2.5 border border-border bg-surface rounded-md text-xs font-body text-white placeholder:text-text-dim focus:outline-none focus:border-brand-purple/50 transition-colors" />
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas adicionales (opcional)" rows={2}
                className="w-full p-2.5 border border-border bg-surface rounded-md text-xs font-body text-white placeholder:text-text-dim focus:outline-none focus:border-brand-purple/50 resize-none transition-colors" />
              <button onClick={handleSubmit} disabled={submitting || !name.trim() || !phone.trim()}
                className="w-full py-2.5 bg-brand-purple text-white rounded-md font-medium text-xs font-body hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {submitting ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Reservando...</> : 'Confirmar Reserva'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && result && (
          <div className="text-center py-6" style={{ animation: 'fadeUp 0.3s ease-out' }}>
            <div className="relative w-14 h-14 mx-auto mb-3">
              <div className="absolute inset-0 rounded-full border border-status-success/20 animate-sentient-breathe" />
              <div className="absolute inset-2 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(6, 214, 160, 0.1)' }}>
                <Check className="w-5 h-5 text-status-success" />
              </div>
            </div>
            <h2 className="text-lg font-bold text-white font-body mb-1">Reserva Solicitada</h2>
            <p className="text-text-muted text-xs font-body mb-3">{result.message}</p>
            <div className="bg-surface rounded-md border border-border p-3 text-left text-xs font-body space-y-1">
              <div className="flex justify-between">
                <span className="text-text-dim">Servicio</span>
                <span className="text-white font-medium">{selectedService?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-dim">Fecha</span>
                <span className="text-white font-medium">{selectedDate} · {selectedSlot}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-dim">Paciente</span>
                <span className="text-white font-medium">{name}</span>
              </div>
              {clinic.phone && (
                <div className="flex items-center gap-1 text-text-dim mt-1.5 pt-1.5 border-t border-border">
                  <Phone className="w-3 h-3" />{clinic.phone}
                </div>
              )}
            </div>
            <button onClick={() => { setStep(0); setSelectedService(null); setSelectedDate(''); setSelectedSlot(''); setResult(null); setName(''); setPhone(''); setEmail(''); setNotes('') }}
              className="mt-5 text-brand-purple text-xs font-body font-medium hover:brightness-125 transition-colors">
              Hacer otra reserva
            </button>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-[11px] font-body text-text-dim mt-8">
          Powered by <a href="https://ataraxiaialabs.ai" className="text-brand-purple hover:brightness-125" target="_blank" rel="noopener">SofIA</a>
        </p>
      </div>
    </div>
  )
}
