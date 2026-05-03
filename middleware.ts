import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          for (const { name, value, options } of cookiesToSet) {
            request.cookies.set(name, value)
            response = NextResponse.next({ request })
            response.cookies.set(name, value, options)
          }
        },
      },
    }
  )

  // S133 VER-007 (documented tradeoff): getUser() makes a network call
  // to Supabase on every matched request. Caching this would create a
  // stale-session window where a revoked or expired session is still
  // treated as valid. Supabase explicitly recommends NOT caching
  // getUser() in middleware — see
  // https://supabase.com/docs/guides/auth/server-side/nextjs.
  // The latency cost is the price of the security guarantee.
  const { data: { user } } = await supabase.auth.getUser()

  if (pathname.startsWith('/dashboard')) {
    if (!user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  if (pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/reset-password', '/onboarding', '/forgot-password', '/auth/callback'],
}
