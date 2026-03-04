'use client'

import { useState, useCallback, useMemo } from 'react'
import { CreditCard, Lock, Loader2, AlertCircle } from 'lucide-react'

interface CardTokenizationFormProps {
  wompiPublicKey: string
  wompiSandbox: boolean
  onTokenized: (token: string) => void
  onError: (error: string) => void
  disabled?: boolean
}

/* ── Helpers ── */

const WOMPI_BASE = {
  sandbox: 'https://sandbox.wompi.co/v1',
  production: 'https://production.wompi.co/v1',
}

function luhnCheck(num: string): boolean {
  const digits = num.replace(/\s/g, '').split('').reverse().map(Number)
  const sum = digits.reduce((acc, d, i) => {
    if (i % 2 === 1) {
      const doubled = d * 2
      return acc + (doubled > 9 ? doubled - 9 : doubled)
    }
    return acc + d
  }, 0)
  return sum % 10 === 0
}

function detectBrand(num: string): 'visa' | 'mastercard' | null {
  const clean = num.replace(/\s/g, '')
  if (/^4/.test(clean)) return 'visa'
  if (/^(5[1-5]|2[2-7])/.test(clean)) return 'mastercard'
  return null
}

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16)
  return digits.replace(/(.{4})/g, '$1 ').trim()
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return digits
}

function isExpiryValid(exp: string): boolean {
  const match = exp.match(/^(\d{2})\/(\d{2})$/)
  if (!match) return false
  const month = parseInt(match[1], 10)
  const year = parseInt(match[2], 10) + 2000
  if (month < 1 || month > 12) return false
  const now = new Date()
  const expDate = new Date(year, month)
  return expDate > now
}

/* ── Brand icons (inline SVG to avoid external deps) ── */

function BrandIcon({ brand }: { brand: 'visa' | 'mastercard' | null }) {
  if (brand === 'visa') {
    return (
      <svg viewBox="0 0 48 32" className="h-5 w-auto" aria-label="Visa">
        <rect width="48" height="32" rx="4" fill="#1A1F71" />
        <text x="24" y="20" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold" fontFamily="sans-serif">VISA</text>
      </svg>
    )
  }
  if (brand === 'mastercard') {
    return (
      <svg viewBox="0 0 48 32" className="h-5 w-auto" aria-label="Mastercard">
        <rect width="48" height="32" rx="4" fill="#1A1A2E" />
        <circle cx="19" cy="16" r="8" fill="#EB001B" opacity="0.9" />
        <circle cx="29" cy="16" r="8" fill="#F79E1B" opacity="0.9" />
      </svg>
    )
  }
  return <CreditCard className="h-4 w-4 text-text-dim" />
}

/* ── Component ── */

