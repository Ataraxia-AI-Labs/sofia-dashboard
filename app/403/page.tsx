import Link from 'next/link'
import { SofiaLogo } from '@/components/sofia-logo'
import { ArrowRight, Home, ShieldOff } from 'lucide-react'

export default function Forbidden() {
  return (
    <div className="min-h-screen bg-void flex flex-col items-center justify-center px-5 relative overflow-hidden">
      <div className="text-center space-y-6 max-w-md relative z-10">
        {/* Logo */}
        <div className="flex justify-center">
          <SofiaLogo size="md" variant="full" />
        </div>

        {/* Icon + 403 display */}
        <div>
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 rounded-lg bg-status-danger/10 border border-status-danger/20 flex items-center justify-center">
              <ShieldOff size={24} className="text-status-danger" />
            </div>
          </div>
          <h1 className="text-8xl font-bold font-mono text-brand-purple mb-2">403</h1>
          <h2 className="text-xl font-semibold text-text-primary font-mono">Acceso denegado</h2>
          <p className="text-text-muted text-xs font-mono mt-2 leading-relaxed max-w-sm mx-auto">
            No tienes permiso para ver esta pagina.
            Contacta al administrador de tu clinica si crees que esto es un error.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg bg-brand-purple text-white font-semibold text-xs font-mono flex items-center gap-2 hover:bg-brand-purple-dark transition-colors"
          >
            <Home size={12} />
            Ir al Dashboard
          </Link>
          <Link
            href="/"
            className="px-4 py-2 rounded-lg bg-surface-2 border border-border text-text-muted text-xs font-mono font-semibold hover:text-text-primary hover:border-brand-purple/30 transition-all flex items-center gap-2"
          >
            Inicio <ArrowRight size={12} />
          </Link>
        </div>

        <p className="text-text-dim text-[10px] font-mono">
          SofIA by Ataraxia IA Labs &mdash; Asistente IA para clinicas
        </p>
      </div>
    </div>
  )
}
