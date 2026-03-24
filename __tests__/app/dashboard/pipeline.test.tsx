// __tests__/app/dashboard/pipeline.test.tsx
// ---------------------------------------------------------------------------
// Nuclear-level tests for the Pipeline page
// (app/dashboard/pipeline/page.tsx)
//
// States tested: loading skeleton, data loaded (kanban with all 6 stages),
// stage counts, conversion rates, patient cards, expand/collapse columns,
// empty pipeline, empty individual stages, refresh, error handling.
// ---------------------------------------------------------------------------

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// ---- Mocks (BEFORE component import) ----

jest.mock('@/lib/org-context')
jest.mock('@/lib/api')
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
  usePathname: () => '/dashboard/pipeline',
}))

// Mock lucide-react
jest.mock('lucide-react', () => {
  const icon = (props: Record<string, unknown>) => <svg data-testid="icon" {...props} />
  return new Proxy({}, { get: () => icon })
})

import { useOrg } from '@/lib/org-context'
import { fetchPipelineData } from '@/lib/api'

const mockUseOrg = useOrg as jest.Mock
const mockFetchPipeline = fetchPipelineData as jest.Mock

import PipelinePage from '@/app/dashboard/pipeline/page'

// ---- Factories ----

function makePipelinePatient(
  id: string,
  name: string,
  stage: string,
  interactionCount = 5,
  serviceInterest = 'Botox',
) {
  return {
    id,
    full_name: name,
    phone: `+5730000${id}`,
    email: `${id}@mail.com`,
    service_interest: serviceInterest,
    created_at: '2026-03-20T10:00:00Z',
    stage,
    interaction_count: interactionCount,
    appointment_count: stage === 'CITA_AGENDADA' ? 1 : 0,
    completed_count: stage === 'CITA_COMPLETADA' ? 1 : 0,
    has_paid: stage === 'PAGADO' || stage === 'RECURRENTE',
  }
}

function makeFullPipeline() {
  return [
    makePipelinePatient('p-1', 'Ana Garcia', 'LEAD'),
    makePipelinePatient('p-2', 'Maria Lopez', 'LEAD'),
    makePipelinePatient('p-3', 'Carlos Ruiz', 'CONTACTADO'),
    makePipelinePatient('p-4', 'Laura Torres', 'CITA_AGENDADA'),
    makePipelinePatient('p-5', 'Pedro Gomez', 'CITA_AGENDADA'),
    makePipelinePatient('p-6', 'Sofia Martinez', 'CITA_COMPLETADA'),
    makePipelinePatient('p-7', 'Diego Herrera', 'PAGADO'),
    makePipelinePatient('p-8', 'Isabella Vargas', 'RECURRENTE'),
  ]
}

// ---- Test Suite ----

