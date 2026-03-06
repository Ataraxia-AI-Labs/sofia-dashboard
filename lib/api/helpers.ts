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

/**
 * Format a monetary amount using the browser's Intl.NumberFormat.
 * Supports any currency code (COP, USD, MXN, BRL, PEN, etc.)
 * Falls back to compact notation for large numbers.
 */
export function formatCurrency(n: number, currency: string = 'COP', locale: string = 'es-CO'): string {
  if (n == null || Number.isNaN(n)) return '$0'
  try {
    // Compact display for large numbers
    if (n >= 1_000_000) {
      return new Intl.NumberFormat(locale, {
        style: 'currency', currency, notation: 'compact',
        maximumFractionDigits: 1,
      }).format(n)
    }
    return new Intl.NumberFormat(locale, {
      style: 'currency', currency, maximumFractionDigits: 0,
    }).format(n)
  } catch {
    // Fallback if Intl fails (SSR, unknown currency)
    return `$${n.toLocaleString(locale)}`
  }
}

/** @deprecated Use formatCurrency(n, 'COP') instead */
export function formatCOP(n: number): string {
  return formatCurrency(n, 'COP', 'es-CO')
}

/** @deprecated Use formatCurrency(n, 'USD', 'en-US') instead */
export function formatUSD(n: number): string {
  return formatCurrency(n, 'USD', 'en-US')
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
