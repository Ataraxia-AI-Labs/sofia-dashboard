// __tests__/lib/api/channels-voice-health-opportunities.test.ts

const mockAuthFetch = jest.fn()
jest.mock('@/lib/supabase', () => ({
  authFetch: (...args: unknown[]) => mockAuthFetch(...args),
  API_URL: 'https://test-api.example.com',
  supabase: { auth: { getSession: jest.fn().mockResolvedValue({ data: { session: { access_token: 'test' } } }) } },
}))

import {
  fetchChannelStatus, connectWhatsApp, connectWhatsAppEmbedded,
  getChannelMetrics, getChannelComparison, getUnifiedInbox,
  getConversationDetail, getChannelConfig, updateChannelConfig,
  suggestRedirect,
} from '@/lib/api/channels'

import {
  fetchVoiceMetrics, sendCrossModal, getCallHistory, getCallDetail,
  generateCallSummary, getVoiceAnalytics, getCallEvents,
} from '@/lib/api/voice'

import { fetchSystemHealth } from '@/lib/api/health'
import { fetchOpportunities, updateOpportunity } from '@/lib/api/opportunities'

describe('Channels API', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('fetchChannelStatus', () => {
    it('returns channel status on success', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ whatsapp: { connected: true }, instagram: { connected: false }, messenger: { connected: false }, voice: { connected: true } }),
      })
      const result = await fetchChannelStatus('org-1')
      expect(result.whatsapp.connected).toBe(true)
      expect(result.voice.connected).toBe(true)
    })

    it('returns all disconnected on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      const result = await fetchChannelStatus('org-1')
      expect(result.whatsapp.connected).toBe(false)
      expect(result.instagram.connected).toBe(false)
    })
  })

  describe('connectWhatsApp', () => {
    it('sends POST with credentials', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ success: true }),
      })
      await connectWhatsApp('org-1', { phone_number_id: 'pn-1', api_key: 'key-1' })
      expect(mockAuthFetch).toHaveBeenCalledWith(
        expect.stringContaining('/channels/org-1/whatsapp'),
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('throws on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false, status: 400 })
      await expect(connectWhatsApp('org-1', { phone_number_id: 'x', api_key: 'x' })).rejects.toThrow()
    })
  })

  describe('connectWhatsAppEmbedded', () => {
    it('sends embedded signup code', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ waba_id: 'w-1' }),
      })
      const result = await connectWhatsAppEmbedded('org-1', 'code-123')
      expect(result.waba_id).toBe('w-1')
    })

    it('throws with detail on error', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ detail: 'Invalid code' }),
      })
      await expect(connectWhatsAppEmbedded('org-1', 'bad')).rejects.toThrow('Invalid code')
    })

    it('throws with HTTP status when json fails', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: false, status: 502,
        json: () => Promise.reject(new Error('parse error')),
      })
      await expect(connectWhatsAppEmbedded('org-1', 'bad')).rejects.toThrow('HTTP 502')
    })
  })

  describe('getChannelMetrics', () => {
    it('returns metrics', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve([{ channel: 'WHATSAPP', count: 100 }]),
      })
      expect(await getChannelMetrics('org-1')).toHaveLength(1)
    })

    it('includes period param', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) })
      await getChannelMetrics('org-1', '7d')
      expect(mockAuthFetch.mock.calls[0][0]).toContain('period=7d')
    })

    it('returns empty on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await getChannelMetrics('org-1')).toEqual([])
    })
  })

  describe('getChannelComparison', () => {
    it('returns comparison', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ best_by_messages: 'WHATSAPP' }),
      })
      expect((await getChannelComparison('org-1'))!.best_by_messages).toBe('WHATSAPP')
    })

    it('returns null on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await getChannelComparison('org-1')).toBeNull()
    })
  })

  describe('getUnifiedInbox', () => {
    it('returns conversations', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve([{ id: 'conv-1' }]),
      })
      expect(await getUnifiedInbox('org-1')).toHaveLength(1)
    })

    it('includes channel and unread_only filters', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) })
      await getUnifiedInbox('org-1', { channel: 'INSTAGRAM', unread_only: true })
      const url = mockAuthFetch.mock.calls[0][0]
      expect(url).toContain('channel=INSTAGRAM')
      expect(url).toContain('unread_only=true')
    })

    it('returns empty on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await getUnifiedInbox('org-1')).toEqual([])
    })
  })

  describe('getConversationDetail', () => {
    it('returns messages', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve([{ id: 'm1', text: 'Hi' }]),
      })
      expect(await getConversationDetail('org-1', 'p1')).toHaveLength(1)
    })

    it('returns empty on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await getConversationDetail('org-1', 'p1')).toEqual([])
    })
  })

  describe('getChannelConfig', () => {
    it('returns config array', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve([{ channel: 'WHATSAPP', enabled: true }]),
      })
      expect(await getChannelConfig('org-1')).toHaveLength(1)
    })

    it('returns empty on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await getChannelConfig('org-1')).toEqual([])
    })
  })

  describe('updateChannelConfig', () => {
    it('sends PATCH', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ channel: 'WHATSAPP', enabled: false }),
      })
      const result = await updateChannelConfig('org-1', 'WHATSAPP', { enabled: false } as Record<string, unknown>)
      expect(result).toBeDefined()
    })

    it('returns null on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await updateChannelConfig('org-1', 'WHATSAPP', {} as Record<string, unknown>)).toBeNull()
    })
  })

  // S145: getChannelInsights tests removed — function deleted with the
  // panel (CEO directive). See lib/api/channels.ts for rationale.

  describe('suggestRedirect', () => {
    it('returns suggestion', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ suggestion: 'Switch to voice' }),
      })
      const result = await suggestRedirect('org-1', { patient_id: 'p1', current_channel: 'WHATSAPP', needed_action: 'complex' })
      expect(result!.suggestion).toBe('Switch to voice')
    })

    it('returns null on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await suggestRedirect('org-1', { patient_id: 'p1', current_channel: 'WHATSAPP', needed_action: 'x' })).toBeNull()
    })
  })
})

