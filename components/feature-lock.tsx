'use client'

import Link from 'next/link'
import { AtaraxiaLogoCompact } from '@/components/ataraxia-logo'
import { Lock, Sparkles, ArrowRight, Check } from 'lucide-react'

export interface FeatureLockProps {
  icon: React.ReactNode
  title: string
  headline: string
  subhead: string
  eta?: string
  bullets: string[]
  ctaLabel?: string
  /** Slug de la pagina hyper-persuasiva en /dashboard/proximamente/[slug] */
  persuasiveKey: string
}

/**
 * Reusable "coming soon" lock page.
 * Replaces the actual page content until the feature is released.
 * Backend endpoints stay alive — only UI is gated.
 */
export function FeatureLock({ icon, title, headline, subhead, eta, bullets, ctaLabel = 'Ver más y entrar a la beta', persuasiveKey }: FeatureLockProps) {
  return (
    <div className="flex flex-col items-center text-center max-w-[560px] mx-auto pt-16 pb-12">
      {/* Floating icon with lila halo — no heavy border, just inner glow */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-brand-purple/25 blur-3xl rounded-full" />
        <div
          className="relative w-20 h-20 rounded-2xl bg-brand-purple/[0.04] flex items-center justify-center"
          style={{
            boxShadow:
              '0 0 0 1px rgba(139,92,246,0.15), 0 0 40px -20px rgba(168,85,247,0.4), 0 1px 0 0 rgba(255,255,255,0.05) inset',
          }}
        >
          <div className="text-brand-purple">{icon}</div>
          {/* Naked lock icon — no circle bg */}
          <Lock size={14} className="absolute -top-1 -right-1 text-brand-purple/80" strokeWidth={2} />
        </div>
      </div>

      {/* ETA pill */}
      {eta && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-purple/10 border border-brand-purple/20 text-brand-purple text-[11px] font-body font-medium tracking-wide mb-4">
          <Sparkles size={10} strokeWidth={1.8} />
          {eta}
        </div>
      )}

      <h1 className="text-[30px] md:text-[34px] font-display font-medium text-text-primary tracking-tight leading-tight mb-3">
        {headline}
      </h1>

      <p className="text-[14.5px] font-body text-text-muted leading-relaxed mb-7 max-w-md">
        {subhead}
      </p>

      {/* Bullets */}
      <div className="w-full max-w-md space-y-2 mb-8">
        {bullets.map((b, i) => (
          <div
            key={i}
            className="flex items-start gap-2.5 text-left px-3 py-2 rounded-lg bg-surface/40"
            style={{ boxShadow: '0 0 0 1px rgba(139,92,246,0.1)' }}
          >
            <div className="mt-[3px] flex-shrink-0 w-4 h-4 rounded-full bg-brand-purple/15 flex items-center justify-center">
              <Check size={10} className="text-brand-purple" strokeWidth={2.5} />
            </div>
            <span className="text-[13px] font-body text-text-primary leading-relaxed">{b}</span>
          </div>
        ))}
      </div>

      {/* CTA → navigates to hyper-persuasive page */}
      <Link
        href={`/dashboard/proximamente/${persuasiveKey}`}
        className="inline-flex items-center gap-2 h-11 px-5 rounded-xl font-body font-medium text-[14px] transition-all duration-150 active:scale-[0.97] text-white border border-white/10 bg-gradient-to-b from-brand-purple-light to-brand-purple shadow-[0_1px_0_0_rgba(255,255,255,0.2)_inset,0_4px_18px_-2px_rgba(139,92,246,0.55)] hover:shadow-[0_1px_0_0_rgba(255,255,255,0.22)_inset,0_6px_24px_-2px_rgba(139,92,246,0.7)]"
      >
        <AtaraxiaLogoCompact size={16} />
        {ctaLabel}
        <ArrowRight size={14} strokeWidth={2} />
      </Link>

      <p className="text-[11.5px] font-body text-text-dim mt-3">
        Entra al primer grupo de clínicas beta cuando se abra.
      </p>
    </div>
  )
}
