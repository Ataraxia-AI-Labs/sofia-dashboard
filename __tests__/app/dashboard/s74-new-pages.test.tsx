// __tests__/app/dashboard/s74-new-pages.test.tsx
// ---------------------------------------------------------------------------
// Tests for ALL 8 new S74 dashboard pages:
// auditoria, webhooks, automatizaciones, crecimiento, contenido,
// referidos, resenas, marketplace
// Also tests enhanced pages: equipo (with coaching panel), conversaciones (with conv intel)
// ---------------------------------------------------------------------------

import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---- Common Mocks ----

jest.mock('@/lib/org-context')
jest.mock('@/components/ui/toast', () => ({
  useToast: () => ({ success: jest.fn(), error: jest.fn() }),
}))

jest.mock('@/components/ui', () => ({
  Button: ({ children, onClick, disabled, loading, icon, className, variant, size, ...rest }: any) => (
    <button onClick={onClick} disabled={disabled || loading} className={className} {...rest}>
      {icon}{children}
    </button>
  ),
  Badge: ({ children, variant }: any) => <span data-variant={variant}>{children}</span>,
  Modal: ({ open, onClose, title, children }: any) => {
    if (!open) return null
    return <div data-testid="modal" role="dialog"><div>{title}</div>{children}</div>
  },
  Input: ({ label, value, onChange, placeholder, type }: any) => (
    <div><label>{label}</label><input value={value} onChange={onChange} placeholder={placeholder} type={type} /></div>
  ),
  Select: ({ label, value, onChange, options }: any) => (
    <div><label>{label}</label><select value={value} onChange={onChange}>
      {options?.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select></div>
  ),
  Tabs: ({ tabs, activeTab, onChange }: any) => (
    <div data-testid="tabs">{tabs?.map((t: any) => (
      <button key={t.id} onClick={() => onChange(t.id)} data-active={t.id === activeTab}>{t.label}</button>
    ))}</div>
  ),
}))

const stableT = ((key: string, params?: Record<string, unknown>) => {
  if (params) return `${key}:${JSON.stringify(params)}`
  return key
}) as any
stableT.has = () => true
jest.mock('next-intl', () => ({
  useTranslations: () => stableT,
}))
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn(), back: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/test',
}))
jest.mock('lucide-react', () => new Proxy({}, {
  get: (_, name) => {
    const C = (p: any) => <svg data-testid={`icon-${String(name)}`} {...p} />
    C.displayName = String(name)
    return C
  },
}))
jest.mock('@/lib/api/helpers', () => ({
  authFetch: jest.fn(),
  API_URL: 'https://test-api.example.com',
  timeAgo: (d: string) => d,
  formatCurrency: (n: number) => `$${n}`,
  formatNumber: (n: number) => String(n),
}))

// ---- API Mocks ----

