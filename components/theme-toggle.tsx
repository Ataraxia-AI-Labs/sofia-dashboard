'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon, Zap, Waves, Gem, type LucideIcon } from 'lucide-react'

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
      <div
        className="flex items-center gap-0.5 rounded-lg bg-surface-2 border border-border p-0.5"
        aria-label="Selector de tema"
      >
        {options.map((opt) => (
          <div
            key={opt.value}
            className="w-7 h-7 rounded-md"
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-0.5 rounded-lg bg-surface-2 border border-border p-0.5"
      role="group"
      aria-label="Selector de tema"
    >
      {options.map(({ value, icon: Icon, label, activeColor }) => {
        const isActive = theme === value
        return (
          <button
            key={value}
            onClick={() => setTheme(value)}
            title={label}
            aria-label={label}
            aria-pressed={isActive}
            className={`
              w-7 h-7 rounded-md flex items-center justify-center transition-all duration-200
              ${isActive
                ? activeColor
                : 'text-text-muted hover:text-text-primary hover:bg-surface-3'
              }
            `}
          >
            <Icon size={14} />
          </button>
        )
      })}
    </div>
  )
}
