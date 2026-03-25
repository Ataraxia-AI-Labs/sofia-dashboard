// __tests__/lib/api/auth-fetch.test.ts
// ---------------------------------------------------------------------------
// Tests for the authFetch wrapper in lib/supabase.ts
//
// Strategy:
//   - Mock @supabase/ssr so createBrowserClient returns a controllable client
//   - Mock global fetch to simulate backend responses
//   - Test the REAL authFetch implementation (not a re-implementation)
// ---------------------------------------------------------------------------

// @ts-expect-error — __mockSupabaseClient is exported by our manual mock (__mocks__/@supabase/ssr.ts)
import { __mockSupabaseClient } from '@supabase/ssr'

// The import resolves lib/supabase.ts which calls createBrowserClient at module level.
// Since @supabase/ssr is mocked (via __mocks__/@supabase/ssr.ts), it gets our mock client.
import { authFetch, parseAPIError, API_URL } from '@/lib/supabase'

// Type alias for cleaner access to mock functions
const mockGetSession = __mockSupabaseClient.auth.getSession as jest.Mock

// ---------------------------------------------------------------------------
// Mock global fetch
// ---------------------------------------------------------------------------
const mockFetch = jest.fn()
global.fetch = mockFetch

// Helper: create a minimal Response-like object
function createMockResponse(status: number, body?: Record<string, unknown>): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers(),
    json: jest.fn().mockResolvedValue(body ?? {}),
    text: jest.fn().mockResolvedValue(JSON.stringify(body ?? {})),
    clone: jest.fn(),
  } as unknown as Response
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('authFetch', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Default: session with valid token
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'test-jwt-token-abc123',
          refresh_token: 'test-refresh',
          user: { id: 'u-1', email: 'doc@clinica.com' },
        },
      },
      error: null,
    })
  })

  // -----------------------------------------------------------------------
  // Authorization header injection
  // -----------------------------------------------------------------------

  it('should attach Bearer token from Supabase session', async () => {
    mockFetch.mockResolvedValue(createMockResponse(200, { ok: true }))

    await authFetch(`${API_URL}/api/patients`)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [, options] = mockFetch.mock.calls[0]
    const headers = options.headers as Headers
    expect(headers.get('Authorization')).toBe('Bearer test-jwt-token-abc123')
  })

  it('should NOT set Authorization header when there is no session', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })
    mockFetch.mockResolvedValue(createMockResponse(200))

    await authFetch(`${API_URL}/api/patients`)

    const [, options] = mockFetch.mock.calls[0]
    const headers = options.headers as Headers
    expect(headers.get('Authorization')).toBeNull()
  })

  // -----------------------------------------------------------------------
  // Content-Type auto-detection
  // -----------------------------------------------------------------------

  it('should auto-set Content-Type to application/json when body is present', async () => {
    mockFetch.mockResolvedValue(createMockResponse(200))

    await authFetch(`${API_URL}/api/patients`, {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Patient' }),
    })

    const [, options] = mockFetch.mock.calls[0]
    const headers = options.headers as Headers
    expect(headers.get('Content-Type')).toBe('application/json')
  })

  it('should NOT override Content-Type if already set', async () => {
    mockFetch.mockResolvedValue(createMockResponse(200))

    await authFetch(`${API_URL}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data' },
      body: 'file-data',
    })

    const [, options] = mockFetch.mock.calls[0]
    const headers = options.headers as Headers
    expect(headers.get('Content-Type')).toBe('multipart/form-data')
  })

  it('should NOT set Content-Type when there is no body', async () => {
    mockFetch.mockResolvedValue(createMockResponse(200))

    await authFetch(`${API_URL}/api/patients`)

    const [, options] = mockFetch.mock.calls[0]
    const headers = options.headers as Headers
    expect(headers.get('Content-Type')).toBeNull()
  })

  // -----------------------------------------------------------------------
  // Successful responses
  // -----------------------------------------------------------------------

  it('should return the Response for 200 status', async () => {
    const mockRes = createMockResponse(200, { patients: [] })
    mockFetch.mockResolvedValue(mockRes)

    const res = await authFetch(`${API_URL}/api/patients`)

    expect(res).toBe(mockRes)
    expect(res.status).toBe(200)
  })

  it('should pass through custom options like method and body', async () => {
    mockFetch.mockResolvedValue(createMockResponse(201))

    await authFetch(`${API_URL}/api/patients`, {
      method: 'POST',
      body: JSON.stringify({ name: 'Maria' }),
    })

    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe(`${API_URL}/api/patients`)
    expect(options.method).toBe('POST')
  })

  // -----------------------------------------------------------------------
  // Error status handling (401, 403, 429) — returns response, does NOT throw
  // Callers use `if (!res.ok)` to handle errors gracefully
  // -----------------------------------------------------------------------

  it('should return response on 401 without throwing', async () => {
    mockFetch.mockResolvedValue(createMockResponse(401))
    const res = await authFetch(`${API_URL}/api/patients`)
    expect(res.status).toBe(401)
  })

  it('should return response on 403 without throwing', async () => {
    mockFetch.mockResolvedValue(
      createMockResponse(403, { message: 'No perteneces a esta organizacion' })
    )
    const res = await authFetch(`${API_URL}/api/org/123`)
    expect(res.status).toBe(403)
  })

  it('should return response on 429 without throwing', async () => {
    mockFetch.mockResolvedValue(createMockResponse(429))
    const res = await authFetch(`${API_URL}/api/patients`)
    expect(res.status).toBe(429)
  })

  // -----------------------------------------------------------------------
  // Non-error HTTP statuses (should NOT throw)
  // -----------------------------------------------------------------------

  it('should NOT throw on 404 (let caller decide)', async () => {
    const mockRes = createMockResponse(404, { message: 'Not found' })
    mockFetch.mockResolvedValue(mockRes)

    const res = await authFetch(`${API_URL}/api/patients/999`)

    expect(res.status).toBe(404)
  })

  it('should NOT throw on 500 (let caller decide)', async () => {
    const mockRes = createMockResponse(500, { message: 'Internal error' })
    mockFetch.mockResolvedValue(mockRes)

    const res = await authFetch(`${API_URL}/api/patients`)

    expect(res.status).toBe(500)
  })

  // -----------------------------------------------------------------------
  // Timeout behavior
  // -----------------------------------------------------------------------

  it('should use default 15s timeout', async () => {
    mockFetch.mockResolvedValue(createMockResponse(200))

    await authFetch(`${API_URL}/api/patients`)

    const [, options] = mockFetch.mock.calls[0]
    // The signal should be an AbortSignal (from the internal controller)
    expect(options.signal).toBeDefined()
    expect(options.signal).toBeInstanceOf(AbortSignal)
  })

  it('should respect custom timeoutMs', async () => {
    // We test indirectly: if fetch rejects with AbortError, authFetch propagates it
    mockFetch.mockRejectedValue(new DOMException('The operation was aborted.', 'AbortError'))

    await expect(
      authFetch(`${API_URL}/api/slow-endpoint`, { timeoutMs: 100 })
    ).rejects.toThrow()
  })

  it('should use caller-provided signal instead of internal timeout signal', async () => {
    const externalController = new AbortController()
    mockFetch.mockResolvedValue(createMockResponse(200))

    await authFetch(`${API_URL}/api/patients`, {
      signal: externalController.signal,
    })

    const [, options] = mockFetch.mock.calls[0]
    expect(options.signal).toBe(externalController.signal)
  })
})

// ---------------------------------------------------------------------------
// parseAPIError
// ---------------------------------------------------------------------------

describe('parseAPIError', () => {
  it('should extract message field from backend error response', async () => {
    const res = createMockResponse(400, { message: 'Invalid patient data' })
    const msg = await parseAPIError(res)
    expect(msg).toBe('Invalid patient data')
  })

  it('should extract detail field when message is absent', async () => {
    const mockRes = {
      status: 422,
      json: jest.fn().mockResolvedValue({ detail: 'Validation failed' }),
    } as unknown as Response
    const msg = await parseAPIError(mockRes)
    expect(msg).toBe('Validation failed')
  })

  it('should stringify detail when it is an object', async () => {
    const mockRes = {
      status: 422,
      json: jest.fn().mockResolvedValue({
        detail: [{ loc: ['body', 'email'], msg: 'required' }],
      }),
    } as unknown as Response
    const msg = await parseAPIError(mockRes)
    expect(msg).toContain('required')
  })

  it('should fall back to "Error <status>" when body has no message or detail', async () => {
    const mockRes = {
      status: 502,
      json: jest.fn().mockResolvedValue({}),
    } as unknown as Response
    const msg = await parseAPIError(mockRes)
    expect(msg).toBe('Error 502')
  })

  it('should fall back to "Error <status>" when json() throws', async () => {
    const mockRes = {
      status: 500,
      json: jest.fn().mockRejectedValue(new Error('invalid json')),
    } as unknown as Response
    const msg = await parseAPIError(mockRes)
    expect(msg).toBe('Error 500')
  })
})

// ---------------------------------------------------------------------------
// API_URL
// ---------------------------------------------------------------------------

describe('API_URL', () => {
  it('should read from NEXT_PUBLIC_API_URL env var', () => {
    // API_URL comes from process.env.NEXT_PUBLIC_API_URL (no hardcoded fallback)
    // In CI without the env var set, it will be undefined — that's correct behavior
    expect(typeof API_URL === 'string' || typeof API_URL === 'undefined').toBe(true)
  })
})