jest.mock('@/lib/api/audit', () => ({
  fetchAuditLogs: jest.fn(),
}))
jest.mock('@/lib/api/webhooks', () => ({
  listWebhookEndpoints: jest.fn(),
  createWebhookEndpoint: jest.fn(),
  updateWebhookEndpoint: jest.fn(),
  deleteWebhookEndpoint: jest.fn(),
  testWebhookEndpoint: jest.fn(),
  listWebhookDeliveries: jest.fn(),
  retryWebhookDelivery: jest.fn(),
  getWebhookEventCatalog: jest.fn(),
}))
jest.mock('@/lib/api/workflows', () => ({
  listWorkflows: jest.fn(),
  getWorkflow: jest.fn(),
  createWorkflow: jest.fn(),
  updateWorkflow: jest.fn(),
  activateWorkflow: jest.fn(),
  pauseWorkflow: jest.fn(),
  archiveWorkflow: jest.fn(),
  listTemplates: jest.fn(),
  createFromTemplate: jest.fn(),
  enrollPatients: jest.fn(),
  listEnrollments: jest.fn(),
  getWorkflowAnalytics: jest.fn(),
  getWorkflowComparison: jest.fn(),
}))
jest.mock('@/lib/api/growth', () => ({
  getAttribution: jest.fn(),
  getGrowthDashboard: jest.fn(),
  listAdCampaigns: jest.fn(),
  getSEOHealth: jest.fn(),
  getChannelROI: jest.fn(),
  getPatientJourney: jest.fn(),
  getAdCampaignROI: jest.fn(),
  generateAdContent: jest.fn(),
  generateKeywords: jest.fn(),
}))
jest.mock('@/lib/api/content', () => ({
  listContent: jest.fn(),
  createContent: jest.fn(),
  updateContent: jest.fn(),
  getContentAnalytics: jest.fn(),
  suggestTopics: jest.fn(),
  getContentCalendar: jest.fn(),
}))
jest.mock('@/lib/api/referrals', () => ({
  getReferralProgram: jest.fn(),
  updateReferralProgram: jest.fn(),
  generateReferralLink: jest.fn(),
  getReferralLeaderboard: jest.fn(),
  getReferralAnalytics: jest.fn(),
}))
jest.mock('@/lib/api/reviews', () => ({
  listReviews: jest.fn(),
  getReviewStats: jest.fn(),
  replyToReview: jest.fn(),
  generateReviewReply: jest.fn(),
  syncReviews: jest.fn(),
  getReputationDashboard: jest.fn(),
  getNPS: jest.fn(),
  requestReview: jest.fn(),
}))
jest.mock('@/lib/api/marketplace', () => ({
  browseConnectors: jest.fn(),
  getConnectorDetail: jest.fn(),
  getCategories: jest.fn(),
  installConnector: jest.fn(),
  uninstallConnector: jest.fn(),
  listInstalled: jest.fn(),
  getConnectorReviews: jest.fn(),
  listPlugins: jest.fn(),
  createPlugin: jest.fn(),
  updatePlugin: jest.fn(),
  deletePlugin: jest.fn(),
  testPlugin: jest.fn(),
}))
jest.mock('@/lib/api/conv-intel', () => ({
  getPatientMemories: jest.fn(),
  getPatientPersonality: jest.fn(),
  getPatientEmotions: jest.fn(),
  getPatientSummary: jest.fn(),
  getEmotionTrajectory: jest.fn(),
  getCoachingTips: jest.fn(),
  getStaffMetrics: jest.fn(),
  getCoachingDashboard: jest.fn(),
  markTipRead: jest.fn(),
}))

import { useOrg } from '@/lib/org-context'
const mockUseOrg = useOrg as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  mockUseOrg.mockReturnValue({ orgId: 'org-1', branchId: null, orgName: 'Test Clinic', plan: 'PRO', role: 'OWNER' })
})

// ============================================================
// AUDITORIA PAGE
// ============================================================
describe('AuditoriaPage', () => {
  const { fetchAuditLogs } = require('@/lib/api/audit')

  it('renders loading state then audit logs', async () => {
    fetchAuditLogs.mockResolvedValue({
      data: [
        { id: 'a1', action: 'LOGIN', user_email: 'ana@test.com', resource_type: 'session', created_at: '2026-03-25T10:00:00Z', details: {}, ip_address: '1.2.3.4' },
      ],
      total: 1, limit: 50, offset: 0,
    })
    const AuditoriaPage = require('@/app/dashboard/auditoria/page').default
    render(<AuditoriaPage />)
    await waitFor(() => {
      expect(screen.getByText('ana@test.com')).toBeInTheDocument()
    })
  })

  it('renders empty state when no logs', async () => {
    fetchAuditLogs.mockResolvedValue({ data: [], total: 0, limit: 50, offset: 0 })
    const AuditoriaPage = require('@/app/dashboard/auditoria/page').default
    render(<AuditoriaPage />)
    await waitFor(() => {
      expect(fetchAuditLogs).toHaveBeenCalledWith('org-1', expect.any(Object))
    })
  })

  it('calls fetchAuditLogs with orgId', async () => {
    fetchAuditLogs.mockResolvedValue({ data: [], total: 0, limit: 50, offset: 0 })
    const AuditoriaPage = require('@/app/dashboard/auditoria/page').default
    render(<AuditoriaPage />)
    await waitFor(() => {
      expect(fetchAuditLogs).toHaveBeenCalled()
    })
  })
})

