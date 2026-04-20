'use client'

import { useState } from 'react'
import { Save, CalendarDays, Cake } from 'lucide-react'
import { Button, Toggle } from '@/components/ui'
import { updateOrganization } from '@/lib/api'
import type { Organization, BirthdayBotConfig } from '@/types'

interface NotificationsTabProps {
  orgId: string
  org: Organization
  isReadOnly: boolean
  onMessage: (msg: string) => void
}

export function NotificationsTab({ orgId, org, isReadOnly, onMessage }: NotificationsTabProps) {
  const config = (org.config_settings || {}) as Record<string, unknown>
  const [notifPhone, setNotifPhone] = useState((config.notification_phone as string) || '')
  const [vacationMode, setVacationMode] = useState(Boolean(config.vacation_mode))
  const [vacationReturnDate, setVacationReturnDate] = useState((config.vacation_return_date as string) || '')
  const bday = config.birthday_bot as BirthdayBotConfig | undefined
  const [birthdayEnabled, setBirthdayEnabled] = useState(Boolean(bday?.enabled))
  const [birthdayTemplate, setBirthdayTemplate] = useState(bday?.message_template || 'Feliz cumpleanos {nombre}! De parte de todo el equipo de {clinica} te deseamos un dia maravilloso.')
  const [saving, setSaving] = useState(false)

  const saveConfig = async (updates: Record<string, unknown>, msg: string) => {
    if (isReadOnly) return
    setSaving(true)
    try {
      const merged = { ...(org.config_settings || {}), ...updates }
      await updateOrganization(orgId, { config_settings: merged })
      onMessage(msg)
    } catch (e) {
      onMessage('Error: ' + (e instanceof Error ? e.message : 'desconocido'))
    }
    setSaving(false)
  }

  return (
    <div className="glass-card p-5 space-y-4">
      {/* Notification Phone */}
      <div>
        <h3 className="text-xs font-body font-semibold text-text-primary mb-1">Numero de Notificaciones</h3>
        <p className="text-[12px] font-body text-text-dim mb-2">
          WhatsApp donde SofIA envia alertas de emergencia, crisis emocional, y solicitudes de escalamiento a humano.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={notifPhone}
            onChange={(e) => setNotifPhone(e.target.value)}
            placeholder="573001234567"
            className="flex-1 px-3 py-2 rounded-lg bg-void border border-border text-text-primary text-xs font-body outline-none focus:border-brand-purple/40"
          />
          <Button
            variant="secondary"
            onClick={() => saveConfig({ notification_phone: notifPhone }, 'Numero guardado')}
            disabled={saving || isReadOnly}
            loading={saving}
            icon={<Save size={13} />}
          >
            Guardar
          </Button>
        </div>
      </div>

      {/* Vacation Mode */}
      <div className="border-t border-border pt-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h4 className="text-xs font-body font-semibold text-text-primary">Modo Vacaciones</h4>
            <p className="text-[12px] font-body text-text-dim mt-0.5">
              Cuando esta activo, SofIA sigue respondiendo pero informa que la clinica esta en descanso.
            </p>
          </div>
          <Toggle
            checked={vacationMode}
            onChange={async (val) => {
              setVacationMode(val)
              await saveConfig({ vacation_mode: val }, val ? 'Modo vacaciones activado' : 'Modo vacaciones desactivado')
            }}
            disabled={isReadOnly}
            color="warning"
          />
        </div>
        {vacationMode && (
          <div className="space-y-3">
            <div className="px-3 py-2 rounded-md bg-status-warning/10 border border-status-warning/20 text-[12px] font-body text-status-warning font-semibold">
              VACACIONES ACTIVO — SofIA NO esta procesando mensajes. Los pacientes reciben un mensaje de que la clinica esta en descanso.
            </div>
            <div className="flex items-center gap-3">
              <CalendarDays size={14} className="text-status-warning flex-shrink-0" />
              <label className="text-[12px] font-body text-text-muted font-semibold whitespace-nowrap">Fecha de retorno:</label>
              <input
                type="date"
                value={vacationReturnDate}
                onChange={(e) => setVacationReturnDate(e.target.value)}
                className="px-3 py-1.5 rounded-md bg-void border border-border text-text-primary text-xs font-body outline-none focus:border-brand-purple/40"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => saveConfig({ vacation_return_date: vacationReturnDate }, 'Fecha de retorno guardada')}
                disabled={saving || isReadOnly || !vacationReturnDate}
                icon={<Save size={12} />}
              />
            </div>
            {vacationReturnDate && (
              <p className="text-[12px] font-body text-text-dim ml-7">
                SofIA informara a los pacientes que la clinica regresa el {new Date(vacationReturnDate + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Birthday Bot */}
      <div className="border-t border-border pt-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Cake size={16} className="text-brand-purple" />
            <div>
              <h4 className="text-xs font-body font-semibold text-text-primary">Birthday Bot</h4>
              <p className="text-[12px] font-body text-text-dim mt-0.5">
                Envia un mensaje automatico de felicitacion a pacientes en su cumpleanos.
              </p>
            </div>
          </div>
          <Toggle
            checked={birthdayEnabled}
            onChange={async (val) => {
              setBirthdayEnabled(val)
              await saveConfig({ birthday_bot: { enabled: val, message_template: birthdayTemplate } }, 'Birthday Bot actualizado')
            }}
            disabled={isReadOnly || saving}
            color="purple"
          />
        </div>
        {birthdayEnabled && (
          <div className="space-y-3 ml-0.5">
            <div>
              <label className="block text-[12px] font-body font-semibold text-text-dim uppercase tracking-wider mb-1">Plantilla del mensaje</label>
              <textarea
                value={birthdayTemplate}
                onChange={(e) => setBirthdayTemplate(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-md bg-void border border-border text-text-primary text-xs font-body outline-none focus:border-brand-purple/40 resize-y"
                placeholder="Feliz cumpleanos {nombre}! De parte de {clinica}..."
              />
              <p className="text-[12px] font-body text-text-dim mt-1">
                Variables disponibles: <code className="text-brand-purple font-body">{'{nombre}'}</code> = nombre del paciente, <code className="text-brand-purple font-body">{'{clinica}'}</code> = nombre de la clinica
              </p>
            </div>
            <div className="flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => saveConfig({ birthday_bot: { enabled: birthdayEnabled, message_template: birthdayTemplate } }, 'Plantilla guardada')}
                disabled={saving || isReadOnly}
                loading={saving}
                icon={<Save size={12} />}
              >
                Guardar plantilla
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Auto-notification list */}
      <div className="border-t border-border pt-3">
        <h4 className="text-[12px] font-body font-semibold text-text-muted uppercase tracking-wider mb-2">SofIA notifica automaticamente cuando:</h4>
        <div className="space-y-1.5">
          {[
            { emoji: '🚨', label: 'Crisis emocional', desc: 'Paciente menciona suicidio o autolesion — Linea 106 + alerta al doctor' },
            { emoji: '⚠️', label: 'Emergencia medica', desc: 'Paciente reporta dolor extremo, sangrado, etc. — 123 + alerta al doctor' },
            { emoji: '👋', label: 'Escalamiento a humano', desc: 'Paciente pide hablar con una persona real — alerta al doctor' },
            { emoji: '📅', label: 'Cita nueva agendada', desc: 'SofIA confirma una cita — se registra en el calendario' },
            { emoji: '❌', label: 'Cita cancelada', desc: 'Paciente cancela — se actualiza el estado' },
          ].map(item => (
            <div key={item.label} className="flex items-start gap-3 px-3 py-2 rounded-md bg-surface-3/50">
              <span className="text-base">{item.emoji}</span>
              <div>
                <span className="text-[12px] font-body font-semibold text-text-primary">{item.label}</span>
                <p className="text-[12px] font-body text-text-dim">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
