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
  usePathname: () => '/admin/latency',
}))

jest.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  Tooltip: () => null,
}))

const mockFetchLatencyMetrics = jest.fn()
jest.mock('@/lib/admin-api', () => ({
  fetchLatencyMetrics: (...a: any[]) => mockFetchLatencyMetrics(...a),
}))

import AdminLatencyPage from '@/app/admin/latency/page'

const ROWS = [
  { endpoint: '/api/patients', method: 'GET', p50_ms: 50, p95_ms: 150, p99_ms: 250, avg_ms: 80, request_count: 1000, history: [50, 60, 55, 70] },
  { endpoint: '/api/appointments', method: 'POST', p50_ms: 200, p95_ms: 450, p99_ms: 600, avg_ms: 280, request_count: 500, history: [200, 300, 250] },
  { endpoint: '/api/ai/brain', method: 'POST', p50_ms: 400, p95_ms: 800, p99_ms: 1200, avg_ms: 550, request_count: 200, history: null },
]

beforeEach(() => {
  jest.clearAllMocks()
  mockFetchLatencyMetrics.mockResolvedValue(ROWS)
})

describe('AdminLatencyPage', () => {
  it('renders header', async () => {
    render(<AdminLatencyPage />)
    await waitFor(() => expect(screen.getByText('Latency Metrics')).toBeInTheDocument())
    expect(screen.getByText(/P50 \/ P95 \/ P99/)).toBeInTheDocument()
  })

  it('shows loading then data', async () => {
    render(<AdminLatencyPage />)
    await waitFor(() => expect(screen.getByText('/api/ai/brain')).toBeInTheDocument())
    expect(screen.getByText('/api/patients')).toBeInTheDocument()
    expect(screen.getByText('/api/appointments')).toBeInTheDocument()
  })

  it('shows empty state when no data', async () => {
    mockFetchLatencyMetrics.mockResolvedValue([])
    render(<AdminLatencyPage />)
    await waitFor(() => expect(screen.getByText('Sin datos de latencia disponibles')).toBeInTheDocument())
  })

  it('displays summary cards', async () => {
    render(<AdminLatencyPage />)
    await waitFor(() => expect(screen.getByText('Peor P95')).toBeInTheDocument())
    expect(screen.getByText('Endpoints lentos')).toBeInTheDocument()
    expect(screen.getByText('En alerta')).toBeInTheDocument()
    expect(screen.getByText('Total requests')).toBeInTheDocument()
  })

  it('shows worst P95 value', async () => {
    render(<AdminLatencyPage />)
    await waitFor(() => expect(screen.getAllByText('800ms').length).toBeGreaterThanOrEqual(1))
  })

  it('counts slow endpoints (>500ms)', async () => {
    render(<AdminLatencyPage />)
    // 1 slow endpoint (ai/brain with p95=800ms)
    await waitFor(() => {
      const slowCard = screen.getByText('Endpoints lentos').parentElement
      expect(slowCard?.textContent).toContain('1')
    })
  })

  it('counts warning endpoints (200-500ms)', async () => {
    render(<AdminLatencyPage />)
    await waitFor(() => {
      const warnCard = screen.getByText('En alerta').parentElement
      expect(warnCard?.textContent).toContain('1')
    })
  })

  it('displays total request count', async () => {
    render(<AdminLatencyPage />)
    await waitFor(() => {
      const totalCard = screen.getByText('Total requests').parentElement
      expect(totalCard?.textContent).toContain('1.7k')
    })
  })

  it('shows HTTP method badges', async () => {
    render(<AdminLatencyPage />)
    await waitFor(() => expect(screen.getByText('GET')).toBeInTheDocument())
    expect(screen.getAllByText('POST').length).toBeGreaterThanOrEqual(1)
  })

  it('shows legend', async () => {
    render(<AdminLatencyPage />)
    await waitFor(() => expect(screen.getByText(/< 200ms/)).toBeInTheDocument())
    expect(screen.getByText(/200-499ms/)).toBeInTheDocument()
    expect(screen.getByText(/500ms\+/)).toBeInTheDocument()
  })

  it('shows endpoint count in table header', async () => {
    render(<AdminLatencyPage />)
    await waitFor(() => expect(screen.getByText(/Endpoints \(3\)/)).toBeInTheDocument())
  })

  it('shows critical count badge when slow endpoints exist', async () => {
    render(<AdminLatencyPage />)
    await waitFor(() => expect(screen.getByText(/1 critico/)).toBeInTheDocument())
  })

  it('toggles auto-refresh', async () => {
    render(<AdminLatencyPage />)
    await waitFor(() => screen.getByText('Auto-refresh ON'))
    fireEvent.click(screen.getByText('Auto-refresh ON'))
    expect(screen.getByText('Auto-refresh OFF')).toBeInTheDocument()
  })

  it('refreshes on button click', async () => {
    render(<AdminLatencyPage />)
    await waitFor(() => expect(mockFetchLatencyMetrics).toHaveBeenCalledTimes(1))
    const refreshIcons = screen.getAllByTestId('icon-RefreshCw')
    fireEvent.click(refreshIcons[refreshIcons.length - 1].closest('button')!)
    await waitFor(() => expect(mockFetchLatencyMetrics).toHaveBeenCalledTimes(2))
  })

  it('handles API error', async () => {
    const { captureException } = require('@sentry/nextjs')
    mockFetchLatencyMetrics.mockRejectedValue(new Error('fail'))
    render(<AdminLatencyPage />)
    await waitFor(() => expect(captureException).toHaveBeenCalled())
  })

  it('renders sparkline for endpoints with history', async () => {
    render(<AdminLatencyPage />)
    await waitFor(() => expect(screen.getAllByTestId('responsive-container').length).toBeGreaterThanOrEqual(1))
  })

  it('formats P95 values with ms/s suffix', async () => {
    render(<AdminLatencyPage />)
    await waitFor(() => expect(screen.getByText('150ms')).toBeInTheDocument())
    expect(screen.getByText('450ms')).toBeInTheDocument()
    // P99 of ai/brain = 1200ms = 1.2s
    expect(screen.getByText('1.2s')).toBeInTheDocument()
  })

  it('shows request counts per endpoint', async () => {
    render(<AdminLatencyPage />)
    await waitFor(() => expect(screen.getByText('1,000')).toBeInTheDocument())
    expect(screen.getByText('500')).toBeInTheDocument()
    expect(screen.getByText('200')).toBeInTheDocument()
  })
})
