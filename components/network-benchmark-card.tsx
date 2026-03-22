'use client'

import { useTranslations } from 'next-intl'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface NetworkBenchmarkCardProps {
  metricName: string
  yours: number
  marketAvg: number
  percentile: number
  format?: 'percent' | 'currency' | 'number' | 'time'
  higherIsBetter?: boolean
}

export function NetworkBenchmarkCard({
  metricName,
  yours,
  marketAvg,
  percentile,
  format = 'number',
  higherIsBetter = true,
}: NetworkBenchmarkCardProps) {
  const t = useTranslations('network')

  const isAbove = higherIsBetter ? yours >= marketAvg : yours <= marketAvg
  const isClose = Math.abs(yours - marketAvg) / (marketAvg || 1) < 0.05

  const colorClass = isClose
    ? 'text-status-warning'
    : isAbove
    ? 'text-status-success'
    : 'text-status-danger'

  const bgClass = isClose
    ? 'bg-status-warning/10 border-status-warning/20'
    : isAbove
    ? 'bg-status-success/10 border-status-success/20'
    : 'bg-status-danger/10 border-status-danger/20'

  const formatValue = (v: number) => {
    switch (format) {
      case 'percent':
        return `${v.toFixed(1)}%`
      case 'currency':
        return `$${v.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`
      case 'time':
        return v >= 3600 ? `${(v / 3600).toFixed(1)}h` : v >= 60 ? `${(v / 60).toFixed(0)}m` : `${v.toFixed(0)}s`
      default:
        return v.toLocaleString('es-CO', { maximumFractionDigits: 1 })
    }
  }

  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between mb-3">
        <h4 className="text-[10px] font-mono font-semibold text-text-muted uppercase tracking-wider">{metricName}</h4>
        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${bgClass} ${colorClass}`}>
          P{percentile}
        </span>
      </div>

      <div className="flex items-end gap-3 mb-3">
        <div className="text-xl font-bold font-mono text-text-primary">{formatValue(yours)}</div>
        <div className="flex items-center gap-1 pb-0.5">
          {isClose ? (
            <Minus size={14} className={colorClass} />
          ) : isAbove ? (
            <TrendingUp size={14} className={colorClass} />
          ) : (
            <TrendingDown size={14} className={colorClass} />
          )}
          <span className={`text-[10px] font-mono font-semibold ${colorClass}`}>
            {isAbove ? t('aboveAvg') : isClose ? '~' : t('belowAvg')}
          </span>
        </div>
      </div>

      {/* Comparison bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] text-text-dim">
          <span>{t('yourClinic')}</span>
          <span>{t('marketAvg')}</span>
        </div>
        <div className="relative h-2 bg-surface-3 rounded overflow-hidden">
          {/* Market avg marker */}
          <div
            className="absolute top-0 h-full w-0.5 bg-text-dim z-10"
            style={{ left: `${Math.min(95, (marketAvg / Math.max(yours, marketAvg) * 1.2) * 100 / 1.2)}%` }}
          />
          {/* Your value bar */}
          <div
            className={`h-full rounded transition-all ${isAbove ? 'bg-status-success' : isClose ? 'bg-status-warning' : 'bg-status-danger'}`}
            style={{ width: `${Math.min(100, (yours / Math.max(yours, marketAvg) * 1.2) * 100 / 1.2)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-mono text-text-dim">
          <span>{formatValue(yours)}</span>
          <span>{formatValue(marketAvg)}</span>
        </div>
      </div>
    </div>
  )
}
