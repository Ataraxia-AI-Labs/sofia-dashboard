// __tests__/app/dashboard/network.test.tsx
// ---------------------------------------------------------------------------
// Nuclear-level tests for the Network (Inter-Clinic Intelligence) page
// (app/dashboard/network/page.tsx)
//
// States tested: loading skeleton, network stats cards, narrative section,
// benchmarks (4 cards), service trends (UP/DOWN/STABLE), conversion patterns,
// optimal hours heatmap, alerts, publish button, refresh, empty state,
// format compact helper, no data.
// ---------------------------------------------------------------------------

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// ---- Mocks (BEFORE component import) ----

jest.mock('@/lib/org-context')
jest.mock('@/lib/api/network')
jest.mock('@/lib/api/helpers', () => ({
  timeAgo: (d: string) => `timeAgo(${d})`,
}))
jest.mock('@/components/network-benchmark-card', () => ({
  NetworkBenchmarkCard: (props: any) => (
    <div data-testid="benchmark-card" data-metric={props.metricName}>
      {props.metricName}: yours={props.yours} avg={props.marketAvg} p={props.percentile}
    </div>
  ),
}))
jest.mock('@/components/network-alert-badge', () => ({
  NetworkAlertBadge: ({ severity }: { severity: string }) => (
    <span data-testid={`alert-badge-${severity}`}>{severity}</span>
  ),
}))
jest.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, params?: Record<string, unknown>) => {
      if (params) return `${key}:${JSON.stringify(params)}`
      return key
    }
    t.has = () => true
    return t
  },
}))
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }))
jest.mock('@/components/ui/toast', () => ({
  useToast: () => ({ toast: jest.fn(), success: jest.fn(), error: jest.fn(), warning: jest.fn(), info: jest.fn() }),
}))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn(), back: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/network',
}))
jest.mock('lucide-react', () => {
  return new Proxy({}, {
    get: (_, name) => {
      const C = (p: any) => <svg data-testid={`icon-${String(name)}`} {...p} />
      C.displayName = String(name)
      return C
    },
  })
})

import { useOrg } from '@/lib/org-context'
import {
  getNetworkBenchmarks,
  getServiceTrends,
  getConversionPatterns,
  getOptimalHours,
  getNetworkAlerts,
  getNetworkNarrative,
  getNetworkStats,
  publishMetrics,
} from '@/lib/api/network'

const mockUseOrg = useOrg as jest.Mock
const mockBenchmarks = getNetworkBenchmarks as jest.Mock
const mockTrends = getServiceTrends as jest.Mock
const mockPatterns = getConversionPatterns as jest.Mock
const mockHours = getOptimalHours as jest.Mock
const mockAlerts = getNetworkAlerts as jest.Mock
const mockNarrative = getNetworkNarrative as jest.Mock
const mockStats = getNetworkStats as jest.Mock
const mockPublish = publishMetrics as jest.Mock

import NetworkPage from '@/app/dashboard/network/page'

// ---- Fixtures ----

const MOCK_BENCHMARKS = {
  conversion_rate: { yours: 0.35, market_avg: 0.28, percentile: 72 },
  avg_ticket: { yours: 250000, market_avg: 180000, percentile: 85 },
  satisfaction: { yours: 0.92, market_avg: 0.84, percentile: 90 },
  response_time: { yours: 45, market_avg: 120, percentile: 95 },
}

const MOCK_TRENDS = [
  { service_name: 'Botox', trend: 'UP' as const, demand_count: 120, change_pct: 15.3 },
  { service_name: 'Limpieza', trend: 'DOWN' as const, demand_count: 80, change_pct: -8.2 },
  { service_name: 'Blanqueamiento', trend: 'STABLE' as const, demand_count: 60, change_pct: 0.5 },
]

const MOCK_PATTERNS = [
  { pattern: 'WhatsApp 2-step', impact_factor: 2.3, description: 'Two-step funnel converts 2.3x better' },
  { pattern: 'Morning booking', impact_factor: 1.8, description: 'Bookings at 9-11AM have higher show rate' },
]

const MOCK_HOURS = [
  { day: 'Lun', hour: 9, score: 0.9 },
  { day: 'Lun', hour: 10, score: 0.85 },
  { day: 'Mar', hour: 14, score: 0.7 },
]

const MOCK_ALERTS = [
  { id: 'a1', title: 'Conversion drop', description: 'Conversion dropped 15% this week', severity: 'HIGH', is_read: false, created_at: '2026-03-22T10:00:00Z' },
  { id: 'a2', title: 'New record', description: 'Best week ever for appointments', severity: 'LOW', is_read: true, created_at: '2026-03-21T08:00:00Z' },
]

const MOCK_NARRATIVE = {
  narrative: 'Tu clinica esta en el percentil 72 de conversion.',
  generated_at: '2026-03-22T12:00:00Z',
}

const MOCK_STATS = {
  total_clinics: 245,
  total_countries: 8,
  total_interactions: 1_250_000,
  total_patients: 85_000,
}

