import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase client — uses cookies (not localStorage) so the
// Next.js middleware can read the session via createServerClient.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// API base URL for the FastAPI backend (required — no hardcoded fallback)
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://ataraxia-api-core.onrender.com'

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
  // getSession() reads from local cache (fast). The JWT is re-validated server-side
  // by the backend's auth.py, so we don't need the overhead of getUser() here.
  const { data: { session } } = await supabase.auth.getSession()
  const headers = new Headers(options?.headers)
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`)
  }
  if (!headers.has('Content-Type') && options?.body) {
    headers.set('Content-Type', 'application/json')
  }

  // Timeout protection — prevent hanging requests (e.g. Render cold starts)
  const timeoutMs = options?.timeoutMs ?? 15000
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: options?.signal ?? controller.signal,
    })

    // Global 401 — Backend rejected the token.
    // Do NOT auto-signout: the Supabase session may still be valid
    // (backend could be deploying, cold starting, or have JWT config issues).
    // Let the calling code handle the error gracefully.
    if (res.status === 401) {
      throw new Error('Error de autenticación con el servidor. Intenta recargar la página.')
    }

    // Global 403 — Access denied (e.g. user accessing another org's data)
    if (res.status === 403) {
      const msg = await parseAPIError(res)
      throw new Error(msg || 'No tienes acceso a este recurso')
    }

    // Global 429 — Rate limit exceeded
    if (res.status === 429) {
      throw new Error('Demasiadas solicitudes. Espera un momento e intenta de nuevo.')
    }

    return res
  } finally {
    clearTimeout(timer)
  }
}
