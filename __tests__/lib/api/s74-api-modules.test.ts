// __tests__/lib/api/s74-api-modules.test.ts
// ---------------------------------------------------------------------------
// Tests for all 11 new API modules created in S74
// audit, webhooks, workflows, growth, conv-intel, content, referrals,
// reviews, marketplace, api-keys, revenue
// ---------------------------------------------------------------------------

import '@testing-library/jest-dom'

const mockAuthFetch = jest.fn()
jest.mock('@/lib/supabase', () => ({
  authFetch: (...args: unknown[]) => mockAuthFetch(...args),
  API_URL: 'https://test-api.example.com',
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: { access_token: 'test' } } }),
    },
  },
}))

// ---- Audit ----
import { fetchAuditLogs } from '@/lib/api/audit'
// ---- Webhooks ----
import {
  listWebhookEndpoints, getWebhookEndpoint, createWebhookEndpoint,
  updateWebhookEndpoint, deleteWebhookEndpoint, testWebhookEndpoint,
  listWebhookDeliveries, retryWebhookDelivery, getWebhookEventCatalog,
} from '@/lib/api/webhooks'
// ---- Workflows ----
import {
  listWorkflows, getWorkflow, createWorkflow, updateWorkflow,
  activateWorkflow, pauseWorkflow, archiveWorkflow, listTemplates,
  createFromTemplate, enrollPatients, listEnrollments,
  getWorkflowAnalytics, getWorkflowComparison,
} from '@/lib/api/workflows'
// ---- Growth ----
import {
  getAttribution, getChannelROI, getPatientJourney,
  getGrowthDashboard, listAdCampaigns, getAdCampaignROI,
  generateAdContent, generateKeywords, getSEOHealth,
} from '@/lib/api/growth'
// ---- Conv Intelligence ----
import {
  getPatientMemories, addPatientMemory, deletePatientMemory,
  searchPatientMemories, getPatientPersonality, getPatientEmotions,
  getEmotionTrajectory, getEmotionAnalytics, getPatientIntents,
  getIntentAnalytics, getPatientSummary, generatePatientSummary,
  getCoachingPatterns, getCoachingTips, markTipRead,
  getStaffMetrics, getCoachingDashboard, getProactiveQueue, getProactiveAnalytics,
} from '@/lib/api/conv-intel'
// ---- Content ----
import {
  listContent, createContent, updateContent,
  getContentAnalytics, suggestTopics, getContentCalendar,
} from '@/lib/api/content'
// ---- Referrals ----
import {
  getReferralProgram, updateReferralProgram, generateReferralLink,
  getReferralLeaderboard, getReferralAnalytics,
} from '@/lib/api/referrals'
// ---- Reviews ----
import {
  listReviews, getReviewStats, replyToReview,
  generateReviewReply, syncReviews, getReputationDashboard, getNPS, requestReview,
} from '@/lib/api/reviews'
// ---- Marketplace ----
import {
  browseConnectors, getConnectorDetail, getCategories,
  installConnector, uninstallConnector, listInstalled, getConnectorReviews,
  listPlugins, createPlugin, updatePlugin, deletePlugin, testPlugin,
} from '@/lib/api/marketplace'
// ---- API Keys ----
import { listApiKeys, createApiKey, revokeApiKey } from '@/lib/api/api-keys'
// ---- Revenue ----
import {
  getRevenueDashboard, getMRR, getChurn, getCohorts,
  getRevenueFunnel, getRevenueForecast,
} from '@/lib/api/revenue'

beforeEach(() => jest.clearAllMocks())

const ok = (data: unknown) => mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(data) })
const fail = () => mockAuthFetch.mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) })

