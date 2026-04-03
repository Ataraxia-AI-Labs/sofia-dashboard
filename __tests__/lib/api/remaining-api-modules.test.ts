// __tests__/lib/api/remaining-api-modules.test.ts
// Tests for: data-lake, network, portal, segments, leads, models,
//            waiting-room, takeover, media, branches, business-hours,
//            competitors, conversions, duplicates, gamification,
//            ltv, organization, outreach, pipeline, pricing,
//            prompt-optimizer, services, staff-notes, treatments,
//            doctor-learning, annotations

const mockAuthFetch = jest.fn()
jest.mock('@/lib/supabase', () => ({
  authFetch: (...args: unknown[]) => mockAuthFetch(...args),
  API_URL: 'https://test-api.example.com',
  supabase: { auth: { getSession: jest.fn().mockResolvedValue({ data: { session: { access_token: 'test' } } }) } },
}))

// Mock global fetch for portal (public endpoints)
const mockFetch = jest.fn()
global.fetch = mockFetch

beforeEach(() => {
  jest.clearAllMocks()
  process.env.NEXT_PUBLIC_API_URL = 'https://test-api.example.com'
})

// ===================================================================
// Data Lake
// ===================================================================
import {
  fetchDataLakeStats, fetchDataLakeDaily, fetchTrainingReadyCount, exportDataLakeJSONL,
} from '@/lib/api/data-lake'

describe('Data Lake API', () => {
  describe('fetchDataLakeStats', () => {
    it('returns stats', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ raw_data_total: 5000 }),
      })
      const result = await fetchDataLakeStats('org-1')
      expect(result!.raw_data_total).toBe(5000)
    })

    it('includes branch_id', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
      await fetchDataLakeStats('org-1', 'br-1')
      expect(mockAuthFetch.mock.calls[0][0]).toContain('branch_id=br-1')
    })

    it('returns null on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await fetchDataLakeStats('org-1')).toBeNull()
    })
  })

  describe('fetchDataLakeDaily', () => {
    it('returns daily data', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve([{ date: '2026-03-01', count: 100 }]),
      })
      expect(await fetchDataLakeDaily('org-1')).toHaveLength(1)
    })

    it('uses custom days', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) })
      await fetchDataLakeDaily('org-1', 7)
      expect(mockAuthFetch.mock.calls[0][0]).toContain('dias=7')
    })

    it('returns empty on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await fetchDataLakeDaily('org-1')).toEqual([])
    })
  })

  describe('fetchTrainingReadyCount', () => {
    it('returns count', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve(250),
      })
      expect(await fetchTrainingReadyCount('org-1')).toBe(250)
    })

    it('returns 0 on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await fetchTrainingReadyCount('org-1')).toBe(0)
    })
  })

  describe('exportDataLakeJSONL', () => {
    it('sends POST with defaults', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ records: 100 }),
      })
      await exportDataLakeJSONL('org-1')
      const body = JSON.parse(mockAuthFetch.mock.calls[0][1].body)
      expect(body.product).toBe('SOFIA')
      expect(body.min_quality).toBe(0.7)
      expect(body.balance_intents).toBe(true)
    })

    it('sends custom options', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ records: 50 }),
      })
      await exportDataLakeJSONL('org-1', { product: 'CUSTOM', min_quality: 0.9, balance_intents: false })
      const body = JSON.parse(mockAuthFetch.mock.calls[0][1].body)
      expect(body.product).toBe('CUSTOM')
      expect(body.min_quality).toBe(0.9)
      expect(body.balance_intents).toBe(false)
    })

    it('returns null on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await exportDataLakeJSONL('org-1')).toBeNull()
    })
  })
})

// ===================================================================
// Network Intelligence
// ===================================================================
import {
  getNetworkBenchmarks, getServiceTrends, getPricingBenchmark,
  getConversionPatterns, getOptimalHours, getNetworkAlerts,
  getNetworkNarrative, getNetworkStats, publishMetrics,
} from '@/lib/api/network'

