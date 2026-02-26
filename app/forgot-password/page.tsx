'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Mail, Send } from 'lucide-react'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${window.location.origin}/reset-password` }
      )

      if (resetError) {
        setError(resetError.message)
        setLoading(false)
        return
      }

      setSent(true)
    } catch {
      setError('Error de conexion. Verifica tu internet e intenta de nuevo.')
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

        {sent ? (
          <div className="text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-status-success/10 border border-status-success/20 flex items-center justify-center mx-auto">
              <Mail size={28} className="text-status-success" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-text-primary mb-2">Revisa tu correo</h2>
              <p className="text-text-muted text-sm leading-relaxed">
                Enviamos un enlace de recuperacion a <strong className="text-text-primary">{email}</strong>.
                Haz clic en el enlace para restablecer tu contrasena.
              </p>
            </div>
            <p className="text-text-dim text-xs">
              Si no lo ves, revisa la carpeta de spam. El enlace expira en 1 hora.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-text-muted text-sm font-semibold hover:text-text-primary transition-colors"
            >
              <ArrowLeft size={16} />
              Volver al login
            </button>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-text-primary mb-2">Recuperar contrasena</h2>
              <p className="text-text-muted text-sm">
                Ingresa tu email y te enviaremos un enlace para restablecer tu contrasena.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@clinica.com"
                  className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary placeholder:text-text-dim text-sm outline-none focus:border-brand-purple/50 focus:ring-1 focus:ring-brand-purple/20 transition-all"
                  required
                  autoFocus
                />
              </div>

              {error && (
                <div className="px-4 py-3 rounded-xl bg-status-danger/10 border border-status-danger/20 text-status-danger text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-purple to-brand-purple-dark text-white font-semibold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-brand-purple/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Enviar enlace
                    <Send size={16} />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => router.push('/login')}
                className="w-full py-2.5 text-text-muted text-sm font-medium hover:text-text-primary transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft size={14} />
                Volver al login
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
