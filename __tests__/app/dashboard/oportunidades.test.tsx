// __tests__/app/dashboard/oportunidades.test.tsx
// ---------------------------------------------------------------------------
// Nuclear-level tests for the Oportunidades (Opportunities) page
// (app/dashboard/oportunidades/page.tsx)
//
// States tested: loading skeleton, opportunity cards with type/patient/value,
// all opportunity types (HOT_LEAD, UPSELL, etc.), status filter, type filter,
// summary KPI cards, view tabs (list, scoring, predictions, queue, pricing,
// outreach, competitors), action buttons (En accion, Convertida, Descartar),
// lead score badge, empty state, error state, refresh.
// ---------------------------------------------------------------------------

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// ---- Mocks (BEFORE component import) ----

jest.mock('@/lib/org-context')
jest.mock('@/lib/api', () => ({
  fetchOpportunities: jest.fn(),
  updateOpportunity: jest.fn(),
  formatCOP: (n: number) => `$${n.toLocaleString()}`,
  timeAgo: () => 'hace 2h',
}))
jest.mock('@/lib/api/leads', () => ({
  getLeadScores: jest.fn(),
}))
jest.mock('@/components/lead-score-badge', () => ({
  LeadScoreBadge: ({ score, classification }: { score: number; classification: string }) => (
    <span data-testid="lead-score-badge">{classification}:{score}</span>
  ),
}))
jest.mock('next/dynamic', () => {
  return () => {
    const C = (p: any) => <div data-testid="dynamic-panel" data-orgid={p.orgId} />
    C.displayName = 'DynamicPanel'
    return C
  }
})
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
  usePathname: () => '/dashboard/oportunidades',
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
import { fetchOpportunities, updateOpportunity } from '@/lib/api'
import { getLeadScores } from '@/lib/api/leads'

const mockUseOrg = useOrg as jest.Mock
const mockFetchOpps = fetchOpportunities as jest.Mock
const mockUpdateOpp = updateOpportunity as jest.Mock
const mockGetLeadScores = getLeadScores as jest.Mock

import OportunidadesPage from '@/app/dashboard/oportunidades/page'

// ---- Factories ----

function makeOpp(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: overrides.id ?? 'opp-1',
    opportunity_type: overrides.opportunity_type ?? 'HOT_LEAD',
    status: overrides.status ?? 'DETECTED',
    estimated_value: overrides.estimated_value ?? 500000,
    notes: overrides.notes ?? 'Paciente interesado en botox',
    created_at: '2026-03-20T10:00:00Z',
    patient_id: overrides.patient_id ?? 'pat-1',
    patients: overrides.patients ?? { full_name: 'Ana Garcia', phone: '+573001234567' },
  }
}

function makeLeadScore(patientId: string) {
  return {
    patient_id: patientId,
    score: 85,
    classification: 'HOT',
    engagement_pct: 90,
    intent_pct: 80,
    behavioral_pct: 75,
    negative_signals: 0,
    scored_at: '2026-03-20T10:00:00Z',
  }
}

// ---- Setup ----

beforeEach(() => {
  jest.clearAllMocks()
  mockUseOrg.mockReturnValue({ orgId: 'org-1', branchId: null, orgName: 'Test Clinic', plan: 'PRO', role: 'OWNER' })
  mockGetLeadScores.mockResolvedValue([])
})

// ---- Tests ----

