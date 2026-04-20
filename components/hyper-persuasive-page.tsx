'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useOrg } from '@/lib/org-context'
import { AtaraxiaLogoCompact } from '@/components/ataraxia-logo'
import {
  Lock, Sparkles, ArrowRight, Check, ArrowLeft, ChevronDown, ChevronUp, Star,
} from 'lucide-react'

export interface HyperTestimonial {
  name: string
  role: string            // "Dra. Odontología, Bogotá"
  photo?: string
  quote: string
  result?: string         // "+3.2x ingresos en 6 meses"
}

export interface HyperFeatureBlock {
  icon: React.ReactNode
  title: string
  description: string
}

export interface HyperFaqItem {
  q: string
  a: string
}

export interface HyperPersuasivePageProps {
  // Required hero
  icon: React.ReactNode
  title: string
  headline: string
  subhead: string
  eta: string
  // Slots (optional)
  heroVisual?: React.ReactNode
  testimonials?: HyperTestimonial[]
  features?: HyperFeatureBlock[]
  integrations?: { name: string; logo?: string }[]
  faq?: HyperFaqItem[]
  footerQuote?: string
  // Beta signup config
  formUseCaseLabel?: string
  formUseCaseOptions?: string[]
  // Back link
  backHref?: string
  backLabel?: string
}

/**
 * Nivel 2 de feature lock — página persuasiva completa con slots.
 * Todos los slots son opcionales excepto hero. Usa solo los que tengas contenido.
 */
