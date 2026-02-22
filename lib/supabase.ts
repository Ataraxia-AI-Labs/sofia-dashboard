import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// API base URL for the FastAPI backend (required — no hardcoded fallback)
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://ataraxia-api-core.onrender.com'

// ============================================================
// Authenticated fetch — sends Supabase JWT as Bearer token
// ============================================================

export async function authFetch(url: string, options?: RequestInit & { timeoutMs?: number }): Promise<Response> {
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
    return res
  } finally {
    clearTimeout(timer)
  }
}
