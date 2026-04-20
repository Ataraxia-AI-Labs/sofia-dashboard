import Link from 'next/link'
import { ArrowRight, Home, ShieldOff } from 'lucide-react'

export default function Forbidden() {
  return (
    <div className="min-h-screen bg-void flex flex-col items-center justify-center px-5 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[250px] rounded-full blur-[100px] pointer-events-none" style={{ background: 'rgba(239, 68, 68, 0.04)' }} />

      <div className="text-center space-y-6 max-w-md relative z-10">
        {/* Sentient Eye */}
        <div className="flex justify-center">
          <svg width="36" height="36" viewBox="0 0 48 48">
            <ellipse cx="24" cy="24" rx="20" ry="12" fill="none" stroke="#8B5CF6" strokeWidth="1.5" opacity="0.4" />
            <circle cx="24" cy="24" r="6" fill="#8B5CF6" opacity="0.8">
              <animate attributeName="r" values="6;7;6" dur="3s" repeatCount="indefinite" />
            </circle>
            <circle cx="24" cy="24" r="2.5" fill="#F5F3FF" />
          </svg>
        </div>

        {/* Icon + 403 display */}
        <div>
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-md bg-status-danger/10 border border-status-danger/20 flex items-center justify-center">
              <ShieldOff size={20} className="text-status-danger" />
            </div>
          </div>
          <h1 className="text-7xl font-bold font-body text-brand-purple mb-2">403</h1>
          <h2 className="text-lg font-semibold text-white font-body">Acceso denegado</h2>
          <p className="text-text-muted text-xs font-body mt-2 leading-relaxed max-w-sm mx-auto">
            No tienes permiso para ver esta pagina.
            Contacta al administrador de tu clinica si crees que esto es un error.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-md bg-brand-purple text-white font-semibold text-xs font-body flex items-center gap-2 hover:bg-brand-purple-dark transition-colors"
          >
            <Home size={12} />
            Ir al Nucleus
          </Link>
          <Link
            href="/"
            className="px-4 py-2 rounded-md bg-surface border border-border text-text-muted text-xs font-body font-semibold hover:text-text-primary hover:border-brand-purple/30 transition-all flex items-center gap-2"
          >
            Inicio <ArrowRight size={12} />
          </Link>
        </div>

        <p className="text-text-dim text-[12px] font-body">
          SofIA by Ataraxia IA Labs
        </p>
      </div>
    </div>
  )
}
