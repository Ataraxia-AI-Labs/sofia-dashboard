// __tests__/lib/api/payments.test.ts

const mockAuthFetch = jest.fn()
jest.mock('@/lib/supabase', () => ({
  authFetch: (...args: unknown[]) => mockAuthFetch(...args),
  API_URL: 'https://test-api.example.com',
  supabase: { auth: { getSession: jest.fn().mockResolvedValue({ data: { session: { access_token: 'test' } } }) } },
}))

import { fetchPayments, fetchRevenueAttribution } from '@/lib/api/payments'

describe('Payments API', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('fetchPayments', () => {
    it('fetches payments for org', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ payments: [{ id: 'pay-1' }] }),
      })
      const result = await fetchPayments('org-1')
      expect(result).toHaveLength(1)
      expect(mockAuthFetch).toHaveBeenCalledWith(expect.stringContaining('/payments/org-1'))
    })

    it('includes status filter', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ payments: [] }),
      })
      await fetchPayments('org-1', { status: 'APPROVED' })
      expect(mockAuthFetch.mock.calls[0][0]).toContain('status=APPROVED')
    })

    it('includes branch_id', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ payments: [] }),
      })
      await fetchPayments('org-1', { branchId: 'br-1' })
      expect(mockAuthFetch.mock.calls[0][0]).toContain('branch_id=br-1')
    })

    it('returns empty array on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      const result = await fetchPayments('org-1')
      expect(result).toEqual([])
    })

    it('returns empty array when payments field is missing', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({}),
      })
      const result = await fetchPayments('org-1')
      expect(result).toEqual([])
    })
  })

  describe('fetchRevenueAttribution', () => {
    it('fetches attribution data', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ total_revenue: 100000 }),
      })
      const result = await fetchRevenueAttribution('org-1')
      expect(result).toBeDefined()
      expect(result!.total_revenue).toBe(100000)
    })

    it('uses custom days parameter', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({}),
      })
      await fetchRevenueAttribution('org-1', 60)
      expect(mockAuthFetch.mock.calls[0][0]).toContain('dias=60')
    })

    it('includes branch_id', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({}),
      })
      await fetchRevenueAttribution('org-1', 30, 'br-1')
      expect(mockAuthFetch.mock.calls[0][0]).toContain('branch_id=br-1')
    })

    it('returns null on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await fetchRevenueAttribution('org-1')).toBeNull()
    })
  })
})