// ============================================================
// WEBHOOKS PAGE
// ============================================================
describe('WebhooksPage', () => {
  const { listWebhookEndpoints, listWebhookDeliveries, getWebhookEventCatalog } = require('@/lib/api/webhooks')

  it('renders endpoints list', async () => {
    listWebhookEndpoints.mockResolvedValue([
      { id: 'ep-1', name: 'My Webhook', url: 'https://x.com/hook', is_active: true, event_types: ['payment.created'], signing_secret: 'whsec_xxx', created_at: '2026-01-01', updated_at: '2026-01-01', custom_headers: {}, ip_allowlist: [], batch_mode: false, batch_interval_seconds: 0 },
    ])
    listWebhookDeliveries.mockResolvedValue([])
    getWebhookEventCatalog.mockResolvedValue(['payment.created'])

    const WebhooksPage = require('@/app/dashboard/webhooks/page').default
    render(<WebhooksPage />)
    await waitFor(() => {
      expect(screen.getByText('My Webhook')).toBeInTheDocument()
    })
  })

  it('renders empty state', async () => {
    listWebhookEndpoints.mockResolvedValue([])
    listWebhookDeliveries.mockResolvedValue([])
    getWebhookEventCatalog.mockResolvedValue([])

    const WebhooksPage = require('@/app/dashboard/webhooks/page').default
    render(<WebhooksPage />)
    await waitFor(() => {
      expect(listWebhookEndpoints).toHaveBeenCalledWith('org-1')
    })
  })
})

// ============================================================
// AUTOMATIZACIONES PAGE
// ============================================================
describe('AutomatizacionesPage', () => {
  const { listWorkflows, listTemplates } = require('@/lib/api/workflows')

  it('renders workflows list', async () => {
    listWorkflows.mockResolvedValue([
      { id: 'w-1', name: 'Welcome Flow', status: 'ACTIVE', trigger_type: 'APPOINTMENT', steps: [], created_at: '2026-01-01', updated_at: '2026-01-01' },
    ])
    listTemplates.mockResolvedValue([])

    const AutomatizacionesPage = require('@/app/dashboard/automatizaciones/page').default
    render(<AutomatizacionesPage />)
    await waitFor(() => {
      expect(screen.getByText('Welcome Flow')).toBeInTheDocument()
    })
  })

  it('renders empty state', async () => {
    listWorkflows.mockResolvedValue([])
    listTemplates.mockResolvedValue([])

    const AutomatizacionesPage = require('@/app/dashboard/automatizaciones/page').default
    render(<AutomatizacionesPage />)
    await waitFor(() => {
      expect(listWorkflows).toHaveBeenCalledWith('org-1')
    })
  })
})

// ============================================================
// CRECIMIENTO PAGE
// ============================================================
describe('CrecimientoPage', () => {
  const { getGrowthDashboard, getAttribution, listAdCampaigns, getSEOHealth } = require('@/lib/api/growth')

  it('renders growth metrics', async () => {
    getGrowthDashboard.mockResolvedValue({
      funnel: { visitors: 1000, leads: 200, appointments: 50, completed: 40, revenue: 5000000 },
      anomalies: [], trends: {}, kpis: {},
    })
    getAttribution.mockResolvedValue({ model_type: 'first_touch', channels: {}, total_conversions: 10, total_revenue: 1000 })
    listAdCampaigns.mockResolvedValue([])
    getSEOHealth.mockResolvedValue({})

    const CrecimientoPage = require('@/app/dashboard/crecimiento/page').default
    render(<CrecimientoPage />)
    await waitFor(() => {
      expect(getGrowthDashboard).toHaveBeenCalledWith('org-1', 30)
    })
  })
})

