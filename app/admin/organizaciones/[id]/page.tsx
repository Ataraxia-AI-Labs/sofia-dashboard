'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  fetchOrgFull, fetchOrgStats, fetchOrgUsers, fetchOrgActivityLog,
  updateOrgStatus, populateKnowledgeBase, testWhatsApp,
  type ActivityLogEntry,
} from '@/lib/admin-api'
import { fetchServicesCatalog, fetchBusinessHours, updateOrganization, createService, deleteService, updateBusinessHour, formatCOP, timeAgo } from '@/lib/api'
import type { ServiceCatalog, BusinessHour } from '@/types'
import {
  Building2, Users, Calendar, MessageSquare, DollarSign,
  Settings2, Save, ChevronLeft, RefreshCw, Phone,
  CheckCircle2, AlertTriangle,
  Loader2, Trash2, Plus, BookOpen, Send,
  Clock, ShoppingBag, Activity, FileText
} from 'lucide-react'

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

type Tab = 'general' | 'services' | 'hours' | 'users' | 'prompt' | 'activity'

const INTENT_COLORS: Record<string, string> = {
  AGENDAR: 'text-status-success',
  CANCELAR: 'text-status-danger',
  CONSULTA_PRECIO: 'text-brand-gold',
  CONSULTA_HORARIO: 'text-status-info',
  SALUDO: 'text-brand-cyan',
  OTRO: 'text-text-muted',
}

