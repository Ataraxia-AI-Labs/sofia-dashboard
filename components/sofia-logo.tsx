// SofIA Brand Logo — inline SVG mark + wordmark
// Use this everywhere instead of the text-only "A" fallback

interface SofiaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'full' | 'mark'   // full = mark + wordmark, mark = icon only
  className?: string
}

const sizes = {
  sm: { mark: 24, text: 'text-xs', sub: 'text-[8px]' },
  md: { mark: 32, text: 'text-sm', sub: 'text-[9px]' },
  lg: { mark: 40, text: 'text-lg', sub: 'text-[10px]' },
  xl: { mark: 56, text: 'text-2xl', sub: 'text-xs' },
}

export function SofiaLogo({ size = 'md', variant = 'full', className = '' }: SofiaLogoProps) {
  const s = sizes[size]
  const px = s.mark

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Icon mark — geometric S + neural arc */}
      <svg
        width={px}
        height={px}
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <defs>
          <linearGradient id="sofia-grad-a" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#06D6A0" />
          </linearGradient>
          <linearGradient id="sofia-grad-b" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#06D6A0" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        {/* Background tile */}
        <rect width="44" height="44" rx="8" fill="#0C0C14" />
        <rect width="44" height="44" rx="8" fill="url(#sofia-grad-b)" fillOpacity="0.1" />
        {/* Neural arc top */}
        <path
          d="M12 14 Q22 8 32 14"
          stroke="url(#sofia-grad-a)"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.5"
        />
        {/* S letterform */}
        <path
          d="M27 17.5C27 17.5 24.5 16 22 16C19.5 16 17 17.5 17 19.5C17 21.5 19 22.5 22 23C25 23.5 27 24.5 27 26.5C27 28.5 24.5 30 22 30C19.5 30 17 28.5 17 28.5"
          stroke="url(#sofia-grad-a)"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />
        {/* Neural arc bottom */}
        <path
          d="M12 30 Q22 36 32 30"
          stroke="url(#sofia-grad-a)"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.5"
        />
        {/* Corner dot accent */}
        <circle cx="34" cy="10" r="2" fill="#06D6A0" opacity="0.8" />
      </svg>

      {variant === 'full' && (
        <div className="flex flex-col leading-none">
          <span className={`font-body font-bold text-text-primary tracking-tight ${s.text}`}>
            Sof<span className="text-brand-purple">IA</span>
          </span>
          <span className={`text-text-dim font-body ${s.sub} mt-0.5 tracking-wider uppercase`}>
            Ataraxia IA Labs
          </span>
        </div>
      )}
    </div>
  )
}

export default SofiaLogo
