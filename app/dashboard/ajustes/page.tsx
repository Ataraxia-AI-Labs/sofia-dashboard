'use client'

import { useEffect, useState, useCallback } from 'react'
import { useOrg } from '@/lib/org-context'
import { fetchOrganization, fetchServicesCatalog, fetchBusinessHours, updateOrganization } from '@/lib/api'
import { Tabs } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import { PromptTab, ServicesTab, HoursTab, NotificationsTab, TemplatesTab, BotsTab, ChannelsTab, LanguageTab } from './tabs'
import type { Organization, ServiceCatalog, BusinessHour } from '@/types'
import { MessageSquare, Clock, ShoppingBag, Bell, Phone, Activity, RefreshCw, Shield, Wifi, Globe } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function AjustesPage() {
  const { orgId, role } = useOrg()
  const toast = useToast()
  const t = useTranslations('settings')
  const tCommon = useTranslations('common')
  const isReadOnly = role === 'STAFF'
  const [activeTab, setActiveTab] = useState('prompt')
  const [org, setOrg] = useState<Organization | null>(null)
  const [services, setServices] = useState<ServiceCatalog[]>([])
  const [hours, setHours] = useState<BusinessHour[]>([])
  const [loading, setLoading] = useState(true)
  const [systemPrompt, setSystemPrompt] = useState('')
  const [saving, setSaving] = useState(false)

  const TAB_DEFS = [
    { id: 'prompt', label: t('tabs.prompt'), icon: MessageSquare },
    { id: 'services', label: t('tabs.services'), icon: ShoppingBag },
    { id: 'hours', label: t('tabs.hours'), icon: Clock },
    { id: 'notifications', label: t('tabs.notifications'), icon: Bell },
    { id: 'templates', label: t('tabs.templates'), icon: Phone },
    { id: 'bots', label: t('tabs.bots'), icon: Activity },
    { id: 'channels', label: t('tabs.channels'), icon: Wifi },
    { id: 'language', label: t('tabs.language'), icon: Globe },
  ]

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
      toast.error(tCommon('error') + ': ' + (e instanceof Error ? e.message : tCommon('errorUnknown')))
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
          {t('readOnly', { role: role ?? '' })}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">{t('title')}</h2>
          <p className="text-text-dim text-xs mt-0.5">{org?.name || t('subtitle')}</p>
        </div>
        <button onClick={loadData} aria-label={tCommon('refresh')} className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
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
      {activeTab === 'language' && (
        <LanguageTab />
      )}
    </div>
  )
}