export function HyperPersuasivePage({
  icon, title, headline, subhead, eta,
  heroVisual, testimonials, features, integrations, faq, footerQuote,
  formUseCaseLabel = '¿Cómo la usarías?',
  formUseCaseOptions = ['Automatizar operación', 'Crecer más rápido', 'Ahorrar tiempo del staff', 'Otro'],
  backHref = '/dashboard',
  backLabel = 'Volver',
}: HyperPersuasivePageProps) {
  const { user, org } = useOrg()
  const [email, setEmail] = useState(user?.email || '')
  const [role, setRole] = useState('')
  const [useCase, setUseCase] = useState(formUseCaseOptions[0])
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting || submitted) return
    setSubmitting(true)
    try {
      if (typeof window !== 'undefined') {
        const key = `waitlist_${title.toLowerCase().replace(/\s+/g, '_')}`
        localStorage.setItem(key, JSON.stringify({
          user_id: user?.id,
          org_id: org?.id,
          feature: title,
          email, role, use_case: useCase,
          at: new Date().toISOString(),
        }))
      }
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-[880px] mx-auto pt-10 pb-16 space-y-16">
      {/* Back link */}
      <Link href={backHref} className="inline-flex items-center gap-1.5 text-[12px] font-body text-text-muted hover:text-brand-purple transition-colors">
        <ArrowLeft size={12} />
        {backLabel}
      </Link>

      {/* HERO */}
      <section className="text-center">
        <div className="relative inline-block mb-6">
          <div className="absolute inset-0 bg-brand-purple/30 blur-3xl rounded-full scale-150" />
          <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-surface-2 to-surface border border-border/60 flex items-center justify-center shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset,0_10px_40px_-8px_rgba(0,0,0,0.5),0_0_0_1px_rgba(139,92,246,0.2)]">
            <div className="text-brand-purple">{icon}</div>
            <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-surface-2 border border-border/60 flex items-center justify-center shadow">
              <Lock size={11} className="text-text-dim" />
            </div>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-purple/10 border border-brand-purple/25 text-brand-purple text-[11px] font-body font-medium tracking-wider uppercase mb-5">
          <Sparkles size={11} strokeWidth={1.8} />
          {eta}
        </div>

        <h1 className="text-[38px] md:text-[46px] font-display font-medium text-text-primary tracking-tight leading-[1.05] mb-4 max-w-[620px] mx-auto">
          {headline}
        </h1>

        <p className="text-[16px] font-body text-text-muted leading-relaxed max-w-[560px] mx-auto">
          {subhead}
        </p>

        {heroVisual && (
          <div className="mt-10">
            {heroVisual}
          </div>
        )}
      </section>

      {/* FEATURES */}
      {features && features.length > 0 && (
        <section>
          <h2 className="text-[12px] font-body font-semibold uppercase tracking-[0.18em] text-text-dim text-center mb-6">
            Lo que trae
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {features.map((f, i) => (
              <div key={i} className="p-4 rounded-xl bg-surface/40 border border-border/40 hover:border-brand-purple/30 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple mb-3">
                  {f.icon}
                </div>
                <h3 className="text-[14px] font-body font-semibold text-text-primary mb-1">{f.title}</h3>
                <p className="text-[12.5px] font-body text-text-muted leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TESTIMONIALS */}
      {testimonials && testimonials.length > 0 && (
        <section>
          <h2 className="text-[12px] font-body font-semibold uppercase tracking-[0.18em] text-text-dim text-center mb-6">
            Lo que dicen clínicas en beta
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {testimonials.map((t, i) => (
              <div key={i} className="p-5 rounded-xl bg-surface/40 border border-border/40">
                <div className="flex items-center gap-0.5 text-brand-purple mb-3">
                  {[0, 1, 2, 3, 4].map(s => <Star key={s} size={11} fill="currentColor" strokeWidth={0} />)}
                </div>
                <p className="text-[13px] font-body text-text-primary leading-relaxed italic mb-4">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[12.5px] font-body font-semibold text-text-primary">{t.name}</div>
                    <div className="text-[11px] font-body text-text-dim">{t.role}</div>
                  </div>
                  {t.result && (
                    <div className="px-2 py-0.5 rounded-md bg-brand-purple/10 border border-brand-purple/20 text-brand-purple text-[11px] font-body font-semibold">
                      {t.result}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* INTEGRATIONS (optional) */}
      {integrations && integrations.length > 0 && (
        <section>
          <h2 className="text-[12px] font-body font-semibold uppercase tracking-[0.18em] text-text-dim text-center mb-6">
            Integra con
          </h2>
          <div className="flex flex-wrap justify-center gap-2">
            {integrations.map((ig, i) => (
              <div key={i} className="px-3 py-2 rounded-lg bg-surface/40 border border-border/40 text-[12px] font-body text-text-muted">
                {ig.name}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SIGNUP FORM */}
      <section className="relative">
        <div className="absolute inset-0 bg-brand-purple/8 blur-3xl rounded-3xl" />
        <div className="relative p-6 md:p-8 rounded-2xl bg-surface/60 backdrop-blur-sm border border-brand-purple/20">
          {submitted ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-status-success/15 border border-status-success/30 flex items-center justify-center mx-auto mb-4">
                <Check size={22} className="text-status-success" strokeWidth={2.4} />
              </div>
              <h3 className="text-[20px] font-display font-medium text-text-primary mb-2">Estás en la lista</h3>
              <p className="text-[13px] font-body text-text-muted max-w-md mx-auto">
                Te avisamos apenas abramos {title}. Tu clínica está en las primeras 100 invitaciones beta.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="text-center mb-2">
                <h3 className="text-[22px] font-display font-medium text-text-primary mb-1.5">Entra a la beta privada</h3>
                <p className="text-[13px] font-body text-text-muted">Invitaciones por orden de lista. Cero spam.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-body font-medium text-text-dim uppercase tracking-wider mb-1.5">Email</label>
                  <input
                    type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-surface border border-border/60 text-[13px] font-body text-text-primary placeholder-text-dim outline-none focus:border-brand-purple/50 transition-colors"
                    placeholder="tu@clinica.com"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-body font-medium text-text-dim uppercase tracking-wider mb-1.5">Tu rol</label>
                  <input
                    type="text" value={role} onChange={e => setRole(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-surface border border-border/60 text-[13px] font-body text-text-primary placeholder-text-dim outline-none focus:border-brand-purple/50 transition-colors"
                    placeholder="Dr/a, Director/a, etc."
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-body font-medium text-text-dim uppercase tracking-wider mb-1.5">{formUseCaseLabel}</label>
                <select
                  value={useCase} onChange={e => setUseCase(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-surface border border-border/60 text-[13px] font-body text-text-primary outline-none focus:border-brand-purple/50 transition-colors"
                >
                  {formUseCaseOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <button
                type="submit" disabled={submitting}
                className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl text-white border border-white/10 bg-gradient-to-b from-brand-purple-light to-brand-purple shadow-[0_1px_0_0_rgba(255,255,255,0.2)_inset,0_4px_18px_-2px_rgba(139,92,246,0.55)] hover:shadow-[0_1px_0_0_rgba(255,255,255,0.22)_inset,0_6px_24px_-2px_rgba(139,92,246,0.7)] active:scale-[0.98] transition-all font-body font-medium text-[14px] disabled:opacity-60"
              >
                <AtaraxiaLogoCompact size={16} />
                Quiero entrar a la beta
                <ArrowRight size={14} strokeWidth={2} />
              </button>
              <p className="text-[10.5px] font-body text-text-dim text-center">
                Al enviar aceptas recibir 1 correo cuando abramos. Cero marketing basura.
              </p>
            </form>
          )}
        </div>
      </section>

      {/* FAQ */}
      {faq && faq.length > 0 && (
        <section>
          <h2 className="text-[12px] font-body font-semibold uppercase tracking-[0.18em] text-text-dim text-center mb-5">
            Dudas comunes
          </h2>
          <div className="space-y-2">
            {faq.map((f, i) => {
              const isOpen = openFaq === i
              return (
                <button
                  key={i}
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="w-full p-4 rounded-xl bg-surface/40 border border-border/40 hover:border-brand-purple/25 transition-colors text-left"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px] font-body font-semibold text-text-primary">{f.q}</span>
                    {isOpen ? <ChevronUp size={14} className="text-text-dim" /> : <ChevronDown size={14} className="text-text-dim" />}
                  </div>
                  {isOpen && (
                    <p className="mt-2 text-[12.5px] font-body text-text-muted leading-relaxed">{f.a}</p>
                  )}
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* FOOTER QUOTE */}
      {footerQuote && (
        <section className="text-center pt-8 border-t border-border/30">
          <p className="text-[13.5px] font-display italic text-text-muted max-w-md mx-auto">
            &ldquo;{footerQuote}&rdquo;
          </p>
        </section>
      )}
    </div>
  )
}
