'use client'

import { useEffect, useState, useCallback } from 'react'
import { useOrg } from '@/lib/org-context'
import { listWebhookEndpoints, createWebhookEndpoint, updateWebhookEndpoint, deleteWebhookEndpoint, testWebhookEndpoint, listWebhookDeliveries, retryWebhookDelivery, getWebhookEventCatalog } from '@/lib/api/webhooks'
import type { WebhookEndpoint, WebhookDelivery } from '@/lib/api/webhooks'
import { useTranslations } from 'next-intl'
import { Webhook, Plus, Trash2, Play, RefreshCw, CheckCircle, XCircle, Eye, EyeOff, Copy } from 'lucide-react'

type Tab = 'endpoints' | 'deliveries'

export default function WebhooksPage() {
  const { orgId, role } = useOrg()
  const t = useTranslations('webhooksPage')
  const isReadOnly = role === 'STAFF'

  const [tab, setTab] = useState<Tab>('endpoints')
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([])
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([])
  const [eventCatalog, setEventCatalog] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [newEvents, setNewEvents] = useState<string[]>([])
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({})
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [eps, evts] = await Promise.all([
        listWebhookEndpoints(orgId),
        getWebhookEventCatalog(orgId),
      ])
      setEndpoints(eps)
      setEventCatalog(evts)
    } catch { /* */ }
    setLoading(false)
  }, [orgId])

  const loadDeliveries = useCallback(async () => {
    const d = await listWebhookDeliveries(orgId)
    setDeliveries(d)
  }, [orgId])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (tab === 'deliveries') loadDeliveries() }, [tab, loadDeliveries])

  const handleCreate = async () => {
    if (!newName || !newUrl || newEvents.length === 0) return
    try {
      await createWebhookEndpoint(orgId, { name: newName, url: newUrl, event_types: newEvents })
      setShowCreate(false); setNewName(''); setNewUrl(''); setNewEvents([])
      load()
    } catch { setMsg('Error al crear webhook') }
  }

  const handleToggle = async (ep: WebhookEndpoint) => {
    await updateWebhookEndpoint(orgId, ep.id, { is_active: !ep.is_active })
    load()
  }

  const handleDelete = async (ep: WebhookEndpoint) => {
    if (!confirm(t('deleteConfirm'))) return
    await deleteWebhookEndpoint(orgId, ep.id)
    load()
  }

  const handleTest = async (ep: WebhookEndpoint) => {
    try {
      const r = await testWebhookEndpoint(orgId, ep.id)
      setMsg(r.success ? t('testSuccess') : t('testFail'))
    } catch { setMsg(t('testFail')) }
    setTimeout(() => setMsg(''), 3000)
  }

  const handleRetry = async (d: WebhookDelivery) => {
    await retryWebhookDelivery(orgId, d.id)
    loadDeliveries()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-mono font-bold text-text-primary tracking-wide flex items-center gap-2">
            <Webhook size={16} className="text-brand-purple" />
            {t('title')}
          </h1>
          <p className="text-[10px] font-mono text-text-dim mt-0.5">{t('subtitle')}</p>
        </div>
        {!isReadOnly && (
          <button onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1 px-2 py-1 rounded bg-brand-purple/10 border border-brand-purple/20 text-brand-purple text-[10px] font-mono font-semibold hover:bg-brand-purple/20 transition-colors">
            <Plus size={12} /> {t('create')}
          </button>
        )}
      </div>

      {msg && <div className="text-[10px] font-mono text-status-success bg-status-success/8 px-3 py-1.5 rounded border border-status-success/15">{msg}</div>}

      {/* Create form */}
      {showCreate && (
        <div className="border border-border rounded-lg p-4 space-y-3 bg-surface-2/50">
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder={t('name')}
            className="w-full text-[11px] font-mono bg-surface border border-border rounded px-3 py-1.5 text-text-primary" />
          <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://..."
            className="w-full text-[11px] font-mono bg-surface border border-border rounded px-3 py-1.5 text-text-primary" />
          <div>
            <p className="text-[9px] font-mono text-text-dim uppercase tracking-wider mb-1">{t('events')}</p>
            <div className="flex flex-wrap gap-1">
              {eventCatalog.map(ev => (
                <button key={ev} onClick={() => setNewEvents(prev => prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev])}
                  className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-colors ${
                    newEvents.includes(ev) ? 'bg-brand-purple/15 border-brand-purple/30 text-brand-purple' : 'border-border text-text-dim hover:text-text-muted'
                  }`}>{ev}</button>
              ))}
            </div>
          </div>
          <button onClick={handleCreate} className="px-3 py-1 rounded bg-brand-purple text-white text-[10px] font-mono font-semibold hover:bg-brand-purple/90">
            {t('create')}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border">
        {(['endpoints', 'deliveries'] as Tab[]).map(tb => (
          <button key={tb} onClick={() => setTab(tb)}
            className={`text-[10px] font-mono font-semibold pb-1.5 border-b-2 transition-colors ${
              tab === tb ? 'text-brand-purple border-brand-purple' : 'text-text-dim border-transparent hover:text-text-muted'
            }`}>{tb === 'endpoints' ? 'Endpoints' : t('deliveries')}</button>
        ))}
      </div>

      {/* Endpoints list */}
      {tab === 'endpoints' && (
        <div className="space-y-2">
          {loading ? (
            <p className="text-[10px] font-mono text-text-dim py-8 text-center">...</p>
          ) : endpoints.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[10px] font-mono text-text-dim">{t('noEndpoints')}</p>
              <p className="text-[9px] font-mono text-text-dim/70 mt-1">{t('noEndpointsHint')}</p>
            </div>
          ) : endpoints.map(ep => (
            <div key={ep.id} className="border border-border rounded-lg p-3 hover:bg-surface-2/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${ep.is_active ? 'bg-status-success' : 'bg-text-dim'}`} />
                  <span className="text-[11px] font-mono font-semibold text-text-primary">{ep.name}</span>
                  <span className="text-[9px] font-mono text-text-dim">{ep.url}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleTest(ep)} title={t('test')}
                    className="p-1 rounded hover:bg-surface-2 text-text-muted hover:text-brand-purple transition-colors">
                    <Play size={12} />
                  </button>
                  <button onClick={() => handleToggle(ep)}
                    className="p-1 rounded hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors">
                    {ep.is_active ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                  {!isReadOnly && (
                    <button onClick={() => handleDelete(ep)}
                      className="p-1 rounded hover:bg-status-danger/10 text-text-dim hover:text-status-danger transition-colors">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                {ep.event_types.map(ev => (
                  <span key={ev} className="text-[8px] font-mono bg-surface-2 border border-border rounded px-1.5 py-0.5 text-text-dim">{ev}</span>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[8px] font-mono text-text-dim">{t('signingSecret')}:</span>
                <span className="text-[8px] font-mono text-text-muted">
                  {showSecret[ep.id] ? ep.signing_secret : '••••••••••••'}
                </span>
                <button onClick={() => setShowSecret(prev => ({ ...prev, [ep.id]: !prev[ep.id] }))}
                  className="text-text-dim hover:text-text-muted"><Eye size={10} /></button>
                <button onClick={() => navigator.clipboard.writeText(ep.signing_secret)}
                  className="text-text-dim hover:text-text-muted"><Copy size={10} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Deliveries list */}
      {tab === 'deliveries' && (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-2 border-b border-border">
                <th className="text-left text-[9px] font-mono font-medium uppercase tracking-wider text-text-dim px-3 py-2">{t('status')}</th>
                <th className="text-left text-[9px] font-mono font-medium uppercase tracking-wider text-text-dim px-3 py-2">{t('events')}</th>
                <th className="text-left text-[9px] font-mono font-medium uppercase tracking-wider text-text-dim px-3 py-2">HTTP</th>
                <th className="text-left text-[9px] font-mono font-medium uppercase tracking-wider text-text-dim px-3 py-2">Intentos</th>
                <th className="text-left text-[9px] font-mono font-medium uppercase tracking-wider text-text-dim px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {deliveries.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-[10px] font-mono text-text-dim py-8">Sin entregas</td></tr>
              ) : deliveries.map(d => (
                <tr key={d.id} className="border-b border-border/50 hover:bg-surface-2/50">
                  <td className="px-3 py-2">
                    {d.status === 'SUCCESS' ? <CheckCircle size={14} className="text-status-success" />
                      : d.status === 'FAILED' ? <XCircle size={14} className="text-status-danger" />
                      : <RefreshCw size={14} className="text-text-dim animate-spin" />}
                  </td>
                  <td className="px-3 py-2 text-[10px] font-mono text-text-secondary">{d.event_type}</td>
                  <td className="px-3 py-2 text-[10px] font-mono text-text-muted">{d.http_status || '—'}</td>
                  <td className="px-3 py-2 text-[10px] font-mono text-text-muted">{d.attempts}</td>
                  <td className="px-3 py-2">
                    {d.status === 'FAILED' && (
                      <button onClick={() => handleRetry(d)} className="text-[9px] font-mono text-brand-purple hover:text-brand-purple/80">
                        {t('retry')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
