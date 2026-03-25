import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase client — uses cookies (not localStorage) so the
// Next.js middleware can read the session via createServerClient.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// API base URL for the FastAPI backend
export const API_URL = process.env.NEXT_PUBLIC_API_URL!

// ============================================================
// Standardized API error format (from backend Sesion 18)
// ============================================================

export interface APIError {
  error: true
  status_code: number
  message: string
}

/** Parse standardized error response from backend */
export async function parseAPIError(res: Response): Promise<string> {
  try {
    const data = await res.json()
    if (data?.message) return data.message
    if (data?.detail) return typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)
    return `Error ${res.status}`
  } catch {
    return `Error ${res.status}`
  }
}

// ============================================================
// Authenticated fetch — sends Supabase JWT as Bearer token
// Global handling for 401, 403, 429 per backend security spec
// ============================================================

export async function authFetch(url: string, options?: RequestInit & { timeoutMs?: number }): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession()
  const headers = new Headers(options?.headers)

  if (!session?.access_token) {
    console.warn('[authFetch] No session token available for:', url)
    throw new Error('No hay sesión activa. Recarga la página o inicia sesión de nuevo.')
  }

  headers.set('Authorization', `Bearer ${session.access_token}`)
  if (!headers.has('Content-Type') && options?.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const timeoutMs = options?.timeoutMs ?? 45000
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: options?.signal ?? controller.signal,
    })

    if (!res.ok) {
      console.warn(`[authFetch] ${res.status} ${options?.method || 'GET'} ${url}`)
    }

    return res
  } catch (err) {
    console.error(`[authFetch] Network error for ${url}:`, err)
    throw err
  } finally {
    clearTimeout(timer)
  }
}
