'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, Lock, CheckCircle2 } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [sessionReady, setSessionReady] = useState(false)

  // Supabase sends the user to this page with a session after clicking the reset link
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
      }
    })

    // Also check if already in a session (direct navigation after recovery)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('La contrasena debe tener al menos 8 caracteres')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contrasenas no coinciden')
      return
    }

    setLoading(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) {
        setError(updateError.message)
        setLoading(false)
        return
      }

      setSuccess(true)
      setTimeout(() => router.push('/dashboard'), 3000)
    } catch {
      setError('Error actualizando la contrasena. Intenta de nuevo.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-purple to-brand-cyan flex items-center justify-center">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <span className="text-text-primary font-display text-xl font-semibold">Ataraxia</span>
        </div>

        {success ? (
          <div className="text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-status-success/10 border border-status-success/20 flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} className="text-status-success" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-text-primary mb-2">Contrasena actualizada</h2>
              <p className="text-text-muted text-sm">
                Tu contrasena ha sido restablecida exitosamente. Redirigiendo al dashboard...
              </p>
            </div>
            <div className="w-5 h-5 border-2 border-brand-purple/30 border-t-brand-purple rounded-full animate-spin mx-auto" />
          </div>
        ) : !sessionReady ? (
          <div className="text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mx-auto">
              <Lock size={28} className="text-text-dim" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-text-primary mb-2">Verificando enlace...</h2>
              <p className="text-text-muted text-sm">
                Si fuiste redirigido desde tu email, espera un momento.
              </p>
              <p className="text-text-dim text-xs mt-2">
                Si el enlace expiro, <button onClick={() => router.push('/forgot-password')} className="text-brand-purple hover:underline">solicita uno nuevo</button>.
              </p>
            </div>
            <div className="w-5 h-5 border-2 border-brand-purple/30 border-t-brand-purple rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-text-primary mb-2">Nueva contrasena</h2>
              <p className="text-text-muted text-sm">
                Ingresa tu nueva contrasena. Debe tener al menos 8 caracteres.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">
                  Nueva contrasena
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimo 8 caracteres"
                    className="w-full px-4 py-3 pr-12 rounded-xl bg-surface-2 border border-border text-text-primary placeholder:text-text-dim text-sm outline-none focus:border-brand-purple/50 focus:ring-1 focus:ring-brand-purple/20 transition-all"
                    required
                    minLength={8}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-muted transition-colors"
                  >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">
                  Confirmar contrasena
                </label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contrasena"
                  className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary placeholder:text-text-dim text-sm outline-none focus:border-brand-purple/50 focus:ring-1 focus:ring-brand-purple/20 transition-all"
                  required
                  minLength={8}
                />
              </div>

              {/* Password strength indicator */}
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      password.length >= level * 3
                        ? password.length >= 12
                          ? 'bg-status-success'
                          : password.length >= 8
                          ? 'bg-status-warning'
                          : 'bg-status-danger'
                        : 'bg-surface-3'
                    }`}
                  />
                ))}
              </div>

              {error && (
                <div className="px-4 py-3 rounded-xl bg-status-danger/10 border border-status-danger/20 text-status-danger text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || password.length < 8}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-purple to-brand-purple-dark text-white font-semibold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-brand-purple/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Lock size={16} />
                    Restablecer contrasena
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
