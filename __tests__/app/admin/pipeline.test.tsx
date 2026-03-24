import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

jest.mock('lucide-react', () => {
  return new Proxy({}, {
    get: (_, name) => {
      const C = (p: any) => <svg data-testid={`icon-${String(name)}`} {...p} />
      C.displayName = String(name)
      return C
    },
  })
})

jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn(), back: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/admin/pipeline',
}))

jest.mock('next/dynamic', () => (fn: any) => {
  const Component = (props: any) => <div data-testid="dynamic-chart" />
  Component.displayName = 'DynamicChart'
  return Component
})

const mockFetchPipelineMetrics = jest.fn()
jest.mock('@/lib/admin-api', () => ({
  fetchPipelineMetrics: (...a: any[]) => mockFetchPipelineMetrics(...a),
}))

import PipelinePage from '@/app/admin/pipeline/page'

const METRICS_WEEK1 = [
  {
    id: 'm1', repo: 'Ataraxia-AI-Labs/SofIA-backend-core', week_start: '2026-03-16',
    prs_created: 10, prs_merged: 8, prs_open: 2,
    ci_pass_rate: 95, avg_time_to_merge_hours: 1.5,
    coderabbit_approved: 7, coderabbit_changes_requested: 1,
    issues_created: 5, issues_closed: 4,
    sentry_errors: 0, health_check_failures: 0,
    lines_added: 2000, lines_removed: 500,
  },
  {
    id: 'm2', repo: 'Ataraxia-AI-Labs/sofia-dashboard', week_start: '2026-03-16',
    prs_created: 5, prs_merged: 4, prs_open: 1,
    ci_pass_rate: 88, avg_time_to_merge_hours: 2.0,
    coderabbit_approved: 3, coderabbit_changes_requested: 2,
    issues_created: 3, issues_closed: 2,
    sentry_errors: 2, health_check_failures: 1,
    lines_added: 1000, lines_removed: 200,
  },
]

const METRICS_WEEK0 = [
  {
    id: 'm3', repo: 'Ataraxia-AI-Labs/SofIA-backend-core', week_start: '2026-03-09',
    prs_created: 7, prs_merged: 6, prs_open: 1,
    ci_pass_rate: 90, avg_time_to_merge_hours: 2.0,
    coderabbit_approved: 5, coderabbit_changes_requested: 1,
    issues_created: 3, issues_closed: 3,
    sentry_errors: 1, health_check_failures: 0,
    lines_added: 1500, lines_removed: 300,
  },
]

function setupHappy() {
  mockFetchPipelineMetrics.mockResolvedValue([...METRICS_WEEK1, ...METRICS_WEEK0])
}

beforeEach(() => {
  jest.clearAllMocks()
  setupHappy()
})

