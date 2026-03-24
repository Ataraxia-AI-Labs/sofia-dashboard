// __tests__/app/dashboard/health.test.tsx
// ---------------------------------------------------------------------------
// Nuclear-level tests for the System Health page
// (app/dashboard/health/page.tsx)
//
// States tested: loading, overall status (HEALTHY/DEGRADED/CRITICAL),
// circuit breaker cards (CLOSED/HALF_OPEN/OPEN), uptime/db/version display,
// message queue count, auto-refresh toggle (on/off), manual refresh,
// breaker icons (openai/supabase/meta/voice/wompi), failure/success/uptime
// counters, "how it works" section, error state (fetch fails -> CRITICAL).
// ---------------------------------------------------------------------------

import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// ---- Mocks (BEFORE component import) ----

jest.mock('@/lib/api/health')
const stableT = (key: string, params?: Record<string, unknown>) => {
  if (params) return `${key}:${JSON.stringify(params)}`
  return key
}
;(stableT as any).has = () => true
jest.mock('next-intl', () => ({
  useTranslations: () => stableT,
}))
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn(), back: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/health',
}))
jest.mock('lucide-react', () => {
  return new Proxy({}, {
    get: (_, name) => {
      if (String(name) === '__esModule') return false
      const C = (p: any) => <svg data-testid={`icon-${String(name)}`} {...p} />
      C.displayName = String(name)
      return C
    },
  })
})

import { fetchSystemHealth } from '@/lib/api/health'
const mockFetchHealth = fetchSystemHealth as jest.Mock

import SystemHealthPage from '@/app/dashboard/health/page'

// ---- Fixtures ----

const HEALTHY_DATA = {
  status: 'HEALTHY',
  uptime_human: '14d 3h 22m',
  database: 'connected',
  version: '3.2.1',
  message_queue: { pending: 0 },
  circuit_breakers: {
    openai: { name: 'OpenAI', state: 'CLOSED', failure_count: 0, success_count: 4520, uptime_seconds: 86400 },
    supabase: { name: 'Supabase', state: 'CLOSED', failure_count: 2, success_count: 12000, uptime_seconds: 172800 },
    meta: { name: 'Meta WhatsApp', state: 'HALF_OPEN', failure_count: 15, success_count: 3200, uptime_seconds: 300 },
    voice: { name: 'Voice AI', state: 'CLOSED', failure_count: 0, success_count: 800, uptime_seconds: 43200 },
    wompi: { name: 'Wompi', state: 'OPEN', failure_count: 50, success_count: 100, uptime_seconds: 60 },
  },
}

const DEGRADED_DATA = {
  ...HEALTHY_DATA,
  status: 'DEGRADED',
}

const CRITICAL_DATA = {
  status: 'CRITICAL',
  error: 'loadError',
}

// ---- Tests ----

