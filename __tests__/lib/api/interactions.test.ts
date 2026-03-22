// __tests__/lib/api/interactions.test.ts

const mockAuthFetch = jest.fn()
jest.mock('@/lib/supabase', () => ({
  authFetch: (...args: unknown[]) => mockAuthFetch(...args),
  API_URL: 'https://test-api.example.com',
  supabase: { auth: { getSession: jest.fn().mockResolvedValue({ data: { session: { access_token: 'test' } } }) } },
}))

import { fetchInteractions, annotateInteraction, removeAnnotation, fetchAnnotationStats } from '@/lib/api/interactions'

describe('Interactions API', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('fetchInteractions', () => {
    it('fetches interactions and transforms message_content fields', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          interactions: [{
            id: 'i1', patient_id: 'p1', message_content: 'Hello', direction: 'INBOUND',
          }],
        }),
      })
      const result = await fetchInteractions('org-1')
      expect(result).toHaveLength(1)
      expect(result[0].message_content).toBe('Hello')
      expect(result[0].direction).toBe('INBOUND')
    })

    it('splits raw_content and ai_response into two messages', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{
          id: 'i1', patient_id: 'p1',
          raw_content: 'Patient message',
          ai_response: 'Bot response',
        }]),
      })
      const result = await fetchInteractions('org-1')
      expect(result).toHaveLength(2)
      expect(result[0].direction).toBe('INBOUND')
      expect(result[0].message_content).toBe('Patient message')
      expect(result[1].direction).toBe('OUTBOUND')
      expect(result[1].message_content).toBe('Bot response')
      expect(result[1].id).toBe('i1-ai')
    })

    it('creates placeholder when neither raw_content nor ai_response', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ id: 'i1', patient_id: 'p1' }]),
      })
      const result = await fetchInteractions('org-1')
      expect(result).toHaveLength(1)
      expect(result[0].message_content).toBe('')
    })

    it('handles only raw_content (no ai_response)', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ id: 'i1', raw_content: 'Hello' }]),
      })
      const result = await fetchInteractions('org-1')
      expect(result).toHaveLength(1)
      expect(result[0].direction).toBe('INBOUND')
    })

    it('returns empty on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await fetchInteractions('org-1')).toEqual([])
    })

    it('includes filter params', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve([]),
      })
      await fetchInteractions('org-1', {
        limit: 50, offset: 10, patient_id: 'p1',
        channel: 'WHATSAPP', from: '2026-01-01', to: '2026-01-31', branchId: 'br-1',
      })
      const url = mockAuthFetch.mock.calls[0][0] as string
      expect(url).toContain('limit=50')
      expect(url).toContain('patient_id=p1')
      expect(url).toContain('channel=WHATSAPP')
      expect(url).toContain('branch_id=br-1')
    })

    it('handles data.data array format', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [{ id: 'i1', message_content: 'Hi', direction: 'INBOUND' }] }),
      })
      const result = await fetchInteractions('org-1')
      expect(result).toHaveLength(1)
    })

    it('maps platform to channel', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ id: 'i1', platform: 'INSTAGRAM', message_content: 'Hi' }]),
      })
      const result = await fetchInteractions('org-1')
      expect(result[0].channel).toBe('INSTAGRAM')
    })

    it('maps sentiment to sentiment_score', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ id: 'i1', sentiment: 0.8, message_content: 'Happy' }]),
      })
      const result = await fetchInteractions('org-1')
      expect(result[0].sentiment_score).toBe(0.8)
    })
  })

  describe('annotateInteraction', () => {
    it('sends annotation POST', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ ok: true }),
      })
      const result = await annotateInteraction('org-1', 'i1', 'thumbs_up', 'Great response')
      expect(result.ok).toBe(true)
      const body = JSON.parse(mockAuthFetch.mock.calls[0][1].body)
      expect(body.rating).toBe('thumbs_up')
      expect(body.notes).toBe('Great response')
    })

    it('returns { ok: false } on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      const result = await annotateInteraction('org-1', 'i1', 'thumbs_down')
      expect(result.ok).toBe(false)
    })
  })

  describe('removeAnnotation', () => {
    it('sends DELETE', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ ok: true }),
      })
      const result = await removeAnnotation('org-1', 'i1')
      expect(result.ok).toBe(true)
      expect(mockAuthFetch).toHaveBeenCalledWith(
        expect.stringContaining('/interactions/org-1/i1/annotate'),
        expect.objectContaining({ method: 'DELETE' })
      )
    })

    it('returns { ok: false } on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect((await removeAnnotation('org-1', 'i1')).ok).toBe(false)
    })
  })

  describe('fetchAnnotationStats', () => {
    it('returns stats on success', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ total: 100, thumbs_up: 80, thumbs_down: 20, approval_rate: 0.8 }),
      })
      const result = await fetchAnnotationStats('org-1')
      expect(result.approval_rate).toBe(0.8)
    })

    it('returns zeros on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      const result = await fetchAnnotationStats('org-1')
      expect(result).toEqual({ total: 0, thumbs_up: 0, thumbs_down: 0, approval_rate: 0 })
    })
  })
})
