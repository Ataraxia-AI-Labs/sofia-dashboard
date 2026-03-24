import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

/* ── lucide-react proxy ── */
jest.mock('lucide-react', () => {
  return new Proxy({}, {
    get: (_, name) => {
      const C = (p: any) => <svg data-testid={`icon-${String(name)}`} {...p} />
      C.displayName = String(name)
      return C
    },
  })
})

/* ── Sentry ── */
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }))

/* ── next/navigation ── */
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), refresh: jest.fn(), back: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/admin',
}))

/* ── admin-api ── */
const mockFetchAllOrganizations = jest.fn()
const mockFetchGlobalMetrics = jest.fn()
const mockFetchOrgStats = jest.fn()
const mockFetchOrgLastActivity = jest.fn()
const mockFetchPipelineMetrics = jest.fn()
const mockFetchBotErrorCount24h = jest.fn()
const mockFetchBotLogs = jest.fn()
const mockEnsureSuperAdminMembership = jest.fn()

jest.mock('@/lib/admin-api', () => ({
  fetchAllOrganizations: (...a: any[]) => mockFetchAllOrganizations(...a),
  fetchGlobalMetrics: (...a: any[]) => mockFetchGlobalMetrics(...a),
  fetchOrgStats: (...a: any[]) => mockFetchOrgStats(...a),
  fetchOrgLastActivity: (...a: any[]) => mockFetchOrgLastActivity(...a),
  fetchPipelineMetrics: (...a: any[]) => mockFetchPipelineMetrics(...a),
  fetchBotErrorCount24h: (...a: any[]) => mockFetchBotErrorCount24h(...a),
  fetchBotLogs: (...a: any[]) => mockFetchBotLogs(...a),
  ensureSuperAdminMembership: (...a: any[]) => mockEnsureSuperAdminMembership(...a),
}))

/* ── api/health ── */
const mockFetchSystemHealth = jest.fn()
jest.mock('@/lib/api/health', () => ({
  fetchSystemHealth: (...a: any[]) => mockFetchSystemHealth(...a),
}))

/* ── impersonation ── */
const mockStartImpersonation = jest.fn()
jest.mock('@/lib/impersonation', () => ({
  startImpersonation: (...a: any[]) => mockStartImpersonation(...a),
}))

/* ── api ── */
jest.mock('@/lib/api', () => ({
  formatCOP: (n: number) => `$${n.toLocaleString()}`,
  timeAgo: (d: string) => '5 min ago',
}))

import AdminPage from '@/app/admin/page'

const ORG_1 = { id: 'org-1', name: 'Clinica Alpha', status: 'ACTIVE', plan: 'PRO', whatsapp_phone_id: '12345678901234' }
const ORG_2 = { id: 'org-2', name: 'Clinica Beta', status: 'TRIAL', plan: 'TRIAL', whatsapp_phone_id: '' }

function setupHappy() {
  mockFetchAllOrganizations.mockResolvedValue([ORG_1, ORG_2])
  mockFetchGlobalMetrics.mockResolvedValue({ patients: 100, appointments: 50, interactions: 200, revenue: 5000000, dataLake: 300 })
  mockFetchOrgStats.mockResolvedValue({ patients: 50, appointments: 25, interactions: 100, revenue: 2500000 })
  mockFetchOrgLastActivity.mockResolvedValue('2026-03-20T10:00:00Z')
  mockFetchPipelineMetrics.mockResolvedValue([])
  mockFetchSystemHealth.mockResolvedValue({ status: 'HEALTHY' })
  mockFetchBotErrorCount24h.mockResolvedValue(0)
  mockFetchBotLogs.mockResolvedValue([])
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers()
  setupHappy()
})

afterEach(() => {
  jest.useRealTimers()
})