describe('Network API', () => {
  describe('getNetworkBenchmarks', () => {
    it('returns benchmarks', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ response_time: { yours: 1.5, market_avg: 2.0, percentile: 75 } }) })
      expect((await getNetworkBenchmarks('org-1'))!.response_time.yours).toBe(1.5)
    })
    it('returns null on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await getNetworkBenchmarks('org-1')).toBeNull()
    })
  })

  describe('getServiceTrends', () => {
    it('returns trends', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([{ service: 'Botox' }]) })
      expect(await getServiceTrends('org-1')).toHaveLength(1)
    })
    it('returns empty on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await getServiceTrends('org-1')).toEqual([])
    })
  })

  describe('getPricingBenchmark', () => {
    it('encodes service name in URL', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ avg_price: 500000 }) })
      await getPricingBenchmark('org-1', 'Botox Facial')
      expect(mockAuthFetch.mock.calls[0][0]).toContain('service=Botox%20Facial')
    })
    it('returns null on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await getPricingBenchmark('org-1', 'x')).toBeNull()
    })
  })

  describe('getConversionPatterns', () => {
    it('returns patterns', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([{ pattern: 'weekend' }]) })
      expect(await getConversionPatterns('org-1')).toHaveLength(1)
    })
    it('returns empty on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await getConversionPatterns('org-1')).toEqual([])
    })
  })

  describe('getOptimalHours', () => {
    it('returns hours', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([{ hour: 10 }]) })
      expect(await getOptimalHours('org-1')).toHaveLength(1)
    })
    it('returns empty on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await getOptimalHours('org-1')).toEqual([])
    })
  })

  describe('getNetworkAlerts', () => {
    it('returns alerts', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([{ type: 'ANOMALY' }]) })
      expect(await getNetworkAlerts('org-1')).toHaveLength(1)
    })
    it('returns empty on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await getNetworkAlerts('org-1')).toEqual([])
    })
  })

  describe('getNetworkNarrative', () => {
    it('returns narrative', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ text: 'Your clinic is...' }) })
      expect(await getNetworkNarrative('org-1')).toBeDefined()
    })
    it('returns null on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await getNetworkNarrative('org-1')).toBeNull()
    })
  })

  describe('getNetworkStats', () => {
    it('returns stats', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ total_orgs: 10 }) })
      expect(await getNetworkStats()).toBeDefined()
    })
    it('returns null on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await getNetworkStats()).toBeNull()
    })
  })

  describe('publishMetrics', () => {
    it('sends POST and returns true', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true })
      expect(await publishMetrics('org-1')).toBe(true)
    })
    it('returns false on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await publishMetrics('org-1')).toBe(false)
    })
    it('uses custom period', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true })
      await publishMetrics('org-1', 60)
      const body = JSON.parse(mockAuthFetch.mock.calls[0][1].body)
      expect(body.period_days).toBe(60)
    })
  })
})

// ===================================================================
// Portal (public API, no auth)
// ===================================================================
import {
  getPortalData, getAppointments, getPayments, getGamification,
  cancelAppointment, requestReschedule,
} from '@/lib/api/portal'

describe('Portal API', () => {
  describe('getPortalData', () => {
    it('fetches portal data with token', async () => {
      mockFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ clinic_name: 'Maria' }),
      })
      const result = await getPortalData('tok-123')
      expect(result!.clinic_name).toBe('Maria')
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/portal/tok-123'))
    })
    it('returns null on error', async () => {
      mockFetch.mockResolvedValue({ ok: false })
      expect(await getPortalData('tok-bad')).toBeNull()
    })
  })

  describe('getAppointments (portal)', () => {
    it('returns appointments', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([{ id: 'a1' }]) })
      expect(await getAppointments('tok-123')).toHaveLength(1)
    })
    it('returns empty on error', async () => {
      mockFetch.mockResolvedValue({ ok: false })
      expect(await getAppointments('tok-bad')).toEqual([])
    })
  })

  describe('getPayments (portal)', () => {
    it('returns payments', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([{ id: 'pay-1' }]) })
      expect(await getPayments('tok-123')).toHaveLength(1)
    })
    it('returns empty on error', async () => {
      mockFetch.mockResolvedValue({ ok: false })
      expect(await getPayments('tok-bad')).toEqual([])
    })
  })

  describe('getGamification (portal)', () => {
    it('returns gamification data', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ total_points: 150 }) })
      expect((await getGamification('tok-123'))!.total_points).toBe(150)
    })
    it('returns null on error', async () => {
      mockFetch.mockResolvedValue({ ok: false })
      expect(await getGamification('tok-bad')).toBeNull()
    })
  })

  describe('cancelAppointment (portal)', () => {
    it('returns true on success', async () => {
      mockFetch.mockResolvedValue({ ok: true })
      expect(await cancelAppointment('tok-123', 'a1')).toBe(true)
    })
    it('returns false on error', async () => {
      mockFetch.mockResolvedValue({ ok: false })
      expect(await cancelAppointment('tok-123', 'a1')).toBe(false)
    })
  })

  describe('requestReschedule (portal)', () => {
    it('returns true on success', async () => {
      mockFetch.mockResolvedValue({ ok: true })
      expect(await requestReschedule('tok-123', 'a1', ['2026-04-01', '2026-04-02'])).toBe(true)
    })
    it('sends preferred dates in body', async () => {
      mockFetch.mockResolvedValue({ ok: true })
      await requestReschedule('tok-123', 'a1', ['2026-04-01'])
      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.preferred_dates).toEqual(['2026-04-01'])
    })
    it('returns false on error', async () => {
      mockFetch.mockResolvedValue({ ok: false })
      expect(await requestReschedule('tok-123', 'a1', [])).toBe(false)
    })
  })
})

