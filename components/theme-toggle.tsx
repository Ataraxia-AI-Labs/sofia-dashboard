'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon, Monitor, type LucideIcon } from 'lucide-react'

type ThemeOption = 'light' | 'dark' | 'system'

const options: { value: ThemeOption; icon: LucideIcon; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Claro' },
  { value: 'dark', icon: Moon, label: 'Oscuro' },
  { value: 'system', icon: Monitor, label: 'Sistema' },
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
      {options.map(({ value, icon: Icon, label }) => {
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
                ? 'bg-brand-purple text-white shadow-sm shadow-brand-purple/30'
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
