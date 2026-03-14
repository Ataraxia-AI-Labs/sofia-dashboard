// __tests__/lib/api/admin-api-latency.test.ts
// ---------------------------------------------------------------------------
// Tests for fetchLatencyMetrics() in lib/admin-api.ts
// ---------------------------------------------------------------------------

import '@testing-library/jest-dom'

// ── Mock authFetch & supabase ────────────────────────────────────────────────
const mockAuthFetch = jest.fn()

jest.mock('@/lib/supabase', () => ({
  authFetch: (...args: unknown[]) => mockAuthFetch(...args),
  API_URL: 'https://test-api.example.com',
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token', user: { id: 'u-1', app_metadata: { is_super_admin: true } } } },
        error: null,
      }),
    },
  },
}))

import { fetchLatencyMetrics, type LatencyMetricRow } from '@/lib/admin-api'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeMockRow(overrides: Partial<LatencyMetricRow> = {}): LatencyMetricRow {
  return {
    endpoint: '/api/test',
    method: 'GET',
    p50_ms: 45,
    p95_ms: 120,
    p99_ms: 200,
    avg_ms: 60,
    request_count: 1000,
    ...overrides,
  }
}

function mockOkResponse(data: LatencyMetricRow[]) {
  mockAuthFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ data }),
  })
}

// ── Test suite ───────────────────────────────────────────────────────────────

describe('fetchLatencyMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('calls the correct admin latency endpoint', async () => {
    mockOkResponse([])
    await fetchLatencyMetrics()
    expect(mockAuthFetch).toHaveBeenCalledWith(
      'https://test-api.example.com/admin/latency',
      undefined
    )
  })

  it('returns the data array from the response', async () => {
    const rows: LatencyMetricRow[] = [
      makeMockRow({ endpoint: '/api/patients', method: 'GET', p95_ms: 180 }),
      makeMockRow({ endpoint: '/api/appointments', method: 'POST', p95_ms: 340 }),
    ]
    mockOkResponse(rows)

    const result = await fetchLatencyMetrics()
    expect(result).toHaveLength(2)
    expect(result[0].endpoint).toBe('/api/patients')
    expect(result[1].p95_ms).toBe(340)
  })

  it('returns empty array when data is missing from response', async () => {
    mockAuthFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    })

    const result = await fetchLatencyMetrics()
    expect(result).toEqual([])
  })

  it('returns rows with history sparkline data when provided', async () => {
    const rowWithHistory = makeMockRow({ history: [100, 120, 150, 130, 180] })
    mockOkResponse([rowWithHistory])

    const result = await fetchLatencyMetrics()
    expect(result[0].history).toEqual([100, 120, 150, 130, 180])
  })

  it('throws when the backend returns a non-ok response', async () => {
    mockAuthFetch.mockResolvedValue({
      ok: false,
      text: () => Promise.resolve('Internal Server Error'),
    })

    await expect(fetchLatencyMetrics()).rejects.toThrow('Internal Server Error')
  })
})