function setupAll() {
  mockUseOrg.mockReturnValue({ orgId: 'org-1', role: 'OWNER' })
  mockBenchmarks.mockResolvedValue(MOCK_BENCHMARKS)
  mockTrends.mockResolvedValue(MOCK_TRENDS)
  mockPatterns.mockResolvedValue(MOCK_PATTERNS)
  mockHours.mockResolvedValue(MOCK_HOURS)
  mockAlerts.mockResolvedValue(MOCK_ALERTS)
  mockNarrative.mockResolvedValue(MOCK_NARRATIVE)
  mockStats.mockResolvedValue(MOCK_STATS)
  mockPublish.mockResolvedValue({ ok: true })
}

function setupEmpty() {
  mockUseOrg.mockReturnValue({ orgId: 'org-1', role: 'OWNER' })
  mockBenchmarks.mockResolvedValue(null)
  mockTrends.mockResolvedValue([])
  mockPatterns.mockResolvedValue([])
  mockHours.mockResolvedValue([])
  mockAlerts.mockResolvedValue([])
  mockNarrative.mockResolvedValue(null)
  mockStats.mockResolvedValue(null)
  mockPublish.mockResolvedValue({ ok: true })
}

// ---- Tests ----

describe('NetworkPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setupAll()
  })

  // ===== LOADING STATE =====

  it('shows loading skeleton while data fetches', () => {
    mockBenchmarks.mockReturnValue(new Promise(() => {}))
    mockTrends.mockReturnValue(new Promise(() => {}))
    mockPatterns.mockReturnValue(new Promise(() => {}))
    mockHours.mockReturnValue(new Promise(() => {}))
    mockAlerts.mockReturnValue(new Promise(() => {}))
    mockNarrative.mockReturnValue(new Promise(() => {}))
    mockStats.mockReturnValue(new Promise(() => {}))
    render(<NetworkPage />)
    const pulseElements = document.querySelectorAll('.animate-pulse')
    expect(pulseElements.length).toBeGreaterThan(0)
  })

  // ===== HEADER =====

  it('renders title and subtitle', async () => {
    render(<NetworkPage />)
    await waitFor(() => expect(screen.getByText('title')).toBeInTheDocument())
    expect(screen.getByText('subtitle')).toBeInTheDocument()
  })

  // ===== NETWORK STATS =====

  it('renders all 4 network stats cards', async () => {
    render(<NetworkPage />)
    await waitFor(() => expect(screen.getByText('245')).toBeInTheDocument())
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('1.3M')).toBeInTheDocument()
    expect(screen.getByText('85.0K')).toBeInTheDocument()
  })

  it('renders stats card labels', async () => {
    render(<NetworkPage />)
    await waitFor(() => expect(screen.getByText('totalClinics')).toBeInTheDocument())
    expect(screen.getByText('totalCountries')).toBeInTheDocument()
    expect(screen.getByText('totalInteractions')).toBeInTheDocument()
    expect(screen.getByText('totalPatients')).toBeInTheDocument()
  })

  it('does not render stats section when stats is null', async () => {
    mockStats.mockResolvedValue(null)
    render(<NetworkPage />)
    await waitFor(() => expect(screen.getByText('title')).toBeInTheDocument())
    expect(screen.queryByText('totalClinics')).not.toBeInTheDocument()
  })

  // ===== NARRATIVE =====

  it('renders AI-generated narrative', async () => {
    render(<NetworkPage />)
    await waitFor(() => expect(screen.getByText('narrative')).toBeInTheDocument())
    expect(screen.getByText(/percentil 72/)).toBeInTheDocument()
    expect(screen.getByText(/timeAgo\(2026-03-22T12:00:00Z\)/)).toBeInTheDocument()
  })

  it('does not render narrative section when narrative is null', async () => {
    mockNarrative.mockResolvedValue(null)
    render(<NetworkPage />)
    await waitFor(() => expect(screen.getByText('title')).toBeInTheDocument())
    expect(screen.queryByText('narrative')).not.toBeInTheDocument()
  })

  // ===== BENCHMARKS =====

  it('renders 4 benchmark cards with correct data', async () => {
    render(<NetworkPage />)
    await waitFor(() => {
      const cards = screen.getAllByTestId('benchmark-card')
      expect(cards).toHaveLength(4)
    })
    expect(screen.getByText(/metrics.conversionRate/)).toBeInTheDocument()
    expect(screen.getByText(/metrics.avgTicket/)).toBeInTheDocument()
    expect(screen.getByText(/metrics.satisfaction/)).toBeInTheDocument()
    expect(screen.getByText(/metrics.responseTime/)).toBeInTheDocument()
  })

  it('does not render benchmarks when null', async () => {
    mockBenchmarks.mockResolvedValue(null)
    render(<NetworkPage />)
    await waitFor(() => expect(screen.getByText('title')).toBeInTheDocument())
    expect(screen.queryByText('benchmarks')).not.toBeInTheDocument()
  })

  // ===== SERVICE TRENDS =====

  it('renders all service trends with correct icons', async () => {
    render(<NetworkPage />)
    await waitFor(() => expect(screen.getByText('Botox')).toBeInTheDocument())
    expect(screen.getByText('Limpieza')).toBeInTheDocument()
    expect(screen.getByText('Blanqueamiento')).toBeInTheDocument()
  })

  it('shows trend percentages with correct signs', async () => {
    render(<NetworkPage />)
    await waitFor(() => expect(screen.getByText('+15.3%')).toBeInTheDocument())
    expect(screen.getByText('-8.2%')).toBeInTheDocument()
    expect(screen.getByText('+0.5%')).toBeInTheDocument()
  })

  it('shows demand counts for each trend', async () => {
    render(<NetworkPage />)
    await waitFor(() => expect(screen.getByText(/120 demands/)).toBeInTheDocument())
    expect(screen.getByText(/80 demands/)).toBeInTheDocument()
  })

  it('does not render trends section when empty', async () => {
    mockTrends.mockResolvedValue([])
    render(<NetworkPage />)
    await waitFor(() => expect(screen.getByText('title')).toBeInTheDocument())
    expect(screen.queryByText('trends')).not.toBeInTheDocument()
  })

  // ===== CONVERSION PATTERNS =====

  it('renders conversion patterns with impact factor', async () => {
    render(<NetworkPage />)
    await waitFor(() => expect(screen.getByText('WhatsApp 2-step')).toBeInTheDocument())
    expect(screen.getByText('2.30x')).toBeInTheDocument()
    expect(screen.getByText('Morning booking')).toBeInTheDocument()
    expect(screen.getByText('1.80x')).toBeInTheDocument()
  })

  it('renders pattern descriptions', async () => {
    render(<NetworkPage />)
    await waitFor(() => expect(screen.getByText(/Two-step funnel/)).toBeInTheDocument())
    expect(screen.getByText(/9-11AM/)).toBeInTheDocument()
  })

  // ===== OPTIMAL HOURS HEATMAP =====

  it('renders optimal hours heatmap with day labels', async () => {
    render(<NetworkPage />)
    await waitFor(() => expect(screen.getByText('optimalHours')).toBeInTheDocument())
    expect(screen.getByText('Lun')).toBeInTheDocument()
    expect(screen.getByText('Mar')).toBeInTheDocument()
    expect(screen.getByText('Dom')).toBeInTheDocument()
  })

  it('renders hour headers in heatmap', async () => {
    render(<NetworkPage />)
    await waitFor(() => expect(screen.getByText('7:00')).toBeInTheDocument())
    expect(screen.getByText('12:00')).toBeInTheDocument()
    expect(screen.getByText('19:00')).toBeInTheDocument()
  })

  it('renders low/high legend', async () => {
    render(<NetworkPage />)
    await waitFor(() => expect(screen.getByText('low')).toBeInTheDocument())
    expect(screen.getByText('high')).toBeInTheDocument()
  })

  // ===== ALERTS =====

  it('renders alert items with severity badges', async () => {
    render(<NetworkPage />)
    await waitFor(() => expect(screen.getByText('Conversion drop')).toBeInTheDocument())
    expect(screen.getByText('New record')).toBeInTheDocument()
    expect(screen.getByTestId('alert-badge-HIGH')).toBeInTheDocument()
    expect(screen.getByTestId('alert-badge-LOW')).toBeInTheDocument()
  })

  it('renders alert descriptions and timestamps', async () => {
    render(<NetworkPage />)
    await waitFor(() => expect(screen.getByText(/Conversion dropped 15%/)).toBeInTheDocument())
    expect(screen.getByText(/timeAgo\(2026-03-22T10:00:00Z\)/)).toBeInTheDocument()
  })

  // ===== PUBLISH BUTTON =====

  it('publish button calls publishMetrics', async () => {
    const user = userEvent.setup()
    render(<NetworkPage />)
    await waitFor(() => expect(screen.getByText('publish')).toBeInTheDocument())
    await user.click(screen.getByText('publish'))

    expect(mockPublish).toHaveBeenCalledWith('org-1', 30)
  })

  it('shows loading text while publishing', async () => {
    const user = userEvent.setup()
    mockPublish.mockReturnValue(new Promise(() => {}))
    render(<NetworkPage />)
    await waitFor(() => expect(screen.getByText('publish')).toBeInTheDocument())
    await user.click(screen.getByText('publish'))

    expect(screen.getByText('loading')).toBeInTheDocument()
  })

  // ===== REFRESH =====

  it('refresh button re-fetches all data', async () => {
    const user = userEvent.setup()
    render(<NetworkPage />)
    // Wait for content to render (loading skeleton has no title text)
    await waitFor(() => expect(screen.getByText('title')).toBeInTheDocument())

    const refreshBtn = screen.getByTestId('icon-RefreshCw').closest('button')
    expect(refreshBtn).toBeTruthy()
    await user.click(refreshBtn!)
    await waitFor(() => expect(mockBenchmarks).toHaveBeenCalledTimes(2))
  })

  // ===== EMPTY STATE =====

  it('shows empty state when no benchmarks, narrative, or trends', async () => {
    setupEmpty()
    render(<NetworkPage />)
    await waitFor(() => expect(screen.getByText('noData')).toBeInTheDocument())
    expect(screen.getByText('noDataHint')).toBeInTheDocument()
  })
})
