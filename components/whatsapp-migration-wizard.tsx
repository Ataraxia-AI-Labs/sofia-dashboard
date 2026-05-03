'use client'

/**
 * S134 WhatsApp number migration / SMS-OTP wizard.
 *
 * Renders the 4-step Meta Cloud API flow once the org already has a
 * phone_number_id + token saved. Each step calls one of the channels
 * API helpers and surfaces Meta's error message verbatim so the operator
 * can act on it (most common failures: rate limit, wrong code, PIN
 * already set).
 */

import { useState } from 'react'
import { ShieldCheck, MessageSquare, Phone, Send, Check, Loader2 } from 'lucide-react'
import {
  requestWhatsAppOTP,
  verifyWhatsAppOTP,
  registerWhatsAppCloud,
  sendWhatsAppTestMessage,
} from '@/lib/api/channels'

type Step = 'request' | 'verify' | 'register' | 'test' | 'done'

interface Props {
  orgId: string
  isReadOnly: boolean
  onMessage: (msg: string) => void
}

export function WhatsAppMigrationWizard({ orgId, isReadOnly, onMessage }: Props) {
  const [step, setStep] = useState<Step>('request')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const [codeMethod, setCodeMethod] = useState<'SMS' | 'VOICE'>('SMS')
  const [otp, setOtp] = useState('')
  const [pin, setPin] = useState('')
  const [testPhone, setTestPhone] = useState('')

  const wrap = async (fn: () => Promise<unknown>) => {
    setError('')
    setBusy(true)
    try {
      await fn()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      setError(msg)
      throw err
    } finally {
      setBusy(false)
    }
  }

  const onRequest = () => wrap(async () => {
    await requestWhatsAppOTP(orgId, { code_method: codeMethod, language: 'es' })
    onMessage(`Código ${codeMethod} solicitado. Revisa el teléfono.`)
    setStep('verify')
  }).catch(() => { /* error already in state */ })

  const onVerify = () => wrap(async () => {
    await verifyWhatsAppOTP(orgId, otp.trim())
    onMessage('Número verificado. Define un PIN de 6 dígitos para 2FA.')
    setStep('register')
  }).catch(() => { /* */ })

  const onRegister = () => wrap(async () => {
    await registerWhatsAppCloud(orgId, pin.trim())
    onMessage('Número registrado en Cloud API. Envía un mensaje de prueba.')
    setStep('test')
  }).catch(() => { /* */ })

  const onTest = () => wrap(async () => {
    const normalized = testPhone.trim().replace(/\s+/g, '')
    await sendWhatsAppTestMessage(orgId, { to_phone: normalized })
    onMessage('Mensaje de prueba enviado.')
    setStep('done')
  }).catch(() => { /* */ })

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-text-dim">
        <ShieldCheck size={12} className="text-brand-purple" aria-hidden="true" />
        <span>Migrar número a Cloud API · SMS verification</span>
      </div>

      {/* Stepper */}
      <ol className="flex items-center gap-2 text-[10px] font-mono">
        {(['request', 'verify', 'register', 'test'] as const).map((s, i) => {
          const order = ['request', 'verify', 'register', 'test'] as const
          const idx = order.indexOf(s)
          const cur = order.indexOf(step === 'done' ? 'test' : (step as typeof order[number]))
          const state = step === 'done' || idx < cur ? 'done' : idx === cur ? 'current' : 'future'
          return (
            <li
              key={s}
              className={`flex items-center gap-1 ${
                state === 'done'
                  ? 'text-status-success'
                  : state === 'current'
                    ? 'text-brand-purple'
                    : 'text-text-dim'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                  state === 'done'
                    ? 'border-status-success bg-status-success/10'
                    : state === 'current'
                      ? 'border-brand-purple bg-brand-purple/10'
                      : 'border-border bg-surface-2'
                }`}
              >
                {state === 'done' ? <Check size={8} aria-hidden="true" /> : i + 1}
              </span>
              <span className="hidden sm:inline">
                {s === 'request' && 'Pedir OTP'}
                {s === 'verify' && 'Verificar'}
                {s === 'register' && 'Registrar PIN'}
                {s === 'test' && 'Test'}
              </span>
            </li>
          )
        })}
      </ol>

      {/* STEP 1 — Request OTP */}
      {step === 'request' && (
        <div className="rounded-lg border border-border bg-surface-2/50 p-3 space-y-2">
          <p className="text-[12px] font-body text-text-muted leading-relaxed">
            Meta enviará un código de 6 dígitos al número configurado. Elige el método.
          </p>
          <div className="flex gap-1.5">
            {(['SMS', 'VOICE'] as const).map(m => (
              <button
                key={m}
                onClick={() => setCodeMethod(m)}
                disabled={busy || isReadOnly}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-body font-medium transition-colors ${
                  codeMethod === m
                    ? 'bg-brand-purple text-white'
                    : 'bg-surface-2 text-text-dim hover:text-text-primary'
                }`}
              >
                {m === 'SMS' ? <MessageSquare size={11} aria-hidden="true" /> : <Phone size={11} aria-hidden="true" />}
                {m}
              </button>
            ))}
          </div>
          <button
            onClick={onRequest}
            disabled={busy || isReadOnly}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-purple text-white text-[12px] font-body font-semibold disabled:opacity-50 hover:bg-brand-purple-dark transition-colors"
          >
            {busy ? <Loader2 size={11} className="animate-spin" aria-hidden="true" /> : <Send size={11} aria-hidden="true" />}
            Solicitar código
          </button>
        </div>
      )}

      {/* STEP 2 — Verify OTP */}
      {step === 'verify' && (
        <div className="rounded-lg border border-border bg-surface-2/50 p-3 space-y-2">
          <label htmlFor="wa-otp" className="text-[11px] font-body text-text-muted">
            Pega el código de 6 dígitos recibido por {codeMethod}
          </label>
          <input
            id="wa-otp"
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
            disabled={busy || isReadOnly}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            className="w-full px-3 py-1.5 rounded-md bg-surface border border-border text-text-primary text-[14px] font-mono tracking-widest text-center focus:outline-none focus:ring-1 focus:ring-brand-purple/50"
          />
          <button
            onClick={onVerify}
            disabled={busy || isReadOnly || otp.length < 4}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-purple text-white text-[12px] font-body font-semibold disabled:opacity-50 hover:bg-brand-purple-dark transition-colors"
          >
            {busy ? <Loader2 size={11} className="animate-spin" aria-hidden="true" /> : <Check size={11} aria-hidden="true" />}
            Verificar
          </button>
        </div>
      )}

      {/* STEP 3 — Register with Cloud API + PIN */}
      {step === 'register' && (
        <div className="rounded-lg border border-border bg-surface-2/50 p-3 space-y-2">
          <label htmlFor="wa-pin" className="text-[11px] font-body text-text-muted">
            Define un PIN de 6 dígitos (2FA del WABA). Guárdalo — Meta lo pide para
            re-registros futuros.
          </label>
          <input
            id="wa-pin"
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            disabled={busy || isReadOnly}
            inputMode="numeric"
            type="password"
            autoComplete="new-password"
            placeholder="••••••"
            className="w-full px-3 py-1.5 rounded-md bg-surface border border-border text-text-primary text-[14px] font-mono tracking-widest text-center focus:outline-none focus:ring-1 focus:ring-brand-purple/50"
          />
          <button
            onClick={onRegister}
            disabled={busy || isReadOnly || pin.length !== 6}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-purple text-white text-[12px] font-body font-semibold disabled:opacity-50 hover:bg-brand-purple-dark transition-colors"
          >
            {busy ? <Loader2 size={11} className="animate-spin" aria-hidden="true" /> : <ShieldCheck size={11} aria-hidden="true" />}
            Registrar en Cloud API
          </button>
        </div>
      )}

      {/* STEP 4 — Send hello_world test */}
      {step === 'test' && (
        <div className="rounded-lg border border-border bg-surface-2/50 p-3 space-y-2">
          <label htmlFor="wa-test-phone" className="text-[11px] font-body text-text-muted">
            Envíate un mensaje de prueba al WhatsApp del CEO (formato +57…).
            Usa el template <code>hello_world</code> (siempre aprobado por Meta).
          </label>
          <input
            id="wa-test-phone"
            value={testPhone}
            onChange={e => setTestPhone(e.target.value)}
            disabled={busy || isReadOnly}
            placeholder="+573001234567"
            inputMode="tel"
            autoComplete="tel"
            className="w-full px-3 py-1.5 rounded-md bg-surface border border-border text-text-primary text-[12px] font-mono focus:outline-none focus:ring-1 focus:ring-brand-purple/50"
          />
          <button
            onClick={onTest}
            disabled={busy || isReadOnly || testPhone.replace(/\D/g, '').length < 8}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-purple text-white text-[12px] font-body font-semibold disabled:opacity-50 hover:bg-brand-purple-dark transition-colors"
          >
            {busy ? <Loader2 size={11} className="animate-spin" aria-hidden="true" /> : <Send size={11} aria-hidden="true" />}
            Enviar mensaje de prueba
          </button>
        </div>
      )}

      {/* STEP 5 — Done */}
      {step === 'done' && (
        <div className="rounded-lg border border-status-success/25 bg-status-success/5 p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-status-success text-[12px] font-body font-semibold">
            <Check size={12} aria-hidden="true" />
            <span>Migración completa</span>
          </div>
          <p className="text-[11px] font-body text-text-muted leading-relaxed">
            El número ya está registrado en WhatsApp Cloud API. SofIA puede recibir
            y enviar mensajes inmediatamente. Si tu test no llegó, revisa que el
            número destino haya enviado al menos un mensaje al WABA en los últimos
            24 h (limitación de templates fuera de la ventana).
          </p>
          <button
            onClick={() => { setStep('request'); setOtp(''); setPin(''); setTestPhone('') }}
            className="text-[11px] font-body text-brand-purple hover:underline"
          >
            Reiniciar wizard
          </button>
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-md border border-status-danger/25 bg-status-danger/5 px-3 py-2 text-[11px] font-body text-status-danger">
          {error}
        </div>
      )}
    </div>
  )
}