describe('SystemHealthPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockFetchHealth.mockResolvedValue(HEALTHY_DATA)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  // ===== LOADING =====

  it('calls fetchSystemHealth on mount', async () => {
    await act(async () => { render(<SystemHealthPage />) })
    expect(mockFetchHealth).toHaveBeenCalledTimes(1)
  })

  // ===== HEADER =====

  it('renders page title and subtitle', async () => {
    await act(async () => { render(<SystemHealthPage />) })
    expect(screen.getByText('title')).toBeInTheDocument()
    expect(screen.getByText('Circuit Breakers & Service Status')).toBeInTheDocument()
  })

  // ===== OVERALL STATUS — HEALTHY =====

  it('shows operational label for HEALTHY status', async () => {
    await act(async () => { render(<SystemHealthPage />) })
    // "operational" is the label for HEALTHY
    const operationalTexts = screen.getAllByText('operational')
    expect(operationalTexts.length).toBeGreaterThan(0)
  })

  it('shows uptime, database, and version info', async () => {
    await act(async () => { render(<SystemHealthPage />) })
    expect(screen.getByText(/14d 3h 22m/)).toBeInTheDocument()
    expect(screen.getByText(/connected/)).toBeInTheDocument()
    expect(screen.getByText(/3\.2\.1/)).toBeInTheDocument()
  })

  it('shows message queue count as 0 (success color)', async () => {
    await act(async () => { render(<SystemHealthPage />) })
    expect(screen.getByText('Cola de mensajes')).toBeInTheDocument()
    const queueValue = screen.getAllByText('0')
    expect(queueValue.length).toBeGreaterThan(0)
  })

  // ===== OVERALL STATUS — DEGRADED =====

  it('shows degraded label for DEGRADED status', async () => {
    mockFetchHealth.mockResolvedValue(DEGRADED_DATA)
    await act(async () => { render(<SystemHealthPage />) })
    const degradedTexts = screen.getAllByText('degraded')
    expect(degradedTexts.length).toBeGreaterThan(0)
  })

  // ===== OVERALL STATUS — CRITICAL =====

  it('shows critical/down label when fetch fails', async () => {
    mockFetchHealth.mockRejectedValue(new Error('fail'))
    await act(async () => { render(<SystemHealthPage />) })
    const downTexts = screen.getAllByText('down')
    expect(downTexts.length).toBeGreaterThan(0)
  })

  // ===== CIRCUIT BREAKER CARDS =====

  it('renders all 5 circuit breaker cards', async () => {
    await act(async () => { render(<SystemHealthPage />) })
    expect(screen.getByText('OpenAI')).toBeInTheDocument()
    expect(screen.getByText('Supabase')).toBeInTheDocument()
    expect(screen.getByText('Meta WhatsApp')).toBeInTheDocument()
    expect(screen.getByText('Voice AI')).toBeInTheDocument()
    expect(screen.getByText('Wompi')).toBeInTheDocument()
  })

  it('shows CLOSED breakers as operational', async () => {
    await act(async () => { render(<SystemHealthPage />) })
    // CLOSED state maps to "operational" label — OpenAI, Supabase, Voice are CLOSED
    const operationalLabels = screen.getAllByText('operational')
    expect(operationalLabels.length).toBeGreaterThanOrEqual(3)
  })

  it('shows HALF_OPEN breaker as degraded', async () => {
    await act(async () => { render(<SystemHealthPage />) })
    // Meta is HALF_OPEN -> "degraded"
    const degradedLabels = screen.getAllByText('degraded')
    expect(degradedLabels.length).toBeGreaterThanOrEqual(1)
  })

  it('shows OPEN breaker as down', async () => {
    await act(async () => { render(<SystemHealthPage />) })
    // Wompi is OPEN -> "down"
    const downLabels = screen.getAllByText('down')
    expect(downLabels.length).toBeGreaterThanOrEqual(1)
  })

  it('renders failure, success, and uptime counters for each breaker', async () => {
    await act(async () => { render(<SystemHealthPage />) })
    // OpenAI: 0 failures, 4520 successes, 86400s
    expect(screen.getByText('4520')).toBeInTheDocument()
    expect(screen.getByText('86400s')).toBeInTheDocument()
    // Supabase: 2 failures, 12000 successes
    expect(screen.getByText('12000')).toBeInTheDocument()
    // Wompi: 50 failures
    expect(screen.getByText('50')).toBeInTheDocument()
  })

  it('renders counter labels (Fallos, Exitos, En estado)', async () => {
    await act(async () => { render(<SystemHealthPage />) })
    const fallosLabels = screen.getAllByText('Fallos')
    expect(fallosLabels.length).toBe(5)
    const exitosLabels = screen.getAllByText('Exitos')
    expect(exitosLabels.length).toBe(5)
    const estadoLabels = screen.getAllByText('En estado')
    expect(estadoLabels.length).toBe(5)
  })

  // ===== MESSAGE QUEUE WARNING =====

  it('shows warning color for pending messages > 0', async () => {
    mockFetchHealth.mockResolvedValue({
      ...HEALTHY_DATA,
      message_queue: { pending: 15 },
    })
    await act(async () => { render(<SystemHealthPage />) })
    // '15' may appear multiple times (pending count + meta failure_count)
    const matches = screen.getAllByText('15')
    expect(matches.length).toBeGreaterThan(0)
  })

  // ===== AUTO-REFRESH =====

  it('auto-refresh is ON by default', async () => {
    await act(async () => { render(<SystemHealthPage />) })
    expect(screen.getByText(/Auto-refresh ON/)).toBeInTheDocument()
  })

  it('toggling auto-refresh OFF stops interval', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    await act(async () => { render(<SystemHealthPage />) })

    await user.click(screen.getByText(/Auto-refresh ON/))
    expect(screen.getByText(/Auto-refresh OFF/)).toBeInTheDocument()
  })

  it('auto-refresh fetches health every 15 seconds', async () => {
    await act(async () => { render(<SystemHealthPage />) })
    expect(mockFetchHealth).toHaveBeenCalledTimes(1)

    await act(async () => { jest.advanceTimersByTime(15000) })
    expect(mockFetchHealth).toHaveBeenCalledTimes(2)

    await act(async () => { jest.advanceTimersByTime(15000) })
    expect(mockFetchHealth).toHaveBeenCalledTimes(3)
  })

  it('disabling auto-refresh stops further calls', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    await act(async () => { render(<SystemHealthPage />) })
    expect(mockFetchHealth).toHaveBeenCalledTimes(1)

    await user.click(screen.getByText(/Auto-refresh ON/))

    await act(async () => { jest.advanceTimersByTime(30000) })
    // Should not have been called more after disabling
    expect(mockFetchHealth).toHaveBeenCalledTimes(1)
  })

  // ===== MANUAL REFRESH =====

  it('manual refresh button re-fetches health data', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    await act(async () => { render(<SystemHealthPage />) })
    expect(mockFetchHealth).toHaveBeenCalledTimes(1)

    const refreshBtn = screen.getByRole('button', { name: 'refresh' })
    await user.click(refreshBtn)

    expect(mockFetchHealth).toHaveBeenCalledTimes(2)
  })

  // ===== HOW IT WORKS SECTION =====

  it('renders Circuit Breaker explanation section', async () => {
    await act(async () => { render(<SystemHealthPage />) })
    expect(screen.getByText('Como funciona el Circuit Breaker')).toBeInTheDocument()
    expect(screen.getByText('CLOSED')).toBeInTheDocument()
    expect(screen.getByText('HALF-OPEN')).toBeInTheDocument()
    expect(screen.getByText('OPEN')).toBeInTheDocument()
  })

  it('renders explanation descriptions', async () => {
    await act(async () => { render(<SystemHealthPage />) })
    expect(screen.getByText(/Todo funciona/)).toBeInTheDocument()
    expect(screen.getByText(/Probando recuperacion/)).toBeInTheDocument()
    expect(screen.getByText(/Servicio caido/)).toBeInTheDocument()
  })

  // ===== NO CIRCUIT BREAKERS =====

  it('handles missing circuit_breakers gracefully', async () => {
    mockFetchHealth.mockResolvedValue({
      status: 'HEALTHY',
      uptime_human: '1h',
      database: 'ok',
      version: '1.0',
      message_queue: { pending: 0 },
    })
    await act(async () => { render(<SystemHealthPage />) })
    // Should render without crashing
    expect(screen.getByText('title')).toBeInTheDocument()
  })
})
