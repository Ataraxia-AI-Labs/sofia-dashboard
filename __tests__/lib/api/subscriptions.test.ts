// __tests__/lib/api/subscriptions.test.ts

const mockAuthFetch = jest.fn()
jest.mock('@/lib/supabase', () => ({
  authFetch: (...args: unknown[]) => mockAuthFetch(...args),
  API_URL: 'https://test-api.example.com',
  supabase: { auth: { getSession: jest.fn().mockResolvedValue({ data: { session: { access_token: 'test' } } }) } },
}))

import {
  fetchSubscription, createSubscription, changePlan, cancelSubscription,
  updatePaymentMethod, fetchInvoices, fetchUsage, fetchWompiConfig,
} from '@/lib/api/subscriptions'

describe('Subscriptions API', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('fetchSubscription', () => {
    it('returns subscription on success', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ subscription: { plan: 'PRO' } }),
      })
      const result = await fetchSubscription('org-1')
      expect(result!.plan).toBe('PRO')
    })

    it('returns null when no subscription field', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({}),
      })
      expect(await fetchSubscription('org-1')).toBeNull()
    })

    it('returns null on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await fetchSubscription('org-1')).toBeNull()
    })
  })

  describe('createSubscription', () => {
    it('sends POST with subscription body', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ exito: true, subscription_id: 'sub-1' }),
      })
      const result = await createSubscription('org-1', {
        plan: 'PRO', billing_cycle: 'monthly',
        card_token: 'tok_1', customer_email: 'test@test.com', acceptance_token: 'acc_1',
      })
      expect(result.exito).toBe(true)
      expect(result.subscription_id).toBe('sub-1')
    })

    it('returns error response from backend', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: false, json: () => Promise.resolve({ exito: false, error: 'Card declined' }),
      })
      const result = await createSubscription('org-1', {
        plan: 'PRO', billing_cycle: 'monthly',
        card_token: 'tok_bad', customer_email: 'x@x.com', acceptance_token: 'acc',
      })
      expect(result.exito).toBe(false)
    })
  })

  describe('changePlan', () => {
    it('sends change plan request', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ exito: true }),
      })
      const result = await changePlan('org-1', 'BUSINESS', 'yearly')
      expect(result.exito).toBe(true)
      const body = JSON.parse(mockAuthFetch.mock.calls[0][1].body)
      expect(body.new_plan).toBe('BUSINESS')
      expect(body.new_billing_cycle).toBe('yearly')
    })
  })

  describe('cancelSubscription', () => {
    it('cancels with immediate=false by default', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ exito: true }),
      })
      await cancelSubscription('org-1')
      const body = JSON.parse(mockAuthFetch.mock.calls[0][1].body)
      expect(body.immediate).toBe(false)
    })

    it('cancels immediately when specified', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ exito: true }),
      })
      await cancelSubscription('org-1', true)
      const body = JSON.parse(mockAuthFetch.mock.calls[0][1].body)
      expect(body.immediate).toBe(true)
    })
  })

  describe('updatePaymentMethod', () => {
    it('sends update payment request', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ exito: true }),
      })
      const result = await updatePaymentMethod('org-1', 'tok_new', 'acc_new')
      expect(result.exito).toBe(true)
    })
  })

  describe('fetchInvoices', () => {
    it('returns invoices', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ invoices: [{ id: 'inv-1' }] }),
      })
      const result = await fetchInvoices('org-1')
      expect(result).toHaveLength(1)
    })

    it('uses custom limit', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ invoices: [] }),
      })
      await fetchInvoices('org-1', 50)
      expect(mockAuthFetch.mock.calls[0][0]).toContain('limit=50')
    })

    it('returns empty on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await fetchInvoices('org-1')).toEqual([])
    })

    it('returns empty when invoices field missing', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({}),
      })
      expect(await fetchInvoices('org-1')).toEqual([])
    })
  })

  describe('fetchUsage', () => {
    it('returns usage data', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ messages_used: 500 }),
      })
      const result = await fetchUsage('org-1')
      expect(result!.messages_used).toBe(500)
    })

    it('returns null on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await fetchUsage('org-1')).toBeNull()
    })
  })

  describe('fetchWompiConfig', () => {
    it('returns wompi config', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ public_key: 'pk_test' }),
      })
      const result = await fetchWompiConfig()
      expect(result!.public_key).toBe('pk_test')
    })

    it('returns null on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await fetchWompiConfig()).toBeNull()
    })
  })
})
