'use client'

import { forwardRef } from 'react'
import clsx from 'clsx'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: React.ReactNode
  iconRight?: React.ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-gradient-to-r from-brand-purple to-brand-purple-dark text-white hover:shadow-lg hover:shadow-brand-purple/20',
  secondary: 'bg-brand-purple/15 text-brand-purple hover:bg-brand-purple/25',
  ghost: 'bg-surface-2 border border-border text-text-muted hover:text-text-primary hover:border-brand-purple/30',
  danger: 'bg-status-danger/15 text-status-danger hover:bg-status-danger/25',
  success: 'bg-status-success/15 text-status-success hover:bg-status-success/25',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3.5 text-sm gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, iconRight, className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          'inline-flex items-center justify-center font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed',
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
        ) : icon ? (
          icon
        ) : null}
        {children}
        {iconRight && !loading && iconRight}
      </button>
    )
  }
)

Button.displayName = 'Button'
