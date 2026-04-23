'use client'

import { useState } from 'react'
import { Plus, Trash2, Phone } from 'lucide-react'
import { Button, Toggle, Input, Select } from '@/components/ui'
import { updateOrganization } from '@/lib/api'
import type { Organization, WhatsAppTemplate, WATemplateCategory } from '@/types'

const TEMPLATE_CATEGORIES: { value: string; label: string }[] = [
  { value: 'APPOINTMENT_REMINDER', label: 'Recordatorio de Cita' },
  { value: 'FOLLOW_UP', label: 'Seguimiento' },
  { value: 'TREATMENT_REMINDER', label: 'Recordatorio Tratamiento' },
  { value: 'PAYMENT_LINK', label: 'Link de Pago' },
  { value: 'WELCOME', label: 'Bienvenida' },
  { value: 'CUSTOM', label: 'Personalizada' },
]

interface TemplatesTabProps {
  orgId: string
  org: Organization
  isReadOnly: boolean
  onMessage: (msg: string) => void
}

export function TemplatesTab({ orgId, org, isReadOnly, onMessage }: TemplatesTabProps) {
  const tpls = (org.config_settings as Record<string, unknown>)?.whatsapp_templates
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>(Array.isArray(tpls) ? tpls as WhatsAppTemplate[] : [])
  const [showNew, setShowNew] = useState(false)
  const [newTpl, setNewTpl] = useState<Omit<WhatsAppTemplate, 'id'>>({ name: '', category: 'APPOINTMENT_REMINDER', language: 'es', description: '', is_active: true })
  const [saving, setSaving] = useState(false)

  const saveTemplates = async (updated: WhatsAppTemplate[]) => {
    if (isReadOnly) return
    setSaving(true)
    try {
      const config = { ...(org.config_settings || {}), whatsapp_templates: updated }
      await updateOrganization(orgId, { config_settings: config })
      setTemplates(updated)
      onMessage('Plantillas actualizadas')
    } catch (e) {
      onMessage('Error: ' + (e instanceof Error ? e.message : 'desconocido'))
    }
    setSaving(false)
  }

  const handleAdd = async () => {
    if (!newTpl.name) return
    const tpl: WhatsAppTemplate = { ...newTpl, id: crypto.randomUUID() }
    await saveTemplates([...templates, tpl])
    setShowNew(false)
    setNewTpl({ name: '', category: 'APPOINTMENT_REMINDER', language: 'es', description: '', is_active: true })
  }

  return (
    <div className="space-y-3">
      <div className="px-3 py-2 rounded-md bg-status-info/10 border border-status-info/20 text-[12px] font-body text-status-info leading-relaxed">
        <strong>Importante:</strong> Las plantillas deben estar aprobadas en Meta Business Manager antes de configurarlas aqui.
        Cuando los sub-bots (Reminder, Hunter, Nurse) envian mensajes fuera de la ventana de 24h de WhatsApp, usan estas plantillas en lugar de texto libre.
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[12px] font-body text-text-dim">{templates.length} plantillas configuradas</p>
        {/* CRUD removido: crear plantilla vive SOLO en Pulso (SofIA). */}
      </div>

      {templates.map((tpl) => {
        const catLabel = TEMPLATE_CATEGORIES.find(c => c.value === tpl.category)?.label || tpl.category
        return (
          <div key={tpl.id} className={`glass-card p-4 ${!tpl.is_active ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-status-success flex-shrink-0" />
                  <span className="text-xs font-body font-semibold text-text-primary">{tpl.name}</span>
                  <span className="text-[12px] font-body bg-surface-3 text-text-dim px-2 py-0.5 rounded-md">{catLabel}</span>
                  <span className="text-[12px] font-body text-text-dim">{tpl.language}</span>
                </div>
                {tpl.description && (
                  <p className="text-[12px] font-body text-text-muted mt-1 ml-6">{tpl.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                <Toggle
                  checked={tpl.is_active}
                  onChange={() => saveTemplates(templates.map(t => t.id === tpl.id ? { ...t, is_active: !t.is_active } : t))}
                  disabled={isReadOnly}
                  size="sm"
                />
                {!isReadOnly && (
                  <button
                    onClick={() => saveTemplates(templates.filter(t => t.id !== tpl.id))}
                    className="w-7 h-7 rounded-md bg-surface-3 flex items-center justify-center text-text-dim hover:text-status-danger transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}

      {templates.length === 0 && !showNew && (
        <div className="glass-card p-6 text-center text-text-dim text-[12px] font-body">
          No hay plantillas configuradas. Agrega la primera desde Meta Business Manager y registrala aqui.
        </div>
      )}
    </div>
  )
}