// ===================================================================
// Segments
// ===================================================================
import {
  generateEmbeddings, runClustering, getSegments, getPatientSegment,
  findSimilarPatients, getCampaignSuggestion,
} from '@/lib/api/segments'

describe('Segments API', () => {
  describe('generateEmbeddings', () => {
    it('sends POST', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ embeddings_generated: 100 }) })
      const result = await generateEmbeddings('org-1')
      expect(result!.embeddings_generated).toBe(100)
    })
    it('returns null on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await generateEmbeddings('org-1')).toBeNull()
    })
  })

  describe('runClustering', () => {
    it('runs with default clusters', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ n_clusters: 5 }) })
      await runClustering('org-1')
      expect(mockAuthFetch.mock.calls[0][0]).not.toContain('n_clusters')
    })
    it('runs with custom clusters', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ n_clusters: 3 }) })
      await runClustering('org-1', 3)
      expect(mockAuthFetch.mock.calls[0][0]).toContain('n_clusters=3')
    })
    it('returns null on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await runClustering('org-1')).toBeNull()
    })
  })

  describe('getSegments', () => {
    it('returns segments', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([{ id: 's1' }]) })
      expect(await getSegments('org-1')).toHaveLength(1)
    })
    it('returns empty on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await getSegments('org-1')).toEqual([])
    })
  })

  describe('getPatientSegment', () => {
    it('returns patient segment', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ segment_label: 'VIP' }) })
      expect((await getPatientSegment('org-1', 'p1'))!.segment_label).toBe('VIP')
    })
    it('returns null on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await getPatientSegment('org-1', 'p1')).toBeNull()
    })
  })

  describe('findSimilarPatients', () => {
    it('returns similar patients', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([{ id: 'p2', score: 0.95 }]) })
      expect(await findSimilarPatients('org-1', 'p1')).toHaveLength(1)
    })
    it('uses custom limit', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) })
      await findSimilarPatients('org-1', 'p1', 5)
      expect(mockAuthFetch.mock.calls[0][0]).toContain('limit=5')
    })
    it('returns empty on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await findSimilarPatients('org-1', 'p1')).toEqual([])
    })
  })

  describe('getCampaignSuggestion', () => {
    it('returns suggestion', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ message: 'Send promo' }) })
      expect(await getCampaignSuggestion('org-1', 's1')).toBeDefined()
    })
    it('returns null on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await getCampaignSuggestion('org-1', 's1')).toBeNull()
    })
  })
})

// ===================================================================
// Leads
// ===================================================================
import { scorePatient, scoreAllLeads, getLeadScores, getLeadInsights, getTopLeads } from '@/lib/api/leads'