export default function OrgDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orgId = params.id as string

  const [org, setOrg] = useState<Record<string, unknown> | null>(null)
  const [stats, setStats] = useState({ patients: 0, appointments: 0, interactions: 0, revenue: 0 })
  const [users, setUsers] = useState<{ id: string; user_id: string; role: string; created_at: string }[]>([])
  const [services, setServices] = useState<ServiceCatalog[]>([])
  const [hours, setHours] = useState<BusinessHour[]>([])
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<Tab>('general')
  const [message, setMessage] = useState({ type: '', text: '' })

  // Editable fields
  const [editName, setEditName] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [editPlan, setEditPlan] = useState('')
  const [editPrompt, setEditPrompt] = useState('')
  const [editWhatsApp, setEditWhatsApp] = useState('')

  // New service form
  const [newServiceName, setNewServiceName] = useState('')
  const [newServicePrice, setNewServicePrice] = useState('')
  const [newServiceDuration, setNewServiceDuration] = useState('60')
  const [newServiceCategory, setNewServiceCategory] = useState('GENERAL')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [orgData, statsData, usersData, servicesData, hoursData, activityData] = await Promise.all([
        fetchOrgFull(orgId),
        fetchOrgStats(orgId),
        fetchOrgUsers(orgId),
        fetchServicesCatalog(orgId),
        fetchBusinessHours(orgId),
        fetchOrgActivityLog(orgId, 100),
      ])

      setOrg(orgData)
      setStats(statsData)
      setUsers(usersData)
      setServices(servicesData)
      setHours(hoursData)
      setActivityLog(activityData)

      setEditName(orgData.name || '')
      setEditStatus(orgData.status || 'ACTIVE')
      setEditPlan((orgData.config_settings as Record<string, unknown>)?.plan as string || 'TRIAL')
      setEditPrompt(orgData.system_prompt || '')
      setEditWhatsApp(orgData.whatsapp_phone_id || '')
    } catch (e) {
      console.error('Error loading org detail:', e)
      setMessage({ type: 'error', text: 'Error cargando datos de la organización' })
    }
    setLoading(false)
  }, [orgId])

  useEffect(() => { loadData() }, [loadData])

  const handleSaveGeneral = async () => {
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      await updateOrganization(orgId, {
        name: editName,
        status: editStatus,
        whatsapp_phone_id: editWhatsApp || null,
        config_settings: {
          ...(org?.config_settings as Record<string, unknown> || {}),
          plan: editPlan,
        },
      })
      setMessage({ type: 'success', text: 'Organización actualizada' })
      loadData()
    } catch (e) {
      setMessage({ type: 'error', text: `Error: ${e instanceof Error ? e.message : 'desconocido'}` })
    }
    setSaving(false)
  }

  const handleSavePrompt = async () => {
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      await updateOrganization(orgId, { system_prompt: editPrompt })
      setMessage({ type: 'success', text: 'System prompt actualizado' })
    } catch (e) {
      setMessage({ type: 'error', text: `Error: ${e instanceof Error ? e.message : 'desconocido'}` })
    }
    setSaving(false)
  }

  const handleAddService = async () => {
    if (!newServiceName || !newServicePrice) return
    try {
      await createService(orgId, {
        name: newServiceName,
        price: parseInt(newServicePrice),
        duration_minutes: parseInt(newServiceDuration),
        category: newServiceCategory,
      })
      setNewServiceName('')
      setNewServicePrice('')
      loadData()
      setMessage({ type: 'success', text: 'Servicio agregado' })
    } catch (e) {
      setMessage({ type: 'error', text: `Error: ${e instanceof Error ? e.message : 'desconocido'}` })
    }
  }

  const handleDeleteService = async (serviceId: string) => {
    try {
      await deleteService(serviceId)
      loadData()
    } catch (e) {
      console.error(e)
    }
  }

  const handleToggleDay = async (hour: BusinessHour) => {
    try {
      await updateBusinessHour(hour.id, { is_open: !hour.is_open })
      loadData()
    } catch (e) {
      console.error(e)
    }
  }

  const handleUpdateHourTime = async (hour: BusinessHour, field: 'open_time' | 'close_time', value: string) => {
    try {
      await updateBusinessHour(hour.id, { [field]: value })
      loadData()
    } catch (e) {
      console.error(e)
    }
  }

  const handleTestWhatsApp = async () => {
    const phone = prompt('Número de teléfono para prueba (ej: 573001234567):')
    if (!phone) return
    try {
      await testWhatsApp(orgId, phone)
      setMessage({ type: 'success', text: `Mensaje de prueba enviado a ${phone}` })
    } catch (e) {
      setMessage({ type: 'error', text: `Error enviando mensaje: ${e instanceof Error ? e.message : 'desconocido'}` })
    }
  }

  const handlePopulateKB = async () => {
    try {
      await populateKnowledgeBase(orgId)
      setMessage({ type: 'success', text: 'Knowledge base poblada exitosamente' })
    } catch (e) {
      setMessage({ type: 'error', text: `Error: ${e instanceof Error ? e.message : 'desconocido'}` })
    }
  }

  if (loading) {
    return (
      <div className="max-w-[1200px] space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass-card p-6 animate-pulse">
            <div className="h-5 bg-surface-3 rounded w-48 mb-3" />
            <div className="h-4 bg-surface-3 rounded w-72" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-[1200px] space-y-5">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/admin')} className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
            <ChevronLeft size={16} />
          </button>
          <div>
            <h2 className="text-xl font-semibold text-text-primary">{org?.name as string || 'Organización'}</h2>
            <p className="text-text-dim text-xs mt-0.5 font-mono">{orgId}</p>
          </div>
        </div>
        <button onClick={loadData} className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<Users size={14} />} color="text-status-info" value={stats.patients.toString()} label="Pacientes" />
        <StatCard icon={<Calendar size={14} />} color="text-brand-purple" value={stats.appointments.toString()} label="Citas" />
        <StatCard icon={<MessageSquare size={14} />} color="text-brand-cyan" value={stats.interactions.toLocaleString()} label="Interacciones" />
        <StatCard icon={<DollarSign size={14} />} color="text-brand-gold" value={formatCOP(stats.revenue)} label="Revenue" />
      </div>

      {/* MESSAGE */}
      {message.text && (
        <div className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
          message.type === 'success' ? 'bg-status-success/10 border border-status-success/20 text-status-success' : 'bg-status-danger/10 border border-status-danger/20 text-status-danger'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          {message.text}
        </div>
      )}

      {/* TABS */}
      <div className="flex gap-0 border-b border-border overflow-x-auto">
        {([
          { id: 'general' as Tab, label: 'General', icon: Settings2 },
          { id: 'services' as Tab, label: 'Servicios', icon: ShoppingBag },
          { id: 'hours' as Tab, label: 'Horarios', icon: Clock },
          { id: 'users' as Tab, label: 'Usuarios', icon: Users },
          { id: 'prompt' as Tab, label: 'System Prompt', icon: BookOpen },
          { id: 'activity' as Tab, label: 'Actividad', icon: Activity },
        ]).map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setMessage({ type: '', text: '' }) }}
              className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 text-[11px] font-semibold transition-all whitespace-nowrap ${
                tab === t.id ? 'border-brand-purple text-brand-purple' : 'border-transparent text-text-dim hover:text-text-muted'
              }`}
            >
              <Icon size={13} />
              {t.label}
              {t.id === 'activity' && <span className="text-[9px] text-text-dim ml-1">({activityLog.length})</span>}
            </button>
          )
        })}
      </div>

      {/* TAB: General */}
      {tab === 'general' && (
        <div className="glass-card p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Nombre</label>
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary text-sm outline-none focus:border-brand-purple/40 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Estado</label>
              <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary text-sm outline-none focus:border-brand-purple/40 transition-all">
                <option value="ACTIVE">Activa</option>
                <option value="SETUP">En Setup</option>
                <option value="PAUSED">Pausada</option>
                <option value="CANCELLED">Cancelada</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Plan</label>
              <select value={editPlan} onChange={e => setEditPlan(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary text-sm outline-none focus:border-brand-purple/40 transition-all">
                <option value="TRIAL">Trial</option>
                <option value="BASIC">Starter</option>
                <option value="PRO">Pro</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">WhatsApp Phone ID</label>
              <input type="text" value={editWhatsApp} onChange={e => setEditWhatsApp(e.target.value)} placeholder="Meta Business phone ID" className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary placeholder:text-text-dim text-sm font-mono outline-none focus:border-brand-purple/40 transition-all" />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2 flex-wrap">
            <button onClick={handleSaveGeneral} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-purple/15 text-brand-purple font-semibold text-xs hover:bg-brand-purple/25 transition-colors disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Guardar Cambios
            </button>
            <button onClick={handleTestWhatsApp} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-status-success/10 border border-status-success/20 text-status-success font-semibold text-xs hover:bg-status-success/20 transition-colors">
              <Send size={12} /> Test WhatsApp
            </button>
            <button onClick={handlePopulateKB} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-status-info/10 border border-status-info/20 text-status-info font-semibold text-xs hover:bg-status-info/20 transition-colors">
              <BookOpen size={12} /> Poblar KB
            </button>
          </div>
        </div>
      )}

      {/* TAB: Services */}
      {tab === 'services' && (
        <div className="space-y-4">
          <div className="glass-card p-4">
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Agregar Servicio</h4>
            <div className="flex gap-2 flex-wrap">
              <input type="text" value={newServiceName} onChange={e => setNewServiceName(e.target.value)} placeholder="Nombre" className="flex-1 min-w-[150px] px-3 py-2 rounded-lg bg-surface-2 border border-border text-text-primary text-xs outline-none focus:border-brand-purple/40 transition-all" />
              <input type="number" value={newServicePrice} onChange={e => setNewServicePrice(e.target.value)} placeholder="Precio COP" className="w-32 px-3 py-2 rounded-lg bg-surface-2 border border-border text-text-primary text-xs font-mono outline-none focus:border-brand-purple/40 transition-all" />
              <input type="number" value={newServiceDuration} onChange={e => setNewServiceDuration(e.target.value)} placeholder="Min" className="w-20 px-3 py-2 rounded-lg bg-surface-2 border border-border text-text-primary text-xs font-mono outline-none focus:border-brand-purple/40 transition-all" />
              <select value={newServiceCategory} onChange={e => setNewServiceCategory(e.target.value)} className="px-3 py-2 rounded-lg bg-surface-2 border border-border text-text-primary text-xs outline-none focus:border-brand-purple/40 transition-all">
                <option value="GENERAL">General</option>
                <option value="ESTETICA">Estética</option>
                <option value="ODONTOLOGIA">Odontología</option>
                <option value="CONSULTA">Consulta</option>
              </select>
              <button onClick={handleAddService} className="px-3 py-2 rounded-lg bg-brand-purple/15 text-brand-purple text-xs font-semibold hover:bg-brand-purple/25 transition-colors">
                <Plus size={14} />
              </button>
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-text-dim uppercase tracking-wider">Servicio</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-text-dim uppercase tracking-wider">Categoría</th>
                  <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-text-dim uppercase tracking-wider">Precio</th>
                  <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-text-dim uppercase tracking-wider">Duración</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {services.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-text-dim text-xs">Sin servicios configurados</td></tr>
                ) : (
                  services.map(s => (
                    <tr key={s.id} className="border-b border-border/50 hover:bg-surface-3/50">
                      <td className="px-4 py-2.5 text-sm text-text-primary">{s.name}</td>
                      <td className="px-4 py-2.5 text-xs text-text-muted">{s.category}</td>
                      <td className="px-4 py-2.5 text-right text-sm font-mono text-text-primary">{formatCOP(s.price)}</td>
                      <td className="px-4 py-2.5 text-right text-xs text-text-muted">{s.duration_minutes}min</td>
                      <td className="px-4 py-2.5 text-right">
                        <button onClick={() => handleDeleteService(s.id)} className="text-text-dim hover:text-status-danger transition-colors"><Trash2 size={13} /></button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: Hours — Editable Grid */}
      {tab === 'hours' && (
        <div className="glass-card p-5">
          <div className="space-y-2">
            {hours.sort((a, b) => a.day_of_week - b.day_of_week).map(h => (
              <div key={h.id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${h.is_open ? 'bg-surface-2 border-border' : 'bg-surface-3/30 border-border/50'}`}>
                <div className="flex items-center gap-3">
                  <button onClick={() => handleToggleDay(h)} className={`w-9 h-5 rounded-full transition-all relative ${h.is_open ? 'bg-status-success' : 'bg-surface-3'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${h.is_open ? 'left-4' : 'left-0.5'}`} />
                  </button>
                  <span className={`text-sm font-medium w-28 ${h.is_open ? 'text-text-primary' : 'text-text-dim'}`}>
                    {DAY_NAMES[h.day_of_week]}
                  </span>
                </div>
                {h.is_open ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={h.open_time}
                      onChange={e => handleUpdateHourTime(h, 'open_time', e.target.value)}
                      className="px-2 py-1.5 rounded-lg bg-surface-3 border border-border text-text-primary text-xs font-mono outline-none focus:border-brand-purple/40 transition-all"
                    />
                    <span className="text-text-dim text-xs">—</span>
                    <input
                      type="time"
                      value={h.close_time}
                      onChange={e => handleUpdateHourTime(h, 'close_time', e.target.value)}
                      className="px-2 py-1.5 rounded-lg bg-surface-3 border border-border text-text-primary text-xs font-mono outline-none focus:border-brand-purple/40 transition-all"
                    />
                  </div>
                ) : (
                  <span className="text-xs text-text-dim">Cerrado</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: Users */}
      {tab === 'users' && (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-text-dim uppercase tracking-wider">User ID</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-text-dim uppercase tracking-wider">Rol</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-text-dim uppercase tracking-wider">Desde</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-border/50">
                  <td className="px-4 py-3 text-xs font-mono text-text-muted">{u.user_id}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      u.role === 'OWNER' ? 'bg-brand-gold/10 text-brand-gold border-brand-gold/20'
                      : u.role === 'ADMIN' ? 'bg-brand-purple/10 text-brand-purple border-brand-purple/20'
                      : 'bg-surface-3 text-text-dim border-border'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-dim">{new Date(u.created_at).toLocaleDateString('es-CO')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB: System Prompt */}
      {tab === 'prompt' && (
        <div className="space-y-4">
          <div className="glass-card p-5">
            <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">System Prompt de SofIA</label>
            <textarea
              value={editPrompt}
              onChange={e => setEditPrompt(e.target.value)}
              rows={18}
              className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary text-xs font-mono leading-relaxed outline-none focus:border-brand-purple/40 focus:ring-1 focus:ring-brand-purple/20 transition-all resize-y"
            />
            <div className="flex items-center justify-between mt-3">
              <span className="text-[10px] text-text-dim">{editPrompt.length} caracteres</span>
              <button onClick={handleSavePrompt} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-purple/15 text-brand-purple font-semibold text-xs hover:bg-brand-purple/25 transition-colors disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Guardar Prompt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Activity Log */}
      {tab === 'activity' && (
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-brand-purple" />
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Log de Actividad</h3>
            </div>
            <span className="text-[10px] text-text-dim">{activityLog.length} interacciones recientes</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-text-dim uppercase tracking-wider">Fecha</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-text-dim uppercase tracking-wider">Canal</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-text-dim uppercase tracking-wider">Intent</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-text-dim uppercase tracking-wider">Teléfono</th>
                </tr>
              </thead>
              <tbody>
                {activityLog.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-12 text-center text-text-dim text-xs">Sin actividad registrada</td></tr>
                ) : (
                  activityLog.map(a => (
                    <tr key={a.id} className="border-b border-border/50 hover:bg-surface-3/50">
                      <td className="px-4 py-2.5 text-xs text-text-muted">{timeAgo(a.created_at)}</td>
                      <td className="px-4 py-2.5">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-3 border border-border text-text-muted uppercase">{a.channel}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-medium ${INTENT_COLORS[a.intent] || 'text-text-muted'}`}>{a.intent}</span>
                      </td>
                      <td className="px-4 py-2.5 text-xs font-mono text-text-dim">{a.patient_phone || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, color, value, label }: { icon: React.ReactNode; color: string; value: string; label: string }) {
  return (
    <div className="glass-card p-3.5">
      <div className={`${color} mb-1.5`}>{icon}</div>
      <div className="text-lg font-bold font-mono text-text-primary">{value}</div>
      <div className="text-[10px] text-text-muted">{label}</div>
    </div>
  )
}
