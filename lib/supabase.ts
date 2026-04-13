import { createBrowserClient } from '@supabase/ssr'
import * as Sentry from '@sentry/nextjs'

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

// Cache getUser() result to avoid hammering Supabase Auth on every authFetch.
// Supabase Auth rate-limits aggressive polling → ERR_CONNECTION_CLOSED.
// User identity changes at most on sign-in/sign-out — cache for 60s is safe.
let _userCache: { user: any; ts: number } | null = null
let _inflightGetUser: Promise<any> | null = null
const USER_CACHE_TTL_MS = 60000

async function getCachedUser() {
  const now = Date.now()
  if (_userCache && (now - _userCache.ts) < USER_CACHE_TTL_MS) {
    return { user: _userCache.user, error: null }
  }
  if (_inflightGetUser) {
    return _inflightGetUser
  }
  _inflightGetUser = (async () => {
    try {
      const res = await supabase.auth.getUser()
      if (res.data?.user && !res.error) {
        _userCache = { user: res.data.user, ts: Date.now() }
      }
      return { user: res.data?.user ?? null, error: res.error }
    } finally {
      _inflightGetUser = null
    }
  })()
  return _inflightGetUser
}

export function invalidateUserCache() {
  _userCache = null
}

// Invalidate cache on auth state changes (sign-in / sign-out / token refresh)
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange(() => { _userCache = null })
}

export async function authFetch(url: string, options?: RequestInit & { timeoutMs?: number }): Promise<Response> {
  // AUTH-001: Validate user server-side first (cached 60s), then get session token
  const { user, error: userError } = await getCachedUser()
  if (userError || !user) {
    Sentry.captureMessage(`[authFetch] User validation failed for: ${url}`, 'warning')
    throw new Error('No hay sesión activa. Recarga la página o inicia sesión de nuevo.')
  }

  const { data: { session } } = await supabase.auth.getSession()
  const headers = new Headers(options?.headers)

  if (!session?.access_token) {
    Sentry.captureMessage(`[authFetch] No session token after user validation for: ${url}`, 'warning')
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
      Sentry.captureMessage(`[authFetch] ${res.status} ${options?.method || 'GET'} ${url}`, 'warning')
    }

    return res
  } catch (err) {
    Sentry.captureException(err, { tags: { context: 'authFetch', url } })
    throw err
  } finally {
    clearTimeout(timer)
  }
}
