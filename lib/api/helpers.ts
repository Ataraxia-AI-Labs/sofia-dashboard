import { API_URL, authFetch } from '../supabase'

// Re-export for use by domain modules
export { API_URL, authFetch }

// ============================================================
// URL HELPERS
// ============================================================

export function withBranch(url: string, branchId?: string | null): string {
  if (!branchId) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}branch_id=${branchId}`
}

// ============================================================
// FORMATTERS
// ============================================================

export function formatCOP(n: number): string {
  if (n == null || Number.isNaN(n)) return '$0'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toLocaleString('es-CO')}`
}

export function formatUSD(n: number): string {
  return `$${n.toFixed(2)}`
}

export function formatNumber(n: number): string {
  return (n || 0).toLocaleString('es-CO')
}

export function formatPercent(n: number): string {
  return `${(n || 0).toFixed(1)}%`
}

export function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diff < 60) return 'ahora'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `hace ${Math.floor(diff / 86400)}d`
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}
