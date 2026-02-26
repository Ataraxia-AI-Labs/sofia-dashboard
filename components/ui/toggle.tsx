'use client'

import clsx from 'clsx'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  size?: 'sm' | 'md'
  color?: 'purple' | 'success' | 'warning'
  label?: string
}

const colorStyles = {
  purple: 'bg-brand-purple',
  success: 'bg-status-success',
  warning: 'bg-status-warning',
}

export function Toggle({ checked, onChange, disabled, size = 'md', color = 'success', label }: ToggleProps) {
  const isMd = size === 'md'

  return (
    <label className={clsx('inline-flex items-center gap-2', disabled && 'opacity-50 cursor-not-allowed')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={clsx(
          'rounded-full transition-colors relative',
          isMd ? 'w-12 h-6' : 'w-10 h-5',
          checked ? colorStyles[color] : 'bg-surface-3',
        )}
      >
        <div
          className={clsx(
            'rounded-full bg-white absolute top-0.5 transition-all',
            isMd ? 'w-5 h-5' : 'w-4 h-4',
          )}
          style={{ left: checked ? (isMd ? '26px' : '22px') : '2px' }}
        />
      </button>
      {label && <span className="text-xs text-text-muted">{label}</span>}
    </label>
  )
}
