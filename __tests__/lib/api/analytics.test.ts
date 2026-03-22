// __tests__/lib/api/analytics.test.ts

const mockAuthFetch = jest.fn()
jest.mock('@/lib/supabase', () => ({
  authFetch: (...args: unknown[]) => mockAuthFetch(...args),
  API_URL: 'https://test-api.example.com',
  supabase: { auth: { getSession: jest.fn().mockResolvedValue({ data: { session: { access_token: 'test' } } }) } },
}))

import { fetchFullAnalytics, fetchQuickMetrics, downloadReportPdf, fetchAiQualityMetrics } from '@/lib/api/analytics'

describe('Analytics API', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('fetchFullAnalytics', () => {
    it('fetches full analytics', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ conversations: 100 }),
      })
      const result = await fetchFullAnalytics('org-1')
      expect(result.conversations).toBe(100)
      expect(mockAuthFetch).toHaveBeenCalledWith(expect.stringContaining('/analytics/org-1/full?dias=30'))
    })

    it('uses custom days', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
      await fetchFullAnalytics('org-1', 90)
      expect(mockAuthFetch.mock.calls[0][0]).toContain('dias=90')
    })

    it('includes branch_id', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
      await fetchFullAnalytics('org-1', 30, 'br-1')
      expect(mockAuthFetch.mock.calls[0][0]).toContain('branch_id=br-1')
    })

    it('throws on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false, status: 500 })
      await expect(fetchFullAnalytics('org-1')).rejects.toThrow('Analytics error: 500')
    })
  })

  describe('fetchQuickMetrics', () => {
    it('fetches quick metrics', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ total_patients: 50 }),
      })
      const result = await fetchQuickMetrics('org-1')
      expect(result.total_patients).toBe(50)
    })

    it('throws on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false, status: 500 })
      await expect(fetchQuickMetrics('org-1')).rejects.toThrow('Quick metrics error: 500')
    })
  })

  describe('downloadReportPdf', () => {
    it('returns blob on success', async () => {
      const mockBlob = new Blob(['pdf-data'])
      mockAuthFetch.mockResolvedValue({
        ok: true, blob: () => Promise.resolve(mockBlob),
      })
      const result = await downloadReportPdf('org-1')
      expect(result).toBeInstanceOf(Blob)
    })

    it('uses custom days and branch', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, blob: () => Promise.resolve(new Blob()),
      })
      await downloadReportPdf('org-1', 60, 'br-1')
      const url = mockAuthFetch.mock.calls[0][0]
      expect(url).toContain('dias=60')
      expect(url).toContain('branch_id=br-1')
    })

    it('throws on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false, status: 500 })
      await expect(downloadReportPdf('org-1')).rejects.toThrow('Report download error: 500')
    })
  })

  describe('fetchAiQualityMetrics', () => {
    it('fetches AI quality metrics', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ accuracy: 0.95 }),
      })
      const result = await fetchAiQualityMetrics('org-1')
      expect(result.accuracy).toBe(0.95)
    })

    it('throws on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false, status: 500 })
      await expect(fetchAiQualityMetrics('org-1')).rejects.toThrow()
    })
  })
})
