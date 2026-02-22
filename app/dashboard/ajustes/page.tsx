'use client'

import { useEffect, useState, useCallback } from 'react'
import { useOrg } from '@/lib/org-context'
import {
  fetchOrganization, fetchServicesCatalog, fetchBusinessHours,
  updateOrganization, createService, updateService, deleteService, updateBusinessHour,
  formatCOP
} from '@/lib/api'
import type { Organization, ServiceCatalog, BusinessHour, WhatsAppTemplate, WATemplateCategory } from '@/types'
import {
  MessageSquare, Clock, ShoppingBag, Bell, Save,
  Plus, Trash2, Edit3, RefreshCw, Shield, Phone
} from 'lucide-react'

const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const TABS = [
  { id: 'prompt', label: 'System Prompt', icon: MessageSquare },
  { id: 'services', label: 'Catálogo', icon: ShoppingBag },
  { id: 'hours', label: 'Horarios', icon: Clock },
  { id: 'notifications', label: 'Notificaciones', icon: Bell },
  { id: 'templates', label: 'Plantillas WA', icon: Phone },
]

const TEMPLATE_CATEGORIES: { value: WATemplateCategory; label: string }[] = [
  { value: 'APPOINTMENT_REMINDER', label: 'Recordatorio de Cita' },
  { value: 'FOLLOW_UP', label: 'Seguimiento' },
  { value: 'TREATMENT_REMINDER', label: 'Recordatorio Tratamiento' },
  { value: 'PAYMENT_LINK', label: 'Link de Pago' },
  { value: 'WELCOME', label: 'Bienvenida' },
  { value: 'CUSTOM', label: 'Personalizada' },
]

