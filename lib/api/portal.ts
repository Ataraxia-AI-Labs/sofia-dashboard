import type { PortalData } from '@/types'

// ============================================================
// PATIENT PORTAL API (P5-08) — PUBLIC (no auth)
// ============================================================

const API = process.env.NEXT_PUBLIC_API_URL!

// S154: las citas vienen como ISO UTC desde Postgres. Antes usábamos
// dt.toISOString().split('T')[0] que devuelve la fecha en UTC — para un
// paciente en Bogotá (UTC-5) una cita "2026-05-08T03:00:00Z" se rendereaba
// como "8 de mayo" cuando en local es "7 de mayo, 22:00". Convertimos a
// componentes locales para que la fecha + la hora siempre cuadren con el
// reloj del paciente. Misma familia que el fix DOB del patient panel.
function localYMD(dt: Date): string {
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const d = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function localHM(dt: Date): string {
  const h = String(dt.getHours()).padStart(2, '0')
  const m = String(dt.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

function mapPortalData(raw: Record<string, unknown>): PortalData {
  const pi = (raw.patient_info ?? {}) as Record<string, unknown>
  const rawAppts = (raw.upcoming_appointments ?? []) as Record<string, unknown>[]
  const rawHistory = (raw.appointment_history ?? []) as Record<string, unknown>[]
  const rawInvoices = (raw.invoices ?? raw.payments ?? []) as Record<string, unknown>[]
  const rawGam = (raw.gamification ?? {}) as Record<string, unknown>
  const rawRef = (raw.referral_code ?? raw.referral ?? {}) as Record<string, unknown>
  const rawTreatments = (raw.treatments ?? []) as Record<string, unknown>[]
  const progress = (rawGam.progress_to_next_tier ?? {}) as Record<string, unknown>

  return {
    patient_info: {
      name: (pi.full_name ?? pi.name ?? '') as string,
      phone: (pi.phone ?? '') as string,
      email: (pi.email ?? '') as string,
    },
    clinic_name: (raw.clinic_name ?? raw.org_name ?? '') as string,
    clinic_phone: (raw.clinic_phone ?? raw.org_phone ?? '') as string,
    upcoming_appointments: rawAppts.map(a => {
      const startTime = (a.start_time ?? a.date ?? '') as string
      const dt = startTime ? new Date(startTime) : null
      return {
        id: (a.id ?? '') as string,
        date: dt ? localYMD(dt) : (a.date ?? '') as string,
        time: dt ? localHM(dt) : (a.time ?? '') as string,
        doctor: (a.doctor_name ?? a.doctor ?? a.doctor_id ?? '') as string,
        service: (a.service_name ?? a.service ?? '') as string,
        status: (a.status ?? '') as string,
      }
    }),
    appointment_history: rawHistory.map(a => {
      const startTime = (a.start_time ?? a.date ?? '') as string
      const dt = startTime ? new Date(startTime) : null
      return {
        date: dt ? localYMD(dt) : (a.date ?? '') as string,
        service: (a.service_name ?? a.service ?? '') as string,
        doctor: (a.doctor_name ?? a.doctor ?? a.doctor_id ?? '') as string,
      }
    }),
    treatments: rawTreatments.map(t => ({
      id: (t.id ?? '') as string,
      name: (t.treatment_name ?? t.name ?? '') as string,
      treatment_name: (t.treatment_name ?? t.name ?? '') as string,
      medication: (t.medication ?? '') as string,
      dosage: (t.dosage ?? '') as string,
      frequency_hours: (t.frequency_hours ?? 0) as number,
      start_date: (t.start_date ?? t.date ?? '') as string,
      end_date: (t.end_date ?? null) as string | null,
      status: (t.status ?? 'ACTIVE') as string,
      notes: (t.notes ?? null) as string | null,
    })),
    payments: rawInvoices.map(p => ({
      id: (p.id ?? '') as string,
      date: (p.created_at ?? p.date ?? '') as string,
      amount: (p.amount ?? p.amount_cop ?? 0) as number,
      status: (p.status ?? 'PENDING') as 'PAID' | 'PENDING',
      description: (p.description ?? '') as string,
    })),
    gamification: {
      total_points: (rawGam.total_points ?? 0) as number,
      tier: (rawGam.tier ?? 'BRONZE') as string,
      streak_months: (rawGam.streak_months ?? 0) as number,
      points_to_next_tier: (progress.points_needed ?? rawGam.points_to_next_tier ?? 0) as number,
      next_tier: (progress.next_tier ?? rawGam.next_tier ?? null) as string | null,
      recent_actions: ((rawGam.recent_actions ?? []) as Record<string, unknown>[]).map(a => ({
        action: (a.action ?? '') as string,
        points: (a.points ?? 0) as number,
        date: (a.date ?? a.created_at ?? '') as string,
      })),
    },
    referral: {
      code: (rawRef.referral_code ?? rawRef.code ?? '') as string,
      referrals_made: (rawRef.referrals_made ?? 0) as number,
      discounts_earned: (rawRef.discounts_earned ?? 0) as number,
    },
  }
}

export async function getPortalData(token: string): Promise<PortalData | null> {
  const res = await fetch(`${API}/api/portal/${token}`)
  if (!res.ok) return null
  const raw = await res.json()
  return mapPortalData(raw)
}

export async function getAppointments(token: string): Promise<PortalData['upcoming_appointments']> {
  const res = await fetch(`${API}/api/portal/${token}/appointments`)
  if (!res.ok) return []
  const d = await res.json()
  const raw = Array.isArray(d) ? d : (d.appointments ?? [])
  return raw.map((a: Record<string, unknown>) => {
    const startTime = (a.start_time ?? a.date ?? '') as string
    const dt = startTime ? new Date(startTime) : null
    return {
      id: (a.id ?? '') as string,
      date: dt ? dt.toISOString().split('T')[0] : (a.date ?? '') as string,
      time: dt ? dt.toTimeString().slice(0, 5) : (a.time ?? '') as string,
      doctor: (a.doctor_name ?? a.doctor ?? a.doctor_id ?? '') as string,
      service: (a.service_name ?? a.service ?? '') as string,
      status: (a.status ?? '') as string,
    }
  })
}

export async function getPayments(token: string): Promise<PortalData['payments']> {
  const res = await fetch(`${API}/api/portal/${token}/payments`)
  if (!res.ok) return []
  const d = await res.json()
  const raw = Array.isArray(d) ? d : (d.payments ?? [])
  return raw.map((p: Record<string, unknown>) => ({
    id: (p.id ?? '') as string,
    date: (p.created_at ?? p.date ?? '') as string,
    amount: (p.amount ?? p.amount_cop ?? 0) as number,
    status: (p.status ?? 'PENDING') as 'PAID' | 'PENDING',
    description: (p.description ?? '') as string,
  }))
}

export async function getGamification(token: string): Promise<PortalData['gamification'] | null> {
  const res = await fetch(`${API}/api/portal/${token}/gamification`)
  if (!res.ok) return null
  const d = await res.json()
  const progress = (d.progress_to_next_tier ?? {}) as Record<string, unknown>
  return {
    total_points: d.total_points ?? 0,
    tier: d.tier ?? 'BRONZE',
    streak_months: d.streak_months ?? 0,
    points_to_next_tier: (progress.points_needed ?? d.points_to_next_tier ?? 0) as number,
    next_tier: (progress.next_tier ?? d.next_tier ?? null) as string | null,
    recent_actions: ((d.recent_actions ?? []) as Record<string, unknown>[]).map((a: Record<string, unknown>) => ({
      action: (a.action ?? '') as string,
      points: (a.points ?? 0) as number,
      date: (a.date ?? a.created_at ?? '') as string,
    })),
  }
}

export async function cancelAppointment(token: string, appointmentId: string): Promise<boolean> {
  const res = await fetch(`${API}/api/portal/${token}/cancel-appointment/${appointmentId}`, {
    method: 'POST',
  })
  return res.ok
}

export async function requestReschedule(
  token: string,
  appointmentId: string,
  preferredDates: string[]
): Promise<boolean> {
  const res = await fetch(`${API}/api/portal/${token}/request-reschedule/${appointmentId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ preferred_dates: preferredDates }),
  })
  return res.ok
}

export async function generatePortalToken(orgId: string, patientId: string): Promise<{ token: string; url: string } | null> {
  const { authFetch } = await import('./helpers')
  const res = await authFetch(`${API}/api/portal/generate-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ org_id: orgId, patient_id: patientId }),
  })
  if (!res.ok) return null
  return res.json()
}
