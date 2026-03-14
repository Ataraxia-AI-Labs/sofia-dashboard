// __tests__/lib/admin-api/audit-logs.test.ts
// Tests for fetchAuditLogs() in lib/admin-api.ts

const mockAuthFetch = jest.fn()

jest.mock('@/lib/supabase', () => ({
  authFetch: (...args: unknown[]) => mockAuthFetch(...args),
  API_URL: 'https://test-api.example.com',
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'test-token',
            user: { id: 'user-1', app_metadata: { is_super_admin: true } },
          },
        },
        error: null,
      }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    }),
  },
}))

import {
  fetchAuditLogs,
  type AuditLogEntry,
  type AuditLogsResponse,
} from '@/lib/admin-api'

const MOCK_LOGS: AuditLogEntry[] = [
  {
    id: 'log-1',
    created_at: '2026-03-11T10:00:00Z',
    user_id: 'user-1',
    user_email: 'admin@ataraxia.ai',
    action: 'create',
    resource_type: 'organization',
    resource_id: 'org-abc123',
    organization_id: 'org-abc123',
    org_name: 'Clínica Demo',
    details: { plan: 'PRO' },
  },
  {
    id: 'log-2',
    created_at: '2026-03-10T15:30:00Z',
    user_id: 'user-2',
    user_email: 'staff@demo.com',
    action: 'update',
    resource_type: 'patient',
    resource_id: 'pat-xyz789',
    organization_id: 'org-abc123',
    org_name: 'Clínica Demo',
    details: null,
  },
]

function mockOkResponse(body: unknown) {
  return {
    ok: true,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  }
}

function mockErrorResponse(status = 500) {
  return {
    ok: false,
    status,
    text: jest.fn().mockResolvedValue(`Error ${status}`),
  }
}

describe('fetchAuditLogs', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('calls the correct endpoint with default params', async () => {
    const mockResponse: AuditLogsResponse = { data: MOCK_LOGS, total: 2, page: 1, limit: 50 }
    mockAuthFetch.mockResolvedValue(mockOkResponse(mockResponse))

    await fetchAuditLogs()

    expect(mockAuthFetch).toHaveBeenCalledTimes(1)
    const [url] = mockAuthFetch.mock.calls[0]
    expect(url).toContain('/admin/audit-logs')
    expect(url).toContain('page=1')
    expect(url).toContain('limit=50')
  })

  it('returns data and total from the response', async () => {
    const mockResponse: AuditLogsResponse = { data: MOCK_LOGS, total: 2, page: 1, limit: 50 }
    mockAuthFetch.mockResolvedValue(mockOkResponse(mockResponse))

    const result = await fetchAuditLogs()

    expect(result.data).toHaveLength(2)
    expect(result.total).toBe(2)
    expect(result.data[0].action).toBe('create')
    expect(result.data[1].action).toBe('update')
  })

  it('passes action filter as query param', async () => {
    const mockResponse: AuditLogsResponse = { data: [], total: 0, page: 1, limit: 50 }
    mockAuthFetch.mockResolvedValue(mockOkResponse(mockResponse))

    await fetchAuditLogs({ action: 'delete' })

    const [url] = mockAuthFetch.mock.calls[0]
    expect(url).toContain('action=delete')
  })

  it('passes org_id filter as query param', async () => {
    const mockResponse: AuditLogsResponse = { data: [], total: 0, page: 1, limit: 50 }
    mockAuthFetch.mockResolvedValue(mockOkResponse(mockResponse))

    await fetchAuditLogs({ org_id: 'org-abc123' })

    const [url] = mockAuthFetch.mock.calls[0]
    expect(url).toContain('org_id=org-abc123')
  })

  it('passes search query as query param', async () => {
    const mockResponse: AuditLogsResponse = { data: [], total: 0, page: 1, limit: 50 }
    mockAuthFetch.mockResolvedValue(mockOkResponse(mockResponse))

    await fetchAuditLogs({ search: 'admin@ataraxia.ai' })

    const [url] = mockAuthFetch.mock.calls[0]
    expect(url).toContain('search=admin')
  })

  it('passes date range filters as query params', async () => {
    const mockResponse: AuditLogsResponse = { data: [], total: 0, page: 1, limit: 50 }
    mockAuthFetch.mockResolvedValue(mockOkResponse(mockResponse))

    await fetchAuditLogs({ date_from: '2026-03-01', date_to: '2026-03-11' })

    const [url] = mockAuthFetch.mock.calls[0]
    expect(url).toContain('date_from=2026-03-01')
    expect(url).toContain('date_to=2026-03-11')
  })

  it('passes custom page and limit', async () => {
    const mockResponse: AuditLogsResponse = { data: [], total: 100, page: 3, limit: 50 }
    mockAuthFetch.mockResolvedValue(mockOkResponse(mockResponse))

    await fetchAuditLogs({ page: 3, limit: 50 })

    const [url] = mockAuthFetch.mock.calls[0]
    expect(url).toContain('page=3')
    expect(url).toContain('limit=50')
  })

  it('does NOT include undefined optional params in URL', async () => {
    const mockResponse: AuditLogsResponse = { data: [], total: 0, page: 1, limit: 50 }
    mockAuthFetch.mockResolvedValue(mockOkResponse(mockResponse))

    await fetchAuditLogs({ page: 1 })

    const [url] = mockAuthFetch.mock.calls[0]
    expect(url).not.toContain('action=')
    expect(url).not.toContain('org_id=')
    expect(url).not.toContain('search=')
    expect(url).not.toContain('date_from=')
    expect(url).not.toContain('date_to=')
  })

  it('throws when the backend returns an error', async () => {
    mockAuthFetch.mockResolvedValue(mockErrorResponse(403))

    await expect(fetchAuditLogs()).rejects.toThrow()
  })
})
