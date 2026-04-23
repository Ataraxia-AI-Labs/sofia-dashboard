import { API_URL, authFetch } from '../supabase'

// Re-export for use by domain modules
export { API_URL, authFetch }

// ============================================================
// RESPONSE UNWRAPPERS
// Backend inconsistency protection: many endpoints return
// {items: [...]} / {data: [...]} / {<resource>: [...]} instead
// of a bare array. Without this, .map() crashes the UI.
// ============================================================

export function unwrapArray<T>(body: unknown, ...keys: string[]): T[] {
  if (Array.isArray(body)) return body as T[]
  if (!body || typeof body !== 'object') return []
  const obj = body as Record<string, unknown>
  // Probe common envelope keys first, then any caller-specific keys
  const probe = ['items', 'data', 'results', 'rows', ...keys]
  for (const k of probe) {
    if (Array.isArray(obj[k])) return obj[k] as T[]
  }
  return []
}

export async function fetchArray<T>(url: string, ...keys: string[]): Promise<T[]> {
  const res = await authFetch(url)
  if (!res.ok) return []
  return unwrapArray<T>(await res.json(), ...keys)
}

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
 */
export function formatCurrency(n: number, currency: string = 'COP', locale: string = 'es-CO'): string {
  if (n == null || Number.isNaN(n)) return '$0'
  try {
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

export function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diff < 60) return 'ahora'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `hace ${Math.floor(diff / 86400)}d`
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}
