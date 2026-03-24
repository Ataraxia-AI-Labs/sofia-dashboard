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
    <div className="min-h-screen bg-void flex items-center justify-center px-5">
      <div className="w-full max-w-md">
        {/* Sentient Eye */}
        <div className="flex justify-center mb-8">
          <svg width="36" height="36" viewBox="0 0 48 48">
            <ellipse cx="24" cy="24" rx="20" ry="12" fill="none" stroke="#8B5CF6" strokeWidth="1.5" opacity="0.4" />
            <circle cx="24" cy="24" r="6" fill="#8B5CF6" opacity="0.8">
              <animate attributeName="r" values="6;7;6" dur="3s" repeatCount="indefinite" />
            </circle>
            <circle cx="24" cy="24" r="2.5" fill="#F5F3FF" />
          </svg>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-lg bg-status-success/10 border border-status-success/20 flex items-center justify-center mx-auto">
              <Mail size={24} className="text-status-success" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-text-primary font-mono mb-1">Revisa tu correo</h2>
              <p className="text-text-muted text-xs font-mono leading-relaxed">
                Enviamos un enlace de recuperacion a <strong className="text-text-primary">{email}</strong>.
                Haz clic en el enlace para restablecer tu contrasena.
              </p>
            </div>
            <p className="text-text-dim text-[10px] font-mono">
              Si no lo ves, revisa la carpeta de spam. El enlace expira en 1 hora.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-2 border border-border text-text-muted text-xs font-mono font-semibold hover:text-text-primary transition-colors"
            >
              <ArrowLeft size={14} />
              Volver al login
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-text-primary font-mono mb-1">Recuperar contrasena</h2>
              <p className="text-text-muted text-xs font-mono">
                Ingresa tu email y te enviaremos un enlace para restablecer tu contrasena.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono font-medium text-text-dim mb-1.5 uppercase tracking-wider">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@clinica.com"
                  className="w-full px-3 py-2.5 rounded-lg bg-surface-2 border border-border text-text-primary placeholder:text-text-dim text-xs font-mono outline-none focus:border-brand-purple/50 focus:ring-1 focus:ring-brand-purple/20 transition-all"
                  required
                  autoFocus
                />
              </div>

              {error && (
                <div className="px-3 py-2.5 rounded-lg bg-status-danger/10 border border-status-danger/20 text-status-danger text-xs font-mono">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full py-3 rounded-lg bg-brand-purple text-white font-semibold text-xs font-mono flex items-center justify-center gap-2 hover:bg-brand-purple-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Enviar enlace
                    <Send size={14} />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => router.push('/login')}
                className="w-full py-2 text-text-muted text-xs font-mono font-medium hover:text-text-primary transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft size={12} />
                Volver al login
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