// ============================================================
// CONTENIDO PAGE
// ============================================================
describe('ContenidoPage', () => {
  const { listContent, suggestTopics } = require('@/lib/api/content')

  it('renders content list', async () => {
    listContent.mockResolvedValue([
      { id: 'c-1', platform: 'INSTAGRAM', title: 'Summer Tips', body: 'Best tips', status: 'PUBLISHED', content_type: 'POST', created_at: '2026-01-01' },
    ])
    suggestTopics.mockResolvedValue([])

    const ContenidoPage = require('@/app/dashboard/contenido/page').default
    render(<ContenidoPage />)
    await waitFor(() => {
      expect(screen.getByText('Summer Tips')).toBeInTheDocument()
    })
  })

  it('renders empty state', async () => {
    listContent.mockResolvedValue([])
    suggestTopics.mockResolvedValue([])

    const ContenidoPage = require('@/app/dashboard/contenido/page').default
    render(<ContenidoPage />)
    await waitFor(() => {
      expect(listContent).toHaveBeenCalledWith('org-1')
    })
  })
})

// ============================================================
// REFERIDOS PAGE
// ============================================================
describe('ReferidosPage', () => {
  const { getReferralProgram, getReferralLeaderboard, getReferralAnalytics } = require('@/lib/api/referrals')

  it('renders referral program data', async () => {
    getReferralProgram.mockResolvedValue({
      id: 'rp-1', is_active: true, reward_type: 'DISCOUNT', reward_value: 50000,
      reward_description: '50K off', min_referrals_for_reward: 3, created_at: '2026-01-01',
    })
    getReferralLeaderboard.mockResolvedValue([
      { patient_id: 'p-1', patient_name: 'Maria Garcia', referral_count: 5, converted_count: 3, reward_earned: 150000 },
    ])
    getReferralAnalytics.mockResolvedValue({
      total_referrals: 20, total_converted: 10, conversion_rate: 0.5, total_rewards_given: 5, top_channels: {},
    })

    const ReferidosPage = require('@/app/dashboard/referidos/page').default
    render(<ReferidosPage />)
    await waitFor(() => {
      expect(getReferralProgram).toHaveBeenCalledWith('org-1')
      expect(getReferralLeaderboard).toHaveBeenCalledWith('org-1')
    })
  })

  it('renders without program', async () => {
    getReferralProgram.mockResolvedValue(null)
    getReferralLeaderboard.mockResolvedValue([])
    getReferralAnalytics.mockResolvedValue({ total_referrals: 0, total_converted: 0, conversion_rate: 0, total_rewards_given: 0, top_channels: {} })

    const ReferidosPage = require('@/app/dashboard/referidos/page').default
    render(<ReferidosPage />)
    await waitFor(() => {
      expect(getReferralProgram).toHaveBeenCalledWith('org-1')
    })
  })
})

