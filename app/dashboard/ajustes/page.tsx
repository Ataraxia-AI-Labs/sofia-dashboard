'use client'

import { useEffect, useState, useCallback } from 'react'
import { useOrg } from '@/lib/org-context'
import { fetchOrganization, fetchServicesCatalog, fetchBusinessHours, updateOrganization } from '@/lib/api'
import { Tabs } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import { PromptTab, ServicesTab, HoursTab, NotificationsTab, TemplatesTab, BotsTab, ChannelsTab, SecurityTab, BrandingTab, PricingTab, ApiKeysTab, WebchatTab } from './tabs'
import type { Organization, ServiceCatalog, BusinessHour } from '@/types'
import { useTranslations } from 'next-intl'
import { MessageSquare, Clock, ShoppingBag, Bell, Phone, Activity, RefreshCw, Shield, Wifi, Lock, Palette, DollarSign, Key, MessageCircle } from 'lucide-react'

const TAB_ICONS: Record<string, typeof MessageSquare> = {
  prompt: MessageSquare,
  services: ShoppingBag,
  hours: Clock,
  notifications: Bell,
  templates: Phone,
  bots: Activity,
  channels: Wifi,
  security: Lock,
  branding: Palette,
  pricing: DollarSign,
  apikeys: Key,
  webchat: MessageCircle,
}

const TAB_IDS = ['prompt', 'services', 'hours', 'notifications', 'templates', 'bots', 'channels', 'security', 'branding', 'pricing', 'apikeys', 'webchat']

export default function AjustesPage() {
  const { orgId, role } = useOrg()
  const toast = useToast()
  const t = useTranslations('settings')
  const tCommon = useTranslations('common')

  const TAB_DEFS = TAB_IDS.map(id => ({
    id,
    label: t.has(`tabs.${id}`) ? t(`tabs.${id}`) : id,
    icon: TAB_ICONS[id],
  }))
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
      toast.success(t('promptSaved'))
    } catch (e) {
      toast.error(t('errorPrefix') + (e instanceof Error ? e.message : tCommon('errorUnknown')))
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="max-w-[1000px] space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass-card p-4 animate-pulse">
            <div className="h-4 bg-surface-3 rounded w-40 mb-3" />
            <div className="h-28 bg-surface-3 rounded" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-[1000px] space-y-4">
      {isReadOnly && (
        <div className="px-3 py-2.5 rounded-lg bg-status-warning/10 border border-status-warning/20 text-[10px] font-mono text-status-warning font-semibold flex items-center gap-2">
          <Shield size={12} />
          {t('readOnly', { role })}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-mono font-bold uppercase tracking-wide text-text-primary">{t('title')}</h2>
          <p className="text-text-dim text-[9px] font-mono mt-0.5">{org?.name || t('subtitle')}</p>
        </div>
        <button onClick={loadData} aria-label={tCommon('refresh')} className="w-7 h-7 rounded-md bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
          <RefreshCw size={13} />
        </button>
      </div>

      <Tabs tabs={TAB_DEFS} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'prompt' && (
        <PromptTab systemPrompt={systemPrompt} onChangePrompt={setSystemPrompt} onSave={savePrompt} saving={saving} isReadOnly={isReadOnly} orgId={orgId} />
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
      {activeTab === 'branding' && org && (
        <BrandingTab orgId={orgId} org={org} isReadOnly={isReadOnly} onMessage={handleMessage} onRefresh={loadData} />
      )}
      {activeTab === 'pricing' && (
        <PricingTab orgId={orgId} isReadOnly={isReadOnly} onMessage={handleMessage} />
      )}
      {activeTab === 'apikeys' && (
        <ApiKeysTab orgId={orgId} isReadOnly={isReadOnly} onMessage={handleMessage} />
      )}
      {activeTab === 'webchat' && (
        <WebchatTab orgId={orgId} isReadOnly={isReadOnly} onMessage={handleMessage} />
      )}
    </div>
  )
}
