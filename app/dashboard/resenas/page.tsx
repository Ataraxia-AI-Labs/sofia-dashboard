'use client'

import { useEffect, useState, useCallback } from 'react'
import { useOrg } from '@/lib/org-context'
import { listReviews, getReviewStats, replyToReview, generateReviewReply, syncReviews, getNPS } from '@/lib/api/reviews'
import type { Review, ReviewStats } from '@/lib/api/reviews'
import { useTranslations } from 'next-intl'
import { Star, RefreshCw, MessageSquare, Sparkles, BarChart3 } from 'lucide-react'

type Tab = 'reviews' | 'stats'

export default function ResenasPage() {
  const { orgId, role } = useOrg()
  const t = useTranslations('reviewsPage')
  const isReadOnly = role === 'STAFF'

  const [tab, setTab] = useState<Tab>('reviews')
  const [reviews, setReviews] = useState<Review[]>([])
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [nps, setNps] = useState<{ score: number; promoters: number; detractors: number; passives: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [generating, setGenerating] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [r, s, n] = await Promise.all([
        listReviews(orgId, { limit: 50 }),
        getReviewStats(orgId),
        getNPS(orgId, 90),
      ])
      setReviews(r)
      setStats(s)
      setNps(n)
    } catch { /* */ }
    setLoading(false)
  }, [orgId])

  useEffect(() => { load() }, [load])

  const handleSync = async () => {
    try {
      await syncReviews(orgId)
      setMsg('Sincronizado')
      load()
    } catch { setMsg('Error al sincronizar') }
    setTimeout(() => setMsg(''), 2000)
  }

  const handleReply = async (reviewId: string) => {
    if (!replyText) return
    try {
      await replyToReview(orgId, reviewId, replyText)
      setReplyingTo(null); setReplyText('')
      load()
    } catch { setMsg('Error al responder') }
  }

  const handleGenerate = async (reviewId: string) => {
    setGenerating(reviewId)
    try {
      const { reply } = await generateReviewReply(orgId, reviewId)
      setReplyText(reply)
      setReplyingTo(reviewId)
    } catch { setMsg('Error al generar') }
    setGenerating(null)
  }

  const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-mono font-bold text-text-primary tracking-wide flex items-center gap-2">
            <Star size={16} className="text-brand-purple" />
            {t('title')}
          </h1>
          <p className="text-[12px] font-body text-text-dim mt-0.5">{t('subtitle')}</p>
        </div>
        <button
          onClick={handleSync}
          className="sentient-btn flex items-center gap-1.5 px-2.5 h-7 rounded-md bg-surface-2 text-text-muted text-[11.5px] font-body hover:text-text-primary"
          style={{ boxShadow: '0 0 0 1px rgba(139,92,246,0.12), 0 2px 10px -4px rgba(139,92,246,0.15)' }}
        >
          <RefreshCw size={11} /> {t('sync')}
        </button>
      </div>

      {msg && <div className="text-[12px] font-body text-status-success bg-status-success/8 px-3 py-1.5 rounded border border-status-success/15">{msg}</div>}

      {/* Stats banner */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl p-3.5 bg-surface/40" style={{ boxShadow: '0 0 0 1px rgba(139,92,246,0.1), 0 2px 12px -4px rgba(139,92,246,0.12)' }}>
            <p className="text-[10px] font-body text-text-dim uppercase tracking-wider">{t('avgRating')}</p>
            <p className="text-sm font-mono font-bold text-brand-gold mt-0.5">{stars(Math.round(stats.average_rating))} {stats.average_rating.toFixed(1)}</p>
          </div>
          <div className="rounded-xl p-3.5 bg-surface/40" style={{ boxShadow: '0 0 0 1px rgba(139,92,246,0.1), 0 2px 12px -4px rgba(139,92,246,0.12)' }}>
            <p className="text-[10px] font-body text-text-dim uppercase tracking-wider">{t('totalReviews')}</p>
            <p className="text-sm font-mono font-bold text-text-primary mt-0.5">{stats.total_reviews}</p>
          </div>
          <div className="rounded-xl p-3.5 bg-surface/40" style={{ boxShadow: '0 0 0 1px rgba(139,92,246,0.1), 0 2px 12px -4px rgba(139,92,246,0.12)' }}>
            <p className="text-[10px] font-body text-text-dim uppercase tracking-wider">{t('responseRate')}</p>
            <p className="text-sm font-mono font-bold text-text-primary mt-0.5">{(stats.response_rate * 100).toFixed(0)}%</p>
          </div>
          <div className="rounded-xl p-3.5 bg-surface/40" style={{ boxShadow: '0 0 0 1px rgba(139,92,246,0.1), 0 2px 12px -4px rgba(139,92,246,0.12)' }}>
            <p className="text-[10px] font-body text-text-dim uppercase tracking-wider">{t('nps')}</p>
            <p className={`text-sm font-mono font-bold mt-0.5 ${nps && nps.score >= 50 ? 'text-status-success' : nps && nps.score >= 0 ? 'text-status-warning' : 'text-status-danger'}`}>
              {nps?.score ?? '—'}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-brand-purple/10">
        <button onClick={() => setTab('reviews')}
          className={`flex items-center gap-1 text-[12px] font-body font-semibold pb-1.5 border-b-2 transition-colors ${
            tab === 'reviews' ? 'text-brand-purple border-brand-purple' : 'text-text-dim border-transparent hover:text-text-muted'
          }`}><MessageSquare size={12} /> {t('reviews')}</button>
        <button onClick={() => setTab('stats')}
          className={`flex items-center gap-1 text-[12px] font-body font-semibold pb-1.5 border-b-2 transition-colors ${
            tab === 'stats' ? 'text-brand-purple border-brand-purple' : 'text-text-dim border-transparent hover:text-text-muted'
          }`}><BarChart3 size={12} /> {t('stats')}</button>
      </div>

      {loading ? (
        <p className="text-[12px] font-body text-text-dim py-12 text-center">...</p>
      ) : tab === 'reviews' ? (
        <div className="space-y-2">
          {reviews.length === 0 ? (
            <div className="text-center py-12">
              <Star size={24} className="mx-auto text-text-dim/30 mb-2" />
              <p className="text-[12px] font-body text-text-dim">{t('noReviews')}</p>
              <p className="text-[11px] font-body text-text-dim/70 mt-1">{t('noReviewsHint')}</p>
            </div>
          ) : reviews.map(review => (
            <div key={review.id} className="rounded-xl p-3.5 bg-surface/40 hover:bg-surface-2/40 transition-colors" style={{ boxShadow: '0 0 0 1px rgba(139,92,246,0.1), 0 2px 12px -4px rgba(139,92,246,0.12)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-body text-brand-gold">{stars(review.rating)}</span>
                  <span className="text-[13px] font-body font-semibold text-text-primary">{review.author_name}</span>
                  <span className={`text-[10px] font-body px-1.5 py-0.5 rounded ${
                    review.status === 'NEW' ? 'bg-status-info/8 text-status-info'
                    : review.status === 'REPLIED' ? 'bg-status-success/8 text-status-success'
                    : 'bg-status-danger/8 text-status-danger'
                  }`}>{t(review.status.toLowerCase() as 'new')}</span>
                </div>
                <span className="text-[10px] font-body text-text-dim">{review.platform}</span>
              </div>
              <p className="text-[12px] font-body text-text-muted mt-1">{review.text}</p>

              {review.reply && (
                <div className="mt-2 pl-3 border-l-2 border-brand-purple/20">
                  <p className="text-[11px] font-body text-text-dim">Respuesta:</p>
                  <p className="text-[12px] font-body text-text-secondary">{review.reply}</p>
                </div>
              )}

              {!review.reply && !isReadOnly && (
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={() => handleGenerate(review.id)}
                    disabled={generating === review.id}
                    className="flex items-center gap-1 text-[11px] font-body text-brand-purple hover:text-brand-purple/80 transition-colors">
                    <Sparkles size={10} /> {generating === review.id ? '...' : t('generateReply')}
                  </button>
                  <button onClick={() => setReplyingTo(replyingTo === review.id ? null : review.id)}
                    className="flex items-center gap-1 text-[11px] font-body text-text-dim hover:text-text-muted transition-colors">
                    <MessageSquare size={10} /> {t('reply')}
                  </button>
                </div>
              )}

              {replyingTo === review.id && (
                <div className="mt-2 flex gap-2">
                  <input
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    className="flex-1 text-[12px] font-body bg-surface rounded-md px-2.5 py-1.5 text-text-primary outline-none focus:shadow-[0_0_0_1px_rgba(139,92,246,0.35)]"
                    style={{ boxShadow: '0 0 0 1px rgba(139,92,246,0.12)' }}
                    placeholder="Escribe tu respuesta..."
                  />
                  <button
                    onClick={() => handleReply(review.id)}
                    className="sentient-btn px-3 py-1.5 rounded-md bg-gradient-to-b from-brand-purple-light to-brand-purple text-white text-[11px] font-body font-semibold"
                    style={{ boxShadow: '0 1px 0 0 rgba(255,255,255,0.18) inset, 0 2px 10px -1px rgba(139,92,246,0.38)' }}
                  >
                    Enviar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Stats tab — rating distribution */
        stats && (
          <div className="space-y-3">
            <p className="text-[11px] font-body text-text-dim uppercase tracking-wider">Distribucion de calificaciones</p>
            {[5, 4, 3, 2, 1].map(rating => {
              const count = stats.rating_distribution[String(rating)] || 0
              const pct = stats.total_reviews > 0 ? (count / stats.total_reviews) * 100 : 0
              return (
                <div key={rating} className="flex items-center gap-3">
                  <span className="text-[12px] font-body text-brand-gold w-12">{stars(rating)}</span>
                  <div className="flex-1 h-2 bg-surface-2 rounded-full">
                    <div className="h-full bg-brand-gold/60 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[12px] font-body text-text-muted w-8 text-right">{count}</span>
                </div>
              )
            })}

            {nps && (
              <div className="mt-4 rounded-xl p-4 bg-surface/40" style={{ boxShadow: '0 0 0 1px rgba(139,92,246,0.1), 0 2px 12px -4px rgba(139,92,246,0.12)' }}>
                <p className="text-[11px] font-body text-text-dim uppercase tracking-wider mb-2">Net Promoter Score</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-lg font-mono font-bold text-status-success">{nps.promoters}</p>
                    <p className="text-[10px] font-body text-text-dim">Promotores</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-mono font-bold text-text-muted">{nps.passives}</p>
                    <p className="text-[10px] font-body text-text-dim">Pasivos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-mono font-bold text-status-danger">{nps.detractors}</p>
                    <p className="text-[10px] font-body text-text-dim">Detractores</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      )}
    </div>
  )
}