describe('Leads API', () => {
  describe('scorePatient', () => {
    it('scores patient', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ score: 85 }) })
      expect((await scorePatient('org-1', 'p1'))!.score).toBe(85)
    })
    it('returns null on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await scorePatient('org-1', 'p1')).toBeNull()
    })
  })

  describe('scoreAllLeads', () => {
    it('scores all', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ scored: 50 }) })
      expect((await scoreAllLeads('org-1'))!.scored).toBe(50)
    })
    it('returns null on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await scoreAllLeads('org-1')).toBeNull()
    })
  })

  describe('getLeadScores', () => {
    it('returns scores', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([{ patient_id: 'p1' }]) })
      expect(await getLeadScores('org-1')).toHaveLength(1)
    })
    it('includes classification filter', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) })
      await getLeadScores('org-1', 'HOT' as 'HOT')
      expect(mockAuthFetch.mock.calls[0][0]).toContain('classification=HOT')
    })
    it('returns empty on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await getLeadScores('org-1')).toEqual([])
    })
  })

  describe('getLeadInsights', () => {
    it('returns insights', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ avg_score: 70 }) })
      expect(await getLeadInsights('org-1')).toBeDefined()
    })
    it('returns null on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await getLeadInsights('org-1')).toBeNull()
    })
  })

  describe('getTopLeads', () => {
    it('returns top leads', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([{ score: 95 }]) })
      expect(await getTopLeads('org-1')).toHaveLength(1)
    })
    it('uses custom limit', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) })
      await getTopLeads('org-1', 5)
      expect(mockAuthFetch.mock.calls[0][0]).toContain('limit=5')
    })
    it('returns empty on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await getTopLeads('org-1')).toEqual([])
    })
  })
})

// ===================================================================
// Models
// ===================================================================
import { getModels, deployModel, evaluateModel, getEvaluations, compareModels, getTrainingReadyCount } from '@/lib/api/models'

describe('Models API', () => {
  describe('getModels', () => {
    it('returns models', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([{ id: 'm1' }]) })
      expect(await getModels('org-1')).toHaveLength(1)
    })
    it('returns empty on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await getModels('org-1')).toEqual([])
    })
  })

  describe('deployModel', () => {
    it('deploys model', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: 'm1', status: 'DEPLOYED' }) })
      expect((await deployModel('org-1', 'm1'))!.status).toBe('DEPLOYED')
    })
    it('returns null on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await deployModel('org-1', 'm1')).toBeNull()
    })
  })

  describe('evaluateModel', () => {
    it('evaluates model', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ overall_score: 0.9 }) })
      expect((await evaluateModel('org-1', 'm1'))!.overall_score).toBe(0.9)
    })
    it('returns null on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await evaluateModel('org-1', 'm1')).toBeNull()
    })
  })

  describe('getEvaluations', () => {
    it('returns evaluations', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([{ id: 'e1' }]) })
      expect(await getEvaluations('org-1')).toHaveLength(1)
    })
    it('returns empty on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await getEvaluations('org-1')).toEqual([])
    })
  })

  describe('compareModels', () => {
    it('compares two models', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ model_a: { id: 'm1' }, model_b: { id: 'm2' } }) })
      expect((await compareModels('org-1', 'm1', 'm2'))!.model_a.id).toBe('m1')
    })
    it('returns null on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await compareModels('org-1', 'm1', 'm2')).toBeNull()
    })
  })

  describe('getTrainingReadyCount', () => {
    it('returns count', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(100) })
      expect(await getTrainingReadyCount('org-1')).toBe(100)
    })
    it('returns 0 on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await getTrainingReadyCount('org-1')).toBe(0)
    })
  })
})

// ===================================================================
// Waiting Room
// ===================================================================
import {
  checkIn, getQueue, getLatePatients, notifyLate,
  offerReschedule, notifyNext, completeVisit, getWaitingStats,
} from '@/lib/api/waiting-room'

