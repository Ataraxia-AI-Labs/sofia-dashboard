'use client'

import { forwardRef } from 'react'
import clsx from 'clsx'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, className, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-[9px] font-mono font-semibold text-text-dim uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={clsx(
              'w-full px-3 py-2 rounded-md bg-surface border text-text-primary text-xs font-mono outline-none transition-colors',
              icon && 'pl-9',
              error
                ? 'border-status-danger/50 focus:border-status-danger focus:ring-1 focus:ring-status-danger/20'
                : 'border-border focus:border-brand-purple/40 focus:ring-1 focus:ring-brand-purple/20',
              className,
            )}
            {...props}
          />
        </div>
        {error && <p className="text-[9px] font-mono text-status-danger">{error}</p>}
        {hint && !error && <p className="text-[9px] font-mono text-text-dim">{hint}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-[9px] font-mono font-semibold text-text-dim uppercase tracking-wider">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={clsx(
            'w-full px-3 py-2 rounded-md bg-surface border text-text-primary text-xs font-mono outline-none transition-colors resize-y',
            error
              ? 'border-status-danger/50 focus:border-status-danger'
              : 'border-border focus:border-brand-purple/40',
            className,
          )}
          {...props}
        />
        {error && <p className="text-[9px] font-mono text-status-danger">{error}</p>}
        {hint && !error && <p className="text-[9px] font-mono text-text-dim">{hint}</p>}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-[9px] font-mono font-semibold text-text-dim uppercase tracking-wider">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={clsx(
            'w-full px-3 py-2 rounded-md bg-surface border text-text-primary text-xs font-mono outline-none transition-colors',
            error ? 'border-status-danger/50' : 'border-border focus:border-brand-purple/40',
            className,
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-[9px] font-mono text-status-danger">{error}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'
