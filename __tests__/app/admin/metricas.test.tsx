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
  usePathname: () => '/admin/metricas',
}))

jest.mock('next/dynamic', () => (fn: any) => {
  const Component = (props: any) => {
    const [Comp, setComp] = React.useState<any>(null)
    React.useEffect(() => { fn().then((m: any) => setComp(() => m.default || m)) }, [])
    return Comp ? <Comp {...props} /> : <div data-testid="dynamic-loading" />
  }
  return Component
})

const mockFetchAllOrganizations = jest.fn()
const mockFetchGlobalMetrics = jest.fn()
const mockFetchOrgStats = jest.fn()
jest.mock('@/lib/admin-api', () => ({
  fetchAllOrganizations: (...a: any[]) => mockFetchAllOrganizations(...a),
  fetchGlobalMetrics: (...a: any[]) => mockFetchGlobalMetrics(...a),
  fetchOrgStats: (...a: any[]) => mockFetchOrgStats(...a),
}))

jest.mock('@/lib/api', () => ({
  formatCOP: (n: number) => `$${n.toLocaleString()}`,
}))

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        in: () => ({
          gte: () => ({
            order: () => Promise.resolve({ data: [] }),
          }),
        }),
      }),
    }),
  },
}))

import MetricsPage from '@/app/admin/metricas/page'

const ORGS = [
  { id: 'org-1', name: 'Clinica Alpha', plan: 'PRO', status: 'ACTIVE' },
  { id: 'org-2', name: 'Clinica Beta', plan: 'STARTER', status: 'ACTIVE' },
]

function setupHappy() {
  mockFetchAllOrganizations.mockResolvedValue(ORGS)
  mockFetchGlobalMetrics.mockResolvedValue({ patients: 200, appointments: 100, interactions: 500, revenue: 10000000, dataLake: 1000 })
  mockFetchOrgStats
    .mockResolvedValueOnce({ patients: 120, appointments: 60, interactions: 300, revenue: 7000000 })
    .mockResolvedValueOnce({ patients: 80, appointments: 40, interactions: 200, revenue: 3000000 })
}

beforeEach(() => {
  jest.clearAllMocks()
  setupHappy()
})

describe('MetricsPage', () => {
  it('renders header', async () => {
    render(<MetricsPage />)
    await waitFor(() => expect(screen.getByText('Metricas Globales')).toBeInTheDocument())
    expect(screen.getByText(/Consolidado de todas las organizaciones/)).toBeInTheDocument()
  })

  it('renders global metric cards', async () => {
    render(<MetricsPage />)
    await waitFor(() => expect(screen.getAllByText('Pacientes').length).toBeGreaterThanOrEqual(1))
    expect(screen.getAllByText('Citas').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Revenue Total')).toBeInTheDocument()
    expect(screen.getByText('Data Lake')).toBeInTheDocument()
    expect(screen.getByText('Organizaciones')).toBeInTheDocument()
  })

  it('renders organization count', async () => {
    render(<MetricsPage />)
    await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument())
    expect(screen.getByText('Organizaciones')).toBeInTheDocument()
  })

  it('renders revenue table', async () => {
    render(<MetricsPage />)
    await waitFor(() => expect(screen.getByText('Revenue por Organizacion')).toBeInTheDocument())
    expect(screen.getAllByText('Clinica Alpha').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Clinica Beta').length).toBeGreaterThanOrEqual(1)
  })

  it('sorts orgs by revenue (highest first)', async () => {
    render(<MetricsPage />)
    await waitFor(() => {
      const rows = screen.getAllByText(/Clinica/)
      expect(rows[0].textContent).toContain('Alpha')
    })
  })

  it('shows plan badges in revenue table', async () => {
    render(<MetricsPage />)
    await waitFor(() => expect(screen.getByText('PRO')).toBeInTheDocument())
    expect(screen.getByText('STARTER')).toBeInTheDocument()
  })

  it('shows TOTAL row in revenue table', async () => {
    render(<MetricsPage />)
    await waitFor(() => expect(screen.getByText('TOTAL')).toBeInTheDocument())
  })

  it('shows revenue percentages', async () => {
    render(<MetricsPage />)
    await waitFor(() => expect(screen.getByText('70.0%')).toBeInTheDocument())
    expect(screen.getByText('30.0%')).toBeInTheDocument()
  })

  it('renders cost estimate table', async () => {
    render(<MetricsPage />)
    await waitFor(() => expect(screen.getByText('Costo Estimado OpenAI por Org')).toBeInTheDocument())
    // Cost: 300 interactions * $0.003 = $0.90
    expect(screen.getByText('$0.90')).toBeInTheDocument()
    expect(screen.getByText('$0.60')).toBeInTheDocument()
  })

  it('shows interaction percentages in cost table', async () => {
    render(<MetricsPage />)
    await waitFor(() => expect(screen.getByText('60.0%')).toBeInTheDocument())
    expect(screen.getByText('40.0%')).toBeInTheDocument()
  })

  it('shows growth chart section', async () => {
    render(<MetricsPage />)
    await waitFor(() => expect(screen.getByText(/Crecimiento ultimos 30 dias/)).toBeInTheDocument())
  })

  it('shows growth chart section', async () => {
    // With orgs present, supabase returns empty arrays, but dayMap still has 30 entries
    // so GrowthChart dynamic component is rendered (or loading placeholder)
    render(<MetricsPage />)
    await waitFor(() => expect(screen.getByText(/Crecimiento ultimos 30 dias/)).toBeInTheDocument())
  })

  it('handles empty orgs', async () => {
    mockFetchAllOrganizations.mockResolvedValue([])
    mockFetchGlobalMetrics.mockResolvedValue({ patients: 0, appointments: 0, interactions: 0, revenue: 0, dataLake: 0 })
    render(<MetricsPage />)
    await waitFor(() => expect(screen.getByText('Sin datos')).toBeInTheDocument())
  })

  it('handles API error gracefully', async () => {
    mockFetchAllOrganizations.mockRejectedValue(new Error('fail'))
    render(<MetricsPage />)
    await waitFor(() => expect(screen.getByText('Sin datos')).toBeInTheDocument())
  })

  it('refreshes on button click', async () => {
    render(<MetricsPage />)
    await waitFor(() => expect(mockFetchAllOrganizations).toHaveBeenCalledTimes(1))
    const refreshIcons = screen.getAllByTestId('icon-RefreshCw')
    fireEvent.click(refreshIcons[0].closest('button')!)
    await waitFor(() => expect(mockFetchAllOrganizations).toHaveBeenCalledTimes(2))
  })

  it('shows loading skeletons in revenue table', () => {
    mockFetchAllOrganizations.mockReturnValue(new Promise(() => {}))
    render(<MetricsPage />)
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('shows data lake count', async () => {
    render(<MetricsPage />)
    await waitFor(() => expect(screen.getByText('1,000')).toBeInTheDocument())
    expect(screen.getByText('Data Lake')).toBeInTheDocument()
  })
})
