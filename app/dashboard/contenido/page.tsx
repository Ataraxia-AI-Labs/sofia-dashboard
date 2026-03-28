'use client'

import { useEffect, useState, useCallback } from 'react'
import { useOrg } from '@/lib/org-context'
import { listContent, createContent, suggestTopics, getContentAnalytics, getContentCalendar } from '@/lib/api/content'
import type { ContentItem } from '@/lib/api/content'
import { useTranslations } from 'next-intl'
import { Palette, Plus, Sparkles, BarChart3, Calendar } from 'lucide-react'

type Tab = 'list' | 'analytics' | 'calendar'

export default function ContenidoPage() {
  const { orgId, role } = useOrg()
  const t = useTranslations('contentPage')
  const isReadOnly = role === 'STAFF'

  const [tab, setTab] = useState<Tab>('list')
  const [items, setItems] = useState<ContentItem[]>([])
  const [analytics, setAnalytics] = useState<Record<string, unknown>>({})
  const [calendar, setCalendar] = useState<Record<string, unknown>>({})
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [topics, setTopics] = useState<string[]>([])
  const [newPlatform, setNewPlatform] = useState('INSTAGRAM')
  const [newTitle, setNewTitle] = useState('')
  const [newBody, setNewBody] = useState('')
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [c, a] = await Promise.all([listContent(orgId), getContentAnalytics(orgId)])
      setItems(c)
      setAnalytics(a)
    } catch { /* */ }
    setLoading(false)
  }, [orgId])

  useEffect(() => { load() }, [load])

  const handleSuggest = async () => {
    const t = await suggestTopics(orgId)
    setTopics(t)
  }

  const handleGenerateCalendar = async () => {
    setCalendarLoading(true)
    try {
      const cal = await getContentCalendar(orgId)
      setCalendar(cal)
    } catch { /* */ }
    setCalendarLoading(false)
  }

  const handleCreate = async () => {
    if (!newTitle || !newBody) return
    try {
      await createContent(orgId, { platform: newPlatform, content_type: 'POST', title: newTitle, body: newBody })
      setShowCreate(false); setNewTitle(''); setNewBody('')
      load()
    } catch { setMsg('Error al crear') }
    setTimeout(() => setMsg(''), 2000)
  }

  const statusBadge = (s: string) => {
    switch (s) {
      case 'PUBLISHED': return 'bg-status-success/8 text-status-success'
      case 'SCHEDULED': return 'bg-status-info/8 text-status-info'
      case 'DRAFT': return 'bg-surface-2 text-text-dim'
      default: return 'bg-surface-2 text-text-dim'
    }
  }

  const platforms = ['INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'LINKEDIN', 'TWITTER'] as const

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-mono font-bold text-text-primary tracking-wide flex items-center gap-2">
            <Palette size={16} className="text-brand-purple" />
            {t('title')}
          </h1>
          <p className="text-[10px] font-mono text-text-dim mt-0.5">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSuggest}
            className="flex items-center gap-1 px-2 py-1 rounded bg-surface-2 border border-border text-text-muted text-[10px] font-mono hover:text-text-primary transition-colors">
            <Sparkles size={12} /> {t('suggest')}
          </button>
          {!isReadOnly && (
            <button onClick={() => setShowCreate(!showCreate)}
              className="flex items-center gap-1 px-2 py-1 rounded bg-brand-purple/10 border border-brand-purple/20 text-brand-purple text-[10px] font-mono font-semibold hover:bg-brand-purple/20 transition-colors">
              <Plus size={12} /> {t('create')}
            </button>
          )}
        </div>
      </div>

      {msg && <div className="text-[10px] font-mono text-status-success bg-status-success/8 px-3 py-1.5 rounded border border-status-success/15">{msg}</div>}

      {/* Suggested topics */}
      {topics.length > 0 && (
        <div className="border border-brand-purple/15 rounded-lg p-3 bg-brand-purple/3">
          <p className="text-[9px] font-mono text-brand-purple uppercase tracking-wider mb-2 flex items-center gap-1">
            <Sparkles size={10} /> Temas sugeridos por IA
          </p>
          <div className="flex flex-wrap gap-1">
            {topics.map((topic, i) => (
              <button key={i} onClick={() => { setNewTitle(topic); setShowCreate(true) }}
                className="text-[9px] font-mono bg-brand-purple/8 border border-brand-purple/15 rounded px-2 py-0.5 text-brand-purple hover:bg-brand-purple/15 transition-colors">
                {topic}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="border border-border rounded-lg p-4 space-y-3 bg-surface-2/50">
          <div className="flex gap-2">
            {platforms.map(p => (
              <button key={p} onClick={() => setNewPlatform(p)}
                className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-colors ${
                  newPlatform === p ? 'bg-brand-purple/10 border-brand-purple/30 text-brand-purple' : 'border-border text-text-dim'
                }`}>{t(`platforms.${p}`)}</button>
            ))}
          </div>
          <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder={t('title_field')}
            className="w-full text-[11px] font-mono bg-surface border border-border rounded px-3 py-1.5 text-text-primary" />
          <textarea value={newBody} onChange={e => setNewBody(e.target.value)} placeholder={t('body')} rows={4}
            className="w-full text-[11px] font-mono bg-surface border border-border rounded px-3 py-1.5 text-text-primary resize-none" />
          <button onClick={handleCreate} className="px-3 py-1 rounded bg-brand-purple text-white text-[10px] font-mono font-semibold hover:bg-brand-purple/90">
            {t('create')}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border">
        <button onClick={() => setTab('list')}
          className={`flex items-center gap-1 text-[10px] font-mono font-semibold pb-1.5 border-b-2 transition-colors ${
            tab === 'list' ? 'text-brand-purple border-brand-purple' : 'text-text-dim border-transparent hover:text-text-muted'
          }`}><Calendar size={12} /> {t('calendar')}</button>
        <button onClick={() => setTab('analytics')}
          className={`flex items-center gap-1 text-[10px] font-mono font-semibold pb-1.5 border-b-2 transition-colors ${
            tab === 'analytics' ? 'text-brand-purple border-brand-purple' : 'text-text-dim border-transparent hover:text-text-muted'
          }`}><BarChart3 size={12} /> {t('analytics')}</button>
        <button onClick={() => { setTab('calendar'); if (Object.keys(calendar).length === 0) handleGenerateCalendar() }}
          className={`flex items-center gap-1 text-[10px] font-mono font-semibold pb-1.5 border-b-2 transition-colors ${
            tab === 'calendar' ? 'text-brand-purple border-brand-purple' : 'text-text-dim border-transparent hover:text-text-muted'
          }`}><Calendar size={12} /> {t('calendarAI') || 'Calendario IA'}</button>
      </div>

      {loading ? (
        <p className="text-[10px] font-mono text-text-dim py-12 text-center">...</p>
      ) : tab === 'list' ? (
        <div className="space-y-2">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <Palette size={24} className="mx-auto text-text-dim/30 mb-2" />
              <p className="text-[10px] font-mono text-text-dim">{t('noContent')}</p>
              <p className="text-[9px] font-mono text-text-dim/70 mt-1">{t('noContentHint')}</p>
            </div>
          ) : items.map(item => (
            <div key={item.id} className="border border-border rounded-lg p-3 hover:bg-surface-2/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-mono bg-surface-2 border border-border rounded px-1.5 py-0.5 text-text-dim uppercase">{item.platform}</span>
                  <span className="text-[11px] font-mono font-semibold text-text-primary">{item.title}</span>
                </div>
                <span className={`text-[8px] font-mono font-semibold px-1.5 py-0.5 rounded ${statusBadge(item.status)}`}>
                  {t(item.status.toLowerCase() as 'draft')}
                </span>
              </div>
              <p className="text-[10px] font-mono text-text-muted mt-1 line-clamp-2">{item.body}</p>
              {item.performance && (
                <div className="flex gap-4 mt-2">
                  {[
                    { l: t('likes'), v: item.performance.likes },
                    { l: t('shares'), v: item.performance.shares },
                    { l: t('reach'), v: item.performance.reach },
                    { l: t('engagement'), v: `${(item.performance.engagement_rate * 100).toFixed(1)}%` },
                  ].map(m => (
                    <div key={m.l}>
                      <p className="text-[8px] font-mono text-text-dim">{m.l}</p>
                      <p className="text-[10px] font-mono font-bold text-text-primary">{m.v}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : tab === 'analytics' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.keys(analytics).length === 0 ? (
            <div className="col-span-full text-center py-12">
              <BarChart3 size={24} className="mx-auto text-text-dim/30 mb-2" />
              <p className="text-[10px] font-mono text-text-dim">{t('noAnalytics') || 'Sin datos de analytics'}</p>
            </div>
          ) : Object.entries(analytics).map(([k, v]) => (
            <div key={k} className="border border-border rounded-lg p-3">
              <p className="text-[8px] font-mono text-text-dim uppercase tracking-wider">{k.replace(/_/g, ' ')}</p>
              <p className="text-sm font-mono font-bold text-text-primary mt-0.5">{String(v)}</p>
            </div>
          ))}
        </div>
      ) : (
        /* Calendar AI tab */
        <div className="space-y-3">
          {calendarLoading ? (
            <p className="text-[10px] font-mono text-text-dim py-12 text-center">Generando calendario con IA...</p>
          ) : Object.keys(calendar).length === 0 ? (
            <div className="text-center py-12">
              <Calendar size={24} className="mx-auto text-text-dim/30 mb-2" />
              <p className="text-[10px] font-mono text-text-dim">{t('noCalendar') || 'Sin calendario generado'}</p>
              <button onClick={handleGenerateCalendar}
                className="mt-2 px-3 py-1 rounded bg-brand-purple/10 border border-brand-purple/20 text-brand-purple text-[10px] font-mono font-semibold hover:bg-brand-purple/20 transition-colors">
                {t('generateCalendar') || 'Generar calendario IA'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-mono text-text-dim">{t('calendarHint') || 'Calendario de contenido generado por IA'}</p>
                <button onClick={handleGenerateCalendar}
                  className="px-2 py-1 rounded bg-surface-2 border border-border text-text-muted text-[9px] font-mono hover:text-text-primary transition-colors">
                  {t('regenerate') || 'Regenerar'}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(calendar).map(([k, v]) => (
                  <div key={k} className="border border-border rounded-lg p-3">
                    <p className="text-[9px] font-mono text-brand-purple uppercase tracking-wider font-semibold">{k.replace(/_/g, ' ')}</p>
                    {Array.isArray(v) ? (
                      <div className="mt-2 space-y-1">
                        {(v as Record<string, unknown>[]).map((item, i) => (
                          <div key={i} className="text-[10px] font-mono text-text-secondary border-l-2 border-brand-purple/20 pl-2">
                            {typeof item === 'object' ? Object.entries(item).map(([ik, iv]) => (
                              <span key={ik} className="block"><span className="text-text-dim">{ik}:</span> {String(iv)}</span>
                            )) : String(item)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] font-mono text-text-secondary mt-1">{String(v)}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
