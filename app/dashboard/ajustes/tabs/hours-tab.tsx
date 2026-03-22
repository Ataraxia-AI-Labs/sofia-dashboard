'use client'

import { Toggle } from '@/components/ui'
import { updateBusinessHour } from '@/lib/api'
import { useTranslations } from 'next-intl'
import type { BusinessHour } from '@/types'

interface HoursTabProps {
  hours: BusinessHour[]
  onRefresh: () => void
}

export function HoursTab({ hours, onRefresh }: HoursTabProps) {
  const t = useTranslations('hours')

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
      <div className="glass-card p-6 text-center text-text-dim text-[10px] font-mono">
        {t('noHours')}
      </div>
    )
  }

  return (
    <div className="glass-card overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left text-[10px] font-mono font-semibold text-text-muted uppercase px-4 py-2.5">{t('day')}</th>
            <th className="text-left text-[10px] font-mono font-semibold text-text-muted uppercase px-4 py-2.5">{t('openTime')}</th>
            <th className="text-left text-[10px] font-mono font-semibold text-text-muted uppercase px-4 py-2.5">{t('closeTime')}</th>
            <th className="text-left text-[10px] font-mono font-semibold text-text-muted uppercase px-4 py-2.5">{t('slot')}</th>
            <th className="text-center text-[10px] font-mono font-semibold text-text-muted uppercase px-4 py-2.5">{t('active')}</th>
          </tr>
        </thead>
        <tbody>
          {hours.map((h) => (
            <tr key={h.id} className={`border-b border-border/50 ${!h.is_active ? 'opacity-40' : ''}`}>
              <td className="px-4 py-2.5 text-xs font-mono font-medium text-text-primary">{t(`days.${h.day_of_week}`)}</td>
              <td className="px-4 py-2.5">
                <input
                  type="time"
                  value={h.open_time?.slice(0, 5) || '08:00'}
                  onChange={(e) => handleUpdate(h.id, 'open_time', e.target.value + ':00')}
                  className="px-2 py-1 rounded-md bg-void border border-border text-text-primary text-xs font-mono outline-none focus:border-brand-purple/40"
                />
              </td>
              <td className="px-4 py-2.5">
                <input
                  type="time"
                  value={h.close_time?.slice(0, 5) || '18:00'}
                  onChange={(e) => handleUpdate(h.id, 'close_time', e.target.value + ':00')}
                  className="px-2 py-1 rounded-md bg-void border border-border text-text-primary text-xs font-mono outline-none focus:border-brand-purple/40"
                />
              </td>
              <td className="px-4 py-2.5">
                <input
                  type="number"
                  value={h.slot_duration_minutes || 60}
                  onChange={(e) => handleUpdate(h.id, 'slot_duration_minutes', e.target.value)}
                  className="w-16 px-2 py-1 rounded-md bg-void border border-border text-text-primary text-xs font-mono outline-none focus:border-brand-purple/40"
                />
              </td>
              <td className="px-4 py-2.5 text-center">
                <Toggle checked={h.is_active} onChange={() => handleToggle(h.id, h.is_active)} size="sm" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
