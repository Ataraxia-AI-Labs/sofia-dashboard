'use client'

import { forwardRef, useId } from 'react'
import clsx from 'clsx'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: React.ReactNode
}

// S116-A11Y: every label is now linked to its input via htmlFor/id, and
// hint+error are exposed via aria-describedby + aria-invalid. Without these,
// screen readers either read the field with no context or skip the validation
// message entirely. Required for WCAG 2.1 SC 1.3.1 + 3.3.1.
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, className, id: idProp, ...props }, ref) => {
    const reactId = useId()
    const id = idProp ?? `input-${reactId}`
    const hintId = hint ? `${id}-hint` : undefined
    const errorId = error ? `${id}-error` : undefined
    const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={id} className="block text-[11px] font-body font-semibold text-text-dim uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" aria-hidden="true">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={id}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={clsx(
              'w-full px-3 py-2 rounded-md bg-surface border text-text-primary text-xs font-body outline-none transition-colors',
              icon && 'pl-9',
              error
                ? 'border-status-danger/50 focus:border-status-danger focus:ring-1 focus:ring-status-danger/20'
                : 'border-border focus:border-brand-purple/40 focus:ring-1 focus:ring-brand-purple/20',
              className,
            )}
            {...props}
          />
        </div>
        {error && (
          <p id={errorId} role="alert" className="text-[11px] font-body text-status-danger">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="text-[11px] font-body text-text-dim">
            {hint}
          </p>
        )}
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
  ({ label, error, hint, className, id: idProp, ...props }, ref) => {
    const reactId = useId()
    const id = idProp ?? `textarea-${reactId}`
    const hintId = hint ? `${id}-hint` : undefined
    const errorId = error ? `${id}-error` : undefined
    const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={id} className="block text-[11px] font-body font-semibold text-text-dim uppercase tracking-wider">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={clsx(
            'w-full px-3 py-2 rounded-md bg-surface border text-text-primary text-xs font-body outline-none transition-colors resize-y',
            error
              ? 'border-status-danger/50 focus:border-status-danger'
              : 'border-border focus:border-brand-purple/40',
            className,
          )}
          {...props}
        />
        {error && (
          <p id={errorId} role="alert" className="text-[11px] font-body text-status-danger">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="text-[11px] font-body text-text-dim">
            {hint}
          </p>
        )}
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
  ({ label, error, options, className, id: idProp, ...props }, ref) => {
    const reactId = useId()
    const id = idProp ?? `select-${reactId}`
    const errorId = error ? `${id}-error` : undefined
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={id} className="block text-[11px] font-body font-semibold text-text-dim uppercase tracking-wider">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={clsx(
            'w-full px-3 py-2 rounded-md bg-surface border text-text-primary text-xs font-body outline-none transition-colors',
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
        {error && (
          <p id={errorId} role="alert" className="text-[11px] font-body text-status-danger">
            {error}
          </p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'
