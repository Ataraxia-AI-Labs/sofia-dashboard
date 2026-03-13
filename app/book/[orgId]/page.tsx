'use client'

import { useState, useEffect, useCallback } from 'react'
import { Calendar, Clock, MapPin, Phone, ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL!

interface ClinicInfo { name: string; specialty: string; city: string; address: string; phone: string; booking_enabled: boolean }
interface Service { id: string; name: string; price: number; duration_minutes: number; category: string; description: string | null; requires_deposit: boolean; deposit_amount: number }
interface DayHours { day: number; day_name: string; open_time: string; close_time: string; is_open: boolean }

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

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
  const [step, setStep] = useState(0) // 0=services, 1=date, 2=time, 3=info, 4=done
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

  // Which days of week are open?
  const openDays = new Set(hours.filter(h => h.is_open).map(h => h.day))

  const isDayAvailable = (day: number) => {
    const d = new Date(calYear, calMonth, day)
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (dateStr < todayStr) return false
    // JS: 0=Sun..6=Sat → our backend: 0=Mon..6=Sun
    const jsDow = d.getDay()
    const backendDow = jsDow === 0 ? 6 : jsDow - 1
    return openDays.has(backendDow)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
    </div>
  )

  if (!clinic || !clinic.booking_enabled) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-500">Esta clínica no tiene reservas en línea habilitadas.</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{clinic.name}</h1>
          {clinic.specialty && <p className="text-gray-500 text-sm">{clinic.specialty}</p>}
          {clinic.city && <p className="text-gray-400 text-xs flex items-center justify-center gap-1 mt-1"><MapPin className="w-3 h-3" />{clinic.city}{clinic.address ? ` · ${clinic.address}` : ''}</p>}
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {['Servicio', 'Fecha', 'Hora', 'Datos'].map((label, i) => (
            <div key={label} className="flex items-center gap-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${step > i ? 'bg-purple-600 text-white' : step === i ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-600' : 'bg-gray-200 text-gray-500'}`}>
                {step > i ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              {i < 3 && <div className={`w-6 h-0.5 ${step > i ? 'bg-purple-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

        {/* Step 0: Services */}
        {step === 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-800">Selecciona un servicio</h2>
            {services.map(svc => (
              <button key={svc.id} onClick={() => { setSelectedService(svc); setStep(1) }}
                className="w-full text-left p-4 bg-white rounded-xl border border-gray-200 hover:border-purple-400 hover:shadow-sm transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">{svc.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{svc.duration_minutes} min · {svc.category}</p>
                    {svc.description && <p className="text-xs text-gray-400 mt-1">{svc.description}</p>}
                  </div>
                  <span className="text-purple-600 font-semibold text-sm whitespace-nowrap">{formatCOP(svc.price)}</span>
                </div>
                {svc.requires_deposit && <p className="text-xs text-amber-600 mt-2">Requiere anticipo: {formatCOP(svc.deposit_amount)}</p>}
              </button>
            ))}
            {services.length === 0 && <p className="text-gray-400 text-center py-8">No hay servicios disponibles.</p>}
          </div>
        )}

        {/* Step 1: Calendar */}
        {step === 1 && (
          <div>
            <button onClick={() => setStep(0)} className="text-sm text-purple-600 mb-3 flex items-center gap-1"><ChevronLeft className="w-4 h-4" />Cambiar servicio</button>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Selecciona una fecha</h2>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) } else setCalMonth(m => m - 1) }} className="p-1 hover:bg-gray-100 rounded"><ChevronLeft className="w-5 h-5" /></button>
                <span className="font-medium">{new Date(calYear, calMonth).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}</span>
                <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) } else setCalMonth(m => m + 1) }} className="p-1 hover:bg-gray-100 rounded"><ChevronRight className="w-5 h-5" /></button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-2">
                {DAYS.map(d => <div key={d}>{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {getMonthDays(calYear, calMonth).map((day, i) => (
                  <div key={i}>
                    {day ? (
                      <button disabled={!isDayAvailable(day)} onClick={() => handleDateSelect(day)}
                        className={`w-full aspect-square rounded-lg text-sm flex items-center justify-center ${isDayAvailable(day) ? 'hover:bg-purple-100 hover:text-purple-700 cursor-pointer' : 'text-gray-300 cursor-not-allowed'} ${selectedDate === `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` ? 'bg-purple-600 text-white' : ''}`}>
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
          <div>
            <button onClick={() => { setStep(1); setSelectedSlot('') }} className="text-sm text-purple-600 mb-3 flex items-center gap-1"><ChevronLeft className="w-4 h-4" />Cambiar fecha</button>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Selecciona una hora</h2>
            <p className="text-sm text-gray-500 mb-3 flex items-center gap-1"><Calendar className="w-4 h-4" />{selectedDate}</p>
            {slotsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-purple-600" /></div>
            ) : availableSlots.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No hay horarios disponibles para esta fecha.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {availableSlots.map(slot => (
                  <button key={slot} onClick={() => { setSelectedSlot(slot); setStep(3) }}
                    className={`p-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-1 transition-all ${selectedSlot === slot ? 'bg-purple-600 text-white border-purple-600' : 'bg-white border-gray-200 hover:border-purple-400 text-gray-700'}`}>
                    <Clock className="w-3.5 h-3.5" />{slot}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Patient info */}
        {step === 3 && (
          <div>
            <button onClick={() => setStep(2)} className="text-sm text-purple-600 mb-3 flex items-center gap-1"><ChevronLeft className="w-4 h-4" />Cambiar hora</button>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Tus datos</h2>
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
              <p className="text-sm text-gray-600"><strong>{selectedService?.name}</strong></p>
              <p className="text-xs text-gray-500">{selectedDate} a las {selectedSlot}</p>
            </div>
            <div className="space-y-3">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre completo *" className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-500" />
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Teléfono / WhatsApp *" className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-500" />
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email (opcional)" type="email" className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-500" />
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas adicionales (opcional)" rows={2} className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-500 resize-none" />
              <button onClick={handleSubmit} disabled={submitting || !name.trim() || !phone.trim()}
                className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Reservando...</> : 'Confirmar Reserva'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && result && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Reserva Solicitada</h2>
            <p className="text-gray-600 text-sm mb-4">{result.message}</p>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-left text-sm space-y-1">
              <p><strong>Servicio:</strong> {selectedService?.name}</p>
              <p><strong>Fecha:</strong> {selectedDate} a las {selectedSlot}</p>
              <p><strong>Paciente:</strong> {name}</p>
              {clinic.phone && <p className="flex items-center gap-1 text-gray-500 mt-2"><Phone className="w-3.5 h-3.5" />{clinic.phone}</p>}
            </div>
            <button onClick={() => { setStep(0); setSelectedService(null); setSelectedDate(''); setSelectedSlot(''); setResult(null); setName(''); setPhone(''); setEmail(''); setNotes('') }}
              className="mt-6 text-purple-600 text-sm font-medium hover:underline">Hacer otra reserva</button>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-8">Powered by <a href="https://ataraxiaialabs.ai" className="text-purple-500 hover:underline" target="_blank" rel="noopener">SofIA</a></p>
      </div>
    </div>
  )
}
