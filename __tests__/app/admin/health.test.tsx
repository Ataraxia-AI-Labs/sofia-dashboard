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
  usePathname: () => '/admin/health',
}))

const mockFetchSystemHealth = jest.fn()
jest.mock('@/lib/api/health', () => ({
  fetchSystemHealth: (...a: any[]) => mockFetchSystemHealth(...a),
}))

const mockFetchBotLogs = jest.fn()
const mockFetchBotErrorCount24h = jest.fn()
jest.mock('@/lib/admin-api', () => ({
  fetchBotLogs: (...a: any[]) => mockFetchBotLogs(...a),
  fetchBotErrorCount24h: (...a: any[]) => mockFetchBotErrorCount24h(...a),
}))

jest.mock('@/lib/api', () => ({
  timeAgo: () => 'hace 2min',
}))

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => Promise.resolve({ error: null }),
    }),
  },
}))

import AdminHealthPage from '@/app/admin/health/page'

function setupHealthy() {
  mockFetchSystemHealth.mockResolvedValue({
    status: 'HEALTHY',
    uptime_seconds: 7200,
    version: 'v3.2.1',
    circuit_breakers: {
      openai: { state: 'CLOSED', failure_count: 0 },
      supabase: { state: 'CLOSED', failure_count: 0 },
      meta: { state: 'HALF_OPEN', failure_count: 2 },
    },
  })
  mockFetchBotLogs.mockResolvedValue([
    { id: '1', bot_name: 'scheduler', status: 'SUCCESS', executed_at: '2026-03-20T10:00:00Z', error_message: null },
    { id: '2', bot_name: 'reminder', status: 'ERROR', executed_at: '2026-03-20T09:00:00Z', error_message: 'Timeout' },
  ])
  mockFetchBotErrorCount24h.mockResolvedValue(1)
}

beforeEach(() => {
  jest.clearAllMocks()
  setupHealthy()
})

describe('AdminHealthPage', () => {
  it('renders header', async () => {
    render(<AdminHealthPage />)
    await waitFor(() => expect(screen.getByText('System Health')).toBeInTheDocument())
    expect(screen.getByText(/Monitoreo en tiempo real/)).toBeInTheDocument()
  })

  it('shows overall DEGRADED status (errors > 0)', async () => {
    render(<AdminHealthPage />)
    await waitFor(() => expect(screen.getByText('Degradado')).toBeInTheDocument())
  })

  it('shows overall HEALTHY status when all clear', async () => {
    mockFetchBotErrorCount24h.mockResolvedValue(0)
    mockFetchSystemHealth.mockResolvedValue({
      status: 'HEALTHY',
      uptime_seconds: 7200,
      circuit_breakers: {},
    })
    render(<AdminHealthPage />)
    await waitFor(() => expect(screen.getByText('Todo operativo')).toBeInTheDocument())
  })

  it('shows CRITICAL when backend fails', async () => {
    mockFetchSystemHealth.mockRejectedValue(new Error('fail'))
    render(<AdminHealthPage />)
    await waitFor(() => expect(screen.getByText('Critico')).toBeInTheDocument())
  })

  it('shows error count', async () => {
    render(<AdminHealthPage />)
    await waitFor(() => expect(screen.getByText('1')).toBeInTheDocument())
    expect(screen.getByText('Errores 24h')).toBeInTheDocument()
  })

  it('shows uptime', async () => {
    render(<AdminHealthPage />)
    await waitFor(() => expect(screen.getByText(/Uptime: 2h 0m/)).toBeInTheDocument())
  })

  it('shows version', async () => {
    render(<AdminHealthPage />)
    await waitFor(() => expect(screen.getByText(/v3.2.1/)).toBeInTheDocument())
  })

  it('renders service cards for circuit breakers', async () => {
    render(<AdminHealthPage />)
    await waitFor(() => expect(screen.getByText('Openai')).toBeInTheDocument())
    expect(screen.getByText('Supabase')).toBeInTheDocument() // from CB
    expect(screen.getByText('Meta')).toBeInTheDocument()
  })

  it('shows circuit breaker states', async () => {
    render(<AdminHealthPage />)
    await waitFor(() => expect(screen.getAllByText('Operativo').length).toBeGreaterThanOrEqual(2))
    expect(screen.getByText(/Recuperando/)).toBeInTheDocument()
  })

  it('renders backend and supabase service cards', async () => {
    render(<AdminHealthPage />)
    await waitFor(() => expect(screen.getByText('Backend (Render)')).toBeInTheDocument())
    expect(screen.getByText('Supabase (DB)')).toBeInTheDocument()
  })

  it('shows bot execution table', async () => {
    render(<AdminHealthPage />)
    await waitFor(() => expect(screen.getByText('Ultima Ejecucion por Bot')).toBeInTheDocument())
    expect(screen.getAllByText('scheduler').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('reminder').length).toBeGreaterThanOrEqual(1)
  })

  it('shows empty bot table when no logs', async () => {
    mockFetchBotLogs.mockResolvedValue([])
    render(<AdminHealthPage />)
    await waitFor(() => expect(screen.getByText('Sin logs de bots')).toBeInTheDocument())
  })

  it('shows bot status badges', async () => {
    render(<AdminHealthPage />)
    await waitFor(() => expect(screen.getAllByText('SUCCESS').length).toBeGreaterThanOrEqual(1))
    expect(screen.getAllByText('ERROR').length).toBeGreaterThanOrEqual(1)
  })

  it('shows recent bot logs table', async () => {
    render(<AdminHealthPage />)
    await waitFor(() => expect(screen.getByText('Logs Recientes de Bots')).toBeInTheDocument())
    expect(screen.getByText('Timeout')).toBeInTheDocument()
  })

  it('toggles auto-refresh', async () => {
    render(<AdminHealthPage />)
    await waitFor(() => screen.getByText('Auto-refresh ON'))
    fireEvent.click(screen.getByText('Auto-refresh ON'))
    expect(screen.getByText('Auto-refresh OFF')).toBeInTheDocument()
  })

  it('refreshes on button click', async () => {
    render(<AdminHealthPage />)
    await waitFor(() => expect(mockFetchSystemHealth).toHaveBeenCalledTimes(1))
    const refreshIcon = screen.getAllByTestId('icon-RefreshCw')
    const refreshBtn = refreshIcon[refreshIcon.length - 1].closest('button')
    fireEvent.click(refreshBtn!)
    await waitFor(() => expect(mockFetchSystemHealth).toHaveBeenCalledTimes(2))
  })

  it('shows failure count for circuit breakers', async () => {
    render(<AdminHealthPage />)
    await waitFor(() => expect(screen.getByText(/2 fallos/)).toBeInTheDocument())
  })
})
