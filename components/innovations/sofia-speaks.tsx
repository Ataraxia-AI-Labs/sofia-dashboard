'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import type { FullAnalytics, VoiceMetrics } from '@/types'
import { formatNumber, formatCOP, formatPercent } from '@/lib/api'

interface SofiaSpeaksProps {
  data: FullAnalytics
  voice?: VoiceMetrics | null
}

/**
 * SofIA Speaks — The dashboard narrator.
 * Generates contextual insights from analytics data.
 * Cycles through observations like a sentient system reporting status.
 */
function generateInsights(data: FullAnalytics, voice?: VoiceMetrics | null): string[] {
  const insights: string[] = []
  const c = data.conversiones
  const r = data.revenue
  const p = data.performance_ia
  const o = data.oportunidades

  // Conversation insights
  if (c.total_mensajes_inbound > 0) {
    insights.push(`${formatNumber(c.total_mensajes_inbound)} mensajes procesados. ${formatNumber(c.pacientes_nuevos)} pacientes nuevos detectados.`)
  }

  // Conversion insight
  if (c.tasa_conversion_pct > 0) {
    const emoji = c.tasa_conversion_pct >= 5 ? 'Conversion saludable' : 'Conversion por mejorar'
    insights.push(`Tasa de conversion: ${formatPercent(c.tasa_conversion_pct)}. ${emoji}.`)
  }

  // Revenue insight
  if (r.revenue_total > 0) {
    insights.push(`Revenue verificado: ${formatCOP(r.revenue_total)}. Ticket promedio: ${formatCOP(r.ticket_promedio)}.`)
  }
  if (r.revenue_pipeline > 0) {
    insights.push(`${formatCOP(r.revenue_pipeline)} en pipeline esperando cierre.`)
  }

  // AI performance
  if (p.total_interacciones > 0) {
    insights.push(`${formatNumber(p.total_interacciones)} interacciones IA. Tiempo promedio: ${formatNumber(p.response_time_promedio_ms)}ms.`)
  }

  // Attendance
  if (c.tasa_asistencia_pct > 0) {
    if (c.tasa_asistencia_pct >= 80) {
      insights.push(`Asistencia del ${formatPercent(c.tasa_asistencia_pct)}. Los recordatorios funcionan.`)
    } else {
      insights.push(`Asistencia del ${formatPercent(c.tasa_asistencia_pct)}. Considerar reforzar recordatorios.`)
    }
  }

  // Opportunities
  if (o.total > 0) {
    insights.push(`${o.total} oportunidades activas. Valor estimado: ${formatCOP(o.valor_total_estimado)}.`)
  }

  // No-show alert
  if (c.tasa_no_show_pct > 10) {
    insights.push(`Alerta: ${formatPercent(c.tasa_no_show_pct)} de no-shows. Activar estrategia de confirmacion.`)
  }

  // Voice
  if (voice && voice.total_calls > 0) {
    insights.push(`Voice AI: ${voice.total_calls} llamadas. ${voice.voice_pct}% del trafico es por voz.`)
  }

  // Projection
  if (r.proyeccion_mensual > 0) {
    insights.push(`Proyeccion mensual: ${formatCOP(r.proyeccion_mensual)}. Manteniendo ritmo actual.`)
  }

  // Cost efficiency
  if (p.total_costo_usd > 0 && p.total_interacciones > 0) {
    const cpi = p.costo_promedio_por_interaccion_usd
    if (cpi < 0.01) {
      insights.push(`Costo por interaccion: $${cpi.toFixed(4)} USD. Eficiencia optima.`)
    } else {
      insights.push(`Costo por interaccion: $${cpi.toFixed(3)} USD. Monitorear tendencia.`)
    }
  }

  if (insights.length === 0) {
    insights.push('Inicializando sensores. Esperando datos de la clinica.')
  }

  return insights
}

export function SofiaSpeaks({ data, voice }: SofiaSpeaksProps) {
  const insights = useMemo(() => generateInsights(data, voice), [data, voice])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [displayText, setDisplayText] = useState('')
  const [isTyping, setIsTyping] = useState(true)

  const currentInsight = insights[currentIndex % insights.length]

  // Typewriter effect
  useEffect(() => {
    setDisplayText('')
    setIsTyping(true)
    let charIndex = 0

    const timer = setInterval(() => {
      if (charIndex < currentInsight.length) {
        setDisplayText(currentInsight.slice(0, charIndex + 1))
        charIndex++
      } else {
        setIsTyping(false)
        clearInterval(timer)
      }
    }, 25)

    return () => clearInterval(timer)
  }, [currentInsight])

  // Auto-advance
  useEffect(() => {
    if (isTyping) return
    const timer = setTimeout(() => {
      setCurrentIndex((i) => (i + 1) % insights.length)
    }, 4000)
    return () => clearTimeout(timer)
  }, [isTyping, insights.length])

  const handleClick = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % insights.length)
  }, [insights.length])

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-md bg-surface-2 border border-border hover:border-brand-purple/20 transition-all cursor-pointer group text-left"
    >
      {/* Sentient indicator */}
      <div className="flex-shrink-0 w-5 h-5 rounded-md bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center">
        <div className="w-1.5 h-1.5 rounded-full bg-brand-purple animate-sentient-pulse" />
      </div>

      {/* Narration */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[8px] font-mono font-bold text-brand-purple uppercase tracking-[0.2em]">SofIA</span>
          <span className="text-[7px] font-mono text-text-dim">SPEAKS</span>
        </div>
        <p className="text-[10px] font-mono text-text-secondary truncate">
          {displayText}
          {isTyping && <span className="inline-block w-px h-3 bg-brand-purple ml-0.5 animate-sentient-pulse" />}
        </p>
      </div>

      {/* Progress dots */}
      <div className="flex-shrink-0 flex gap-0.5">
        {insights.slice(0, Math.min(8, insights.length)).map((_, i) => (
          <div
            key={i}
            className={`w-1 h-1 rounded-full transition-colors ${
              i === currentIndex % insights.length ? 'bg-brand-purple' : 'bg-surface-3'
            }`}
          />
        ))}
      </div>
    </button>
  )
}
