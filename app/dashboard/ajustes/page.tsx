'use client'

import { useEffect, useState, useCallback } from 'react'
import { useOrg } from '@/lib/org-context'
import { fetchOrganization, fetchServicesCatalog, fetchBusinessHours, updateOrganization } from '@/lib/api'
import { Tabs } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import { PromptTab, ServicesTab, HoursTab, NotificationsTab, TemplatesTab, BotsTab, ChannelsTab, SecurityTab } from './tabs'
import type { Organization, ServiceCatalog, BusinessHour } from '@/types'
import { MessageSquare, Clock, ShoppingBag, Bell, Phone, Activity, RefreshCw, Shield, Wifi, Lock } from 'lucide-react'

const TAB_DEFS = [
  { id: 'prompt', label: 'System Prompt', icon: MessageSquare },
  { id: 'services', label: 'Catalogo', icon: ShoppingBag },
  { id: 'hours', label: 'Horarios', icon: Clock },
  { id: 'notifications', label: 'Notificaciones', icon: Bell },
  { id: 'templates', label: 'Plantillas WA', icon: Phone },
  { id: 'bots', label: 'Bot Monitor', icon: Activity },
  { id: 'channels', label: 'Canales', icon: Wifi },
  { id: 'security', label: 'Seguridad', icon: Lock },
]

export default function AjustesPage() {
  const { orgId, role } = useOrg()
  const toast = useToast()
  const isReadOnly = role === 'STAFF'
  const [activeTab, setActiveTab] = useState('prompt')
  const [org, setOrg] = useState<Organization | null>(null)
  const [services, setServices] = useState<ServiceCatalog[]>([])
  const [hours, setHours] = useState<BusinessHour[]>([])
  const [loading, setLoading] = useState(true)
  const [systemPrompt, setSystemPrompt] = useState('')
  const [saving, setSaving] = useState(false)

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
      setServices(servData)
      setHours(hoursData)
    } catch {
      // Settings load failed — UI will show empty state
    }
    setLoading(false)
  }, [orgId])

  useEffect(() => { loadData() }, [loadData])

  const handleMessage = (msg: string) => {
    if (msg.startsWith('Error')) {
      toast.error(msg)
    } else {
      toast.success(msg)
    }
  }

  const savePrompt = async () => {
    if (!orgId || isReadOnly) return
    setSaving(true)
    try {
      await updateOrganization(orgId, { system_prompt: systemPrompt })
      toast.success('System prompt guardado')
    } catch (e) {
      toast.error('Error: ' + (e instanceof Error ? e.message : 'desconocido'))
    }
    setSaving(false)
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
      {isReadOnly && (
        <div className="px-4 py-3 rounded-xl bg-status-warning/10 border border-status-warning/20 text-xs text-status-warning font-semibold flex items-center gap-2">
          <Shield size={14} />
          Solo lectura — Tu rol ({role}) no permite modificar la configuracion. Contacta al administrador.
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Ajustes</h2>
          <p className="text-text-dim text-xs mt-0.5">{org?.name || 'Configuracion de la clinica'}</p>
        </div>
        <button onClick={loadData} aria-label="Actualizar" className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      <Tabs tabs={TAB_DEFS} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'prompt' && (
        <PromptTab systemPrompt={systemPrompt} onChangePrompt={setSystemPrompt} onSave={savePrompt} saving={saving} isReadOnly={isReadOnly} />
      )}
      {activeTab === 'services' && (
        <ServicesTab orgId={orgId} services={services} isReadOnly={isReadOnly} onRefresh={loadData} onMessage={handleMessage} />
      )}
      {activeTab === 'hours' && (
        <HoursTab hours={hours} onRefresh={loadData} />
      )}
      {activeTab === 'notifications' && org && (
        <NotificationsTab orgId={orgId} org={org} isReadOnly={isReadOnly} onMessage={handleMessage} />
      )}
      {activeTab === 'templates' && org && (
        <TemplatesTab orgId={orgId} org={org} isReadOnly={isReadOnly} onMessage={handleMessage} />
      )}
      {activeTab === 'bots' && (
        <BotsTab orgId={orgId} />
      )}
      {activeTab === 'channels' && (
        <ChannelsTab orgId={orgId} isReadOnly={isReadOnly} onMessage={handleMessage} />
      )}
      {activeTab === 'security' && (
        <SecurityTab />
      )}
    </div>
  )
}
