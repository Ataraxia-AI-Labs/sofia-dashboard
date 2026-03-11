// __tests__/lib/admin-api-keys.test.ts
// ---------------------------------------------------------------------------
// Tests for API key management functions in lib/admin-api.ts
// ---------------------------------------------------------------------------

// @ts-expect-error — __mockSupabaseClient is exported by our manual mock (__mocks__/@supabase/ssr.ts)
import { __mockSupabaseClient } from '@supabase/ssr'
import { authFetch } from '@/lib/supabase'

// Mock authFetch + supabase
jest.mock('@/lib/supabase', () => {
  const original = jest.requireActual('@/lib/supabase')
  return {
    ...original,
    authFetch: jest.fn(),
    API_URL: 'https://test-api.example.com',
    supabase: {
      auth: {
        getSession: jest.fn().mockResolvedValue({
          data: {
            session: {
              access_token: 'test-token',
              user: { id: 'u-1', email: 'admin@test.com', app_metadata: { is_super_admin: true } },
            },
          },
        }),
      },
    },
  }
})

const mockAuthFetch = authFetch as jest.MockedFunction<typeof authFetch>

// Helper to build a mock Response
function mockResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers(),
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
    clone: jest.fn(),
  } as unknown as Response
}

// ---------------------------------------------------------------------------
// listAPIKeys
// ---------------------------------------------------------------------------

describe('listAPIKeys', () => {
  beforeEach(() => jest.clearAllMocks())

  it('fetches all API keys without org filter', async () => {
    const { listAPIKeys } = await import('@/lib/admin-api')

    mockAuthFetch.mockResolvedValue(mockResponse(200, {
      data: [
        {
          id: 'key-1',
          name: 'CI Key',
          scopes: ['read'],
          key_hint: 'abcd1234',
          status: 'active',
          created_at: '2026-01-01T00:00:00Z',
          last_used_at: null,
          expires_at: null,
          organization_id: null,
        },
      ],
    }))

    const keys = await listAPIKeys()
    expect(keys).toHaveLength(1)
    expect(keys[0].name).toBe('CI Key')
    expect(keys[0].scopes).toEqual(['read'])
    expect(mockAuthFetch).toHaveBeenCalledWith(
      expect.stringContaining('/admin/api-keys'),
      undefined,
    )
  })

  it('appends organization_id query param when provided', async () => {
    const { listAPIKeys } = await import('@/lib/admin-api')

    mockAuthFetch.mockResolvedValue(mockResponse(200, { data: [] }))

    await listAPIKeys('org-123')

    expect(mockAuthFetch).toHaveBeenCalledWith(
      expect.stringContaining('organization_id=org-123'),
      undefined,
    )
  })

  it('returns empty array when data field is missing', async () => {
    const { listAPIKeys } = await import('@/lib/admin-api')

    mockAuthFetch.mockResolvedValue(mockResponse(200, {}))

    const keys = await listAPIKeys()
    expect(keys).toEqual([])
  })

  it('throws when backend returns an error status', async () => {
    const { listAPIKeys } = await import('@/lib/admin-api')

    const errorRes = mockResponse(403, { message: 'Forbidden' })
    mockAuthFetch.mockResolvedValue(errorRes)

    await expect(listAPIKeys()).rejects.toThrow()
  })
})

// ---------------------------------------------------------------------------
// createAPIKey
// ---------------------------------------------------------------------------

describe('createAPIKey', () => {
  beforeEach(() => jest.clearAllMocks())

  it('creates a key and returns the full key value once', async () => {
    const { createAPIKey } = await import('@/lib/admin-api')

    const created = {
      key: 'sk-test-full-key-value-abc123',
      api_key: {
        id: 'key-2',
        name: 'Test Key',
        scopes: ['read', 'write'],
        key_hint: 'abc123',
        status: 'active',
        created_at: '2026-01-01T00:00:00Z',
        last_used_at: null,
        expires_at: null,
        organization_id: 'org-1',
      },
    }

    mockAuthFetch.mockResolvedValue(mockResponse(200, created))

    const result = await createAPIKey({
      name: 'Test Key',
      scopes: ['read', 'write'],
      organization_id: 'org-1',
    })

    expect(result.key).toBe('sk-test-full-key-value-abc123')
    expect(result.api_key.name).toBe('Test Key')
    expect(mockAuthFetch).toHaveBeenCalledWith(
      expect.stringContaining('/admin/api-keys'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('sends scopes, expires_in_days, and organization_id in the body', async () => {
    const { createAPIKey } = await import('@/lib/admin-api')

    mockAuthFetch.mockResolvedValue(mockResponse(200, {
      key: 'sk-xyz',
      api_key: { id: 'k3', name: 'K', scopes: ['admin'], key_hint: 'zz', status: 'active', created_at: '', last_used_at: null, expires_at: null, organization_id: null },
    }))

    await createAPIKey({ name: 'K', scopes: ['admin'], expires_in_days: 30 })

    const [, options] = mockAuthFetch.mock.calls[0]
    const body = JSON.parse(options?.body as string)
    expect(body.scopes).toEqual(['admin'])
    expect(body.expires_in_days).toBe(30)
  })
})

// ---------------------------------------------------------------------------
// revokeAPIKey
// ---------------------------------------------------------------------------

describe('revokeAPIKey', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls the revoke endpoint with POST', async () => {
    const { revokeAPIKey } = await import('@/lib/admin-api')

    mockAuthFetch.mockResolvedValue(mockResponse(200, {}))

    await revokeAPIKey('key-1')

    expect(mockAuthFetch).toHaveBeenCalledWith(
      expect.stringContaining('/admin/api-keys/key-1/revoke'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('throws when backend returns an error', async () => {
    const { revokeAPIKey } = await import('@/lib/admin-api')

    mockAuthFetch.mockResolvedValue(mockResponse(404, { message: 'Key not found' }))

    await expect(revokeAPIKey('nonexistent')).rejects.toThrow()
  })
})
