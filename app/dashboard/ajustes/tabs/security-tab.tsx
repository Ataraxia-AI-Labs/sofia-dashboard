'use client'

import { useState, useEffect, useRef } from 'react'
import { Shield, ShieldCheck, ShieldOff, Copy, Check, KeyRound, Loader2, AlertTriangle } from 'lucide-react'
import * as Sentry from '@sentry/nextjs'
import { enrollMFA, verifyMFA, unenrollMFA, getMFAStatus } from '@/lib/mfa-api'
import { supabase } from '@/lib/supabase'
import { Modal } from '@/components/ui'

// ── Sub-components ────────────────────────────────────────────

function CodeInput({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={6}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      disabled={disabled}
      placeholder="000000"
      className="w-40 text-center text-2xl font-body tracking-[0.4em] px-4 py-3 rounded-lg bg-surface-2 border border-border text-text-primary placeholder:text-text-dim outline-none focus:border-brand-purple/50 focus:ring-1 focus:ring-brand-purple/20 transition-all disabled:opacity-50"
      autoComplete="one-time-code"
    />
  )
}

// ── Main component ────────────────────────────────────────────

export function SecurityTab() {
  // MFA status
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)

  // Enroll flow
  const [enrolling, setEnrolling] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [enrollFactorId, setEnrollFactorId] = useState<string | null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [enrollSuccess, setEnrollSuccess] = useState(false)
  const [copiedSecret, setCopiedSecret] = useState(false)

  // Disable flow
  const [disableModalOpen, setDisableModalOpen] = useState(false)
  const [disablePassword, setDisablePassword] = useState('')
  const [disabling, setDisabling] = useState(false)
  const [disableError, setDisableError] = useState('')

  // Generic error
  const [error, setError] = useState('')

  // Load MFA status on mount
  useEffect(() => {
    loadStatus()
  }, [])

  async function loadStatus() {
    setStatusLoading(true)
    try {
      const status = await getMFAStatus()
      setMfaEnabled(status.enabled)
      const firstVerified = status.factors.find((f) => f.status === 'verified')
      setFactorId(firstVerified?.id ?? null)
    } catch (e) {
      Sentry.captureException(e)
    }
    setStatusLoading(false)
  }

  // ── Enable flow ────────────────────────────────────────────

  async function handleStartEnroll() {
    setError('')
    setEnrolling(true)
    setEnrollSuccess(false)
    try {
      const result = await enrollMFA()
      setQrCode(result.qrCode)
      setSecret(result.secret)
      setEnrollFactorId(result.factorId)
    } catch (e) {
      Sentry.captureException(e)
      setError(e instanceof Error ? e.message : 'Error al iniciar configuración 2FA')
      setEnrolling(false)
    }
  }

  async function handleVerifyEnroll() {
    if (!enrollFactorId || verifyCode.length !== 6) return
    setVerifying(true)
    setError('')
    try {
      await verifyMFA(enrollFactorId, verifyCode)
      setEnrollSuccess(true)
      setMfaEnabled(true)
      setFactorId(enrollFactorId)
      setQrCode(null)
      setSecret(null)
      setEnrollFactorId(null)
      setVerifyCode('')
      setEnrolling(false)
    } catch (e) {
      Sentry.captureException(e)
      setError(e instanceof Error ? e.message : 'Codigo incorrecto. Intenta de nuevo.')
    }
    setVerifying(false)
  }

  function handleCancelEnroll() {
    setEnrolling(false)
    setQrCode(null)
    setSecret(null)
    setEnrollFactorId(null)
    setVerifyCode('')
    setError('')
  }

  async function handleCopySecret() {
    if (!secret) return
    await navigator.clipboard.writeText(secret)
    setCopiedSecret(true)
    setTimeout(() => setCopiedSecret(false), 2000)
  }

  // ── Disable flow ───────────────────────────────────────────

  async function handleDisable() {
    if (!factorId) return
    setDisabling(true)
    setDisableError('')
    try {
      // Re-verify password before disabling
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) throw new Error('No se pudo obtener el usuario')

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: disablePassword,
      })
      if (signInError) throw new Error('Contrasena incorrecta')

      await unenrollMFA(factorId)
      setMfaEnabled(false)
      setFactorId(null)
      setDisableModalOpen(false)
      setDisablePassword('')
    } catch (e) {
      Sentry.captureException(e)
      setDisableError(e instanceof Error ? e.message : 'Error al desactivar 2FA')
    }
    setDisabling(false)
  }

  // ── Render ─────────────────────────────────────────────────

  if (statusLoading) {
    return (
      <div className="glass-card p-5 flex items-center gap-3 animate-sentient-breathe">
        <Loader2 size={16} className="animate-spin text-brand-purple" />
        <span className="text-text-muted text-[12px] font-body">Cargando estado de seguridad...</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header card */}
      <div className="glass-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${mfaEnabled ? 'bg-status-success/10' : 'bg-surface-3'}`}>
              {mfaEnabled
                ? <ShieldCheck size={20} className="text-status-success" />
                : <Shield size={20} className="text-text-muted" />
              }
            </div>
            <div>
              <h3 className="text-xs font-body font-semibold text-text-primary">
                Autenticacion en dos pasos (2FA)
              </h3>
              <p className="text-[12px] font-body text-text-muted mt-0.5">
                {mfaEnabled
                  ? 'Tu cuenta esta protegida con un autenticador TOTP'
                  : 'Agrega una capa extra de seguridad a tu cuenta'}
              </p>
            </div>
          </div>
          <span className={`text-[12px] font-body font-semibold px-2.5 py-1 rounded-md ${mfaEnabled ? 'bg-status-success/10 text-status-success' : 'bg-surface-3 text-text-dim'}`}>
            {mfaEnabled ? 'Activo' : 'Inactivo'}
          </span>
        </div>

        {error && (
          <div className="mt-3 px-3 py-2 rounded-md bg-status-danger/10 border border-status-danger/20 text-status-danger text-[12px] font-body flex items-center gap-2">
            <AlertTriangle size={14} />
            {error}
          </div>
        )}

        {/* ── Success confirmation ───────────────────────────── */}
        {enrollSuccess && (
          <div className="mt-3 px-3 py-2 rounded-md bg-status-success/10 border border-status-success/20 text-status-success text-[12px] font-body flex items-center gap-2">
            <ShieldCheck size={14} />
            2FA activado correctamente. Tu cuenta ya esta protegida.
          </div>
        )}

        {/* ── Enroll flow ────────────────────────────────────── */}
        {!mfaEnabled && !enrolling && (
          <button
            onClick={handleStartEnroll}
            className="mt-4 px-4 py-2 rounded-lg bg-brand-purple text-white text-[12px] font-body font-semibold flex items-center gap-2 hover:bg-brand-purple-dark transition-colors"
          >
            <KeyRound size={14} />
            Activar 2FA
          </button>
        )}

        {enrolling && qrCode && (
          <div className="mt-4 space-y-4">
            <p className="text-[12px] font-body text-text-muted leading-relaxed">
              Escanea el codigo QR con tu app autenticadora (Google Authenticator, Authy, etc.) y luego ingresa el codigo de 6 digitos para confirmar.
            </p>

            {/* QR Code */}
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="flex-shrink-0 p-3 bg-white rounded-lg border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCode} alt="QR Code para autenticador 2FA" width={160} height={160} className="block" />
              </div>

              {secret && (
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-body text-text-dim mb-1.5">O ingresa el codigo manual:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 min-w-0 px-3 py-2 rounded-md bg-surface-3 text-text-muted text-[12px] font-body break-all">
                      {secret}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopySecret}
                      aria-label="Copiar clave secreta"
                      className="flex-shrink-0 w-8 h-8 rounded-md bg-surface-3 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                    >
                      {copiedSecret ? <Check size={14} className="text-status-success" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Verify */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <CodeInput value={verifyCode} onChange={setVerifyCode} disabled={verifying} />
              <div className="flex gap-2">
                <button
                  onClick={handleVerifyEnroll}
                  disabled={verifyCode.length !== 6 || verifying}
                  className="px-4 py-2 rounded-lg bg-brand-purple text-white text-[12px] font-body font-semibold flex items-center gap-2 hover:bg-brand-purple-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {verifying ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Verificar
                </button>
                <button
                  onClick={handleCancelEnroll}
                  disabled={verifying}
                  className="px-4 py-2 rounded-lg bg-surface-2 border border-border text-text-muted text-[12px] font-body font-medium hover:text-text-primary transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Disable button ─────────────────────────────────── */}
        {mfaEnabled && !enrolling && (
          <button
            onClick={() => { setDisableModalOpen(true); setDisableError(''); setDisablePassword('') }}
            className="mt-4 px-4 py-2 rounded-lg bg-surface-2 border border-status-danger/30 text-status-danger text-[12px] font-body font-semibold flex items-center gap-2 hover:bg-status-danger/10 transition-colors"
          >
            <ShieldOff size={14} />
            Desactivar 2FA
          </button>
        )}
      </div>

      {/* Info card */}
      <div className="glass-card p-4">
        <p className="text-[12px] font-body text-text-dim leading-relaxed">
          <span className="text-text-muted font-medium">Que es 2FA?</span>{' '}
          La autenticacion en dos pasos requiere que ingreses un codigo de 6 digitos generado por tu app autenticadora cada vez que inicias sesion, ademas de tu contrasena habitual.
          Esto protege tu cuenta incluso si alguien obtiene tu contrasena.
        </p>
      </div>

      {/* ── Disable modal ──────────────────────────────────── */}
      <Modal
        open={disableModalOpen}
        onClose={() => !disabling && setDisableModalOpen(false)}
        title="Desactivar 2FA"
        description="Confirma tu contrasena para desactivar la autenticacion en dos pasos."
        size="sm"
      >
        <div className="space-y-3 pt-2">
          <div>
            <label className="block text-[12px] font-body font-medium text-text-muted mb-1.5 uppercase tracking-wider">
              Contrasena actual
            </label>
            <input
              type="password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 rounded-lg bg-surface-2 border border-border text-text-primary placeholder:text-text-dim text-xs font-body outline-none focus:border-brand-purple/50 focus:ring-1 focus:ring-brand-purple/20 transition-all"
              autoComplete="current-password"
            />
          </div>

          {disableError && (
            <div className="px-3 py-2 rounded-md bg-status-danger/10 border border-status-danger/20 text-status-danger text-[12px] font-body">
              {disableError}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              onClick={handleDisable}
              disabled={!disablePassword || disabling}
              className="flex-1 py-2 rounded-lg bg-status-danger text-white text-[12px] font-body font-semibold flex items-center justify-center gap-2 hover:bg-status-danger/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {disabling ? <Loader2 size={14} className="animate-spin" /> : <ShieldOff size={14} />}
              Desactivar
            </button>
            <button
              onClick={() => setDisableModalOpen(false)}
              disabled={disabling}
              className="flex-1 py-2 rounded-lg bg-surface-2 border border-border text-text-muted text-[12px] font-body font-medium hover:text-text-primary transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
