// __tests__/lib/api/campaigns.test.ts

const mockAuthFetch = jest.fn()
jest.mock('@/lib/supabase', () => ({
  authFetch: (...args: unknown[]) => mockAuthFetch(...args),
  API_URL: 'https://test-api.example.com',
  supabase: { auth: { getSession: jest.fn().mockResolvedValue({ data: { session: { access_token: 'test' } } }) } },
}))

import {
  createCampaign, listCampaigns, getCampaign, previewCampaign,
  scheduleCampaign, executeCampaign, cancelCampaign,
  getCampaignResults, getCampaignAnalytics, suggestSegment,
} from '@/lib/api/campaigns'

describe('Campaigns API', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('createCampaign', () => {
    it('sends POST with campaign data', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ id: 'c-1' }),
      })
      const result = await createCampaign('org-1', {
        name: 'Promo Botox', message_template: 'Hola {name}', segment_criteria: { city: 'Bogota' },
      })
      expect(result.id).toBe('c-1')
      expect(mockAuthFetch).toHaveBeenCalledWith(
        expect.stringContaining('/campaigns/org-1'),
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('throws on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      await expect(createCampaign('org-1', { name: 'X', message_template: 'X', segment_criteria: {} })).rejects.toThrow('Create campaign failed')
    })
  })

  describe('listCampaigns', () => {
    it('returns campaigns', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve([{ id: 'c-1' }, { id: 'c-2' }]),
      })
      expect(await listCampaigns('org-1')).toHaveLength(2)
    })

    it('returns empty on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await listCampaigns('org-1')).toEqual([])
    })
  })

  describe('getCampaign', () => {
    it('returns campaign by id', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ id: 'c-1', name: 'Promo' }),
      })
      const result = await getCampaign('org-1', 'c-1')
      expect(result!.name).toBe('Promo')
    })

    it('returns null on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await getCampaign('org-1', 'c-bad')).toBeNull()
    })
  })

  describe('previewCampaign', () => {
    it('returns preview on success', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ audience_count: 50 }),
      })
      const result = await previewCampaign('org-1', 'c-1')
      expect(result!.audience_count).toBe(50)
    })

    it('returns null on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await previewCampaign('org-1', 'c-1')).toBeNull()
    })
  })

  describe('scheduleCampaign', () => {
    it('sends schedule request', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true })
      await scheduleCampaign('org-1', 'c-1', '2026-04-01T10:00:00')
      const body = JSON.parse(mockAuthFetch.mock.calls[0][1].body)
      expect(body.send_at).toBe('2026-04-01T10:00:00')
    })

    it('throws on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      await expect(scheduleCampaign('org-1', 'c-1', 'x')).rejects.toThrow('Schedule failed')
    })
  })

  describe('executeCampaign', () => {
    it('sends execute POST', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true })
      await executeCampaign('org-1', 'c-1')
      expect(mockAuthFetch).toHaveBeenCalledWith(
        expect.stringContaining('/campaigns/org-1/c-1/execute'),
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('throws on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      await expect(executeCampaign('org-1', 'c-1')).rejects.toThrow('Execute failed')
    })
  })

  describe('cancelCampaign', () => {
    it('sends cancel POST', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true })
      await cancelCampaign('org-1', 'c-1')
      expect(mockAuthFetch).toHaveBeenCalledWith(
        expect.stringContaining('/campaigns/org-1/c-1/cancel'),
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('throws on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      await expect(cancelCampaign('org-1', 'c-1')).rejects.toThrow('Cancel failed')
    })
  })

  describe('getCampaignResults', () => {
    it('returns results', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ delivered: 45 }),
      })
      const result = await getCampaignResults('org-1', 'c-1')
      expect(result!.delivered).toBe(45)
    })

    it('returns null on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await getCampaignResults('org-1', 'c-1')).toBeNull()
    })
  })

  describe('getCampaignAnalytics', () => {
    it('returns analytics', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ total_campaigns: 5 }),
      })
      const result = await getCampaignAnalytics('org-1')
      expect(result).toBeDefined()
    })

    it('returns null on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await getCampaignAnalytics('org-1')).toBeNull()
    })
  })

  describe('suggestSegment', () => {
    it('sends POST with goal', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ criteria: { age: '>30' }, explanation: 'Adults' }),
      })
      const result = await suggestSegment('org-1', 'increase botox sales')
      expect(result.explanation).toBe('Adults')
    })

    it('throws on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      await expect(suggestSegment('org-1', 'x')).rejects.toThrow('Suggest segment failed')
    })
  })
})
