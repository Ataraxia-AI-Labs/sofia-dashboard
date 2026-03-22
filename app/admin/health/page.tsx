'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchSystemHealth } from '@/lib/api/health'
import { fetchBotLogs, fetchBotErrorCount24h, type BotLogEntry } from '@/lib/admin-api'
import { timeAgo } from '@/lib/api'
import {
  Activity, Server, Database, Brain, MessageSquare, Phone,
  CreditCard, RefreshCw, CheckCircle, AlertTriangle, XCircle,
  Clock, Shield, Zap, Bot
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import type { SystemHealth } from '@/types'

type HealthData = SystemHealth

const CB_ICONS: Record<string, LucideIcon> = {
  openai: Brain,
  supabase: Database,
  meta: MessageSquare,
  voice: Phone,
  wompi: CreditCard,
}

const CB_STATUS: Record<string, { color: string; bg: string; label: string; icon: LucideIcon }> = {
  CLOSED: { color: 'text-status-success', bg: 'bg-status-success/10', label: 'Operativo', icon: CheckCircle },
  HALF_OPEN: { color: 'text-status-warning', bg: 'bg-status-warning/10', label: 'Recuperando', icon: AlertTriangle },
  OPEN: { color: 'text-status-danger', bg: 'bg-status-danger/10', label: 'Caido', icon: XCircle },
}

const BOT_STATUS_COLORS: Record<string, string> = {
  SUCCESS: 'text-status-success bg-status-success/10 border-status-success/20',
  ERROR: 'text-status-danger bg-status-danger/10 border-status-danger/20',
  PARTIAL: 'text-status-warning bg-status-warning/10 border-status-warning/20',
}

export default function AdminHealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null)
  const [botLogs, setBotLogs] = useState<BotLogEntry[]>([])
  const [errorCount24h, setErrorCount24h] = useState(0)
  const [supabaseStatus, setSupabaseStatus] = useState<'ok' | 'error' | 'checking'>('checking')
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const data = await fetchSystemHealth()
      setHealth(data)
    } catch {
      setHealth({ status: 'CRITICAL', error: 'No se pudo conectar con el backend (Render)' })
    }

    // Check Supabase connectivity
    try {
      const { error } = await supabase.from('organizations').select('id', { count: 'exact', head: true })
      setSupabaseStatus(error ? 'error' : 'ok')
    } catch {
      setSupabaseStatus('error')
    }

    // Fetch bot logs and error count
    try {
      const [logs, errors] = await Promise.all([
        fetchBotLogs(50),
        fetchBotErrorCount24h(),
      ])
      setBotLogs(logs)
      setErrorCount24h(errors)
    } catch {
      // silent
    }

    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Auto-refresh every 15s
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(loadData, 15000)
    return () => clearInterval(interval)
  }, [autoRefresh, loadData])

  const overallStatus = health?.status === 'HEALTHY' && supabaseStatus === 'ok' && errorCount24h === 0
    ? 'HEALTHY'
    : health?.status === 'CRITICAL' || supabaseStatus === 'error'
      ? 'CRITICAL'
      : 'DEGRADED'

  const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
    HEALTHY: { color: 'text-status-success', bg: 'bg-status-success', label: 'Todo operativo' },
    DEGRADED: { color: 'text-status-warning', bg: 'bg-status-warning', label: 'Degradado' },
    CRITICAL: { color: 'text-status-danger', bg: 'bg-status-danger', label: 'Critico' },
  }

  const statusCfg = STATUS_CONFIG[overallStatus] || STATUS_CONFIG.CRITICAL

  // Group bot logs by bot_name to find last execution of each
  const lastBotExecution = new Map<string, BotLogEntry>()
  for (const log of botLogs) {
    if (!lastBotExecution.has(log.bot_name)) {
      lastBotExecution.set(log.bot_name, log)
    }
  }

  return (
    <div className="max-w-[1200px] space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-mono font-bold uppercase tracking-wide text-text-primary">System Health</h2>
          <p className="text-text-dim text-[9px] font-mono mt-0.5">Monitoreo en tiempo real de la infraestructura</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-mono font-semibold border transition-colors ${
              autoRefresh ? 'bg-status-success/10 border-status-success/20 text-status-success' : 'bg-surface-2 border-border text-text-dim'
            }`}
          >
            <Zap size={10} />
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </button>
          <button onClick={loadData} className="w-8 h-8 rounded-md bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* OVERALL STATUS */}
      <div className={`glass-card p-4 flex items-center justify-between ${statusCfg.color}`}>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${statusCfg.bg} animate-pulse-soft`} />
          <div>
            <div className="text-sm font-bold font-mono">{statusCfg.label}</div>
            <div className="text-text-dim text-[10px] font-mono mt-0.5">
              {health?.uptime_seconds ? `Uptime: ${Math.floor(health.uptime_seconds / 3600)}h ${Math.floor((health.uptime_seconds % 3600) / 60)}m` : (health?.uptime_human || '')}
              {health?.version ? ` · ${health.version}` : ''}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] font-mono text-text-dim">Errores 24h</div>
            <div className={`text-lg font-bold font-mono ${errorCount24h > 0 ? 'text-status-danger' : 'text-status-success'}`}>{errorCount24h}</div>
          </div>
        </div>
      </div>

      {/* SERVICES GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Render (Backend) */}
        <ServiceCard
          name="Backend (Render)"
          icon={Server}
          status={health?.status === 'HEALTHY' || health?.status === 'DEGRADED' ? 'ok' : 'error'}
          detail={health?.error || 'API respondiendo correctamente'}
        />

        {/* Supabase */}
        <ServiceCard
          name="Supabase (DB)"
          icon={Database}
          status={supabaseStatus === 'ok' ? 'ok' : supabaseStatus === 'error' ? 'error' : 'checking'}
          detail={supabaseStatus === 'ok' ? 'PostgreSQL + RLS operativo' : supabaseStatus === 'error' ? 'Error de conexion' : 'Verificando...'}
        />

        {/* Circuit Breakers */}
        {health?.circuit_breakers && Object.entries(health.circuit_breakers).map(([name, cb]) => {
          const Icon = CB_ICONS[name] || Shield
          const cbCfg = CB_STATUS[cb.state] || CB_STATUS.CLOSED
          return (
            <ServiceCard
              key={name}
              name={name.charAt(0).toUpperCase() + name.slice(1)}
              icon={Icon}
              status={cb.state === 'CLOSED' ? 'ok' : cb.state === 'HALF_OPEN' ? 'warning' : 'error'}
              detail={`${cbCfg.label} · ${cb.failure_count} fallos`}
            />
          )
        })}
      </div>

      {/* BOT EXECUTION — Last runs */}
      <div className="glass-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Bot size={14} className="text-brand-purple" />
            <h3 className="text-[10px] font-mono font-semibold text-text-muted uppercase tracking-wider">Ultima Ejecucion por Bot</h3>
          </div>
          <span className="text-[9px] font-mono text-text-dim">{botLogs.length} logs totales</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2 text-[10px] font-mono font-semibold text-text-dim uppercase tracking-wider">Bot</th>
                <th className="text-left px-4 py-2 text-[10px] font-mono font-semibold text-text-dim uppercase tracking-wider">Estado</th>
                <th className="text-left px-4 py-2 text-[10px] font-mono font-semibold text-text-dim uppercase tracking-wider">Ultima Ejecucion</th>
              </tr>
            </thead>
            <tbody>
              {lastBotExecution.size === 0 ? (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-text-dim text-xs font-mono">Sin logs de bots</td></tr>
              ) : (
                Array.from(lastBotExecution.entries()).map(([botType, log]) => (
                  <tr key={botType} className="border-b border-border/50 hover:bg-surface-3/50">
                    <td className="px-4 py-2.5 text-xs font-mono font-medium text-text-primary">{botType}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${BOT_STATUS_COLORS[log.status] || 'text-text-dim bg-surface-3 border-border'}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs font-mono text-text-muted">{timeAgo(log.executed_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECENT BOT LOGS */}
      <div className="glass-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2.5">
          <Clock size={14} className="text-brand-cyan" />
          <h3 className="text-[10px] font-mono font-semibold text-text-muted uppercase tracking-wider">Logs Recientes de Bots</h3>
        </div>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-surface">
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2 text-[10px] font-mono font-semibold text-text-dim uppercase tracking-wider">Fecha</th>
                <th className="text-left px-4 py-2 text-[10px] font-mono font-semibold text-text-dim uppercase tracking-wider">Bot</th>
                <th className="text-left px-4 py-2 text-[10px] font-mono font-semibold text-text-dim uppercase tracking-wider">Estado</th>
                <th className="text-left px-4 py-2 text-[10px] font-mono font-semibold text-text-dim uppercase tracking-wider">Error</th>
              </tr>
            </thead>
            <tbody>
              {botLogs.map(log => (
                <tr key={log.id} className="border-b border-border/50 hover:bg-surface-3/50">
                  <td className="px-4 py-2 text-xs font-mono text-text-muted whitespace-nowrap">{timeAgo(log.executed_at)}</td>
                  <td className="px-4 py-2 text-xs font-mono text-text-primary">{log.bot_name}</td>
                  <td className="px-4 py-2">
                    <span className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded-full border ${BOT_STATUS_COLORS[log.status] || 'text-text-dim bg-surface-3 border-border'}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-[10px] font-mono text-text-dim">{log.error_message || '\u2014'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ServiceCard({ name, icon: Icon, status, detail }: {
  name: string
  icon: LucideIcon
  status: 'ok' | 'warning' | 'error' | 'checking'
  detail: string
}) {
  const statusMap = {
    ok: { dot: 'bg-status-success', text: 'text-status-success', label: 'Operativo' },
    warning: { dot: 'bg-status-warning', text: 'text-status-warning', label: 'Degradado' },
    error: { dot: 'bg-status-danger', text: 'text-status-danger', label: 'Error' },
    checking: { dot: 'bg-text-dim animate-pulse', text: 'text-text-dim', label: 'Verificando' },
  }
  const cfg = statusMap[status]

  return (
    <div className="glass-card p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-brand-purple" />
          <span className="text-xs font-mono font-semibold text-text-primary">{name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
          <span className={`text-[9px] font-mono font-semibold ${cfg.text}`}>{cfg.label}</span>
        </div>
      </div>
      <p className="text-[10px] font-mono text-text-dim">{detail}</p>
    </div>
  )
}
