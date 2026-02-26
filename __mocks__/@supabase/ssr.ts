// __mocks__/@supabase/ssr.ts
// ---------------------------------------------------------------------------
// Manual mock for the @supabase/ssr node module.
// Used when testing lib/supabase.ts directly (e.g., authFetch tests).
// Jest auto-resolves node_module mocks from <rootDir>/__mocks__/<package>.
// ---------------------------------------------------------------------------

const mockSupabaseClient = {
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
  },
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  }),
}

export const createBrowserClient = jest.fn().mockReturnValue(mockSupabaseClient)
export const createServerClient = jest.fn().mockReturnValue(mockSupabaseClient)

// Export the mock client for direct access in tests
export const __mockSupabaseClient = mockSupabaseClient
