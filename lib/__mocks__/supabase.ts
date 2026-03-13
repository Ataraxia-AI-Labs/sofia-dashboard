// lib/__mocks__/supabase.ts
// ---------------------------------------------------------------------------
// Manual mock for @/lib/supabase
//
// When a test file calls:  jest.mock('@/lib/supabase')
// Jest resolves the @/ alias to <rootDir>/lib/supabase, finds this __mocks__
// sibling directory, and uses this file automatically.
//
// Usage in component tests:
//   jest.mock('@/lib/supabase')
//   import { supabase } from '@/lib/supabase'
//   const mockSignIn = supabase.auth.signInWithPassword as jest.Mock
// ---------------------------------------------------------------------------

export const supabase = {
  auth: {
    getSession: jest.fn().mockResolvedValue({
      data: {
        session: {
          access_token: 'mock-jwt-token-for-testing',
          refresh_token: 'mock-refresh-token',
          user: {
            id: 'user-uuid-123',
            email: 'test@clinica.com',
          },
        },
      },
      error: null,
    }),
    getUser: jest.fn().mockResolvedValue({
      data: {
        user: {
          id: 'user-uuid-123',
          email: 'test@clinica.com',
        },
      },
      error: null,
    }),
    signInWithPassword: jest.fn().mockResolvedValue({
      data: {
        session: { access_token: 'mock-jwt-token-for-testing' },
        user: { id: 'user-uuid-123', email: 'test@clinica.com' },
      },
      error: null,
    }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: jest.fn().mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    }),
    mfa: {
      enroll: jest.fn().mockResolvedValue({
        data: {
          id: 'factor-uuid-123',
          type: 'totp',
          totp: {
            qr_code: 'data:image/svg+xml;base64,mock-qr-code',
            secret: 'MOCK_SECRET_KEY',
            uri: 'otpauth://totp/SofIA?secret=MOCK_SECRET_KEY',
          },
        },
        error: null,
      }),
      challengeAndVerify: jest.fn().mockResolvedValue({ data: {}, error: null }),
      unenroll: jest.fn().mockResolvedValue({ data: {}, error: null }),
      listFactors: jest.fn().mockResolvedValue({
        data: { totp: [], phone: [], all: [] },
        error: null,
      }),
      getAuthenticatorAssuranceLevel: jest.fn().mockResolvedValue({
        data: { currentLevel: 'aal1', nextLevel: 'aal1' },
        error: null,
      }),
    },
  },
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    execute: jest.fn().mockResolvedValue({ data: [], error: null }),
  }),
}

export const API_URL = 'https://ataraxia-api-core.onrender.com'

export async function authFetch(url: string, options?: RequestInit): Promise<Response> {
  return fetch(url, options)
}

export async function parseAPIError(res: Response): Promise<string> {
  try {
    const data = await res.json()
    if (data?.message) return data.message
    return `Error ${res.status}`
  } catch {
    return `Error ${res.status}`
  }
}
