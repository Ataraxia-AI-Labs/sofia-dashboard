'use client'

import { TrendingUp, Calendar, Target, AlertCircle, BarChart3, Users } from 'lucide-react'

export interface SuggestedPrompt {
  icon: React.ReactNode
  label: string
  prompt: string
  tone?: 'default' | 'alert'
}

export const DEFAULT_PROMPTS: SuggestedPrompt[] = [
  { icon: <TrendingUp size={14} strokeWidth={1.6} />, label: 'Reporte del día', prompt: 'Dame el reporte ejecutivo de hoy' },
  { icon: <Calendar size={14} strokeWidth={1.6} />, label: 'Agenda de mañana', prompt: '¿Qué citas tengo mañana?' },
  { icon: <Target size={14} strokeWidth={1.6} />, label: 'Oportunidades hot', prompt: '¿Qué oportunidades tengo activas ahora?' },
  { icon: <AlertCircle size={14} strokeWidth={1.6} />, label: 'Pacientes en riesgo', prompt: 'Identifica pacientes en riesgo de churn', tone: 'alert' },
  { icon: <BarChart3 size={14} strokeWidth={1.6} />, label: 'Funnel 30 días', prompt: 'Muéstrame el funnel de conversión últimos 30 días' },
  { icon: <Users size={14} strokeWidth={1.6} />, label: 'Pacientes nuevos', prompt: 'Pacientes nuevos esta semana' },
]

interface SuggestedPromptsProps {
  prompts?: SuggestedPrompt[]
  onSelect: (prompt: string) => void
}

export function SuggestedPrompts({ prompts = DEFAULT_PROMPTS, onSelect }: SuggestedPromptsProps) {
  return (
    <div className="w-full max-w-[760px] mx-auto px-4">
      <div className="flex flex-wrap justify-center gap-1.5">
        {prompts.map((p, i) => (
          <button
            key={i}
            onClick={() => onSelect(p.prompt)}
            className={`sentient-btn group inline-flex items-center gap-1.5 px-3 h-7 rounded-full text-left bg-surface/40 hover:bg-surface-2/60`}
            style={{
              boxShadow: p.tone === 'alert'
                ? '0 0 0 1px rgba(245,200,66,0.18), 0 2px 12px -4px rgba(245,200,66,0.18)'
                : '0 0 0 1px rgba(139,92,246,0.12), 0 2px 12px -4px rgba(139,92,246,0.15)',
            }}
          >
            <span className={`flex-shrink-0 transition-colors ${
              p.tone === 'alert' ? 'text-status-warning/70 group-hover:text-status-warning' : 'text-text-dim group-hover:text-brand-purple'
            }`}>
              {p.icon}
            </span>
            <span className="text-[11.5px] font-body text-text-muted group-hover:text-text-primary whitespace-nowrap">
              {p.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