// ============================================================
// RESENAS PAGE
// ============================================================
describe('ResenasPage', () => {
  const { listReviews, getReviewStats, getNPS } = require('@/lib/api/reviews')

  it('renders reviews with ratings', async () => {
    listReviews.mockResolvedValue([
      { id: 'r-1', author_name: 'Carlos', rating: 5, text: 'Excelente!', status: 'NEW', platform: 'GOOGLE', reply: null, created_at: '2026-03-01' },
    ])
    getReviewStats.mockResolvedValue({
      total_reviews: 1, average_rating: 5, rating_distribution: { '5': 1 }, nps_score: 80, response_rate: 0,
    })
    getNPS.mockResolvedValue({ score: 80, promoters: 8, detractors: 1, passives: 1 })

    const ResenasPage = require('@/app/dashboard/resenas/page').default
    render(<ResenasPage />)
    await waitFor(() => {
      expect(screen.getByText('Carlos')).toBeInTheDocument()
    })
  })

  it('renders empty reviews', async () => {
    listReviews.mockResolvedValue([])
    getReviewStats.mockResolvedValue({ total_reviews: 0, average_rating: 0, rating_distribution: {}, nps_score: null, response_rate: 0 })
    getNPS.mockResolvedValue({ score: 0, promoters: 0, detractors: 0, passives: 0 })

    const ResenasPage = require('@/app/dashboard/resenas/page').default
    render(<ResenasPage />)
    await waitFor(() => {
      expect(listReviews).toHaveBeenCalledWith('org-1', expect.objectContaining({ limit: 50 }))
    })
  })
})

// ============================================================
// MARKETPLACE PAGE
// ============================================================
describe('MarketplacePage', () => {
  const { browseConnectors, listInstalled, listPlugins, getCategories } = require('@/lib/api/marketplace')

  it('renders connectors grid', async () => {
    browseConnectors.mockResolvedValue([
      { slug: 'gc', name: 'Google Calendar', description: 'Sync appointments', category: 'CRM', avg_rating: 4.5, install_count: 100, is_official: true, features: [], pricing: 'FREE', author: 'Ataraxia', version: '1.0', icon_url: null },
    ])
    listInstalled.mockResolvedValue([])
    listPlugins.mockResolvedValue([])
    getCategories.mockResolvedValue(['CRM', 'Marketing'])

    const MarketplacePage = require('@/app/dashboard/marketplace/page').default
    render(<MarketplacePage />)
    await waitFor(() => {
      expect(screen.getByText('Google Calendar')).toBeInTheDocument()
    })
  })

  it('renders empty marketplace', async () => {
    browseConnectors.mockResolvedValue([])
    listInstalled.mockResolvedValue([])
    listPlugins.mockResolvedValue([])
    getCategories.mockResolvedValue([])

    const MarketplacePage = require('@/app/dashboard/marketplace/page').default
    render(<MarketplacePage />)
    await waitFor(() => {
      expect(browseConnectors).toHaveBeenCalled()
    })
  })
})

// ============================================================
// COMPONENTS: ConvIntelligencePanel
// ============================================================
describe('ConvIntelligencePanel', () => {
  const { getPatientMemories, getPatientPersonality, getPatientEmotions, getPatientSummary } = require('@/lib/api/conv-intel')

  it('renders with summary data', async () => {
    getPatientMemories.mockResolvedValue([])
    getPatientPersonality.mockResolvedValue({ openness: 0.7, conscientiousness: 0.6, extraversion: 0.5, agreeableness: 0.8, neuroticism: 0.3, warmth: 0.9, dominant_traits: [], communication_style: 'empathetic' })
    getPatientEmotions.mockResolvedValue({ joy: 0.6, trust: 0.7, fear: 0.1, surprise: 0.2, sadness: 0.1, disgust: 0.05, anger: 0.05, anticipation: 0.3, dominant_emotion: 'trust', emotional_stability: 0.85 })
    getPatientSummary.mockResolvedValue({ summary: 'Patient with regular visits', brief: 'Good' })

    const { ConvIntelligencePanel } = require('@/components/conv-intelligence-panel')
    render(<ConvIntelligencePanel orgId="org-1" patientId="p-1" patientName="Maria" />)
    await waitFor(() => {
      expect(screen.getByText('Patient with regular visits')).toBeInTheDocument()
    })
  })

  it('renders loading state', () => {
    getPatientMemories.mockReturnValue(new Promise(() => {}))
    getPatientPersonality.mockReturnValue(new Promise(() => {}))
    getPatientEmotions.mockReturnValue(new Promise(() => {}))
    getPatientSummary.mockReturnValue(new Promise(() => {}))

    const { ConvIntelligencePanel } = require('@/components/conv-intelligence-panel')
    render(<ConvIntelligencePanel orgId="org-1" patientId="p-1" />)
    expect(screen.getByText('...')).toBeInTheDocument()
  })

  it('renders empty state for each section', async () => {
    getPatientMemories.mockResolvedValue([])
    getPatientPersonality.mockResolvedValue(null)
    getPatientEmotions.mockResolvedValue(null)
    getPatientSummary.mockResolvedValue(null)

    const { ConvIntelligencePanel } = require('@/components/conv-intelligence-panel')
    render(<ConvIntelligencePanel orgId="org-1" patientId="p-1" />)
    await waitFor(() => {
      expect(getPatientSummary).toHaveBeenCalledWith('org-1', 'p-1')
    })
  })
})

