import Link from 'next/link'
import { SofiaLogo } from '@/components/sofia-logo'
import { ArrowRight, Home, ShieldOff } from 'lucide-react'

export default function Forbidden() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-brand-purple/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="text-center space-y-8 max-w-md relative z-10">
        {/* Logo */}
        <div className="flex justify-center">
          <SofiaLogo size="md" variant="full" />
        </div>

        {/* Icon + 403 display */}
        <div>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-status-danger/10 border border-status-danger/20 flex items-center justify-center">
              <ShieldOff size={28} className="text-status-danger" />
            </div>
          </div>
          <h1 className="text-8xl font-bold font-mono gradient-text mb-3">403</h1>
          <h2 className="text-xl font-semibold text-text-primary">Acceso denegado</h2>
          <p className="text-text-muted text-sm mt-3 leading-relaxed max-w-sm mx-auto">
            No tienes permiso para ver esta pagina.
            Contacta al administrador de tu clinica si crees que esto es un error.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-purple to-brand-purple-dark text-white font-semibold text-sm flex items-center gap-2 hover:shadow-lg hover:shadow-brand-purple/20 transition-all"
          >
            <Home size={14} />
            Ir al Dashboard
          </Link>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl bg-surface-2 border border-border text-text-muted text-sm font-semibold hover:text-text-primary hover:border-brand-purple/30 transition-all flex items-center gap-2"
          >
            Inicio <ArrowRight size={14} />
          </Link>
        </div>

        <p className="text-text-dim text-xs">
          SofIA by Ataraxia IA Labs &mdash; Asistente IA para clinicas
        </p>
      </div>
    </div>
  )
}