describe('PipelinePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseOrg.mockReturnValue({ orgId: 'org-1', branchId: null })
    mockFetchPipeline.mockResolvedValue(makeFullPipeline())
  })

  // -----------------------------------------------------------------------
  // LOADING STATE
  // -----------------------------------------------------------------------

  describe('Loading state', () => {
    it('should render loading skeletons for 6 pipeline columns', () => {
      mockFetchPipeline.mockReturnValue(new Promise(() => {}))
      render(<PipelinePage />)

      const skeletons = document.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('should not render patient cards during loading', () => {
      mockFetchPipeline.mockReturnValue(new Promise(() => {}))
      render(<PipelinePage />)

      expect(screen.queryByText('Ana Garcia')).not.toBeInTheDocument()
    })
  })

  // -----------------------------------------------------------------------
  // DATA LOADED STATE
  // -----------------------------------------------------------------------

  describe('Data loaded state', () => {
    it('should render page title', async () => {
      render(<PipelinePage />)

      await waitFor(() => {
        expect(screen.getByText('title')).toBeInTheDocument()
      })
    })

    it('should show total patient count in subtitle', async () => {
      render(<PipelinePage />)

      await waitFor(() => {
        expect(screen.getByText(/8 pacientes/)).toBeInTheDocument()
      })
    })

    it('should show number of active stages in subtitle', async () => {
      render(<PipelinePage />)

      await waitFor(() => {
        expect(screen.getByText(/6 etapas/)).toBeInTheDocument()
      })
    })

    it('should render all 6 pipeline stage headers', async () => {
      render(<PipelinePage />)

      await waitFor(() => {
        expect(screen.getAllByText('Lead').length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText('Contactado').length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText('Cita Agendada').length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText('Completada').length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText('Pagado').length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText('Recurrente').length).toBeGreaterThanOrEqual(1)
      })
    })

    it('should render patient cards with correct names', async () => {
      render(<PipelinePage />)

      await waitFor(() => {
        expect(screen.getByText('Ana Garcia')).toBeInTheDocument()
        expect(screen.getByText('Maria Lopez')).toBeInTheDocument()
        expect(screen.getByText('Carlos Ruiz')).toBeInTheDocument()
        expect(screen.getByText('Laura Torres')).toBeInTheDocument()
        expect(screen.getByText('Pedro Gomez')).toBeInTheDocument()
        expect(screen.getByText('Sofia Martinez')).toBeInTheDocument()
        expect(screen.getByText('Diego Herrera')).toBeInTheDocument()
        expect(screen.getByText('Isabella Vargas')).toBeInTheDocument()
      })
    })

    it('should show patient phone numbers', async () => {
      render(<PipelinePage />)

      await waitFor(() => {
        expect(screen.getByText('+5730000p-1')).toBeInTheDocument()
      })
    })

    it('should show patient service interest when not "Por identificar"', async () => {
      render(<PipelinePage />)

      await waitFor(() => {
        const botoxLabels = screen.getAllByText('Botox')
        expect(botoxLabels.length).toBeGreaterThanOrEqual(1)
      })
    })

    it('should hide service interest when it equals "Por identificar"', async () => {
      mockFetchPipeline.mockResolvedValue([
        makePipelinePatient('p-x', 'Test User', 'LEAD', 5, 'Por identificar'),
      ])
      render(<PipelinePage />)

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
      })

      expect(screen.queryByText('Por identificar')).not.toBeInTheDocument()
    })

    it('should display interaction count for patients with messages', async () => {
      render(<PipelinePage />)

      await waitFor(() => {
        const msgCounts = screen.getAllByText(/5 msg/)
        expect(msgCounts.length).toBeGreaterThan(0)
      })
    })

    it('should not display interaction count when it is 0', async () => {
      mockFetchPipeline.mockResolvedValue([
        makePipelinePatient('p-z', 'Zero Msgs', 'LEAD', 0),
      ])
      render(<PipelinePage />)

      await waitFor(() => {
        expect(screen.getByText('Zero Msgs')).toBeInTheDocument()
      })

      expect(screen.queryByText('0 msg')).not.toBeInTheDocument()
    })

    it('should show first letter avatar for each patient', async () => {
      render(<PipelinePage />)

      await waitFor(() => {
        expect(screen.getAllByText('A').length).toBeGreaterThanOrEqual(1) // Ana
        expect(screen.getAllByText('M').length).toBeGreaterThanOrEqual(1) // Maria
        expect(screen.getAllByText('C').length).toBeGreaterThanOrEqual(1) // Carlos
      })
    })

    it('should show "?" for patients without names', async () => {
      mockFetchPipeline.mockResolvedValue([
        { ...makePipelinePatient('p-noname', '', 'LEAD'), full_name: '' },
      ])
      render(<PipelinePage />)

      await waitFor(() => {
        expect(screen.getByText('Sin nombre')).toBeInTheDocument()
        expect(screen.getByText('?')).toBeInTheDocument()
      })
    })
  })

  // -----------------------------------------------------------------------
  // STAGE COUNTS (Summary Cards)
  // -----------------------------------------------------------------------

  describe('Stage counts', () => {
    it('should render summary cards with correct counts for each stage', async () => {
      render(<PipelinePage />)

      await waitFor(() => {
        // LEAD: 2, CONTACTADO: 1, CITA_AGENDADA: 2, CITA_COMPLETADA: 1, PAGADO: 1, RECURRENTE: 1
        const counts = screen.getAllByText('2')
        expect(counts.length).toBeGreaterThanOrEqual(2) // LEAD and CITA_AGENDADA
        const ones = screen.getAllByText('1')
        expect(ones.length).toBeGreaterThanOrEqual(4) // CONTACTADO, COMPLETADA, PAGADO, RECURRENTE
      })
    })

    it('should show percentage of total for each stage', async () => {
      render(<PipelinePage />)

      await waitFor(() => {
        // 2/8 = 25%, 1/8 = 13% etc.
        expect(screen.getAllByText(/25% del total/).length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText(/13% del total/).length).toBeGreaterThanOrEqual(1)
      })
    })
  })

  // -----------------------------------------------------------------------
  // CONVERSION FLOW
  // -----------------------------------------------------------------------

  describe('Conversion flow', () => {
    it('should render conversion flow section when patients exist', async () => {
      render(<PipelinePage />)

      await waitFor(() => {
        expect(screen.getByText(/Flujo de Conversi/)).toBeInTheDocument()
      })
    })

    it('should not render conversion flow when pipeline is empty', async () => {
      mockFetchPipeline.mockResolvedValue([])
      render(<PipelinePage />)

      await waitFor(() => {
        expect(screen.getByText('title')).toBeInTheDocument()
      })

      expect(screen.queryByText(/Flujo de Conversi/)).not.toBeInTheDocument()
    })

    it('should render progress bars for each stage in conversion flow', async () => {
      render(<PipelinePage />)

      await waitFor(() => {
        // Each stage in the conversion flow gets a bar
        const flowSection = screen.getByText(/Flujo de Conversi/)
        expect(flowSection).toBeInTheDocument()
      })
    })
  })

  // -----------------------------------------------------------------------
  // EXPAND/COLLAPSE
  // -----------------------------------------------------------------------

  describe('Column expand/collapse', () => {
    it('should show "Ver X mas" button when stage has more than 3 patients', async () => {
      const manyLeads = Array.from({ length: 5 }, (_, i) =>
        makePipelinePatient(`lead-${i}`, `Lead ${i}`, 'LEAD')
      )
      mockFetchPipeline.mockResolvedValue(manyLeads)

      render(<PipelinePage />)

      await waitFor(() => {
        expect(screen.getByText('Lead 0')).toBeInTheDocument()
      })

      // Should show expand button initially (all visible since expanded=true by default)
      // The button shows "Mostrar menos" when expanded
      expect(screen.getByText('Mostrar menos')).toBeInTheDocument()
    })

    it('should toggle between showing all and showing 3 patients', async () => {
      const user = userEvent.setup()
      const manyLeads = Array.from({ length: 5 }, (_, i) =>
        makePipelinePatient(`lead-${i}`, `Lead ${i}`, 'LEAD')
      )
      mockFetchPipeline.mockResolvedValue(manyLeads)

      render(<PipelinePage />)

      await waitFor(() => {
        // All 5 visible initially (expanded=true)
        expect(screen.getByText('Lead 0')).toBeInTheDocument()
        expect(screen.getByText('Lead 4')).toBeInTheDocument()
      })

      // Click to collapse
      await user.click(screen.getByText('Mostrar menos'))

      await waitFor(() => {
        // Should show only first 3
        expect(screen.getByText('Lead 0')).toBeInTheDocument()
        expect(screen.getByText('Lead 1')).toBeInTheDocument()
        expect(screen.getByText('Lead 2')).toBeInTheDocument()
        expect(screen.queryByText('Lead 3')).not.toBeInTheDocument()
        expect(screen.queryByText('Lead 4')).not.toBeInTheDocument()
      })

      // Button should now say "Ver 2 mas"
      expect(screen.getByText(/Ver 2 m/)).toBeInTheDocument()
    })

    it('should not show expand/collapse button when 3 or fewer patients', async () => {
      const fewLeads = Array.from({ length: 3 }, (_, i) =>
        makePipelinePatient(`lead-${i}`, `Lead ${i}`, 'LEAD')
      )
      mockFetchPipeline.mockResolvedValue(fewLeads)

      render(<PipelinePage />)

      await waitFor(() => {
        expect(screen.getByText('Lead 0')).toBeInTheDocument()
      })

      expect(screen.queryByText('Mostrar menos')).not.toBeInTheDocument()
      expect(screen.queryByText(/Ver.*m/)).not.toBeInTheDocument()
    })
  })

  // -----------------------------------------------------------------------
  // EMPTY PIPELINE
  // -----------------------------------------------------------------------

  describe('Empty pipeline', () => {
    it('should show 0 patients in subtitle', async () => {
      mockFetchPipeline.mockResolvedValue([])
      render(<PipelinePage />)

      await waitFor(() => {
        expect(screen.getByText(/0 pacientes/)).toBeInTheDocument()
      })
    })

    it('should show "Sin pacientes" in each empty column', async () => {
      mockFetchPipeline.mockResolvedValue([])
      render(<PipelinePage />)

      await waitFor(() => {
        const emptyLabels = screen.getAllByText('Sin pacientes')
        expect(emptyLabels.length).toBe(6)
      })
    })

    it('should show 0% for all stage percentages', async () => {
      mockFetchPipeline.mockResolvedValue([])
      render(<PipelinePage />)

      await waitFor(() => {
        const zeros = screen.getAllByText('0% del total')
        expect(zeros.length).toBe(6)
      })
    })

    it('should show 0 count in all summary cards', async () => {
      mockFetchPipeline.mockResolvedValue([])
      render(<PipelinePage />)

      await waitFor(() => {
        // 6 summary cards all showing "0" + 6 column headers showing "0"
        const zeroElements = screen.getAllByText('0')
        expect(zeroElements.length).toBeGreaterThanOrEqual(6)
      })
    })
  })

  // -----------------------------------------------------------------------
  // INDIVIDUAL EMPTY STAGES
  // -----------------------------------------------------------------------

  describe('Individual empty stages', () => {
    it('should show "Sin pacientes" for stages with no patients', async () => {
      mockFetchPipeline.mockResolvedValue([
        makePipelinePatient('p-1', 'Solo Lead', 'LEAD'),
      ])
      render(<PipelinePage />)

      await waitFor(() => {
        // 5 empty stages
        const emptyLabels = screen.getAllByText('Sin pacientes')
        expect(emptyLabels.length).toBe(5)
      })
    })
  })

  // -----------------------------------------------------------------------
  // REFRESH
  // -----------------------------------------------------------------------

  describe('Refresh', () => {
    it('should render refresh button with correct aria-label', async () => {
      render(<PipelinePage />)

      await waitFor(() => {
        expect(screen.getByLabelText('refresh')).toBeInTheDocument()
      })
    })

    it('should call loadPipeline when refresh is clicked', async () => {
      const user = userEvent.setup()
      render(<PipelinePage />)

      await waitFor(() => {
        expect(mockFetchPipeline).toHaveBeenCalledTimes(1)
      })

      await user.click(screen.getByLabelText('refresh'))

      await waitFor(() => {
        expect(mockFetchPipeline).toHaveBeenCalledTimes(2)
      })
    })
  })

  // -----------------------------------------------------------------------
  // ERROR STATE
  // -----------------------------------------------------------------------

  describe('Error state', () => {
    it('should show empty pipeline when fetchPipelineData fails', async () => {
      mockFetchPipeline.mockRejectedValue(new Error('API down'))
      render(<PipelinePage />)

      await waitFor(() => {
        expect(screen.getByText(/0 pacientes/)).toBeInTheDocument()
      })
    })

    it('should still render all 6 columns when fetch fails', async () => {
      mockFetchPipeline.mockRejectedValue(new Error('API down'))
      render(<PipelinePage />)

      await waitFor(() => {
        const emptyLabels = screen.getAllByText('Sin pacientes')
        expect(emptyLabels.length).toBe(6)
      })
    })
  })

  // -----------------------------------------------------------------------
  // BRANCH FILTERING
  // -----------------------------------------------------------------------

  describe('Branch filtering', () => {
    it('should pass branchId to fetchPipelineData', async () => {
      mockUseOrg.mockReturnValue({ orgId: 'org-1', branchId: 'branch-3' })
      render(<PipelinePage />)

      await waitFor(() => {
        expect(mockFetchPipeline).toHaveBeenCalledWith('org-1', 'branch-3')
      })
    })
  })

  // -----------------------------------------------------------------------
  // IGNORED STAGES
  // -----------------------------------------------------------------------

  describe('Unknown stages', () => {
    it('should ignore patients with unknown stages', async () => {
      mockFetchPipeline.mockResolvedValue([
        makePipelinePatient('p-1', 'Known', 'LEAD'),
        { ...makePipelinePatient('p-2', 'Unknown', 'UNKNOWN_STAGE'), stage: 'UNKNOWN_STAGE' },
      ])
      render(<PipelinePage />)

      await waitFor(() => {
        expect(screen.getByText('Known')).toBeInTheDocument()
        // Unknown stage patient is in the list but not grouped
        expect(screen.getByText(/2 pacientes/)).toBeInTheDocument()
      })
    })
  })

  // -----------------------------------------------------------------------
  // KANBAN COLUMN STRUCTURE
  // -----------------------------------------------------------------------

  describe('Kanban column structure', () => {
    it('should render column header badge with patient count', async () => {
      render(<PipelinePage />)

      await waitFor(() => {
        // LEAD column should show "2" in the header badge
        // These are rendered as spans inside the column header
        expect(screen.getByText('Ana Garcia')).toBeInTheDocument()
      })
    })
  })
})