describe('Waiting Room API', () => {
  describe('checkIn', () => {
    it('checks in patient', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: 'wr-1', queue_position: 3 }) })
      const result = await checkIn('org-1', 'p1', 'a1')
      expect(result.queue_position).toBe(3)
    })
    it('throws on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      await expect(checkIn('org-1', 'p1')).rejects.toThrow('Check-in failed')
    })
  })

  describe('getQueue', () => {
    it('returns queue', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([{ id: 'wr-1' }]) })
      expect(await getQueue('org-1')).toHaveLength(1)
    })
    it('returns empty on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await getQueue('org-1')).toEqual([])
    })
  })

  describe('getLatePatients', () => {
    it('returns late patients', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([{ patient_id: 'p1' }]) })
      expect(await getLatePatients('org-1')).toHaveLength(1)
    })
    it('returns empty on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await getLatePatients('org-1')).toEqual([])
    })
  })

  describe('notifyLate', () => {
    it('sends notification', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true })
      await notifyLate('org-1', 'p1')
      expect(mockAuthFetch).toHaveBeenCalledWith(
        expect.stringContaining('/waiting-room/org-1/notify-late'),
        expect.objectContaining({ method: 'POST' })
      )
    })
    it('throws on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      await expect(notifyLate('org-1', 'p1')).rejects.toThrow('Notify failed')
    })
  })

  describe('offerReschedule', () => {
    it('offers reschedule', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true })
      await offerReschedule('org-1', 'a1')
      expect(mockAuthFetch).toHaveBeenCalled()
    })
    it('throws on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      await expect(offerReschedule('org-1', 'a1')).rejects.toThrow('Offer reschedule failed')
    })
  })

  describe('notifyNext', () => {
    it('notifies next patient', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true })
      await notifyNext('org-1', 'p1')
    })
    it('throws on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      await expect(notifyNext('org-1', 'p1')).rejects.toThrow('Notify next failed')
    })
  })

  describe('completeVisit', () => {
    it('completes visit', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true })
      await completeVisit('org-1', 'a1')
    })
    it('throws on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      await expect(completeVisit('org-1', 'a1')).rejects.toThrow('Complete failed')
    })
  })

  describe('getWaitingStats', () => {
    it('returns stats', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ avg_wait_today: 15 }) })
      expect((await getWaitingStats('org-1'))!.avg_wait_today).toBe(15)
    })
    it('returns null on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await getWaitingStats('org-1')).toBeNull()
    })
  })
})

// ===================================================================
// Takeover
// ===================================================================
import { fetchActiveTakeovers, startTakeover, endTakeover, sendTakeoverMessage } from '@/lib/api/takeover'

describe('Takeover API', () => {
  describe('fetchActiveTakeovers', () => {
    it('returns active takeovers', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ takeovers: [{ patient_id: 'p1' }] }),
      })
      expect(await fetchActiveTakeovers('org-1')).toHaveLength(1)
    })
    it('returns empty on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await fetchActiveTakeovers('org-1')).toEqual([])
    })
    it('returns empty when takeovers field missing', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
      expect(await fetchActiveTakeovers('org-1')).toEqual([])
    })
  })

  describe('startTakeover', () => {
    it('starts takeover', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ status: 'started' }) })
      const result = await startTakeover('org-1', 'p1')
      expect(result.status).toBe('started')
    })
    it('throws on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false, status: 409 })
      await expect(startTakeover('org-1', 'p1')).rejects.toThrow('Start takeover failed: 409')
    })
  })

  describe('endTakeover', () => {
    it('ends takeover', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ status: 'ended' }) })
      const result = await endTakeover('org-1', 'p1')
      expect(result.status).toBe('ended')
    })
    it('throws on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false, status: 404 })
      await expect(endTakeover('org-1', 'p1')).rejects.toThrow('End takeover failed: 404')
    })
  })

  describe('sendTakeoverMessage', () => {
    it('sends message', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ sent: true }) })
      const result = await sendTakeoverMessage('org-1', 'p1', 'Hola paciente')
      expect(result.sent).toBe(true)
    })
    it('throws on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false, status: 500 })
      await expect(sendTakeoverMessage('org-1', 'p1', 'Hi')).rejects.toThrow('Send message failed: 500')
    })
  })
})

// ===================================================================
// Media
// ===================================================================
import { fetchPatientMedia } from '@/lib/api/media'

describe('Media API', () => {
  describe('fetchPatientMedia', () => {
    it('returns media list', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([{ id: 'media-1' }]) })
      expect(await fetchPatientMedia('p1')).toHaveLength(1)
    })
    it('returns empty on error', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await fetchPatientMedia('p1')).toEqual([])
    })
  })
})

// ===================================================================
// Branches
// ===================================================================
import { fetchBranches } from '@/lib/api/branches'

describe('Branches API', () => {
  describe('fetchBranches', () => {
    it('returns branches with branches field', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve({ branches: [{ id: 'br-1' }] }),
      })
      expect(await fetchBranches('org-1')).toHaveLength(1)
    })
    it('returns branches from raw array', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: true, json: () => Promise.resolve([{ id: 'br-1' }]),
      })
      expect(await fetchBranches('org-1')).toHaveLength(1)
    })
    it('returns empty on error response', async () => {
      mockAuthFetch.mockResolvedValue({ ok: false })
      expect(await fetchBranches('org-1')).toEqual([])
    })
    it('returns empty on exception', async () => {
      mockAuthFetch.mockRejectedValue(new Error('network'))
      expect(await fetchBranches('org-1')).toEqual([])
    })
  })
})