describe('PipelinePage', () => {
  it('renders header', async () => {
    render(<PipelinePage />)
    await waitFor(() => expect(screen.getByText('Pipeline Command Center')).toBeInTheDocument())
    expect(screen.getByText(/Autonomous Engineering Pipeline/)).toBeInTheDocument()
  })

  it('shows autonomy score', async () => {
    render(<PipelinePage />)
    // Total: 10+5+7=22 created, 8+4+6=18 merged => 82%
    await waitFor(() => expect(screen.getByText('82')).toBeInTheDocument())
    expect(screen.getByText('Autonomy Score')).toBeInTheDocument()
  })

  it('shows KPI cards', async () => {
    render(<PipelinePage />)
    await waitFor(() => expect(screen.getAllByText('PRs Creados').length).toBeGreaterThanOrEqual(1))
    expect(screen.getAllByText('CI Pass Rate').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Avg Merge Time')).toBeInTheDocument()
    expect(screen.getByText('Sentry Errors')).toBeInTheDocument()
    expect(screen.getByText('Lines Changed')).toBeInTheDocument()
  })

  it('shows latest week aggregate values', async () => {
    render(<PipelinePage />)
    // PRs created this week: 10+5=15
    await waitFor(() => expect(screen.getAllByText('15').length).toBeGreaterThanOrEqual(1))
    // PRs merged: 8+4=12
    expect(screen.getAllByText('12').length).toBeGreaterThanOrEqual(1)
  })

  it('shows CI pass rate averaged', async () => {
    render(<PipelinePage />)
    // (95+88)/2 = 91.5%
    await waitFor(() => expect(screen.getByText('91.5%')).toBeInTheDocument())
  })

  it('shows Sentry errors for latest week', async () => {
    render(<PipelinePage />)
    // 0+2=2
    await waitFor(() => expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1))
  })

  it('shows lines added', async () => {
    render(<PipelinePage />)
    await waitFor(() => expect(screen.getByText('+3,000')).toBeInTheDocument())
  })

  it('shows per-repo breakdown table', async () => {
    render(<PipelinePage />)
    await waitFor(() => expect(screen.getByText('Detalle por Repositorio')).toBeInTheDocument())
    expect(screen.getByText('SofIA-backend-core')).toBeInTheDocument()
    expect(screen.getByText('sofia-dashboard')).toBeInTheDocument()
  })

  it('shows pipeline flow diagram', async () => {
    render(<PipelinePage />)
    await waitFor(() => expect(screen.getByText('Pipeline Autonomo — Flow')).toBeInTheDocument())
    expect(screen.getByText('Issue')).toBeInTheDocument()
    expect(screen.getByText('Auto-Assign')).toBeInTheDocument()
    expect(screen.getByText('CI/CD')).toBeInTheDocument()
    expect(screen.getByText('Deploy')).toBeInTheDocument()
  })

  it('shows empty state when no data', async () => {
    mockFetchPipelineMetrics.mockResolvedValue([])
    render(<PipelinePage />)
    await waitFor(() => expect(screen.getAllByText(/Sin datos de pipeline/).length).toBeGreaterThanOrEqual(1))
  })

  it('shows error state', async () => {
    mockFetchPipelineMetrics.mockRejectedValue(new Error('DB access denied'))
    render(<PipelinePage />)
    await waitFor(() => expect(screen.getByText('DB access denied')).toBeInTheDocument())
    expect(screen.getByText(/policy RLS/)).toBeInTheDocument()
  })

  it('toggles auto-refresh', async () => {
    render(<PipelinePage />)
    await waitFor(() => screen.getByText('Auto OFF'))
    fireEvent.click(screen.getByText('Auto OFF'))
    expect(screen.getByText('Auto ON')).toBeInTheDocument()
  })

  it('refreshes on button click', async () => {
    render(<PipelinePage />)
    await waitFor(() => expect(mockFetchPipelineMetrics).toHaveBeenCalledTimes(1))
    const refreshIcons = screen.getAllByTestId('icon-RefreshCw')
    fireEvent.click(refreshIcons[refreshIcons.length - 1].closest('button')!)
    await waitFor(() => expect(mockFetchPipelineMetrics).toHaveBeenCalledTimes(2))
  })

  it('renders dynamic charts', async () => {
    render(<PipelinePage />)
    await waitFor(() => {
      const charts = screen.getAllByTestId('dynamic-chart')
      expect(charts.length).toBeGreaterThanOrEqual(5)
    })
  })

  it('shows trend arrows when previous week data exists', async () => {
    render(<PipelinePage />)
    // Current week PRs: 15, prev week: 7, diff = +8
    await waitFor(() => {
      const upArrows = screen.getAllByTestId('icon-ArrowUpRight')
      expect(upArrows.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('shows week date and repo count', async () => {
    render(<PipelinePage />)
    await waitFor(() => expect(screen.getAllByText(/2026-03-16/).length).toBeGreaterThanOrEqual(1))
    expect(screen.getByText(/2 repositorios/)).toBeInTheDocument()
  })

  it('shows avg merge time', async () => {
    render(<PipelinePage />)
    // (1.5+2.0)/2 = 1.8h
    await waitFor(() => expect(screen.getByText('1.8h')).toBeInTheDocument())
  })

  it('shows chart section titles', async () => {
    render(<PipelinePage />)
    await waitFor(() => expect(screen.getByText('PR Throughput')).toBeInTheDocument())
    expect(screen.getAllByText('CI Pass Rate').length).toBeGreaterThanOrEqual(2) // KPI + chart
    expect(screen.getByText('CodeRabbit Reviews')).toBeInTheDocument()
    expect(screen.getByText('Issues & Errores')).toBeInTheDocument()
    expect(screen.getByText('Lines of Code')).toBeInTheDocument()
  })
})
