'use client'

import { useEffect, useState, useCallback } from 'react'
import { useOrg } from '@/lib/org-context'
import { useToast } from '@/components/ui/toast'
import * as Sentry from '@sentry/nextjs'
import { browseConnectors, getCategories, installConnector, listInstalled, uninstallConnector, listPlugins, createPlugin, updatePlugin, deletePlugin, testPlugin } from '@/lib/api/marketplace'
import type { Connector, InstalledConnector, Plugin } from '@/lib/api/marketplace'
import { useTranslations } from 'next-intl'
import { Store, Puzzle, Plus, Trash2, Play, Download, CheckCircle, Search, Star, ToggleLeft, ToggleRight } from 'lucide-react'

type Tab = 'browse' | 'installed' | 'plugins'

export default function MarketplacePage() {
  const { orgId, role } = useOrg()
  const toast = useToast()
  const t = useTranslations('marketplacePage')
  const isReadOnly = role === 'STAFF'

  const [tab, setTab] = useState<Tab>('browse')
  const [connectors, setConnectors] = useState<Connector[]>([])
  const [installed, setInstalled] = useState<InstalledConnector[]>([])
  const [plugins, setPlugins] = useState<Plugin[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCat, setSelectedCat] = useState('')
  const [searchQ, setSearchQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [showPluginForm, setShowPluginForm] = useState(false)
  const [pName, setPName] = useState('')
  const [pHook, setPHook] = useState('before_ai_call')
  const [pUrl, setPUrl] = useState('')
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [c, cats, inst, pl] = await Promise.all([
        browseConnectors({ category: selectedCat || undefined, search: searchQ || undefined }),
        getCategories(),
        listInstalled(orgId),
        listPlugins(orgId),
      ])
      setConnectors(c)
      setCategories(cats)
      setInstalled(inst)
      setPlugins(pl)
    } catch (err) {
      Sentry.captureException(err)
      toast.error(t('loadError'))
    }
    setLoading(false)
  }, [orgId, selectedCat, searchQ])

  useEffect(() => { load() }, [load])

  const handleInstall = async (slug: string) => {
    try {
      await installConnector(orgId, slug)
      setMsg('Instalado')
      load()
    } catch (err) {
      Sentry.captureException(err)
      toast.error(t('installError'))
    }
    setTimeout(() => setMsg(''), 2000)
  }

  const handleUninstall = async (installId: string) => {
    try {
      await uninstallConnector(orgId, installId)
      load()
    } catch (err) {
      Sentry.captureException(err)
      toast.error(t('uninstallError'))
    }
  }

  const handleCreatePlugin = async () => {
    if (!pName || !pUrl) return
    try {
      await createPlugin(orgId, { name: pName, hook_point: pHook, webhook_url: pUrl })
      setShowPluginForm(false); setPName(''); setPUrl('')
      load()
    } catch (err) {
      Sentry.captureException(err)
      toast.error(t('createPluginError'))
    }
  }

  const handleTogglePlugin = async (p: Plugin) => {
    try {
      await updatePlugin(orgId, p.id, { is_active: !p.is_active })
      load()
    } catch (err) {
      Sentry.captureException(err)
      toast.error(t('toggleError'))
    }
  }

  const handleTestPlugin = async (p: Plugin) => {
    try {
      const r = await testPlugin(orgId, p.id)
      setMsg(r.success ? `OK (${r.response_time_ms}ms)` : 'Fallo')
    } catch (err) {
      Sentry.captureException(err)
      toast.error(t('testError'))
    }
    setTimeout(() => setMsg(''), 2000)
  }

  const hookPoints = ['before_ai_call', 'after_ai_call', 'before_appointment', 'after_appointment', 'before_payment', 'after_payment', 'on_patient_create', 'on_message_receive']

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-mono font-bold text-text-primary tracking-wide flex items-center gap-2">
            <Store size={16} className="text-brand-purple" />
            {t('title')}
          </h1>
          <p className="text-[10px] font-mono text-text-dim mt-0.5">{t('subtitle')}</p>
        </div>
      </div>

      {msg && <div className="text-[10px] font-mono text-status-success bg-status-success/8 px-3 py-1.5 rounded border border-status-success/15">{msg}</div>}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border">
        {([
          { id: 'browse' as Tab, icon: Store, label: t('browse') },
          { id: 'installed' as Tab, icon: CheckCircle, label: `${t('installed')} (${installed.length})` },
          { id: 'plugins' as Tab, icon: Puzzle, label: `${t('plugins')} (${plugins.length})` },
        ]).map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)}
            className={`flex items-center gap-1 text-[10px] font-mono font-semibold pb-1.5 border-b-2 transition-colors ${
              tab === tb.id ? 'text-brand-purple border-brand-purple' : 'text-text-dim border-transparent hover:text-text-muted'
            }`}><tb.icon size={12} /> {tb.label}</button>
        ))}
      </div>

      {/* Browse */}
      {tab === 'browse' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-dim" />
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder={t('search')}
                className="w-full text-[10px] font-mono bg-surface-2 border border-border rounded pl-7 pr-3 py-1.5 text-text-primary" />
            </div>
            <select value={selectedCat} onChange={e => setSelectedCat(e.target.value)}
              className="text-[10px] font-mono bg-surface-2 border border-border rounded px-2 py-1 text-text-secondary">
              <option value="">{t('allCategories')}</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {loading ? (
            <p className="text-[10px] font-mono text-text-dim py-8 text-center">...</p>
          ) : connectors.length === 0 ? (
            <p className="text-[10px] font-mono text-text-dim py-8 text-center">{t('noConnectors')}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {connectors.map(c => {
                const isInstalled = installed.some(i => i.connector_slug === c.slug)
                return (
                  <div key={c.slug} className="border border-border rounded-lg p-4 hover:bg-surface-2/30 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-mono font-bold text-text-primary">{c.name}</span>
                          {c.is_official && <span className="text-[7px] font-mono bg-brand-purple/10 text-brand-purple px-1 py-0.5 rounded font-semibold">{t('official')}</span>}
                        </div>
                        <p className="text-[9px] font-mono text-text-dim mt-0.5">{c.author}</p>
                      </div>
                      <span className="text-[8px] font-mono bg-surface-2 border border-border rounded px-1.5 py-0.5 text-text-dim">{c.category}</span>
                    </div>
                    <p className="text-[10px] font-mono text-text-muted mt-2 line-clamp-2">{c.description}</p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono text-brand-gold flex items-center gap-0.5"><Star size={10} /> {c.avg_rating.toFixed(1)}</span>
                        <span className="text-[9px] font-mono text-text-dim flex items-center gap-0.5"><Download size={10} /> {c.install_count}</span>
                      </div>
                      {!isReadOnly && (
                        isInstalled ? (
                          <span className="text-[9px] font-mono text-status-success flex items-center gap-1"><CheckCircle size={10} /> {t('installed')}</span>
                        ) : (
                          <button onClick={() => handleInstall(c.slug)}
                            className="text-[9px] font-mono text-brand-purple hover:text-brand-purple/80 font-semibold flex items-center gap-1">
                            <Download size={10} /> {t('install')}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Installed */}
      {tab === 'installed' && (
        <div className="space-y-2">
          {installed.length === 0 ? (
            <div className="text-center py-12">
              <Store size={24} className="mx-auto text-text-dim/30 mb-2" />
              <p className="text-[10px] font-mono text-text-dim">{t('noInstalled')}</p>
              <p className="text-[9px] font-mono text-text-dim/70 mt-1">{t('noInstalledHint')}</p>
            </div>
          ) : installed.map(i => (
            <div key={i.id} className="flex items-center justify-between border border-border rounded-lg px-3 py-2.5 hover:bg-surface-2/30 transition-colors">
              <div>
                <p className="text-[11px] font-mono font-semibold text-text-primary">{i.connector_name}</p>
                <p className="text-[9px] font-mono text-text-dim">{i.status}</p>
              </div>
              {!isReadOnly && (
                <button onClick={() => handleUninstall(i.id)}
                  className="text-[9px] font-mono text-status-danger hover:text-status-danger/80 flex items-center gap-1">
                  <Trash2 size={10} /> {t('uninstall')}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Plugins */}
      {tab === 'plugins' && (
        <div className="space-y-3">
          {!isReadOnly && (
            <button onClick={() => setShowPluginForm(!showPluginForm)}
              className="flex items-center gap-1 px-2 py-1 rounded bg-brand-purple/10 border border-brand-purple/20 text-brand-purple text-[10px] font-mono font-semibold hover:bg-brand-purple/20 transition-colors">
              <Plus size={12} /> {t('createPlugin')}
            </button>
          )}

          {showPluginForm && (
            <div className="border border-border rounded-lg p-4 space-y-3 bg-surface-2/50">
              <input value={pName} onChange={e => setPName(e.target.value)} placeholder={t('pluginName')}
                className="w-full text-[11px] font-mono bg-surface border border-border rounded px-3 py-1.5 text-text-primary" />
              <select value={pHook} onChange={e => setPHook(e.target.value)}
                className="w-full text-[11px] font-mono bg-surface border border-border rounded px-3 py-1.5 text-text-primary">
                {hookPoints.map(hp => (
                  <option key={hp} value={hp}>{(() => { try { return t(`hookPoints.${hp}`) } catch { return hp } })()}</option>
                ))}
              </select>
              <input value={pUrl} onChange={e => setPUrl(e.target.value)} placeholder={t('webhookUrl')}
                className="w-full text-[11px] font-mono bg-surface border border-border rounded px-3 py-1.5 text-text-primary" />
              <button onClick={handleCreatePlugin} className="px-3 py-1 rounded bg-brand-purple text-white text-[10px] font-mono font-semibold">
                {t('createPlugin')}
              </button>
            </div>
          )}

          {plugins.length === 0 && !showPluginForm ? (
            <p className="text-[10px] font-mono text-text-dim py-8 text-center">Sin plugins configurados</p>
          ) : plugins.map(p => (
            <div key={p.id} className="border border-border rounded-lg p-3 hover:bg-surface-2/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${p.is_active ? 'bg-status-success' : 'bg-text-dim'}`} />
                  <span className="text-[11px] font-mono font-semibold text-text-primary">{p.name}</span>
                  <span className="text-[8px] font-mono bg-surface-2 border border-border rounded px-1.5 py-0.5 text-text-dim">
                    {(() => { try { return t(`hookPoints.${p.hook_point}`) } catch { return p.hook_point } })()}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleTestPlugin(p)} className="p-1 rounded hover:bg-surface-2 text-text-dim hover:text-brand-purple transition-colors">
                    <Play size={12} />
                  </button>
                  <button onClick={() => handleTogglePlugin(p)} className="p-1 rounded hover:bg-surface-2 text-text-dim hover:text-text-primary transition-colors">
                    {p.is_active ? <ToggleRight size={14} className="text-status-success" /> : <ToggleLeft size={14} />}
                  </button>
                  {!isReadOnly && (
                    <button onClick={async () => { try { await deletePlugin(orgId, p.id); load() } catch (err) { Sentry.captureException(err); toast.error(t('deleteError')) } }}
                      className="p-1 rounded hover:bg-status-danger/10 text-text-dim hover:text-status-danger transition-colors">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[9px] font-mono text-text-dim mt-1">{p.webhook_url}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
