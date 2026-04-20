import { AtaraxiaLogo } from '@/components/ataraxia-logo'

interface PageLoaderProps {
  label?: string
  sublabel?: string
  size?: number
}

/**
 * Full-viewport loader used by full-page loading.tsx files (not dashboard
 * sections — those keep their skeleton cards for layout continuity).
 * Renders the Ataraxia eye with its breathing ambient so brand identity
 * shows even at 300ms of latency.
 */
export function PageLoader({ label, sublabel, size = 96 }: PageLoaderProps) {
  return (
    <div className="min-h-screen bg-void flex items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 40%, rgba(139,92,246,0.06), transparent 60%)' }} />
      <div className="relative z-10 flex flex-col items-center gap-4 animate-sentient-breathe">
        <AtaraxiaLogo size={size} />
        {label && (
          <p className="text-[12px] font-body font-semibold uppercase tracking-[0.22em] text-brand-purple/80">
            {label}
          </p>
        )}
        {sublabel && (
          <p className="text-[11px] font-body text-text-dim">{sublabel}</p>
        )}
      </div>
    </div>
  )
}
