'use client'

import { forwardRef } from 'react'
import clsx from 'clsx'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'success'
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: React.ReactNode
  iconRight?: React.ReactNode
}

/**
 * Button v2 — real gradients, inset highlights, colored halos.
 * Dev-tool aesthetic (Vapi / Linear / Supabase-quality).
 *
 * Composition:
 *  - bg-gradient-to-b : top-to-bottom vertical gradient → volume
 *  - shadow inset white 10% top : light reflection
 *  - shadow outer colored : halo aura
 *  - border rgba white 10% : edge definition
 *  - :hover = +brightness, larger halo
 *  - :active = scale 0.97 + gradient invert, halo collapsed
 */
const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    // base
    'text-white border border-white/10',
    'bg-gradient-to-b from-brand-purple-light to-brand-purple',
    'shadow-[0_1px_0_0_rgba(255,255,255,0.18)_inset,0_-1px_0_0_rgba(0,0,0,0.22)_inset,0_2px_8px_-1px_rgba(139,92,246,0.28),0_1px_2px_rgba(0,0,0,0.2)]',
    // hover
    'hover:from-brand-purple hover:to-brand-purple-dark',
    'hover:shadow-[0_1px_0_0_rgba(255,255,255,0.2)_inset,0_-1px_0_0_rgba(0,0,0,0.24)_inset,0_4px_16px_-1px_rgba(139,92,246,0.5),0_1px_2px_rgba(0,0,0,0.25)]',
    // active
    'active:scale-[0.97] active:from-brand-purple-dark active:to-brand-purple-dark',
    'active:shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset,0_0_0_1px_rgba(139,92,246,0.4),0_1px_3px_rgba(0,0,0,0.3)]',
    // focus
    'focus-visible:ring-2 focus-visible:ring-brand-purple/60 focus-visible:ring-offset-2 focus-visible:ring-offset-void',
  ].join(' '),

  secondary: [
    'text-brand-purple border border-brand-purple/25',
    'bg-gradient-to-b from-brand-purple/15 to-brand-purple/8',
    'shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_1px_3px_rgba(0,0,0,0.15)]',
    'hover:from-brand-purple/22 hover:to-brand-purple/14 hover:border-brand-purple/40',
    'hover:shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset,0_2px_10px_-2px_rgba(139,92,246,0.25)]',
    'active:scale-[0.97] active:from-brand-purple/12 active:to-brand-purple/8',
    'focus-visible:ring-2 focus-visible:ring-brand-purple/40',
  ].join(' '),

  ghost: [
    'text-text-muted bg-transparent border border-transparent',
    'hover:text-text-primary hover:bg-surface-2/80 hover:border-border/50',
    'hover:shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_1px_6px_rgba(0,0,0,0.15)]',
    'active:scale-[0.97] active:bg-surface-3',
    'focus-visible:ring-2 focus-visible:ring-border-2',
  ].join(' '),

  outline: [
    'text-text-primary border border-border/70',
    'bg-gradient-to-b from-surface-2 to-surface',
    'shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_1px_2px_rgba(0,0,0,0.2)]',
    'hover:from-surface-3 hover:to-surface-2 hover:border-brand-purple/40',
    'hover:shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset,0_2px_8px_-1px_rgba(139,92,246,0.15)]',
    'active:scale-[0.97] active:from-surface active:to-surface',
    'focus-visible:ring-2 focus-visible:ring-brand-purple/30',
  ].join(' '),

  danger: [
    'text-status-danger border border-status-danger/25',
    'bg-gradient-to-b from-status-danger/14 to-status-danger/7',
    'shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_1px_3px_rgba(0,0,0,0.15)]',
    'hover:from-status-danger/22 hover:to-status-danger/12 hover:border-status-danger/40',
    'hover:shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset,0_2px_10px_-2px_rgba(239,68,68,0.3)]',
    'active:scale-[0.97] active:from-status-danger/12 active:to-status-danger/8',
    'focus-visible:ring-2 focus-visible:ring-status-danger/40',
  ].join(' '),

  success: [
    'text-status-success border border-status-success/25',
    'bg-gradient-to-b from-status-success/14 to-status-success/7',
    'shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_1px_3px_rgba(0,0,0,0.15)]',
    'hover:from-status-success/22 hover:to-status-success/12 hover:border-status-success/40',
    'hover:shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset,0_2px_10px_-2px_rgba(6,214,160,0.25)]',
    'active:scale-[0.97] active:from-status-success/12 active:to-status-success/8',
    'focus-visible:ring-2 focus-visible:ring-status-success/40',
  ].join(' '),
}

const sizeStyles: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-[12px] gap-1.5 rounded-md',
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-md',
  md: 'h-9 px-3.5 text-[13px] gap-2 rounded-lg',
  lg: 'h-10 px-4 text-[14px] gap-2 rounded-lg',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, iconRight, className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          'group inline-flex items-center justify-center font-body font-medium',
          'transition-[background,box-shadow,transform,border-color,color] duration-150 ease-out outline-none',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
          'whitespace-nowrap select-none',
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {loading ? (
          <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
        ) : icon ? (
          <span className="flex-shrink-0">{icon}</span>
        ) : null}
        {children}
        {iconRight && !loading && <span className="flex-shrink-0">{iconRight}</span>}
      </button>
    )
  }
)

Button.displayName = 'Button'