// ============================================================
// COMPONENTS: StaffCoachingPanel
// ============================================================
describe('StaffCoachingPanel', () => {
  const { getCoachingTips, getStaffMetrics, getCoachingDashboard, markTipRead } = require('@/lib/api/conv-intel')

  it('renders coaching tips', async () => {
    getCoachingTips.mockResolvedValue([
      { id: 't-1', tip: 'Respond within 2 minutes', priority: 'HIGH', category: 'RESPONSE_TIME', is_read: false, created_at: '2026-03-01' },
      { id: 't-2', tip: 'Use patient name', priority: 'MEDIUM', category: 'PERSONALIZATION', is_read: true, created_at: '2026-03-01' },
    ])
    getStaffMetrics.mockResolvedValue([
      { staff_id: 's-1', staff_name: 'Ana', conversations_handled: 50, avg_response_time: 45, satisfaction_score: 0.92, resolution_rate: 0.88 },
    ])
    getCoachingDashboard.mockResolvedValue({ total_tips: 2 })

    const { StaffCoachingPanel } = require('@/components/staff-coaching-panel')
    render(<StaffCoachingPanel orgId="org-1" />)
    await waitFor(() => {
      expect(screen.getByText('Respond within 2 minutes')).toBeInTheDocument()
      expect(screen.getByText('Use patient name')).toBeInTheDocument()
    })
  })

  it('renders staff metrics tab', async () => {
    getCoachingTips.mockResolvedValue([])
    getStaffMetrics.mockResolvedValue([
      { staff_id: 's-1', staff_name: 'Ana Garcia', conversations_handled: 100, avg_response_time: 30, satisfaction_score: 0.95, resolution_rate: 0.90 },
    ])
    getCoachingDashboard.mockResolvedValue({})

    const { StaffCoachingPanel } = require('@/components/staff-coaching-panel')
    render(<StaffCoachingPanel orgId="org-1" />)
    await waitFor(() => {
      expect(getStaffMetrics).toHaveBeenCalledWith('org-1')
    })
  })

  it('renders loading state', () => {
    getCoachingTips.mockReturnValue(new Promise(() => {}))
    getStaffMetrics.mockReturnValue(new Promise(() => {}))
    getCoachingDashboard.mockReturnValue(new Promise(() => {}))

    const { StaffCoachingPanel } = require('@/components/staff-coaching-panel')
    render(<StaffCoachingPanel orgId="org-1" />)
    expect(screen.getByText('...')).toBeInTheDocument()
  })

  it('renders empty tips state', async () => {
    getCoachingTips.mockResolvedValue([])
    getStaffMetrics.mockResolvedValue([])
    getCoachingDashboard.mockResolvedValue({})

    const { StaffCoachingPanel } = require('@/components/staff-coaching-panel')
    render(<StaffCoachingPanel orgId="org-1" />)
    await waitFor(() => {
      expect(getCoachingTips).toHaveBeenCalledWith('org-1')
    })
  })
})