// ============================================================
// AUDIT
// ============================================================
describe('Audit API', () => {
  it('fetchAuditLogs sends correct URL with params', async () => {
    ok({ data: [], total: 0, limit: 50, offset: 0 })
    const result = await fetchAuditLogs('org-1', { action: 'LOGIN', limit: 10 })
    expect(mockAuthFetch).toHaveBeenCalledWith(expect.stringContaining('/admin/audit-logs?'))
    expect(mockAuthFetch.mock.calls[0][0]).toContain('org_id=org-1')
    expect(mockAuthFetch.mock.calls[0][0]).toContain('action=LOGIN')
    expect(mockAuthFetch.mock.calls[0][0]).toContain('limit=10')
    expect(result.data).toEqual([])
  })

  it('fetchAuditLogs throws on error', async () => {
    fail()
    await expect(fetchAuditLogs('org-1')).rejects.toThrow('Audit logs error')
  })

  it('fetchAuditLogs works without params', async () => {
    ok({ data: [{ id: '1' }], total: 1, limit: 50, offset: 0 })
    const result = await fetchAuditLogs('org-1')
    expect(result.total).toBe(1)
  })
})

// ============================================================
// WEBHOOKS
// ============================================================
describe('Webhooks API', () => {
  it('listWebhookEndpoints returns array', async () => {
    ok([{ id: 'ep-1', name: 'Test' }])
    const result = await listWebhookEndpoints('org-1')
    expect(result).toEqual([{ id: 'ep-1', name: 'Test' }])
  })

  it('listWebhookEndpoints returns empty on error', async () => {
    fail()
    const result = await listWebhookEndpoints('org-1')
    expect(result).toEqual([])
  })

  it('getWebhookEndpoint throws on error', async () => {
    fail()
    await expect(getWebhookEndpoint('org-1', 'ep-1')).rejects.toThrow()
  })

  it('createWebhookEndpoint sends POST', async () => {
    ok({ id: 'ep-new' })
    await createWebhookEndpoint('org-1', { name: 'New', url: 'https://x.com', event_types: ['payment.created'] })
    expect(mockAuthFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/webhooks/org-1/endpoints'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('updateWebhookEndpoint sends PATCH', async () => {
    ok({ id: 'ep-1' })
    await updateWebhookEndpoint('org-1', 'ep-1', { is_active: false })
    expect(mockAuthFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/webhooks/org-1/endpoints/ep-1'),
      expect.objectContaining({ method: 'PATCH' })
    )
  })

  it('deleteWebhookEndpoint sends DELETE', async () => {
    mockAuthFetch.mockResolvedValue({ ok: true })
    await deleteWebhookEndpoint('org-1', 'ep-1')
    expect(mockAuthFetch).toHaveBeenCalledWith(
      expect.stringContaining('/endpoints/ep-1'),
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  it('testWebhookEndpoint sends POST', async () => {
    ok({ success: true, status_code: 200 })
    const result = await testWebhookEndpoint('org-1', 'ep-1')
    expect(result.success).toBe(true)
  })

  it('listWebhookDeliveries returns array', async () => {
    ok([{ id: 'd-1', status: 'SUCCESS' }])
    const result = await listWebhookDeliveries('org-1')
    expect(result).toHaveLength(1)
  })

  it('retryWebhookDelivery sends POST', async () => {
    mockAuthFetch.mockResolvedValue({ ok: true })
    await retryWebhookDelivery('org-1', 'd-1')
    expect(mockAuthFetch).toHaveBeenCalledWith(
      expect.stringContaining('/deliveries/d-1/retry'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('getWebhookEventCatalog returns array', async () => {
    ok(['payment.created', 'appointment.booked'])
    const result = await getWebhookEventCatalog('org-1')
    expect(result).toEqual(['payment.created', 'appointment.booked'])
  })
})

// ============================================================
// WORKFLOWS
// ============================================================
describe('Workflows API', () => {
  it('listWorkflows returns array', async () => {
    ok([{ id: 'w-1', name: 'Welcome' }])
    const result = await listWorkflows('org-1')
    expect(result).toHaveLength(1)
  })

  it('listWorkflows with status filter', async () => {
    ok([])
    await listWorkflows('org-1', 'ACTIVE')
    expect(mockAuthFetch.mock.calls[0][0]).toContain('?status=ACTIVE')
  })

  it('listWorkflows returns empty on error', async () => {
    fail()
    expect(await listWorkflows('org-1')).toEqual([])
  })

  it('getWorkflow throws on error', async () => {
    fail()
    await expect(getWorkflow('org-1', 'w-1')).rejects.toThrow()
  })

  it('createWorkflow sends POST with data', async () => {
    ok({ id: 'w-new' })
    await createWorkflow('org-1', { name: 'Test', trigger_type: 'APPOINTMENT', trigger_config: {}, steps: [] })
    expect(mockAuthFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/workflows/org-1'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('updateWorkflow sends PATCH', async () => {
    ok({ id: 'w-1' })
    await updateWorkflow('org-1', 'w-1', { name: 'Updated' })
    expect(mockAuthFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/workflows/org-1/w-1'),
      expect.objectContaining({ method: 'PATCH' })
    )
  })

  it('activateWorkflow sends POST', async () => {
    mockAuthFetch.mockResolvedValue({ ok: true })
    await activateWorkflow('org-1', 'w-1')
    expect(mockAuthFetch.mock.calls[0][0]).toContain('/activate')
  })

  it('pauseWorkflow sends POST', async () => {
    mockAuthFetch.mockResolvedValue({ ok: true })
    await pauseWorkflow('org-1', 'w-1')
    expect(mockAuthFetch.mock.calls[0][0]).toContain('/pause')
  })

  it('archiveWorkflow sends POST', async () => {
    mockAuthFetch.mockResolvedValue({ ok: true })
    await archiveWorkflow('org-1', 'w-1')
    expect(mockAuthFetch.mock.calls[0][0]).toContain('/archive')
  })

  it('listTemplates returns array', async () => {
    ok([{ id: 't-1', name: 'Welcome Flow' }])
    const result = await listTemplates('org-1')
    expect(result).toHaveLength(1)
  })

  it('createFromTemplate sends POST', async () => {
    ok({ id: 'w-2' })
    await createFromTemplate('org-1', 't-1', 'My Flow')
    expect(mockAuthFetch).toHaveBeenCalledWith(
      expect.stringContaining('/from-template'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('enrollPatients sends POST', async () => {
    mockAuthFetch.mockResolvedValue({ ok: true })
    await enrollPatients('org-1', 'w-1', ['p-1', 'p-2'])
    expect(mockAuthFetch).toHaveBeenCalledWith(
      expect.stringContaining('/enroll'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('listEnrollments returns array', async () => {
    ok([{ id: 'e-1', status: 'ACTIVE' }])
    const result = await listEnrollments('org-1', 'w-1')
    expect(result).toHaveLength(1)
  })

  it('getWorkflowAnalytics returns object', async () => {
    ok({ conversion_rate: 0.45 })
    const result = await getWorkflowAnalytics('org-1', 'w-1')
    expect(result).toHaveProperty('conversion_rate')
  })

  it('getWorkflowComparison returns array', async () => {
    ok([{ workflow_id: 'w-1', conversion: 0.5 }])
    const result = await getWorkflowComparison('org-1')
    expect(result).toHaveLength(1)
  })
})

// ============================================================
// GROWTH
// ============================================================
describe('Growth API', () => {
  it('getAttribution with model type', async () => {
    ok({ model_type: 'first_touch', total_conversions: 10, total_revenue: 1000, channels: {} })
    const result = await getAttribution('org-1', 'first_touch', 30)
    expect(result.model_type).toBe('first_touch')
    expect(mockAuthFetch.mock.calls[0][0]).toContain('model_type=first_touch')
  })

  it('getAttribution throws on error', async () => {
    fail()
    await expect(getAttribution('org-1')).rejects.toThrow()
  })

  it('getChannelROI returns object', async () => {
    ok({ whatsapp: { roi: 3.5 } })
    const result = await getChannelROI('org-1', 30)
    expect(result).toHaveProperty('whatsapp')
  })

  it('getChannelROI returns empty on error', async () => {
    fail()
    expect(await getChannelROI('org-1')).toEqual({})
  })

  it('getPatientJourney returns object', async () => {
    ok({ touchpoints: [] })
    const result = await getPatientJourney('org-1', 'p-1')
    expect(result).toHaveProperty('touchpoints')
  })

  it('getGrowthDashboard returns metrics', async () => {
    ok({ funnel: { visitors: 100 }, anomalies: [], trends: {}, kpis: {} })
    const result = await getGrowthDashboard('org-1')
    expect(result.funnel.visitors).toBe(100)
  })

  it('listAdCampaigns returns array', async () => {
    ok([{ id: 'c-1', name: 'Summer Promo' }])
    const result = await listAdCampaigns('org-1')
    expect(result).toHaveLength(1)
  })

  it('listAdCampaigns with platform filter', async () => {
    ok([])
    await listAdCampaigns('org-1', 'GOOGLE')
    expect(mockAuthFetch.mock.calls[0][0]).toContain('?platform=GOOGLE')
  })

  it('getAdCampaignROI returns object', async () => {
    ok({ roi: 2.5 })
    const result = await getAdCampaignROI('org-1', 'c-1')
    expect(result.roi).toBe(2.5)
  })

  it('generateAdContent sends POST', async () => {
    ok({ headline: 'Test' })
    await generateAdContent('org-1', 'c-1')
    expect(mockAuthFetch).toHaveBeenCalledWith(
      expect.stringContaining('/generate'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('generateKeywords sends POST', async () => {
    ok(['botox', 'dental implants'])
    const result = await generateKeywords('org-1')
    expect(result).toHaveLength(2)
  })

  it('getSEOHealth returns object', async () => {
    ok({ score: 85 })
    const result = await getSEOHealth('org-1')
    expect(result.score).toBe(85)
  })
})

// ============================================================
// CONV INTELLIGENCE
// ============================================================
describe('Conv Intelligence API', () => {
  // D1 — Patient Memory
  it('getPatientMemories returns array', async () => {
    ok([{ id: 'm-1', content: 'Allergic to penicillin' }])
    const result = await getPatientMemories('org-1', 'p-1')
    expect(result).toHaveLength(1)
  })

  it('getPatientMemories with category filter', async () => {
    ok([])
    await getPatientMemories('org-1', 'p-1', 'medical')
    expect(mockAuthFetch.mock.calls[0][0]).toContain('?category=medical')
  })

  it('getPatientMemories returns empty on error', async () => {
    fail()
    expect(await getPatientMemories('org-1', 'p-1')).toEqual([])
  })

  it('addPatientMemory sends POST', async () => {
    ok({ id: 'm-new' })
    await addPatientMemory('org-1', 'p-1', { category: 'medical', content: 'Test' })
    expect(mockAuthFetch).toHaveBeenCalledWith(
      expect.stringContaining('/memories'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('deletePatientMemory sends DELETE', async () => {
    mockAuthFetch.mockResolvedValue({ ok: true })
    await deletePatientMemory('org-1', 'p-1', 'm-1')
    expect(mockAuthFetch).toHaveBeenCalledWith(
      expect.stringContaining('/memories/m-1'),
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  it('searchPatientMemories encodes query', async () => {
    ok([])
    await searchPatientMemories('org-1', 'p-1', 'allergic reaction')
    expect(mockAuthFetch.mock.calls[0][0]).toContain('query=allergic%20reaction')
  })

  // D2 — Personality
  it('getPatientPersonality returns profile', async () => {
    ok({ openness: 0.7, warmth: 0.8, dominant_traits: ['friendly'] })
    const result = await getPatientPersonality('org-1', 'p-1')
    expect(result?.openness).toBe(0.7)
  })

  it('getPatientPersonality returns null on error', async () => {
    fail()
    expect(await getPatientPersonality('org-1', 'p-1')).toBeNull()
  })

  // D4 — Emotions
  it('getPatientEmotions returns profile', async () => {
    ok({ joy: 0.6, dominant_emotion: 'joy', emotional_stability: 0.8 })
    const result = await getPatientEmotions('org-1', 'p-1')
    expect(result?.dominant_emotion).toBe('joy')
  })

  it('getPatientEmotions returns null on error', async () => {
    fail()
    expect(await getPatientEmotions('org-1', 'p-1')).toBeNull()
  })

  it('getEmotionTrajectory returns array', async () => {
    ok([{ date: '2026-03-01', dominant_emotion: 'joy', scores: {} }])
    const result = await getEmotionTrajectory('org-1', 'p-1')
    expect(result).toHaveLength(1)
  })

  it('getEmotionTrajectory with days param', async () => {
    ok([])
    await getEmotionTrajectory('org-1', 'p-1', 7)
    expect(mockAuthFetch.mock.calls[0][0]).toContain('?days=7')
  })

  it('getEmotionAnalytics returns object', async () => {
    ok({ avg_stability: 0.75 })
    const result = await getEmotionAnalytics('org-1')
    expect(result).toHaveProperty('avg_stability')
  })

  // D3 — Intents
  it('getPatientIntents returns array', async () => {
    ok([{ intent: 'BOOK_APPOINTMENT' }])
    const result = await getPatientIntents('org-1', 'p-1')
    expect(result).toHaveLength(1)
  })

  it('getIntentAnalytics returns object', async () => {
    ok({ top_intents: [] })
    expect(await getIntentAnalytics('org-1')).toHaveProperty('top_intents')
  })

  // D5 — Summarizer
  it('getPatientSummary returns summary', async () => {
    ok({ summary: 'Regular patient', brief: 'Good' })
    const result = await getPatientSummary('org-1', 'p-1')
    expect(result?.summary).toBe('Regular patient')
  })

  it('getPatientSummary returns null on error', async () => {
    fail()
    expect(await getPatientSummary('org-1', 'p-1')).toBeNull()
  })

  it('generatePatientSummary sends POST', async () => {
    ok({ summary: 'Generated' })
    await generatePatientSummary('org-1', 'p-1')
    expect(mockAuthFetch).toHaveBeenCalledWith(
      expect.stringContaining('/summaries/generate'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  // D7 — Staff Coaching
  it('getCoachingTips returns array', async () => {
    ok([{ id: 't-1', tip: 'Respond faster', priority: 'HIGH' }])
    const result = await getCoachingTips('org-1')
    expect(result).toHaveLength(1)
  })

  it('markTipRead sends PATCH', async () => {
    mockAuthFetch.mockResolvedValue({ ok: true })
    await markTipRead('org-1', 't-1')
    expect(mockAuthFetch).toHaveBeenCalledWith(
      expect.stringContaining('/tips/t-1/read'),
      expect.objectContaining({ method: 'PATCH' })
    )
  })

  it('getStaffMetrics returns array', async () => {
    ok([{ staff_id: 's-1', staff_name: 'Ana', conversations_handled: 50 }])
    const result = await getStaffMetrics('org-1')
    expect(result[0].staff_name).toBe('Ana')
  })

  it('getCoachingDashboard returns object', async () => {
    ok({ total_tips: 5 })
    expect(await getCoachingDashboard('org-1')).toHaveProperty('total_tips')
  })

  it('getCoachingPatterns returns array', async () => {
    ok([{ pattern: 'slow_response' }])
    expect(await getCoachingPatterns('org-1')).toHaveLength(1)
  })

  // D6 — Proactive Intelligence
  it('getProactiveQueue returns array', async () => {
    ok([{ patient_id: 'p-1', action: 'follow_up' }])
    expect(await getProactiveQueue('org-1')).toHaveLength(1)
  })

  it('getProactiveAnalytics returns object', async () => {
    ok({ sent: 100, converted: 30 })
    expect(await getProactiveAnalytics('org-1')).toHaveProperty('sent')
  })
})

// ============================================================
// CONTENT
// ============================================================
describe('Content API', () => {
  it('listContent returns array', async () => {
    ok([{ id: 'c-1', title: 'Summer Post' }])
    expect(await listContent('org-1')).toHaveLength(1)
  })

  it('listContent returns empty on error', async () => {
    fail()
    expect(await listContent('org-1')).toEqual([])
  })

  it('createContent sends POST', async () => {
    ok({ id: 'c-new' })
    await createContent('org-1', { platform: 'INSTAGRAM', content_type: 'POST', title: 'Test', body: 'Body' })
    expect(mockAuthFetch).toHaveBeenCalledWith(
      expect.stringContaining('/content'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('updateContent sends PATCH', async () => {
    ok({ id: 'c-1' })
    await updateContent('org-1', 'c-1', { title: 'Updated' })
    expect(mockAuthFetch).toHaveBeenCalledWith(
      expect.stringContaining('/content/c-1'),
      expect.objectContaining({ method: 'PATCH' })
    )
  })

  it('getContentAnalytics returns object', async () => {
    ok({ total_posts: 25 })
    expect(await getContentAnalytics('org-1')).toHaveProperty('total_posts')
  })

  it('suggestTopics sends POST and returns array', async () => {
    ok(['teeth whitening', 'botox tips'])
    const result = await suggestTopics('org-1')
    expect(result).toHaveLength(2)
  })

  it('getContentCalendar sends POST', async () => {
    ok({ weeks: [] })
    await getContentCalendar('org-1')
    expect(mockAuthFetch).toHaveBeenCalledWith(
      expect.stringContaining('/calendar'),
      expect.objectContaining({ method: 'POST' })
    )
  })
})

// ============================================================
// REFERRALS
// ============================================================
describe('Referrals API', () => {
  it('getReferralProgram returns program', async () => {
    ok({ id: 'rp-1', is_active: true, reward_type: 'DISCOUNT' })
    const result = await getReferralProgram('org-1')
    expect(result?.is_active).toBe(true)
  })

  it('getReferralProgram returns null on error', async () => {
    fail()
    expect(await getReferralProgram('org-1')).toBeNull()
  })

  it('updateReferralProgram sends POST', async () => {
    ok({ id: 'rp-1' })
    await updateReferralProgram('org-1', { reward_value: 50000 })
    expect(mockAuthFetch).toHaveBeenCalledWith(
      expect.stringContaining('/referrals/program'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('generateReferralLink sends POST', async () => {
    ok({ referral_url: 'https://x.com/ref/abc', code: 'abc' })
    const result = await generateReferralLink('org-1', 'p-1')
    expect(result.code).toBe('abc')
  })

  it('getReferralLeaderboard returns array', async () => {
    ok([{ patient_id: 'p-1', referral_count: 5 }])
    expect(await getReferralLeaderboard('org-1')).toHaveLength(1)
  })

  it('getReferralAnalytics returns defaults on error', async () => {
    fail()
    const result = await getReferralAnalytics('org-1')
    expect(result.total_referrals).toBe(0)
    expect(result.conversion_rate).toBe(0)
  })

  it('getReferralAnalytics returns data', async () => {
    ok({ total_referrals: 50, total_converted: 20, conversion_rate: 0.4, total_rewards_given: 10, top_channels: {} })
    const result = await getReferralAnalytics('org-1')
    expect(result.total_referrals).toBe(50)
  })
})

// ============================================================
// REVIEWS
// ============================================================
describe('Reviews API', () => {
  it('listReviews returns array', async () => {
    ok([{ id: 'r-1', rating: 5, author_name: 'Maria' }])
    expect(await listReviews('org-1')).toHaveLength(1)
  })

  it('listReviews with filters', async () => {
    ok([])
    await listReviews('org-1', { status: 'NEW', rating: 5 })
    expect(mockAuthFetch.mock.calls[0][0]).toContain('status=NEW')
    expect(mockAuthFetch.mock.calls[0][0]).toContain('rating=5')
  })

  it('listReviews returns empty on error', async () => {
    fail()
    expect(await listReviews('org-1')).toEqual([])
  })

  it('getReviewStats returns defaults on error', async () => {
    fail()
    const result = await getReviewStats('org-1')
    expect(result.total_reviews).toBe(0)
    expect(result.average_rating).toBe(0)
  })

  it('replyToReview sends POST', async () => {
    mockAuthFetch.mockResolvedValue({ ok: true })
    await replyToReview('org-1', 'r-1', 'Gracias!')
    expect(mockAuthFetch).toHaveBeenCalledWith(
      expect.stringContaining('/reviews/r-1/reply'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('generateReviewReply sends POST', async () => {
    ok({ reply: 'Thank you for your feedback!' })
    const result = await generateReviewReply('org-1', 'r-1')
    expect(result.reply).toContain('Thank you')
  })

  it('syncReviews sends POST', async () => {
    mockAuthFetch.mockResolvedValue({ ok: true })
    await syncReviews('org-1')
    expect(mockAuthFetch).toHaveBeenCalledWith(
      expect.stringContaining('/sync'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('getReputationDashboard returns object', async () => {
    ok({ health_score: 90 })
    expect(await getReputationDashboard('org-1')).toHaveProperty('health_score')
  })

  it('getNPS returns defaults on error', async () => {
    fail()
    const result = await getNPS('org-1')
    expect(result.score).toBe(0)
  })

  it('getNPS with days param', async () => {
    ok({ score: 72, promoters: 40, detractors: 5, passives: 10 })
    const result = await getNPS('org-1', 30)
    expect(result.score).toBe(72)
    expect(mockAuthFetch.mock.calls[0][0]).toContain('?days=30')
  })

  it('requestReview sends POST', async () => {
    mockAuthFetch.mockResolvedValue({ ok: true })
    await requestReview('org-1', 'p-1')
    expect(mockAuthFetch.mock.calls[0][0]).toContain('/request-review/p-1')
  })
})

// ============================================================
// MARKETPLACE
// ============================================================
describe('Marketplace API', () => {
  // Connectors
  it('browseConnectors returns array', async () => {
    ok([{ slug: 'google-calendar', name: 'Google Calendar' }])
    expect(await browseConnectors()).toHaveLength(1)
  })

  it('browseConnectors with filters', async () => {
    ok([])
    await browseConnectors({ category: 'CRM', search: 'sales' })
    expect(mockAuthFetch.mock.calls[0][0]).toContain('category=CRM')
    expect(mockAuthFetch.mock.calls[0][0]).toContain('search=sales')
  })

  it('browseConnectors returns empty on error', async () => {
    fail()
    expect(await browseConnectors()).toEqual([])
  })

  it('getConnectorDetail returns connector', async () => {
    ok({ slug: 'gc', name: 'Google Calendar' })
    const result = await getConnectorDetail('gc')
    expect(result?.name).toBe('Google Calendar')
  })

  it('getConnectorDetail returns null on error', async () => {
    fail()
    expect(await getConnectorDetail('gc')).toBeNull()
  })

  it('getCategories returns array', async () => {
    ok(['CRM', 'Marketing', 'Analytics'])
    expect(await getCategories()).toHaveLength(3)
  })

  it('installConnector sends POST', async () => {
    ok({ id: 'i-1', status: 'ACTIVE' })
    const result = await installConnector('org-1', 'gc', { api_key: 'xxx' })
    expect(result.status).toBe('ACTIVE')
    expect(mockAuthFetch).toHaveBeenCalledWith(
      expect.stringContaining('/org-1/install'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('uninstallConnector sends DELETE', async () => {
    mockAuthFetch.mockResolvedValue({ ok: true })
    await uninstallConnector('org-1', 'i-1')
    expect(mockAuthFetch).toHaveBeenCalledWith(
      expect.stringContaining('/uninstall/i-1'),
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  it('listInstalled returns array', async () => {
    ok([{ id: 'i-1', connector_name: 'GC' }])
    expect(await listInstalled('org-1')).toHaveLength(1)
  })

  it('getConnectorReviews returns array', async () => {
    ok([{ id: 'cr-1', rating: 4 }])
    expect(await getConnectorReviews('gc')).toHaveLength(1)
  })

  // Plugins
  it('listPlugins returns array', async () => {
    ok([{ id: 'pl-1', name: 'Custom Logger' }])
    expect(await listPlugins('org-1')).toHaveLength(1)
  })

  it('listPlugins with hook filter', async () => {
    ok([])
    await listPlugins('org-1', 'BEFORE_RESPONSE')
    expect(mockAuthFetch.mock.calls[0][0]).toContain('?hook_point=BEFORE_RESPONSE')
  })

  it('createPlugin sends POST', async () => {
    ok({ id: 'pl-new' })
    await createPlugin('org-1', { name: 'Test', hook_point: 'AFTER_RESPONSE', webhook_url: 'https://x.com' })
    expect(mockAuthFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/plugins/org-1'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('updatePlugin sends PATCH', async () => {
    ok({ id: 'pl-1' })
    await updatePlugin('org-1', 'pl-1', { is_active: false })
    expect(mockAuthFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/plugins/org-1/pl-1'),
      expect.objectContaining({ method: 'PATCH' })
    )
  })

  it('deletePlugin sends DELETE', async () => {
    mockAuthFetch.mockResolvedValue({ ok: true })
    await deletePlugin('org-1', 'pl-1')
    expect(mockAuthFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/plugins/org-1/pl-1'),
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  it('testPlugin sends POST', async () => {
    ok({ success: true, response_time_ms: 120 })
    const result = await testPlugin('org-1', 'pl-1')
    expect(result.success).toBe(true)
  })
})

// ============================================================
// API KEYS
// ============================================================
describe('API Keys API', () => {
  it('listApiKeys returns array', async () => {
    ok([{ id: 'k-1', name: 'Main Key', key_prefix: 'sk_live_...' }])
    expect(await listApiKeys('org-1')).toHaveLength(1)
  })

  it('listApiKeys returns empty on error', async () => {
    fail()
    expect(await listApiKeys('org-1')).toEqual([])
  })

  it('createApiKey sends POST with correct body', async () => {
    ok({ key: { id: 'k-new' }, raw_key: 'sk_live_abc123' })
    const result = await createApiKey('org-1', { name: 'Test', scopes: ['read:patients'] })
    expect(result.raw_key).toBe('sk_live_abc123')
    expect(mockAuthFetch).toHaveBeenCalledWith(
      expect.stringContaining('/admin/api-keys'),
      expect.objectContaining({ method: 'POST' })
    )
    const body = JSON.parse(mockAuthFetch.mock.calls[0][1].body)
    expect(body.org_id).toBe('org-1')
    expect(body.scopes).toEqual(['read:patients'])
  })

  it('revokeApiKey sends DELETE', async () => {
    mockAuthFetch.mockResolvedValue({ ok: true })
    await revokeApiKey('org-1', 'k-1')
    expect(mockAuthFetch).toHaveBeenCalledWith(
      expect.stringContaining('/admin/api-keys/org-1/k-1'),
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  it('revokeApiKey throws on error', async () => {
    fail()
    await expect(revokeApiKey('org-1', 'k-1')).rejects.toThrow()
  })
})

// ============================================================
// REVENUE
// ============================================================
describe('Revenue API', () => {
  it('getRevenueDashboard returns data', async () => {
    ok({ mrr: 5000, arr: 60000, churn_rate: 0.02 })
    const result = await getRevenueDashboard()
    expect(result.mrr).toBe(5000)
  })

  it('getRevenueDashboard with days param', async () => {
    ok({ mrr: 5000 })
    await getRevenueDashboard(30)
    expect(mockAuthFetch.mock.calls[0][0]).toContain('?days=30')
  })

  it('getRevenueDashboard throws on error', async () => {
    fail()
    await expect(getRevenueDashboard()).rejects.toThrow()
  })

  it('getMRR returns data', async () => {
    ok({ mrr: 3000, arr: 36000, growth_rate: 0.15 })
    const result = await getMRR()
    expect(result.mrr).toBe(3000)
  })

  it('getMRR returns defaults on error', async () => {
    fail()
    const result = await getMRR()
    expect(result.mrr).toBe(0)
    expect(result.arr).toBe(0)
  })

  it('getChurn returns data', async () => {
    ok({ churn_rate: 0.03, at_risk: [{ org_id: 'o-1' }] })
    const result = await getChurn(30)
    expect(result.churn_rate).toBe(0.03)
  })

  it('getChurn returns defaults on error', async () => {
    fail()
    const result = await getChurn()
    expect(result.churn_rate).toBe(0)
    expect(result.at_risk).toEqual([])
  })

  it('getCohorts returns array', async () => {
    ok([{ cohort: '2026-01', initial_count: 10, months: {} }])
    expect(await getCohorts()).toHaveLength(1)
  })

  it('getCohorts returns empty on error', async () => {
    fail()
    expect(await getCohorts()).toEqual([])
  })

  it('getRevenueFunnel returns object', async () => {
    ok({ total: 1000 })
    expect(await getRevenueFunnel(30)).toHaveProperty('total')
  })

  it('getRevenueFunnel returns empty on error', async () => {
    fail()
    expect(await getRevenueFunnel()).toEqual({})
  })

  it('getRevenueForecast returns object', async () => {
    ok({ next_month: 5500 })
    expect(await getRevenueForecast(6)).toHaveProperty('next_month')
  })

  it('getRevenueForecast returns empty on error', async () => {
    fail()
    expect(await getRevenueForecast()).toEqual({})
  })
})
