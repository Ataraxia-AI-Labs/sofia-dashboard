'use client'

import { useEffect, useState, useCallback } from 'react'
import { fetchSystemHealth } from '@/lib/api/health'
import type { SystemHealth } from '@/types'
import {
  Activity, Shield, Phone, CreditCard,
  Database, Brain, MessageSquare, RefreshCw,
  CheckCircle, AlertTriangle, XCircle, Server
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

const BREAKER_ICONS: Record<string, LucideIcon> = {
  openai: Brain,
  supabase: Database,
  meta: MessageSquare,
  voice: Phone,
  wompi: CreditCard,
}

export default function SystemHealthPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const t = useTranslations('health')
  const tCommon = useTranslations('common')

  const STATUS_CONFIG: Record<string, { color: string; icon: LucideIcon; label: string }> = {
    CLOSED: { color: 'text-status-success', icon: CheckCircle, label: t('operational') },
    HALF_OPEN: { color: 'text-status-warning', icon: AlertTriangle, label: t('degraded') },
    OPEN: { color: 'text-status-danger', icon: XCircle, label: t('down') },
  }

  const HEALTH_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
    HEALTHY: { color: 'text-status-success', bg: 'bg-status-success/10', label: t('operational') },
    DEGRADED: { color: 'text-status-warning', bg: 'bg-status-warning/10', label: t('degraded') },
    CRITICAL: { color: 'text-status-danger', bg: 'bg-status-danger/10', label: t('down') },
  }

  const loadHealth = useCallback(async () => {
    try {
      const data = await fetchSystemHealth()
      setHealth(data)
    } catch {
      setHealth({ status: 'CRITICAL', error: 'Error al cargar' })
    }
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { loadHealth() }, [loadHealth])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(loadHealth, 15000)
    return () => clearInterval(interval)
  }, [autoRefresh, loadHealth])

  const healthConfig = HEALTH_CONFIG[health?.status || 'CRITICAL'] || HEALTH_CONFIG.CRITICAL

  return (
    <div className="space-y-4 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-md ${healthConfig.bg} flex items-center justify-center`}>
            <Activity size={18} className={healthConfig.color} />
          </div>
          <div>
            <h2 className="text-sm font-mono font-bold uppercase tracking-wide text-text-primary">{t('title')}</h2>
            <p className="text-[11px] font-body text-text-dim">Circuit Breakers & Service Status</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-md text-[12px] font-body font-semibold border ${autoRefresh ? 'bg-status-success/10 border-status-success/20 text-status-success' : 'bg-surface-2 border-border text-text-muted'}`}
          >
            {autoRefresh ? '● Auto-refresh ON' : '○ Auto-refresh OFF'}
          </button>
          <button onClick={loadHealth} aria-label={tCommon('refresh')} className="w-7 h-7 rounded-md bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Overall Status */}
      <div className={`glass-card p-4 border-l-4 ${health?.status === 'HEALTHY' ? 'border-l-status-success' : health?.status === 'DEGRADED' ? 'border-l-status-warning' : 'border-l-status-danger'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield size={20} className={healthConfig.color} />
            <div>
              <div className={`text-sm font-mono font-bold ${healthConfig.color}`}>{healthConfig.label}</div>
              <div className="text-[11px] font-body text-text-dim">
                Uptime: {health?.uptime_human || '—'} | DB: {health?.database || '—'} | v{health?.version || '—'}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-body text-text-dim">Cola de mensajes</div>
            <div className={`text-sm font-bold font-mono ${(health?.message_queue?.pending || 0) > 0 ? 'text-status-warning' : 'text-status-success'}`}>
              {health?.message_queue?.pending || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Circuit Breakers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {health?.circuit_breakers && Object.entries(health.circuit_breakers).map(([key, breaker]) => {
          const statusConf = STATUS_CONFIG[breaker.state] || STATUS_CONFIG.OPEN
          const Icon = BREAKER_ICONS[key] || Server
          const StatusIcon = statusConf.icon

          return (
            <div key={key} className="glass-card p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-md ${breaker.state === 'CLOSED' ? 'bg-status-success/10' : breaker.state === 'HALF_OPEN' ? 'bg-status-warning/10' : 'bg-status-danger/10'} flex items-center justify-center`}>
                    <Icon size={14} className={statusConf.color} />
                  </div>
                  <span className="text-[12px] font-body font-semibold text-text-primary">{breaker.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <StatusIcon size={12} className={statusConf.color} />
                  <span className={`text-[11px] font-body font-semibold ${statusConf.color}`}>{statusConf.label}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-void/50 rounded-md p-1.5">
                  <div className="text-[10px] font-bold text-text-primary font-body">{breaker.failure_count}</div>
                  <div className="text-[10px] font-body text-text-dim">Fallos</div>
                </div>
                <div className="bg-void/50 rounded-md p-1.5">
                  <div className="text-[10px] font-bold text-text-primary font-body">{breaker.success_count}</div>
                  <div className="text-[10px] font-body text-text-dim">Exitos</div>
                </div>
                <div className="bg-void/50 rounded-md p-1.5">
                  <div className="text-[10px] font-bold text-text-primary font-body">{breaker.uptime_seconds}s</div>
                  <div className="text-[10px] font-body text-text-dim">En estado</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* How it works */}
      <div className="glass-card p-4">
        <h3 className="text-[11px] font-body font-semibold text-text-muted uppercase tracking-wider mb-3">Como funciona el Circuit Breaker</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
          <div className="p-2.5 rounded-md bg-status-success/5 border border-status-success/20">
            <CheckCircle size={18} className="text-status-success mx-auto mb-1.5" />
            <div className="text-[12px] font-body font-semibold text-status-success">CLOSED</div>
            <div className="text-[11px] font-body text-text-dim mt-1">Todo funciona. Trafico normal.</div>
          </div>
          <div className="p-2.5 rounded-md bg-status-warning/5 border border-status-warning/20">
            <AlertTriangle size={18} className="text-status-warning mx-auto mb-1.5" />
            <div className="text-[12px] font-body font-semibold text-status-warning">HALF-OPEN</div>
            <div className="text-[11px] font-body text-text-dim mt-1">Probando recuperacion. Trafico limitado.</div>
          </div>
          <div className="p-2.5 rounded-md bg-status-danger/5 border border-status-danger/20">
            <XCircle size={18} className="text-status-danger mx-auto mb-1.5" />
            <div className="text-[12px] font-body font-semibold text-status-danger">OPEN</div>
            <div className="text-[11px] font-body text-text-dim mt-1">Servicio caido. Usando fallback.</div>
          </div>
        </div>
      </div>
    </div>
  )
}