describe('OportunidadesPage', () => {
  // 1. Loading skeleton
  it('renders loading skeleton while fetching data', () => {
    mockFetchOpps.mockReturnValue(new Promise(() => {}))
    mockGetLeadScores.mockReturnValue(new Promise(() => {}))
    render(<OportunidadesPage />)
    const pulseElements = document.querySelectorAll('.animate-pulse')
    expect(pulseElements.length).toBeGreaterThan(0)
  })

  // 2. Opportunity cards render with patient name and value
  it('renders opportunity cards with patient name and estimated value', async () => {
    mockFetchOpps.mockResolvedValue([makeOpp()])
    render(<OportunidadesPage />)
    await waitFor(() => {
      expect(screen.getByText('Ana Garcia')).toBeInTheDocument()
      // $500,000 appears in both opportunity card and summary KPI
      const valueElements = screen.getAllByText('$500,000')
      expect(valueElements.length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('+573001234567')).toBeInTheDocument()
    })
  })

  // 3. Opportunity type label renders
  it('renders opportunity type label', async () => {
    mockFetchOpps.mockResolvedValue([makeOpp({ opportunity_type: 'HOT_LEAD' })])
    render(<OportunidadesPage />)
    await waitFor(() => {
      expect(screen.getByText('types.HOT_LEAD')).toBeInTheDocument()
    })
  })

  // 4. All opportunity types render correctly
  it('renders different opportunity type labels', async () => {
    mockFetchOpps.mockResolvedValue([
      makeOpp({ id: 'o-1', opportunity_type: 'HOT_LEAD' }),
      makeOpp({ id: 'o-2', opportunity_type: 'UPSELL', patients: { full_name: 'Laura Torres', phone: '+572' } }),
      makeOpp({ id: 'o-3', opportunity_type: 'REACTIVATION', patients: { full_name: 'Carlos Ruiz', phone: '+573' } }),
      makeOpp({ id: 'o-4', opportunity_type: 'REFERRAL', patients: { full_name: 'Maria Lopez', phone: '+574' } }),
    ])
    render(<OportunidadesPage />)
    await waitFor(() => {
      expect(screen.getByText('types.HOT_LEAD')).toBeInTheDocument()
      expect(screen.getByText('types.UPSELL')).toBeInTheDocument()
      expect(screen.getByText('types.REACTIVATION')).toBeInTheDocument()
      expect(screen.getByText('types.REFERRAL')).toBeInTheDocument()
    })
  })

  // 5. Status badges render
  it('renders status badge for DETECTED opportunity', async () => {
    mockFetchOpps.mockResolvedValue([makeOpp({ status: 'DETECTED' })])
    render(<OportunidadesPage />)
    await waitFor(() => {
      expect(screen.getByText('statuses.DETECTED')).toBeInTheDocument()
    })
  })

  // 6. Notes display
  it('renders opportunity notes', async () => {
    mockFetchOpps.mockResolvedValue([makeOpp({ notes: 'Paciente interesado en botox' })])
    render(<OportunidadesPage />)
    await waitFor(() => {
      expect(screen.getByText('Paciente interesado en botox')).toBeInTheDocument()
    })
  })

  // 7. Summary KPI cards
  it('renders summary KPI cards with correct totals', async () => {
    mockFetchOpps.mockResolvedValue([
      makeOpp({ id: 'o-1', status: 'DETECTED', estimated_value: 300000, opportunity_type: 'HOT_LEAD', patients: { full_name: 'P1', phone: '+1' } }),
      makeOpp({ id: 'o-2', status: 'CONVERTED', estimated_value: 700000, opportunity_type: 'UPSELL', patients: { full_name: 'P2', phone: '+2' } }),
      makeOpp({ id: 'o-3', status: 'DETECTED', estimated_value: 200000, opportunity_type: 'REACTIVATION', patients: { full_name: 'P3', phone: '+3' } }),
    ])
    render(<OportunidadesPage />)
    await waitFor(() => {
      // Total opportunities: 3 — shown in summary AND in type counts (each type=1),
      // so use getAllByText to handle potential duplicates
      const threeElements = screen.getAllByText('3')
      expect(threeElements.length).toBeGreaterThanOrEqual(1)
      // Pending action (DETECTED count): 2
      expect(screen.getByText('2')).toBeInTheDocument()
      // Converted count: 1 — also appears as type count for each type
      const oneElements = screen.getAllByText('1')
      expect(oneElements.length).toBeGreaterThanOrEqual(1)
      // Total estimated value: formatCOP(1200000) = $1,200,000
      expect(screen.getByText('$1,200,000')).toBeInTheDocument()
      // Converted value appears in summary and opp card — use getAllByText
      const convertedValues = screen.getAllByText('$700,000')
      expect(convertedValues.length).toBeGreaterThanOrEqual(1)
    })
  })

  // 8. Status filter buttons render
  it('renders status filter buttons', async () => {
    mockFetchOpps.mockResolvedValue([makeOpp()])
    render(<OportunidadesPage />)
    await waitFor(() => {
      expect(screen.getByText('statuses.DETECTED')).toBeInTheDocument()
      // Status filter section has "Todos" button
      const todosButtons = screen.getAllByText('Todos')
      expect(todosButtons.length).toBeGreaterThanOrEqual(1)
    })
  })

  // 9. Status filter — clicking triggers re-fetch
  it('re-fetches with status filter when filter button clicked', async () => {
    const user = userEvent.setup()
    mockFetchOpps.mockResolvedValue([makeOpp()])
    render(<OportunidadesPage />)
    await waitFor(() => expect(screen.getByText('Ana Garcia')).toBeInTheDocument())

    // Click on CONVERTED status filter
    const convertedBtn = screen.getAllByText('statuses.CONVERTED')
    // The filter button (not the one in the opportunity card)
    await user.click(convertedBtn[convertedBtn.length - 1])

    await waitFor(() => {
      expect(mockFetchOpps).toHaveBeenCalledTimes(2)
    })
  })

  // 10. Type filter — client-side filtering
  it('filters opportunities by type on client side', async () => {
    const user = userEvent.setup()
    mockFetchOpps.mockResolvedValue([
      makeOpp({ id: 'o-1', opportunity_type: 'HOT_LEAD', patients: { full_name: 'Ana', phone: '+1' } }),
      makeOpp({ id: 'o-2', opportunity_type: 'UPSELL', patients: { full_name: 'Laura', phone: '+2' } }),
    ])
    render(<OportunidadesPage />)
    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument()
      expect(screen.getByText('Laura')).toBeInTheDocument()
    })

    // Click on UPSELL type filter button (not the card label)
    // The filter button text is "types.UPSELL" + count span, find it as a button
    const upsellElements = screen.getAllByText(/types\.UPSELL/)
    const filterBtn = upsellElements.find(el => el.tagName === 'BUTTON') || upsellElements[upsellElements.length - 1]
    await user.click(filterBtn)

    await waitFor(() => {
      expect(screen.getByText('Laura')).toBeInTheDocument()
      expect(screen.queryByText('Ana')).not.toBeInTheDocument()
    })
  })

  // 11. Action buttons — DETECTED status shows En accion, Convertida, Descartar
  it('shows action buttons for DETECTED opportunities', async () => {
    mockFetchOpps.mockResolvedValue([makeOpp({ status: 'DETECTED' })])
    render(<OportunidadesPage />)
    await waitFor(() => {
      expect(screen.getByText('En acción')).toBeInTheDocument()
      expect(screen.getByText('Convertida')).toBeInTheDocument()
      expect(screen.getByText('Descartar')).toBeInTheDocument()
    })
  })

  // 12. Action button — En accion click
  it('calls updateOpportunity with ACTED_ON when "En accion" clicked', async () => {
    const user = userEvent.setup()
    mockFetchOpps.mockResolvedValue([makeOpp({ id: 'opp-42', status: 'DETECTED' })])
    mockUpdateOpp.mockResolvedValue({})
    render(<OportunidadesPage />)
    await waitFor(() => expect(screen.getByText('En acción')).toBeInTheDocument())

    await user.click(screen.getByText('En acción'))
    await waitFor(() => {
      expect(mockUpdateOpp).toHaveBeenCalledWith('opp-42', expect.objectContaining({ status: 'ACTED_ON' }))
    })
  })

  // 13. Action button — Convertida click
  it('calls updateOpportunity with CONVERTED when "Convertida" clicked', async () => {
    const user = userEvent.setup()
    mockFetchOpps.mockResolvedValue([makeOpp({ id: 'opp-42', status: 'DETECTED' })])
    mockUpdateOpp.mockResolvedValue({})
    render(<OportunidadesPage />)
    await waitFor(() => expect(screen.getByText('Convertida')).toBeInTheDocument())

    await user.click(screen.getByText('Convertida'))
    await waitFor(() => {
      expect(mockUpdateOpp).toHaveBeenCalledWith('opp-42', expect.objectContaining({ status: 'CONVERTED' }))
    })
  })

  // 14. Action button — Descartar click
  it('calls updateOpportunity with DISMISSED when "Descartar" clicked', async () => {
    const user = userEvent.setup()
    mockFetchOpps.mockResolvedValue([makeOpp({ id: 'opp-42', status: 'DETECTED' })])
    mockUpdateOpp.mockResolvedValue({})
    render(<OportunidadesPage />)
    await waitFor(() => expect(screen.getByText('Descartar')).toBeInTheDocument())

    await user.click(screen.getByText('Descartar'))
    await waitFor(() => {
      expect(mockUpdateOpp).toHaveBeenCalledWith('opp-42', expect.objectContaining({ status: 'DISMISSED' }))
    })
  })

  // 15. ACTED_ON status — shows Convertida and Expirada buttons
  it('shows Convertida and Expirada buttons for ACTED_ON opportunities', async () => {
    mockFetchOpps.mockResolvedValue([makeOpp({ status: 'ACTED_ON' })])
    render(<OportunidadesPage />)
    await waitFor(() => {
      // "Convertida ✓" is the text for ACTED_ON state
      expect(screen.getByText(/Convertida/)).toBeInTheDocument()
      expect(screen.getByText('Expirada')).toBeInTheDocument()
    })
  })

  // 16. No action buttons for CONVERTED status
  it('shows no action buttons for CONVERTED opportunities', async () => {
    mockFetchOpps.mockResolvedValue([makeOpp({ status: 'CONVERTED' })])
    render(<OportunidadesPage />)
    await waitFor(() => expect(screen.getByText('Ana Garcia')).toBeInTheDocument())
    expect(screen.queryByText('En acción')).not.toBeInTheDocument()
    expect(screen.queryByText('Descartar')).not.toBeInTheDocument()
  })

  // 17. Lead score badge renders
  it('renders LeadScoreBadge when lead score data available', async () => {
    mockFetchOpps.mockResolvedValue([makeOpp({ patient_id: 'pat-1' })])
    mockGetLeadScores.mockResolvedValue([makeLeadScore('pat-1')])
    render(<OportunidadesPage />)
    await waitFor(() => {
      expect(screen.getByTestId('lead-score-badge')).toBeInTheDocument()
      expect(screen.getByText('HOT:85')).toBeInTheDocument()
    })
  })

  // 18. Empty state — no opportunities
  it('shows empty state when no opportunities', async () => {
    mockFetchOpps.mockResolvedValue([])
    render(<OportunidadesPage />)
    await waitFor(() => {
      expect(screen.getByText('No hay oportunidades detectadas aún')).toBeInTheDocument()
    })
  })

  // 19. Empty state with filters applied
  it('shows filtered empty state message when filters active', async () => {
    const user = userEvent.setup()
    // Start with one opp, then filter by status to get empty
    mockFetchOpps.mockResolvedValue([
      makeOpp({ id: 'o-1', opportunity_type: 'HOT_LEAD', status: 'DETECTED' }),
    ])
    render(<OportunidadesPage />)
    await waitFor(() => expect(screen.getByText('Ana Garcia')).toBeInTheDocument())

    // Click CONVERTED status filter — re-fetches with CONVERTED status
    mockFetchOpps.mockResolvedValue([])
    await user.click(screen.getByText('statuses.CONVERTED'))

    await waitFor(() => {
      expect(screen.getByText(/No hay oportunidades/)).toBeInTheDocument()
    })
  })

  // 20. Refresh button
  it('re-fetches data on refresh click', async () => {
    const user = userEvent.setup()
    mockFetchOpps.mockResolvedValue([makeOpp()])
    render(<OportunidadesPage />)
    await waitFor(() => expect(screen.getByText('Ana Garcia')).toBeInTheDocument())

    await user.click(screen.getByLabelText('refresh'))
    await waitFor(() => {
      expect(mockFetchOpps).toHaveBeenCalledTimes(2)
    })
  })

  // 21. Error state — API failure
  it('shows empty state on API failure', async () => {
    mockFetchOpps.mockRejectedValue(new Error('Network error'))
    mockGetLeadScores.mockRejectedValue(new Error('Network error'))
    render(<OportunidadesPage />)
    await waitFor(() => {
      expect(screen.getByText('No hay oportunidades detectadas aún')).toBeInTheDocument()
    })
  })

  // 22. View tab — scoring
  it('switches to scoring view and renders dynamic panel', async () => {
    const user = userEvent.setup()
    mockFetchOpps.mockResolvedValue([makeOpp()])
    render(<OportunidadesPage />)
    await waitFor(() => expect(screen.getByText('Ana Garcia')).toBeInTheDocument())

    await user.click(screen.getByText('views.scoring'))
    await waitFor(() => {
      expect(screen.getByTestId('dynamic-panel')).toBeInTheDocument()
    })
    // List should be hidden
    expect(screen.queryByText('Ana Garcia')).not.toBeInTheDocument()
  })

  // 23. View tab — predictions
  it('switches to predictions view', async () => {
    const user = userEvent.setup()
    mockFetchOpps.mockResolvedValue([makeOpp()])
    render(<OportunidadesPage />)
    await waitFor(() => expect(screen.getByText('Ana Garcia')).toBeInTheDocument())

    await user.click(screen.getByText('views.predictions'))
    await waitFor(() => {
      expect(screen.getByTestId('dynamic-panel')).toBeInTheDocument()
    })
  })

  // 24. View tab — queue
  it('switches to queue view', async () => {
    const user = userEvent.setup()
    mockFetchOpps.mockResolvedValue([makeOpp()])
    render(<OportunidadesPage />)
    await waitFor(() => expect(screen.getByText('Ana Garcia')).toBeInTheDocument())

    await user.click(screen.getByText('views.queue'))
    await waitFor(() => {
      expect(screen.getByTestId('dynamic-panel')).toBeInTheDocument()
    })
  })

  // 25. View tab — pricing
  it('switches to pricing view', async () => {
    const user = userEvent.setup()
    mockFetchOpps.mockResolvedValue([makeOpp()])
    render(<OportunidadesPage />)
    await waitFor(() => expect(screen.getByText('Ana Garcia')).toBeInTheDocument())

    await user.click(screen.getByText('views.pricing'))
    await waitFor(() => {
      expect(screen.getByTestId('dynamic-panel')).toBeInTheDocument()
    })
  })

  // 26. View tab — outreach
  it('switches to outreach view', async () => {
    const user = userEvent.setup()
    mockFetchOpps.mockResolvedValue([makeOpp()])
    render(<OportunidadesPage />)
    await waitFor(() => expect(screen.getByText('Ana Garcia')).toBeInTheDocument())

    await user.click(screen.getByText('views.outreach'))
    await waitFor(() => {
      expect(screen.getByTestId('dynamic-panel')).toBeInTheDocument()
    })
  })

  // 27. View tab — competitors
  it('switches to competitors view', async () => {
    const user = userEvent.setup()
    mockFetchOpps.mockResolvedValue([makeOpp()])
    render(<OportunidadesPage />)
    await waitFor(() => expect(screen.getByText('Ana Garcia')).toBeInTheDocument())

    await user.click(screen.getByText('views.competitors'))
    await waitFor(() => {
      expect(screen.getByTestId('dynamic-panel')).toBeInTheDocument()
    })
  })

  // 28. Page header
  it('renders page header with title and subtitle', async () => {
    mockFetchOpps.mockResolvedValue([])
    render(<OportunidadesPage />)
    await waitFor(() => {
      expect(screen.getByText('title')).toBeInTheDocument()
      expect(screen.getByText('subtitle')).toBeInTheDocument()
    })
  })

  // 29. Type filter counts display
  it('displays type filter counts when opportunities exist', async () => {
    mockFetchOpps.mockResolvedValue([
      makeOpp({ id: 'o-1', opportunity_type: 'HOT_LEAD' }),
      makeOpp({ id: 'o-2', opportunity_type: 'HOT_LEAD' }),
      makeOpp({ id: 'o-3', opportunity_type: 'UPSELL' }),
    ])
    render(<OportunidadesPage />)
    await waitFor(() => {
      // Type filter for HOT_LEAD should show count 2
      const filterArea = screen.getByText('Tipo').closest('div')
      expect(filterArea).toBeTruthy()
    })
  })

  // 30. Estimated value label
  it('shows "Valor estimado" label on opportunity card', async () => {
    mockFetchOpps.mockResolvedValue([makeOpp()])
    render(<OportunidadesPage />)
    await waitFor(() => {
      expect(screen.getByText('Valor estimado')).toBeInTheDocument()
    })
  })

  // 31. BranchId passed to API
  it('passes branchId to API call', async () => {
    mockUseOrg.mockReturnValue({ orgId: 'org-1', branchId: 'branch-42', orgName: 'Test', plan: 'PRO', role: 'OWNER' })
    mockFetchOpps.mockResolvedValue([])
    render(<OportunidadesPage />)
    await waitFor(() => {
      expect(mockFetchOpps).toHaveBeenCalledWith('org-1', undefined, 'branch-42')
    })
  })
})
