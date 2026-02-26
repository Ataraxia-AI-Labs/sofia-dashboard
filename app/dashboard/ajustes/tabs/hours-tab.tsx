'use client'

import { Toggle } from '@/components/ui'
import { updateBusinessHour } from '@/lib/api'
import type { BusinessHour } from '@/types'

const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']

interface HoursTabProps {
  hours: BusinessHour[]
  onRefresh: () => void
}

export function HoursTab({ hours, onRefresh }: HoursTabProps) {
  const handleToggle = async (hourId: string, currentActive: boolean) => {
    try {
      await updateBusinessHour(hourId, { is_active: !currentActive })
      onRefresh()
    } catch {
      // Toggle failed silently — user can retry
    }
  }

  const handleUpdate = async (hourId: string, field: string, value: string) => {
    try {
      await updateBusinessHour(hourId, { [field]: value })
      onRefresh()
    } catch {
      // Hour update failed silently — user can retry
    }
  }

  if (hours.length === 0) {
    return (
      <div className="glass-card p-8 text-center text-text-dim text-sm">
        No hay horarios configurados. Agregalos desde Supabase o business_hours.
      </div>
    )
  }

  return (
    <div className="glass-card overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left text-[11px] font-semibold text-text-muted uppercase px-5 py-3">Dia</th>
            <th className="text-left text-[11px] font-semibold text-text-muted uppercase px-5 py-3">Apertura</th>
            <th className="text-left text-[11px] font-semibold text-text-muted uppercase px-5 py-3">Cierre</th>
            <th className="text-left text-[11px] font-semibold text-text-muted uppercase px-5 py-3">Slot (min)</th>
            <th className="text-center text-[11px] font-semibold text-text-muted uppercase px-5 py-3">Activo</th>
          </tr>
        </thead>
        <tbody>
          {hours.map((h) => (
            <tr key={h.id} className={`border-b border-border/50 ${!h.is_active ? 'opacity-40' : ''}`}>
              <td className="px-5 py-3 text-sm font-medium text-text-primary">{DAYS_ES[h.day_of_week]}</td>
              <td className="px-5 py-3">
                <input
                  type="time"
                  value={h.open_time?.slice(0, 5) || '08:00'}
                  onChange={(e) => handleUpdate(h.id, 'open_time', e.target.value + ':00')}
                  className="px-2 py-1 rounded-lg bg-void border border-border text-text-primary text-sm font-mono outline-none focus:border-brand-purple/40"
                />
              </td>
              <td className="px-5 py-3">
                <input
                  type="time"
                  value={h.close_time?.slice(0, 5) || '18:00'}
                  onChange={(e) => handleUpdate(h.id, 'close_time', e.target.value + ':00')}
                  className="px-2 py-1 rounded-lg bg-void border border-border text-text-primary text-sm font-mono outline-none focus:border-brand-purple/40"
                />
              </td>
              <td className="px-5 py-3">
                <input
                  type="number"
                  value={h.slot_duration_minutes || 60}
                  onChange={(e) => handleUpdate(h.id, 'slot_duration_minutes', e.target.value)}
                  className="w-16 px-2 py-1 rounded-lg bg-void border border-border text-text-primary text-sm font-mono outline-none focus:border-brand-purple/40"
                />
              </td>
              <td className="px-5 py-3 text-center">
                <Toggle checked={h.is_active} onChange={() => handleToggle(h.id, h.is_active)} size="sm" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