export default function AjustesPage() {
  const { orgId, role } = useOrg()
  const isReadOnly = role === 'VIEWER'
  const [activeTab, setActiveTab] = useState('prompt')
  const [org, setOrg] = useState<Organization | null>(null)
  const [services, setServices] = useState<ServiceCatalog[]>([])
  const [hours, setHours] = useState<BusinessHour[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // Editable states
  const [systemPrompt, setSystemPrompt] = useState('')
  const [notifPhone, setNotifPhone] = useState('')
  const [vacationMode, setVacationMode] = useState(false)

  // WhatsApp templates (B7)
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [showNewTemplate, setShowNewTemplate] = useState(false)
  const [newTemplate, setNewTemplate] = useState<Omit<WhatsAppTemplate, 'id'>>({ name: '', category: 'APPOINTMENT_REMINDER', language: 'es', description: '', is_active: true })

  // New service form
  const [showNewService, setShowNewService] = useState(false)
  const [newService, setNewService] = useState({ name: '', description: '', price: 0, duration_minutes: 60, category: 'GENERAL' })
  const [editingService, setEditingService] = useState<string | null>(null)
  const [editServiceData, setEditServiceData] = useState<Partial<ServiceCatalog>>({})

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [orgData, servData, hoursData] = await Promise.all([
        fetchOrganization(orgId),
        fetchServicesCatalog(orgId),
        fetchBusinessHours(orgId),
      ])
      setOrg(orgData)
      setSystemPrompt(orgData?.system_prompt || '')
      const config = (orgData?.config_settings || {}) as Record<string, string | boolean>
      setNotifPhone((config.notification_phone as string) || '')
      setVacationMode(Boolean(config.vacation_mode))
      const tpls = (orgData?.config_settings as Record<string, unknown>)?.whatsapp_templates
      setTemplates(Array.isArray(tpls) ? tpls as WhatsAppTemplate[] : [])
      setServices(servData)
      setHours(hoursData)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }, [orgId])

  useEffect(() => { loadData() }, [loadData])

  const showSaved = (msg: string) => {
    setSaveMsg(msg)
    setTimeout(() => setSaveMsg(''), 3000)
  }

  // ========== SAVE FUNCTIONS ==========

  const savePrompt = async () => {
    if (!orgId || isReadOnly) return
    setSaving(true)
    try {
      await updateOrganization(orgId, { system_prompt: systemPrompt })
      showSaved('System prompt guardado ✓')
    } catch (e) {
      showSaved('Error: ' + (e instanceof Error ? e.message : 'desconocido'))
    }
    setSaving(false)
  }

  const saveNotifPhone = async () => {
    if (!orgId || !org || isReadOnly) return
    setSaving(true)
    try {
      const config = { ...(org.config_settings || {}), notification_phone: notifPhone }
      await updateOrganization(orgId, { config_settings: config })
      showSaved('Número de notificación guardado ✓')
    } catch (e) {
      showSaved('Error: ' + (e instanceof Error ? e.message : 'desconocido'))
    }
    setSaving(false)
  }

  const handleCreateService = async () => {
    if (!orgId || !newService.name || !newService.price || isReadOnly) return
    setSaving(true)
    try {
      await createService(orgId, newService)
      setShowNewService(false)
      setNewService({ name: '', description: '', price: 0, duration_minutes: 60, category: 'GENERAL' })
      loadData()
      showSaved('Servicio creado ✓')
    } catch (e) {
      showSaved('Error: ' + (e instanceof Error ? e.message : 'desconocido'))
    }
    setSaving(false)
  }

  const handleUpdateService = async (serviceId: string) => {
    setSaving(true)
    try {
      await updateService(serviceId, editServiceData)
      setEditingService(null)
      loadData()
      showSaved('Servicio actualizado ✓')
    } catch (e) {
      showSaved('Error: ' + (e instanceof Error ? e.message : 'desconocido'))
    }
    setSaving(false)
  }

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('¿Desactivar este servicio?')) return
    try {
      await deleteService(serviceId)
      loadData()
      showSaved('Servicio desactivado ✓')
    } catch (e) {
      showSaved('Error: ' + (e instanceof Error ? e.message : 'desconocido'))
    }
  }

  // ========== TEMPLATE FUNCTIONS (B7) ==========

  const saveTemplates = async (updated: WhatsAppTemplate[]) => {
    if (!orgId || !org || isReadOnly) return
    setSaving(true)
    try {
      const config = { ...(org.config_settings || {}), whatsapp_templates: updated }
      await updateOrganization(orgId, { config_settings: config })
      setTemplates(updated)
      showSaved('Plantillas actualizadas ✓')
    } catch (e) {
      showSaved('Error: ' + (e instanceof Error ? e.message : 'desconocido'))
    }
    setSaving(false)
  }

  const handleAddTemplate = async () => {
    if (!newTemplate.name) return
    const tpl: WhatsAppTemplate = { ...newTemplate, id: crypto.randomUUID() }
    await saveTemplates([...templates, tpl])
    setShowNewTemplate(false)
    setNewTemplate({ name: '', category: 'APPOINTMENT_REMINDER', language: 'es', description: '', is_active: true })
  }

  const handleRemoveTemplate = async (id: string) => {
    await saveTemplates(templates.filter(t => t.id !== id))
  }

  const handleToggleTemplate = async (id: string) => {
    await saveTemplates(templates.map(t => t.id === id ? { ...t, is_active: !t.is_active } : t))
  }

  const handleToggleDay = async (hourId: string, currentActive: boolean) => {
    try {
      await updateBusinessHour(hourId, { is_active: !currentActive })
      loadData()
    } catch (e) {
      console.error(e)
    }
  }

  const handleUpdateHour = async (hourId: string, field: string, value: string) => {
    try {
      await updateBusinessHour(hourId, { [field]: value })
      loadData()
    } catch (e) {
      console.error(e)
    }
  }

  if (loading) {
    return (
      <div className="max-w-[1000px] space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass-card p-6 animate-pulse">
            <div className="h-5 bg-surface-3 rounded w-40 mb-4" />
            <div className="h-32 bg-surface-3 rounded" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-[1000px] space-y-5">
      {/* RBAC: read-only banner for VIEWERs */}
      {isReadOnly && (
        <div className="px-4 py-3 rounded-xl bg-status-warning/10 border border-status-warning/20 text-xs text-status-warning font-semibold flex items-center gap-2">
          <Shield size={14} />
          Solo lectura — Tu rol ({role}) no permite modificar la configuración. Contacta al administrador.
        </div>
      )}

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Ajustes</h2>
          <p className="text-text-dim text-xs mt-0.5">{org?.name || 'Configuración de la clínica'}</p>
        </div>
        <div className="flex items-center gap-2">
          {saveMsg && (
            <span className={`text-xs font-semibold px-3 py-1.5 rounded-lg animate-fade-in ${
              saveMsg.includes('Error') ? 'bg-status-danger/10 text-status-danger' : 'bg-status-success/10 text-status-success'
            }`}>
              {saveMsg}
            </span>
          )}
          <button onClick={loadData} aria-label="Actualizar" className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-1.5 border-b border-border pb-px">
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-surface-2 text-brand-purple border border-border border-b-surface-2 -mb-px'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ========== TAB: SYSTEM PROMPT ========== */}
      {activeTab === 'prompt' && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">System Prompt de SofIA</h3>
              <p className="text-xs text-text-dim mt-0.5">
                Define la personalidad, tono, y reglas específicas de SofIA para esta clínica.
                Las instrucciones de seguridad (anti-diagnóstico, anti-receta) son automáticas.
              </p>
            </div>
            <button
              onClick={savePrompt}
              disabled={saving || isReadOnly}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-purple/15 text-brand-purple text-xs font-semibold hover:bg-brand-purple/25 transition-colors disabled:opacity-50"
            >
              <Save size={13} />
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={16}
            className="w-full px-4 py-3 rounded-xl bg-void border border-border text-text-primary text-sm font-mono leading-relaxed outline-none focus:border-brand-purple/40 resize-y"
            placeholder="Eres Sofía, asistente virtual de la Clínica XYZ..."
          />
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-brand-purple/5 border border-brand-purple/10">
            <Shield size={14} className="text-brand-purple mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-text-muted leading-relaxed">
              Las reglas de seguridad (anti-diagnóstico, anti-receta, anti-prompt-injection, protocolo de crisis, 
              escalamiento a humano) están hardcodeadas en el cerebro de SofIA y NO se pueden desactivar desde aquí.
            </p>
          </div>
        </div>
      )}

      {/* ========== TAB: SERVICES CATALOG ========== */}
      {activeTab === 'services' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-dim">{services.length} servicios activos</p>
            {!isReadOnly && (
              <button
                onClick={() => setShowNewService(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-purple/15 text-brand-purple text-xs font-semibold hover:bg-brand-purple/25 transition-colors"
              >
                <Plus size={13} />
                Nuevo Servicio
              </button>
            )}
          </div>

          {/* New service form */}
          {showNewService && (
            <div className="glass-card p-5 space-y-3 border-brand-purple/20 animate-fade-up">
              <h4 className="text-sm font-semibold text-text-primary">Nuevo Servicio</h4>
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Nombre" value={newService.name} onChange={(v) => setNewService({ ...newService, name: v })} placeholder="Ej: Limpieza Dental" />
                <InputField label="Precio (COP)" value={newService.price.toString()} onChange={(v) => setNewService({ ...newService, price: Number(v) || 0 })} placeholder="150000" type="number" />
                <InputField label="Duración (min)" value={newService.duration_minutes.toString()} onChange={(v) => setNewService({ ...newService, duration_minutes: Number(v) || 60 })} type="number" />
                <InputField label="Categoría" value={newService.category} onChange={(v) => setNewService({ ...newService, category: v })} placeholder="GENERAL" />
              </div>
              <InputField label="Descripción" value={newService.description} onChange={(v) => setNewService({ ...newService, description: v })} placeholder="Descripción del servicio..." />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowNewService(false)} className="px-3 py-1.5 rounded-lg bg-surface-3 text-text-muted text-xs font-semibold">Cancelar</button>
                <button onClick={handleCreateService} disabled={saving || !newService.name} className="px-3 py-1.5 rounded-lg bg-brand-purple text-white text-xs font-semibold disabled:opacity-50">
                  {saving ? 'Creando...' : 'Crear Servicio'}
                </button>
              </div>
            </div>
          )}

          {/* Services list */}
          {services.map((svc) => (
            <div key={svc.id} className="glass-card p-4">
              {editingService === svc.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <InputField label="Nombre" value={editServiceData.name ?? svc.name} onChange={(v) => setEditServiceData({ ...editServiceData, name: v })} />
                    <InputField label="Precio" value={(editServiceData.price ?? svc.price).toString()} onChange={(v) => setEditServiceData({ ...editServiceData, price: Number(v) })} type="number" />
                    <InputField label="Duración (min)" value={(editServiceData.duration_minutes ?? svc.duration_minutes).toString()} onChange={(v) => setEditServiceData({ ...editServiceData, duration_minutes: Number(v) })} type="number" />
                    <InputField label="Categoría" value={editServiceData.category ?? svc.category} onChange={(v) => setEditServiceData({ ...editServiceData, category: v })} />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingService(null)} className="px-2.5 py-1 rounded-lg bg-surface-3 text-text-muted text-xs">Cancelar</button>
                    <button onClick={() => handleUpdateService(svc.id)} className="px-2.5 py-1 rounded-lg bg-brand-purple text-white text-xs">Guardar</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-text-primary">{svc.name}</span>
                      <span className="text-[10px] bg-surface-3 text-text-dim px-2 py-0.5 rounded-full">{svc.category}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-text-muted">
                      <span className="font-mono font-semibold text-status-success">{formatCOP(svc.price)}</span>
                      <span>{svc.duration_minutes} min</span>
                      {svc.description && <span className="truncate max-w-[200px]">{svc.description}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => { setEditingService(svc.id); setEditServiceData({}) }}
                      className="w-7 h-7 rounded-lg bg-surface-3 flex items-center justify-center text-text-dim hover:text-text-primary transition-colors"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteService(svc.id)}
                      className="w-7 h-7 rounded-lg bg-surface-3 flex items-center justify-center text-text-dim hover:text-status-danger transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {services.length === 0 && !showNewService && (
            <div className="glass-card p-8 text-center text-text-dim text-sm">
              No hay servicios configurados. Agrega tu primer servicio.
            </div>
          )}
        </div>
      )}

      {/* ========== TAB: BUSINESS HOURS ========== */}
      {activeTab === 'hours' && (
        <div className="glass-card overflow-hidden">
          {hours.length === 0 ? (
            <div className="p-8 text-center text-text-dim text-sm">
              No hay horarios configurados. Agrégalos desde Supabase → business_hours.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-[11px] font-semibold text-text-muted uppercase px-5 py-3">Día</th>
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
                        onChange={(e) => handleUpdateHour(h.id, 'open_time', e.target.value + ':00')}
                        className="px-2 py-1 rounded-lg bg-void border border-border text-text-primary text-sm font-mono outline-none focus:border-brand-purple/40"
                      />
                    </td>
                    <td className="px-5 py-3">
                      <input
                        type="time"
                        value={h.close_time?.slice(0, 5) || '18:00'}
                        onChange={(e) => handleUpdateHour(h.id, 'close_time', e.target.value + ':00')}
                        className="px-2 py-1 rounded-lg bg-void border border-border text-text-primary text-sm font-mono outline-none focus:border-brand-purple/40"
                      />
                    </td>
                    <td className="px-5 py-3">
                      <input
                        type="number"
                        value={h.slot_duration_minutes || 60}
                        onChange={(e) => handleUpdateHour(h.id, 'slot_duration_minutes', e.target.value)}
                        className="w-16 px-2 py-1 rounded-lg bg-void border border-border text-text-primary text-sm font-mono outline-none focus:border-brand-purple/40"
                      />
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button
                        onClick={() => handleToggleDay(h.id, h.is_active)}
                        className={`w-10 h-5 rounded-full transition-colors relative ${h.is_active ? 'bg-status-success' : 'bg-surface-3'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${h.is_active ? 'left-5.5' : 'left-0.5'}`} 
                             style={{ left: h.is_active ? '22px' : '2px' }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ========== TAB: WHATSAPP TEMPLATES (B7) ========== */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="px-4 py-3 rounded-xl bg-status-info/10 border border-status-info/20 text-xs text-status-info leading-relaxed">
            <strong>Importante:</strong> Las plantillas deben estar aprobadas en Meta Business Manager antes de configurarlas aquí.
            Cuando los sub-bots (Reminder, Hunter, Nurse) envían mensajes fuera de la ventana de 24h de WhatsApp, usan estas plantillas en lugar de texto libre.
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-text-dim">{templates.length} plantillas configuradas</p>
            {!isReadOnly && (
              <button
                onClick={() => setShowNewTemplate(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-purple/15 text-brand-purple text-xs font-semibold hover:bg-brand-purple/25 transition-colors"
              >
                <Plus size={13} />
                Nueva Plantilla
              </button>
            )}
          </div>

          {/* New template form */}
          {showNewTemplate && (
            <div className="glass-card p-5 space-y-3 border-brand-purple/20 animate-fade-up">
              <h4 className="text-sm font-semibold text-text-primary">Nueva Plantilla</h4>
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Nombre (Meta template name)" value={newTemplate.name} onChange={(v) => setNewTemplate({ ...newTemplate, name: v })} placeholder="appointment_reminder_es" />
                <div>
                  <label className="block text-[10px] font-semibold text-text-dim uppercase tracking-wider mb-1">Categoría</label>
                  <select
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value as WATemplateCategory })}
                    className="w-full px-3 py-2 rounded-lg bg-void border border-border text-text-primary text-sm outline-none focus:border-brand-purple/40 transition-colors"
                  >
                    {TEMPLATE_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <InputField label="Idioma" value={newTemplate.language} onChange={(v) => setNewTemplate({ ...newTemplate, language: v })} placeholder="es" />
                <InputField label="Descripción" value={newTemplate.description || ''} onChange={(v) => setNewTemplate({ ...newTemplate, description: v })} placeholder="Recordatorio 24h antes de la cita" />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowNewTemplate(false)} className="px-3 py-1.5 rounded-lg bg-surface-3 text-text-muted text-xs font-semibold">Cancelar</button>
                <button onClick={handleAddTemplate} disabled={saving || !newTemplate.name} className="px-3 py-1.5 rounded-lg bg-brand-purple text-white text-xs font-semibold disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Agregar Plantilla'}
                </button>
              </div>
            </div>
          )}

          {/* Templates list */}
          {templates.map((tpl) => {
            const catLabel = TEMPLATE_CATEGORIES.find(c => c.value === tpl.category)?.label || tpl.category
            return (
              <div key={tpl.id} className={`glass-card p-4 ${!tpl.is_active ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-status-success flex-shrink-0" />
                      <span className="text-sm font-semibold text-text-primary font-mono">{tpl.name}</span>
                      <span className="text-[10px] bg-surface-3 text-text-dim px-2 py-0.5 rounded-full">{catLabel}</span>
                      <span className="text-[10px] text-text-dim">{tpl.language}</span>
                    </div>
                    {tpl.description && (
                      <p className="text-xs text-text-muted mt-1 ml-6">{tpl.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <button
                      onClick={() => handleToggleTemplate(tpl.id)}
                      disabled={isReadOnly}
                      className={`w-10 h-5 rounded-full transition-colors relative ${tpl.is_active ? 'bg-status-success' : 'bg-surface-3'} ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all" style={{ left: tpl.is_active ? '22px' : '2px' }} />
                    </button>
                    {!isReadOnly && (
                      <button
                        onClick={() => handleRemoveTemplate(tpl.id)}
                        className="w-7 h-7 rounded-lg bg-surface-3 flex items-center justify-center text-text-dim hover:text-status-danger transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {templates.length === 0 && !showNewTemplate && (
            <div className="glass-card p-8 text-center text-text-dim text-sm">
              No hay plantillas configuradas. Agrega la primera desde Meta Business Manager y regístrala aquí.
            </div>
          )}
        </div>
      )}

      {/* ========== TAB: NOTIFICATIONS ========== */}
      {activeTab === 'notifications' && (
        <div className="glass-card p-6 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-1">Número de Notificaciones</h3>
            <p className="text-xs text-text-dim mb-3">
              WhatsApp donde SofIA envía alertas de emergencia, crisis emocional, y solicitudes de escalamiento a humano.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={notifPhone}
                onChange={(e) => setNotifPhone(e.target.value)}
                placeholder="573001234567"
                className="flex-1 px-4 py-2.5 rounded-xl bg-void border border-border text-text-primary text-sm font-mono outline-none focus:border-brand-purple/40"
              />
              <button
                onClick={saveNotifPhone}
                disabled={saving || isReadOnly}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-purple/15 text-brand-purple text-xs font-semibold hover:bg-brand-purple/25 transition-colors disabled:opacity-50"
              >
                <Save size={13} />
                Guardar
              </button>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-semibold text-text-primary">Modo Vacaciones</h4>
                <p className="text-xs text-text-dim mt-0.5">
                  Cuando está activo, SofIA responde que la clínica está en descanso y no procesa mensajes con IA.
                </p>
              </div>
              <button
                onClick={async () => {
                  if (isReadOnly) return
                  const newVal = !vacationMode
                  setVacationMode(newVal)
                  if (orgId && org) {
                    const config = { ...(org.config_settings || {}), vacation_mode: newVal }
                    await updateOrganization(orgId, { config_settings: config })
                    showSaved(newVal ? 'Modo vacaciones activado 🏖️' : 'Modo vacaciones desactivado ✅')
                  }
                }}
                disabled={isReadOnly}
                className={`w-12 h-6 rounded-full transition-colors relative ${vacationMode ? 'bg-status-warning' : 'bg-surface-3'} ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all" style={{ left: vacationMode ? '26px' : '2px' }} />
              </button>
            </div>
            {vacationMode && (
              <div className="px-3 py-2 rounded-lg bg-status-warning/10 border border-status-warning/20 text-xs text-status-warning font-semibold">
                ⚠️ VACACIONES ACTIVO — SofIA NO está procesando mensajes. Los pacientes reciben un mensaje de que la clínica está en descanso.
              </div>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">SofIA notifica automáticamente cuando:</h4>
            <div className="space-y-2">
              <NotifItem emoji="🚨" label="Crisis emocional" desc="Paciente menciona suicidio o autolesión → Línea 106 + alerta al doctor" />
              <NotifItem emoji="⚠️" label="Emergencia médica" desc="Paciente reporta dolor extremo, sangrado, etc. → 123 + alerta al doctor" />
              <NotifItem emoji="👋" label="Escalamiento a humano" desc="Paciente pide hablar con una persona real → alerta al doctor" />
              <NotifItem emoji="📅" label="Cita nueva agendada" desc="SofIA confirma una cita → se registra en el calendario" />
              <NotifItem emoji="❌" label="Cita cancelada" desc="Paciente cancela → se actualiza el estado" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function InputField({ label, value, onChange, placeholder, type }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-text-dim uppercase tracking-wider mb-1">{label}</label>
      <input
        type={type || 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg bg-void border border-border text-text-primary text-sm outline-none focus:border-brand-purple/40 transition-colors"
      />
    </div>
  )
}

function NotifItem({ emoji, label, desc }: { emoji: string; label: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 px-3 py-2 rounded-lg bg-surface-3/50">
      <span className="text-base">{emoji}</span>
      <div>
        <span className="text-xs font-semibold text-text-primary">{label}</span>
        <p className="text-[11px] text-text-dim">{desc}</p>
      </div>
    </div>
  )
}