export default function CardTokenizationForm({
  wompiPublicKey,
  wompiSandbox,
  onTokenized,
  onError,
  disabled = false,
}: CardTokenizationFormProps) {
  const [number, setNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [cardHolder, setCardHolder] = useState('')
  const [loading, setLoading] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const brand = useMemo(() => detectBrand(number), [number])
  const cleanNumber = number.replace(/\s/g, '')

  const errors = useMemo(() => {
    const e: Record<string, string | null> = {}
    e.number = cleanNumber.length === 16 && !luhnCheck(cleanNumber)
      ? 'Numero de tarjeta invalido' : cleanNumber.length > 0 && cleanNumber.length < 16
      ? null : null
    if (cleanNumber.length === 16 && !luhnCheck(cleanNumber)) e.number = 'Numero de tarjeta invalido'
    if (expiry.length === 5 && !isExpiryValid(expiry)) e.expiry = 'Fecha expirada o invalida'
    if (cvc.length > 0 && (cvc.length < 3 || cvc.length > 4)) e.cvc = 'CVC debe tener 3 o 4 digitos'
    if (cardHolder.length > 0 && cardHolder.trim().length < 3) e.cardHolder = 'Nombre muy corto'
    return e
  }, [cleanNumber, expiry, cvc, cardHolder])

  const isValid = useMemo(() => {
    return (
      cleanNumber.length === 16 &&
      luhnCheck(cleanNumber) &&
      isExpiryValid(expiry) &&
      cvc.length >= 3 && cvc.length <= 4 &&
      cardHolder.trim().length >= 3 &&
      !Object.values(errors).some(Boolean)
    )
  }, [cleanNumber, expiry, cvc, cardHolder, errors])

  const handleBlur = useCallback((field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid || loading || disabled) return

    setLoading(true)
    const base = wompiSandbox ? WOMPI_BASE.sandbox : WOMPI_BASE.production
    const [expMonth, expYear] = expiry.split('/')

    try {
      const res = await fetch(`${base}/tokens/cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${wompiPublicKey}`,
        },
        body: JSON.stringify({
          number: cleanNumber,
          cvc,
          exp_month: expMonth,
          exp_year: expYear,
          card_holder: cardHolder.trim().toUpperCase(),
        }),
      })

      const json = await res.json()

      if (!res.ok || json.status !== 'CREATED') {
        throw new Error(json.error?.message || 'Error al tokenizar la tarjeta')
      }

      onTokenized(json.data.id)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Error inesperado al tokenizar')
    } finally {
      setLoading(false)
    }
  }, [isValid, loading, disabled, wompiSandbox, wompiPublicKey, cleanNumber, cvc, expiry, cardHolder, onTokenized, onError])

  const inputClass =
    'w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-text-primary text-xs placeholder:text-text-dim focus:outline-none focus:border-brand-purple/50 focus:ring-1 focus:ring-brand-purple/20'
  const labelClass = 'text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5'
  const errorClass = 'text-[10px] text-status-danger mt-1'

  return (
    <form onSubmit={handleSubmit} className="glass-card p-5" autoComplete="off">
      {/* Card Number */}
      <div className="mb-4">
        <label className={labelClass}>Numero de tarjeta</label>
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            className={inputClass + ' pr-12'}
            placeholder="4242 4242 4242 4242"
            value={number}
            onChange={e => setNumber(formatCardNumber(e.target.value))}
            onBlur={() => handleBlur('number')}
            disabled={disabled || loading}
            aria-invalid={!!(touched.number && errors.number)}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <BrandIcon brand={brand} />
          </span>
        </div>
        {touched.number && errors.number && <p className={errorClass}>{errors.number}</p>}
      </div>

      {/* Expiry + CVC row */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className={labelClass}>Expiracion</label>
          <input
            type="text"
            inputMode="numeric"
            className={inputClass}
            placeholder="MM/YY"
            value={expiry}
            onChange={e => setExpiry(formatExpiry(e.target.value))}
            onBlur={() => handleBlur('expiry')}
            disabled={disabled || loading}
            aria-invalid={!!(touched.expiry && errors.expiry)}
          />
          {touched.expiry && errors.expiry && <p className={errorClass}>{errors.expiry}</p>}
        </div>
        <div>
          <label className={labelClass}>CVC</label>
          <input
            type="text"
            inputMode="numeric"
            className={inputClass}
            placeholder="123"
            value={cvc}
            onChange={e => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
            onBlur={() => handleBlur('cvc')}
            disabled={disabled || loading}
            aria-invalid={!!(touched.cvc && errors.cvc)}
          />
          {touched.cvc && errors.cvc && <p className={errorClass}>{errors.cvc}</p>}
        </div>
      </div>

      {/* Cardholder */}
      <div className="mb-5">
        <label className={labelClass}>Titular de la tarjeta</label>
        <input
          type="text"
          className={inputClass}
          placeholder="NOMBRE COMO APARECE EN LA TARJETA"
          value={cardHolder}
          onChange={e => setCardHolder(e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, ''))}
          onBlur={() => handleBlur('cardHolder')}
          disabled={disabled || loading}
          aria-invalid={!!(touched.cardHolder && errors.cardHolder)}
        />
        {touched.cardHolder && errors.cardHolder && <p className={errorClass}>{errors.cardHolder}</p>}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={!isValid || loading || disabled}
        className="w-full py-2.5 rounded-xl bg-brand-purple text-white text-xs font-semibold hover:bg-brand-purple-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Tokenizando...
          </>
        ) : (
          <>
            <Lock className="h-3.5 w-3.5" />
            Guardar tarjeta de forma segura
          </>
        )}
      </button>

      <p className="text-[9px] text-text-dim text-center mt-3 flex items-center justify-center gap-1">
        <Lock className="h-2.5 w-2.5" />
        Datos encriptados. No almacenamos tu tarjeta.
      </p>
    </form>
  )
}