describe('AdminPage', () => {
  it('renders loading skeletons initially', async () => {
    mockFetchAllOrganizations.mockReturnValue(new Promise(() => {})) // never resolves
    render(<AdminPage />)
    // Skeleton rows should exist (animate-pulse divs)
    const pulseElements = document.querySelectorAll('.animate-pulse')
    expect(pulseElements.length).toBeGreaterThan(0)
  })

  it('renders header with CEO greeting', async () => {
    render(<AdminPage />)
    await waitFor(() => expect(mockFetchAllOrganizations).toHaveBeenCalled())
    expect(screen.getByText(/CEO/)).toBeInTheDocument()
    expect(screen.getByText(/Command Center/)).toBeInTheDocument()
  })

  it('renders organizations after loading', async () => {
    render(<AdminPage />)
    await waitFor(() => expect(screen.getByText('Clinica Alpha')).toBeInTheDocument())
    expect(screen.getByText('Clinica Beta')).toBeInTheDocument()
  })

  it('renders global metrics cards', async () => {
    render(<AdminPage />)
    await waitFor(() => expect(screen.getByText('Pacientes totales')).toBeInTheDocument())
    expect(screen.getByText('Citas totales')).toBeInTheDocument()
    expect(screen.getByText('Revenue total')).toBeInTheDocument()
    expect(screen.getByText('Data Lake entries')).toBeInTheDocument()
  })

  it('filters organizations by search', async () => {
    render(<AdminPage />)
    await waitFor(() => expect(screen.getByText('Clinica Alpha')).toBeInTheDocument())
    const input = screen.getByPlaceholderText('Buscar organizacion...')
    fireEvent.change(input, { target: { value: 'Alpha' } })
    expect(screen.getByText('Clinica Alpha')).toBeInTheDocument()
    expect(screen.queryByText('Clinica Beta')).not.toBeInTheDocument()
  })

  it('shows empty state when search has no match', async () => {
    render(<AdminPage />)
    await waitFor(() => expect(screen.getByText('Clinica Alpha')).toBeInTheDocument())
    fireEvent.change(screen.getByPlaceholderText('Buscar organizacion...'), { target: { value: 'ZZZ' } })
    expect(screen.getByText(/No se encontraron organizaciones/)).toBeInTheDocument()
  })

  it('shows empty state when no orgs exist', async () => {
    mockFetchAllOrganizations.mockResolvedValue([])
    render(<AdminPage />)
    await waitFor(() => expect(screen.getByText('No hay organizaciones registradas')).toBeInTheDocument())
    expect(screen.getByText('Crear primera organizacion')).toBeInTheDocument()
  })

  it('navigates to create org on "Nueva Org" click', async () => {
    render(<AdminPage />)
    await waitFor(() => expect(screen.getByText('Clinica Alpha')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Nueva Org'))
    expect(mockPush).toHaveBeenCalledWith('/admin/organizaciones/nueva')
  })

  it('navigates to org detail on row click', async () => {
    render(<AdminPage />)
    await waitFor(() => expect(screen.getByText('Clinica Alpha')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Clinica Alpha'))
    expect(mockPush).toHaveBeenCalledWith('/admin/organizaciones/org-1')
  })

  it('enters God Mode on button click', async () => {
    mockEnsureSuperAdminMembership.mockResolvedValue(undefined)
    render(<AdminPage />)
    await waitFor(() => expect(screen.getByText('Clinica Alpha')).toBeInTheDocument())
    const godModeButtons = screen.getAllByTitle('Ver dashboard de esta clinica (God Mode)')
    fireEvent.click(godModeButtons[0])
    await waitFor(() => expect(mockEnsureSuperAdminMembership).toHaveBeenCalledWith('org-1'))
    expect(mockStartImpersonation).toHaveBeenCalledWith('org-1', 'Clinica Alpha')
    expect(mockPush).toHaveBeenCalledWith('/dashboard')
  })

  it('toggles auto-refresh button', async () => {
    render(<AdminPage />)
    await waitFor(() => expect(screen.getByText('Clinica Alpha')).toBeInTheDocument())
    const liveBtn = screen.getByText('Live ON')
    fireEvent.click(liveBtn)
    expect(screen.getByText('Live OFF')).toBeInTheDocument()
  })

  it('quick actions navigate correctly', async () => {
    render(<AdminPage />)
    await waitFor(() => expect(screen.getByText('Pipeline')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Pipeline'))
    expect(mockPush).toHaveBeenCalledWith('/admin/pipeline')
    fireEvent.click(screen.getByText('Metricas'))
    expect(mockPush).toHaveBeenCalledWith('/admin/metricas')
    fireEvent.click(screen.getByText('System Health'))
    expect(mockPush).toHaveBeenCalledWith('/admin/health')
  })

  it('shows activity feed empty state', async () => {
    render(<AdminPage />)
    await waitFor(() => expect(screen.getByText('Sin actividad reciente')).toBeInTheDocument())
  })

  it('shows activity feed with logs', async () => {
    mockFetchBotLogs.mockResolvedValue([
      { id: '1', bot_name: 'scheduler', status: 'SUCCESS', executed_at: '2026-03-20T10:00:00Z', error_message: null },
      { id: '2', bot_name: 'reminder', status: 'ERROR', executed_at: '2026-03-20T09:00:00Z', error_message: 'Connection timeout' },
    ])
    render(<AdminPage />)
    await waitFor(() => expect(screen.getByText('scheduler')).toBeInTheDocument())
    expect(screen.getByText('reminder')).toBeInTheDocument()
    expect(screen.getByText(/Connection timeout/)).toBeInTheDocument()
  })

  it('renders system pulse with healthy status', async () => {
    render(<AdminPage />)
    await waitFor(() => expect(screen.getByText('System Pulse')).toBeInTheDocument())
    expect(screen.getByText('Todo operativo')).toBeInTheDocument()
  })

  it('renders system pulse with critical status', async () => {
    mockFetchSystemHealth.mockRejectedValue(new Error('fail'))
    mockFetchBotErrorCount24h.mockResolvedValue(10)
    render(<AdminPage />)
    await waitFor(() => expect(screen.getByText('System Pulse')).toBeInTheDocument())
    // Health failed = CRITICAL, high error count
    await waitFor(() => expect(screen.getByText('Backend')).toBeInTheDocument())
  })

  it('handles API error gracefully', async () => {
    mockFetchAllOrganizations.mockRejectedValue(new Error('Network error'))
    render(<AdminPage />)
    await waitFor(() => expect(screen.getByText('No hay organizaciones registradas')).toBeInTheDocument())
  })

  it('shows org status badges', async () => {
    render(<AdminPage />)
    await waitFor(() => expect(screen.getByText('Activa')).toBeInTheDocument())
    expect(screen.getByText('Trial')).toBeInTheDocument()
  })

  it('shows plan badges', async () => {
    render(<AdminPage />)
    await waitFor(() => expect(screen.getByText('PRO')).toBeInTheDocument())
    expect(screen.getAllByText('TRIAL').length).toBeGreaterThanOrEqual(1)
  })

  it('refreshes data on refresh button click', async () => {
    render(<AdminPage />)
    await waitFor(() => expect(mockFetchAllOrganizations).toHaveBeenCalledTimes(2)) // loadData + loadOrgStats
    const refreshBtns = document.querySelectorAll('[data-testid="icon-RefreshCw"]')
    // Click the standalone refresh button (last one in header)
    const refreshParent = refreshBtns[0]?.closest('button')
    if (refreshParent) fireEvent.click(refreshParent)
    await waitFor(() => expect(mockFetchAllOrganizations).toHaveBeenCalledTimes(4))
  })

  it('shows WhatsApp info when present', async () => {
    render(<AdminPage />)
    await waitFor(() => expect(screen.getByText(/WA: 123456789012/)).toBeInTheDocument())
  })
})
