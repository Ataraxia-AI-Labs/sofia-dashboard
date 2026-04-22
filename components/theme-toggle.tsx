'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon, Zap, Waves, Gem, type LucideIcon } from 'lucide-react'
import { Tooltip } from '@/components/ui'

type ThemeOption = 'light' | 'brand' | 'dark' | 'ataraxia-cyan' | 'ataraxia-purple'

const options: { value: ThemeOption; icon: LucideIcon; label: string; activeColor: string }[] = [
  { value: 'light', icon: Sun, label: 'Claro', activeColor: 'bg-brand-purple text-white' },
  { value: 'brand', icon: Zap, label: 'SofIA', activeColor: 'bg-brand-purple text-white' },
  { value: 'dark', icon: Moon, label: 'Oscuro', activeColor: 'bg-brand-purple text-white' },
  { value: 'ataraxia-cyan', icon: Waves, label: 'Ataraxia Cyan', activeColor: 'bg-brand-cyan text-void' },
  { value: 'ataraxia-purple', icon: Gem, label: 'Ataraxia Purple', activeColor: 'bg-brand-purple-dark text-white ring-1 ring-brand-purple/40' },
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch -- only render on client
  useEffect(() => { setMounted(true) }, [])

  if (!mounted) {
    return (
      <div className="flex items-center gap-1" aria-label="Selector de tema">
        {options.map((opt) => (
          <div key={opt.value} className="w-7 h-7" />
        ))}
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-1"
      role="group"
      aria-label="Selector de tema"
    >
      {options.map(({ value, icon: Icon, label }) => {
        const isActive = theme === value
        return (
          <Tooltip key={value} label={label} side="left" delay={120}>
            <button
              onClick={() => setTheme(value)}
              aria-label={label}
              aria-pressed={isActive}
              className={`
                relative w-7 h-7 flex items-center justify-center rounded-md
                active:scale-[0.9] transition-all duration-150
                ${isActive
                  ? 'text-brand-purple drop-shadow-[0_0_6px_rgba(139,92,246,0.5)]'
                  : 'text-text-dim hover:text-text-primary hover:drop-shadow-[0_0_4px_rgba(139,92,246,0.35)]'
                }
              `}
            >
              <Icon size={14} strokeWidth={isActive ? 2 : 1.6} />
              {isActive && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-0.5 rounded-full bg-brand-purple shadow-[0_0_4px_rgba(139,92,246,0.7)]" />
              )}
            </button>
          </Tooltip>
        )
      })}
    </div>
  )
}