// ===================================================================
// Voice API
// ===================================================================
describe('Voice API', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('fetchVoiceMetrics', () => {
    it('returns metrics on success', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ total_calls: 50 }),
      })
      const result = await fetchVoiceMetrics('org-1')
      expect(result.total_calls).toBe(50)
    })

    it('returns zeros on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      const result = await fetchVoiceMetrics('org-1')
      expect(result.total_calls).toBe(0)
      expect(result.avg_duration_seconds).toBe(0)
    })

    it('includes days param', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ total_calls: 0 }),
      })
      await fetchVoiceMetrics('org-1', 7)
      expect(mockAuthFetch.mock.calls[0][0]).toContain('dias=7')
    })
  })

  describe('sendCrossModal', () => {
    it('sends cross-modal data', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ success: true }),
      })
      const result = await sendCrossModal('org-1', {
        patient_id: 'p1', call_id: 'call-1', content_type: 'IMAGE', content: { url: 'https://x/img.png' },
      })
      expect(result!.success).toBe(true)
    })

    it('returns null on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await sendCrossModal('org-1', { patient_id: 'p1', call_id: 'c1', content_type: 'TEXT', content: { text: 'x' } })).toBeNull()
    })
  })

  describe('getCallHistory', () => {
    it('returns calls', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve([{ id: 'call-1' }]),
      })
      expect(await getCallHistory('org-1')).toHaveLength(1)
    })

    it('includes patient_id filter', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) })
      await getCallHistory('org-1', 'p1')
      expect(mockAuthFetch.mock.calls[0][0]).toContain('patient_id=p1')
    })

    it('returns empty on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await getCallHistory('org-1')).toEqual([])
    })
  })

  describe('getCallDetail', () => {
    it('returns call with transcription', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ call: { id: 'c1' }, transcription: [] }),
      })
      const result = await getCallDetail('org-1', 'c1')
      expect(result!.call.id).toBe('c1')
    })

    it('returns null on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await getCallDetail('org-1', 'c1')).toBeNull()
    })
  })

  describe('generateCallSummary', () => {
    it('generates summary', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ id: 'c1', summary: 'Patient asked about botox' }),
      })
      const result = await generateCallSummary('org-1', 'c1')
      expect(result!.summary).toBeDefined()
    })

    it('returns null on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await generateCallSummary('org-1', 'c1')).toBeNull()
    })
  })

  describe('getVoiceAnalytics', () => {
    it('returns analytics', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ avg_sentiment: 0.7 }),
      })
      expect(await getVoiceAnalytics('org-1')).toBeDefined()
    })

    it('includes period param', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
      await getVoiceAnalytics('org-1', '7d')
      expect(mockAuthFetch.mock.calls[0][0]).toContain('period=7d')
    })

    it('returns null on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await getVoiceAnalytics('org-1')).toBeNull()
    })
  })

  describe('getCallEvents', () => {
    it('returns events', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve([{ event: 'ANSWERED' }]),
      })
      expect(await getCallEvents('org-1', 'c1')).toHaveLength(1)
    })

    it('returns empty on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await getCallEvents('org-1', 'c1')).toEqual([])
    })
  })
})

// ===================================================================
// Health API
// ===================================================================
describe('Health API', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('fetchSystemHealth', () => {
    it('returns health status', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ status: 'HEALTHY', uptime: 99.9 }),
      })
      const result = await fetchSystemHealth()
      expect(result.status).toBe('HEALTHY')
    })

    it('returns CRITICAL on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      const result = await fetchSystemHealth()
      expect(result.status).toBe('CRITICAL')
      expect(result.error).toContain('backend')
    })
  })
})

// ===================================================================
// Opportunities API
// ===================================================================
describe('Opportunities API', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('fetchOpportunities', () => {
    it('fetches opportunities for org', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve([{ id: 'opp-1' }]),
      })
      expect(await fetchOpportunities('org-1')).toHaveLength(1)
    })

    it('includes status filter', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) })
      await fetchOpportunities('org-1', 'OPEN')
      expect(mockAuthFetch.mock.calls[0][0]).toContain('status=OPEN')
    })

    it('includes branch_id', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) })
      await fetchOpportunities('org-1', undefined, 'br-1')
      expect(mockAuthFetch.mock.calls[0][0]).toContain('branch_id=br-1')
    })

    it('throws on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false, status: 500 })
      await expect(fetchOpportunities('org-1')).rejects.toThrow('Opportunities error: 500')
    })
  })

  describe('updateOpportunity', () => {
    it('sends PATCH', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ id: 'opp-1', status: 'WON' }),
      })
      const result = await updateOpportunity('opp-1', { status: 'WON' })
      expect(result.status).toBe('WON')
    })

    it('throws on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false, status: 400 })
      await expect(updateOpportunity('opp-1', {})).rejects.toThrow()
    })
  })
})
