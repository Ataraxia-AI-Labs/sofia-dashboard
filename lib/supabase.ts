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
  // AUTH-001: Validate user server-side first (cached 60s), then get session token.
  // Expired-session throws are expected flow (middleware redirects to /login),
  // so they are ignoreErrors-filtered in sentry.client.config.ts.
  const { user, error: userError } = await getCachedUser()
  if (userError || !user) {
    throw new Error('No hay sesión activa. Recarga la página o inicia sesión de nuevo.')
  }

  const { data: { session } } = await supabase.auth.getSession()
  const headers = new Headers(options?.headers)

  if (!session?.access_token) {
    throw new Error('No hay sesión activa. Recarga la página o inicia sesión de nuevo.')
  }

  headers.set('Authorization', `Bearer ${session.access_token}`)
  if (!headers.has('Content-Type') && options?.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const timeoutMs = options?.timeoutMs ?? 45000
  const method = (options?.method || 'GET').toUpperCase()
  // Only retry idempotent methods. Retrying POST/PUT/DELETE could duplicate side effects.
  const isRetriable = method === 'GET' || method === 'HEAD'
  const maxAttempts = isRetriable ? 3 : 1

  let lastErr: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const res = await fetch(url, {
        ...options,
        headers,
        signal: options?.signal ?? controller.signal,
      })

      if (!res.ok) {
        // 404: legit empty state (caller handles null). 401: auth flow handles redirect.
        const silent = res.status === 404 || res.status === 401
        if (!silent) {
          Sentry.captureMessage(`[authFetch] ${res.status} ${method} ${url}`, 'warning')
        }
      }

      return res
    } catch (err) {
      lastErr = err
      // Retry only on genuine network errors (TypeError from fetch), not on HTTP errors
      // or user-provided AbortSignal cancellations. Fall through to throw on last attempt.
      const isNetworkError = err instanceof TypeError
      const isLastAttempt = attempt === maxAttempts
      if (!isRetriable || !isNetworkError || isLastAttempt) {
        Sentry.captureException(err, { tags: { context: 'authFetch', url, attempts: String(attempt) } })
        throw err
      }
      // Exponential backoff — covers Render cold start warmup (~20-40s typical)
      await new Promise(r => setTimeout(r, 500 * Math.pow(3, attempt - 1)))
    } finally {
      clearTimeout(timer)
    }
  }
  // Unreachable — the loop either returns on success or throws on last attempt
  throw lastErr ?? new Error('authFetch: unexpected loop exit')
}
