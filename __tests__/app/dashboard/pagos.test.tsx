// __tests__/app/dashboard/pagos.test.tsx
// ---------------------------------------------------------------------------
// Nuclear-level tests for the Pagos (Payments) & Revenue Attribution page
// (app/dashboard/pagos/page.tsx)
//
// States tested: loading skeleton, payments table with all columns,
// status badges (PAID/PENDING/DECLINED/ERROR/EXPIRED/VOIDED), status filter,
// KPI cards, tab switching (pagos/attribution), attribution data rendering,
// empty state, refresh, external link presence, top conversaciones section.
// ---------------------------------------------------------------------------

import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// ---- Mocks (BEFORE component import) ----

jest.mock('@/lib/org-context')
jest.mock('@/lib/api/payments')
jest.mock('@/lib/api', () => ({
  formatCOP: (n: number) => `$${n.toLocaleString()}`,
  timeAgo: (d: string) => `hace 2h`,
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
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn(), back: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/pagos',
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
import { fetchPayments, fetchRevenueAttribution } from '@/lib/api/payments'

const mockUseOrg = useOrg as jest.Mock
const mockFetchPayments = fetchPayments as jest.Mock
const mockFetchAttribution = fetchRevenueAttribution as jest.Mock

import PagosPage from '@/app/dashboard/pagos/page'

// ---- Factories ----

function makePayment(overrides: Partial<{
  id: string; status: string; amount_cop: number; service_name: string;
  payment_method_type: string; link_url: string;
  patients: { full_name: string; phone: string };
}> = {}) {
  return {
    id: overrides.id ?? 'pay-1',
    patient_id: 'pat-1',
    organization_id: 'org-1',
    amount_cop: overrides.amount_cop ?? 150000,
    status: overrides.status ?? 'PAID',
    service_name: overrides.service_name ?? 'Botox',
    payment_method_type: overrides.payment_method_type ?? 'CARD',
    link_url: overrides.link_url ?? null,
    created_at: '2026-03-20T10:00:00Z',
    patients: overrides.patients ?? { full_name: 'Ana Garcia', phone: '+573001234567' },
  }
}

function makeAttribution() {
  return {
    resumen: {
      total_revenue: 5000000,
      total_pending: 500000,
      total_pagos: 20,
      pagos_pendientes: 3,
      ticket_promedio: 250000,
      roi_estimado: 12,
      costo_ia_usd: 8.5,
      tiempo_promedio_a_pago_horas: 4.2,
    },
    attribution: {
      por_canal: { WhatsApp: 3000000, Instagram: 1500000, Web: 500000 },
      por_servicio: { Botox: 2500000, Limpieza: 1500000, Ortodoncia: 1000000 },
      por_dia: { Lun: 800000, Mar: 1200000, Mie: 600000, Jue: 900000, Vie: 1500000 },
    },
    top_conversaciones: [
      { patient: 'Maria Lopez', service: 'Botox', conversation_snippet: 'Me interesa el botox', payment_amount: 350000, paid_at: '2026-03-19T15:00:00Z' },
      { patient: 'Carlos Ruiz', service: 'Limpieza', conversation_snippet: 'Quiero agendar limpieza', payment_amount: 180000, paid_at: '2026-03-18T09:00:00Z' },
    ],
  }
}

// ---- Setup ----

beforeEach(() => {
  jest.clearAllMocks()
  mockUseOrg.mockReturnValue({ orgId: 'org-1', branchId: null, orgName: 'Test Clinic', plan: 'PRO', role: 'OWNER' })
})

// ---- Tests ----

describe('PagosPage', () => {
  // 1. Loading skeleton
  it('renders loading skeleton while data is being fetched', () => {
    mockFetchPayments.mockReturnValue(new Promise(() => {}))
    mockFetchAttribution.mockReturnValue(new Promise(() => {}))
    render(<PagosPage />)
    const pulseElements = document.querySelectorAll('.animate-pulse')
    expect(pulseElements.length).toBeGreaterThan(0)
  })

  // 2. Payments table renders with correct columns
  it('renders table with all expected column headers', async () => {
    mockFetchPayments.mockResolvedValue([makePayment()])
    mockFetchAttribution.mockResolvedValue(makeAttribution())
    render(<PagosPage />)
    await waitFor(() => {
      expect(screen.getByText('Paciente')).toBeInTheDocument()
      expect(screen.getByText('Servicio')).toBeInTheDocument()
      expect(screen.getByText('Monto')).toBeInTheDocument()
      expect(screen.getByText('Estado')).toBeInTheDocument()
      expect(screen.getByText('Método')).toBeInTheDocument()
      expect(screen.getByText('Fecha')).toBeInTheDocument()
      expect(screen.getByText('Link')).toBeInTheDocument()
    })
  })

  // 3. Payment row data renders correctly
  it('displays payment row with patient name, service, amount, status, method', async () => {
    mockFetchPayments.mockResolvedValue([makePayment()])
    mockFetchAttribution.mockResolvedValue(makeAttribution())
    render(<PagosPage />)
    await waitFor(() => {
      expect(screen.getByText('Ana Garcia')).toBeInTheDocument()
      expect(screen.getByText('+573001234567')).toBeInTheDocument()
      expect(screen.getByText('Botox')).toBeInTheDocument()
      expect(screen.getByText('$150,000')).toBeInTheDocument()
      expect(screen.getByText('Pagado')).toBeInTheDocument()
      expect(screen.getByText('CARD')).toBeInTheDocument()
    })
  })

  // 4. Status badge — PAID
  it('renders Pagado badge for PAID status', async () => {
    mockFetchPayments.mockResolvedValue([makePayment({ status: 'PAID' })])
    mockFetchAttribution.mockResolvedValue(makeAttribution())
    render(<PagosPage />)
    await waitFor(() => {
      expect(screen.getByText('Pagado')).toBeInTheDocument()
    })
  })

  // 5. Status badge — PENDING
  it('renders Pendiente badge for PENDING status', async () => {
    mockFetchPayments.mockResolvedValue([makePayment({ id: 'pay-2', status: 'PENDING' })])
    mockFetchAttribution.mockResolvedValue(makeAttribution())
    render(<PagosPage />)
    await waitFor(() => {
      expect(screen.getByText('Pendiente')).toBeInTheDocument()
    })
  })

  // 6. Status badge — DECLINED
  it('renders Rechazado badge for DECLINED status', async () => {
    mockFetchPayments.mockResolvedValue([makePayment({ id: 'pay-3', status: 'DECLINED' })])
    mockFetchAttribution.mockResolvedValue(makeAttribution())
    render(<PagosPage />)
    await waitFor(() => {
      expect(screen.getByText('Rechazado')).toBeInTheDocument()
    })
  })

  // 7. Status badge — ERROR
  it('renders Error badge for ERROR status', async () => {
    mockFetchPayments.mockResolvedValue([makePayment({ id: 'pay-4', status: 'ERROR' })])
    mockFetchAttribution.mockResolvedValue(makeAttribution())
    render(<PagosPage />)
    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument()
    })
  })

  // 8. Status badge — EXPIRED
  it('renders Expirado badge for EXPIRED status', async () => {
    mockFetchPayments.mockResolvedValue([makePayment({ id: 'pay-5', status: 'EXPIRED' })])
    mockFetchAttribution.mockResolvedValue(makeAttribution())
    render(<PagosPage />)
    await waitFor(() => {
      expect(screen.getByText('Expirado')).toBeInTheDocument()
    })
  })

  // 9. Status badge — VOIDED
  it('renders Anulado badge for VOIDED status', async () => {
    mockFetchPayments.mockResolvedValue([makePayment({ id: 'pay-6', status: 'VOIDED' })])
    mockFetchAttribution.mockResolvedValue(makeAttribution())
    render(<PagosPage />)
    await waitFor(() => {
      expect(screen.getByText('Anulado')).toBeInTheDocument()
    })
  })

  // 10. Filter by status
  it('re-fetches payments when status filter changes', async () => {
    const user = userEvent.setup()
    mockFetchPayments.mockResolvedValue([makePayment()])
    mockFetchAttribution.mockResolvedValue(makeAttribution())
    render(<PagosPage />)
    await waitFor(() => expect(screen.getByText('Ana Garcia')).toBeInTheDocument())

    const select = screen.getByDisplayValue('Todos los estados')
    mockFetchPayments.mockResolvedValue([makePayment({ id: 'pay-2', status: 'PENDING' })])
    await user.selectOptions(select, 'PAID')

    await waitFor(() => {
      // The second call should include the filter
      expect(mockFetchPayments).toHaveBeenCalledTimes(2)
    })
  })

  // 11. Filter options exist
  it('renders all filter options in the status dropdown', async () => {
    mockFetchPayments.mockResolvedValue([makePayment()])
    mockFetchAttribution.mockResolvedValue(makeAttribution())
    render(<PagosPage />)
    await waitFor(() => expect(screen.getByText('Ana Garcia')).toBeInTheDocument())

    const options = screen.getAllByRole('option')
    const values = options.map(o => (o as HTMLOptionElement).value)
    expect(values).toContain('')
    expect(values).toContain('PAID')
    expect(values).toContain('PENDING')
    expect(values).toContain('DECLINED')
  })

  // 12. Empty state
  it('shows empty state when no payments returned', async () => {
    mockFetchPayments.mockResolvedValue([])
    mockFetchAttribution.mockResolvedValue(makeAttribution())
    render(<PagosPage />)
    await waitFor(() => {
      expect(screen.getByText('noPayments')).toBeInTheDocument()
    })
  })

  // 13. Error state — API failure degrades gracefully
  it('shows empty state when API fails', async () => {
    mockFetchPayments.mockRejectedValue(new Error('Network Error'))
    mockFetchAttribution.mockRejectedValue(new Error('Network Error'))
    render(<PagosPage />)
    await waitFor(() => {
      expect(screen.getByText('noPayments')).toBeInTheDocument()
    })
  })

  // 14. KPI cards render
  it('renders KPI cards with attribution data', async () => {
    mockFetchPayments.mockResolvedValue([makePayment()])
    mockFetchAttribution.mockResolvedValue(makeAttribution())
    render(<PagosPage />)
    await waitFor(() => {
      expect(screen.getByText('Revenue Total')).toBeInTheDocument()
      expect(screen.getByText('$5,000,000')).toBeInTheDocument()
      expect(screen.getByText('20 pagos')).toBeInTheDocument()
      expect(screen.getByText('$500,000')).toBeInTheDocument()
      expect(screen.getByText('3 pendientes')).toBeInTheDocument()
      expect(screen.getByText('Ticket Promedio')).toBeInTheDocument()
      expect(screen.getByText('$250,000')).toBeInTheDocument()
      expect(screen.getByText('ROI')).toBeInTheDocument()
      expect(screen.getByText('12x')).toBeInTheDocument()
    })
  })

  // 15. Refresh button
  it('calls loadData again when refresh button is clicked', async () => {
    const user = userEvent.setup()
    mockFetchPayments.mockResolvedValue([makePayment()])
    mockFetchAttribution.mockResolvedValue(makeAttribution())
    render(<PagosPage />)
    await waitFor(() => expect(screen.getByText('Ana Garcia')).toBeInTheDocument())

    const refreshBtn = screen.getByLabelText('refresh')
    await user.click(refreshBtn)

    await waitFor(() => {
      expect(mockFetchPayments).toHaveBeenCalledTimes(2)
      expect(mockFetchAttribution).toHaveBeenCalledTimes(2)
    })
  })

  // 16. Tab switching — pagos tab active by default
  it('shows Pagos tab active by default with table visible', async () => {
    mockFetchPayments.mockResolvedValue([makePayment()])
    mockFetchAttribution.mockResolvedValue(makeAttribution())
    render(<PagosPage />)
    await waitFor(() => {
      expect(screen.getByText('Paciente')).toBeInTheDocument()
    })
    // Attribution tab content should NOT be visible
    expect(screen.queryByText('Revenue por Canal')).not.toBeInTheDocument()
  })

  // 17. Tab switching — attribution tab
  it('switches to Attribution tab and displays channel revenue', async () => {
    const user = userEvent.setup()
    mockFetchPayments.mockResolvedValue([makePayment()])
    mockFetchAttribution.mockResolvedValue(makeAttribution())
    render(<PagosPage />)
    await waitFor(() => expect(screen.getByText('Ana Garcia')).toBeInTheDocument())

    const attributionBtn = screen.getByText('Attribution')
    await user.click(attributionBtn)

    await waitFor(() => {
      expect(screen.getByText('Revenue por Canal')).toBeInTheDocument()
      expect(screen.getByText('WhatsApp')).toBeInTheDocument()
      expect(screen.getByText('$3,000,000')).toBeInTheDocument()
      expect(screen.getByText('Instagram')).toBeInTheDocument()
      expect(screen.getByText('Revenue por Servicio')).toBeInTheDocument()
    })
  })

  // 18. Attribution — Revenue por Servicio
  it('displays revenue by service in attribution tab', async () => {
    const user = userEvent.setup()
    mockFetchPayments.mockResolvedValue([makePayment()])
    mockFetchAttribution.mockResolvedValue(makeAttribution())
    render(<PagosPage />)
    await waitFor(() => expect(screen.getByText('Ana Garcia')).toBeInTheDocument())

    await user.click(screen.getByText('Attribution'))

    await waitFor(() => {
      expect(screen.getByText('Revenue por Servicio')).toBeInTheDocument()
      expect(screen.getByText('$2,500,000')).toBeInTheDocument()
      expect(screen.getByText('Limpieza')).toBeInTheDocument()
      expect(screen.getByText('Ortodoncia')).toBeInTheDocument()
    })
  })

  // 19. Attribution — Revenue por Dia
  it('displays day-of-week chart in attribution tab', async () => {
    const user = userEvent.setup()
    mockFetchPayments.mockResolvedValue([makePayment()])
    mockFetchAttribution.mockResolvedValue(makeAttribution())
    render(<PagosPage />)
    await waitFor(() => expect(screen.getByText('Ana Garcia')).toBeInTheDocument())

    await user.click(screen.getByText('Attribution'))

    await waitFor(() => {
      expect(screen.getByText('Revenue por Día de la Semana')).toBeInTheDocument()
      expect(screen.getByText('Lun')).toBeInTheDocument()
      expect(screen.getByText('Vie')).toBeInTheDocument()
    })
  })

  // 20. Attribution — metrics display
  it('displays attribution metrics (ROI, tiempo promedio, costo IA)', async () => {
    const user = userEvent.setup()
    mockFetchPayments.mockResolvedValue([makePayment()])
    mockFetchAttribution.mockResolvedValue(makeAttribution())
    render(<PagosPage />)
    await waitFor(() => expect(screen.getByText('Ana Garcia')).toBeInTheDocument())

    await user.click(screen.getByText('Attribution'))

    await waitFor(() => {
      expect(screen.getByText('Métricas de Attribution')).toBeInTheDocument()
      expect(screen.getByText('Tiempo promedio a pago')).toBeInTheDocument()
      expect(screen.getByText('4.2h')).toBeInTheDocument()
      expect(screen.getByText('$8.5 USD')).toBeInTheDocument()
    })
  })

  // 21. Top conversaciones render
  it('displays top conversaciones that generated revenue', async () => {
    const user = userEvent.setup()
    mockFetchPayments.mockResolvedValue([makePayment()])
    mockFetchAttribution.mockResolvedValue(makeAttribution())
    render(<PagosPage />)
    await waitFor(() => expect(screen.getByText('Ana Garcia')).toBeInTheDocument())

    await user.click(screen.getByText('Attribution'))

    await waitFor(() => {
      expect(screen.getByText('Maria Lopez')).toBeInTheDocument()
      expect(screen.getByText(/Me interesa el botox/)).toBeInTheDocument()
      expect(screen.getByText('$350,000')).toBeInTheDocument()
      expect(screen.getByText('Carlos Ruiz')).toBeInTheDocument()
    })
  })

  // 22. External link displayed when link_url present
  it('renders external link icon when payment has link_url', async () => {
    mockFetchPayments.mockResolvedValue([makePayment({ link_url: 'https://pay.example.com/abc' })])
    mockFetchAttribution.mockResolvedValue(makeAttribution())
    render(<PagosPage />)
    await waitFor(() => {
      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', 'https://pay.example.com/abc')
      expect(link).toHaveAttribute('target', '_blank')
    })
  })

  // 23. No external link when link_url is null
  it('does not render external link when link_url is absent', async () => {
    mockFetchPayments.mockResolvedValue([makePayment({ link_url: undefined })])
    mockFetchAttribution.mockResolvedValue(makeAttribution())
    render(<PagosPage />)
    await waitFor(() => expect(screen.getByText('Ana Garcia')).toBeInTheDocument())
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  // 24. Transaction count displayed in header
  it('displays transaction count in header', async () => {
    mockFetchPayments.mockResolvedValue([makePayment(), makePayment({ id: 'pay-2' })])
    mockFetchAttribution.mockResolvedValue(makeAttribution())
    render(<PagosPage />)
    await waitFor(() => {
      expect(screen.getByText('2 transacciones')).toBeInTheDocument()
    })
  })

  // 25. Multiple payments render in table
  it('renders multiple payment rows', async () => {
    mockFetchPayments.mockResolvedValue([
      makePayment({ id: 'pay-1', patients: { full_name: 'Ana Garcia', phone: '+571' } }),
      makePayment({ id: 'pay-2', status: 'PENDING', patients: { full_name: 'Laura Torres', phone: '+572' } }),
      makePayment({ id: 'pay-3', status: 'DECLINED', patients: { full_name: 'Carlos Ruiz', phone: '+573' } }),
    ])
    mockFetchAttribution.mockResolvedValue(makeAttribution())
    render(<PagosPage />)
    await waitFor(() => {
      expect(screen.getByText('Ana Garcia')).toBeInTheDocument()
      expect(screen.getByText('Laura Torres')).toBeInTheDocument()
      expect(screen.getByText('Carlos Ruiz')).toBeInTheDocument()
    })
  })

  // 26. Patient without name fallback
  it('shows "Sin nombre" when patient has no full_name', async () => {
    const noNamePayment = { ...makePayment(), patients: null }
    mockFetchPayments.mockResolvedValue([noNamePayment])
    mockFetchAttribution.mockResolvedValue(makeAttribution())
    render(<PagosPage />)
    await waitFor(() => {
      expect(screen.getByText('Sin nombre')).toBeInTheDocument()
    })
  })

  // 27. Payment method fallback
  it('shows dash when payment_method_type is null', async () => {
    const noMethodPayment = { ...makePayment(), payment_method_type: null }
    mockFetchPayments.mockResolvedValue([noMethodPayment])
    mockFetchAttribution.mockResolvedValue(makeAttribution())
    render(<PagosPage />)
    await waitFor(() => {
      expect(screen.getByText('—')).toBeInTheDocument()
    })
  })

  // 28. Attribution empty state
  it('shows empty attribution message when no channel data', async () => {
    const user = userEvent.setup()
    const emptyAttr = {
      resumen: { total_revenue: 0, total_pending: 0, total_pagos: 0, pagos_pendientes: 0, ticket_promedio: 0, roi_estimado: 0, costo_ia_usd: 0, tiempo_promedio_a_pago_horas: 0 },
      attribution: { por_canal: {}, por_servicio: {}, por_dia: {} },
      top_conversaciones: [],
    }
    mockFetchPayments.mockResolvedValue([])
    mockFetchAttribution.mockResolvedValue(emptyAttr)
    render(<PagosPage />)
    await waitFor(() => expect(screen.getByText('noPayments')).toBeInTheDocument())

    await user.click(screen.getByText('Attribution'))
    await waitFor(() => {
      expect(screen.getByText('Sin datos de attribution aun')).toBeInTheDocument()
      expect(screen.getByText('Sin datos aun')).toBeInTheDocument()
    })
  })

  // 29. KPI cards show zero values when attribution is null
  it('shows zero KPI values when attribution data is null', async () => {
    mockFetchPayments.mockResolvedValue([])
    mockFetchAttribution.mockResolvedValue(null)
    render(<PagosPage />)
    await waitFor(() => {
      const zeroAmounts = screen.getAllByText('$0')
      expect(zeroAmounts.length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('0 pagos')).toBeInTheDocument()
    })
  })

  // 30. Passes branchId to API calls
  it('passes branchId to API calls when present', async () => {
    mockUseOrg.mockReturnValue({ orgId: 'org-1', branchId: 'branch-42', orgName: 'Test', plan: 'PRO', role: 'OWNER' })
    mockFetchPayments.mockResolvedValue([])
    mockFetchAttribution.mockResolvedValue(null)
    render(<PagosPage />)
    await waitFor(() => {
      expect(mockFetchPayments).toHaveBeenCalledWith('org-1', { status: undefined, branchId: 'branch-42' })
      expect(mockFetchAttribution).toHaveBeenCalledWith('org-1', 30, 'branch-42')
    })
  })
})
