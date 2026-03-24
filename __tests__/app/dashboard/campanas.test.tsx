// __tests__/app/dashboard/campanas.test.tsx
// ---------------------------------------------------------------------------
// Nuclear-level tests for the Campanas (Campaigns/Marketing) page
// (app/dashboard/campanas/page.tsx)
//
// States tested: loading skeleton, campaign list, status badges via component,
// analytics cards, create campaign modal (name, template, segment criteria,
// AI suggest, variable pills), preview modal, schedule modal, cancel campaign,
// results button, empty state, error state, refresh.
// ---------------------------------------------------------------------------

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// ---- Mocks (BEFORE component import) ----

jest.mock('@/lib/org-context')
jest.mock('@/lib/api/campaigns')
jest.mock('@/lib/api/helpers', () => ({
  formatCOP: (n: number) => `$${n.toLocaleString()}`,
}))
jest.mock('@/components/campaign-status-badge', () => ({
  CampaignStatusBadge: ({ status }: { status: string }) => (
    <span data-testid={`badge-${status}`}>{status}</span>
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
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn(), back: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/campanas',
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
  listCampaigns,
  createCampaign,
  previewCampaign,
  scheduleCampaign,
  executeCampaign,
  cancelCampaign,
  getCampaignAnalytics,
  suggestSegment,
} from '@/lib/api/campaigns'

const mockUseOrg = useOrg as jest.Mock
const mockListCampaigns = listCampaigns as jest.Mock
const mockCreateCampaign = createCampaign as jest.Mock
const mockPreviewCampaign = previewCampaign as jest.Mock
const mockScheduleCampaign = scheduleCampaign as jest.Mock
const mockExecuteCampaign = executeCampaign as jest.Mock
const mockCancelCampaign = cancelCampaign as jest.Mock
const mockGetAnalytics = getCampaignAnalytics as jest.Mock
const mockSuggestSegment = suggestSegment as jest.Mock

import CampanasPage from '@/app/dashboard/campanas/page'

// ---- Factories ----

function makeCampaign(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: overrides.id ?? 'camp-1',
    name: overrides.name ?? 'Promo Botox Marzo',
    message_template: overrides.message_template ?? 'Hola {patient_name}, tenemos una promo especial.',
    segment_criteria: overrides.segment_criteria ?? { gender: 'F', age_range: [25, 55] },
    status: overrides.status ?? 'DRAFT',
    scheduled_at: overrides.scheduled_at ?? null,
    stats: overrides.stats ?? { sent: 0, delivered: 0, responded: 0, converted: 0, revenue: 0 },
    created_at: '2026-03-20T10:00:00Z',
  }
}

function makeAnalytics() {
  return {
    total_campaigns: 5,
    total_sent: 1200,
    avg_conversion_rate: 0.082,
    total_revenue: 2500000,
    best_performing: 'Promo Diciembre',
  }
}

// ---- Setup ----

beforeEach(() => {
  jest.clearAllMocks()
  mockUseOrg.mockReturnValue({ orgId: 'org-1', branchId: null, orgName: 'Test Clinic', plan: 'PRO', role: 'OWNER' })
})

// ---- Tests ----

describe('CampanasPage', () => {
  // 1. Loading skeleton
  it('renders loading skeleton while fetching data', () => {
    mockListCampaigns.mockReturnValue(new Promise(() => {}))
    mockGetAnalytics.mockReturnValue(new Promise(() => {}))
    render(<CampanasPage />)
    const pulseElements = document.querySelectorAll('.animate-pulse')
    expect(pulseElements.length).toBeGreaterThan(0)
  })

  // 2. Campaign list renders with names
  it('renders campaign list with campaign names', async () => {
    mockListCampaigns.mockResolvedValue([
      makeCampaign({ id: 'c-1', name: 'Promo Botox' }),
      makeCampaign({ id: 'c-2', name: 'Reactivacion Pacientes' }),
    ])
    mockGetAnalytics.mockResolvedValue(makeAnalytics())
    render(<CampanasPage />)
    await waitFor(() => {
      expect(screen.getByText('Promo Botox')).toBeInTheDocument()
      expect(screen.getByText('Reactivacion Pacientes')).toBeInTheDocument()
    })
  })

  // 3. Campaign status badge renders
  it('renders CampaignStatusBadge for each campaign', async () => {
    mockListCampaigns.mockResolvedValue([
      makeCampaign({ id: 'c-1', status: 'DRAFT' }),
      makeCampaign({ id: 'c-2', status: 'COMPLETED' }),
    ])
    mockGetAnalytics.mockResolvedValue(makeAnalytics())
    render(<CampanasPage />)
    await waitFor(() => {
      expect(screen.getByTestId('badge-DRAFT')).toBeInTheDocument()
      expect(screen.getByTestId('badge-COMPLETED')).toBeInTheDocument()
    })
  })

  // 4. Analytics cards render
  it('renders analytics cards with correct values', async () => {
    mockListCampaigns.mockResolvedValue([])
    mockGetAnalytics.mockResolvedValue(makeAnalytics())
    render(<CampanasPage />)
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('1,200')).toBeInTheDocument()
      expect(screen.getByText('8.2%')).toBeInTheDocument()
      expect(screen.getByText('$2,500,000')).toBeInTheDocument()
    })
  })

  // 5. Empty state
  it('shows empty state when no campaigns exist', async () => {
    mockListCampaigns.mockResolvedValue([])
    mockGetAnalytics.mockResolvedValue(null)
    render(<CampanasPage />)
    await waitFor(() => {
      expect(screen.getByText('noCampaigns')).toBeInTheDocument()
      expect(screen.getByText('noCampaignsHint')).toBeInTheDocument()
    })
  })

  // 6. Refresh button
  it('re-fetches data on refresh click', async () => {
    const user = userEvent.setup()
    mockListCampaigns.mockResolvedValue([makeCampaign()])
    mockGetAnalytics.mockResolvedValue(makeAnalytics())
    render(<CampanasPage />)
    await waitFor(() => expect(screen.getByText('Promo Botox Marzo')).toBeInTheDocument())

    await user.click(screen.getByLabelText('refresh'))
    await waitFor(() => {
      expect(mockListCampaigns).toHaveBeenCalledTimes(2)
      expect(mockGetAnalytics).toHaveBeenCalledTimes(2)
    })
  })

  // 7. Create campaign modal opens
  it('opens create campaign modal on new campaign button click', async () => {
    const user = userEvent.setup()
    mockListCampaigns.mockResolvedValue([])
    mockGetAnalytics.mockResolvedValue(null)
    render(<CampanasPage />)
    await waitFor(() => expect(screen.getByText('noCampaigns')).toBeInTheDocument())

    await user.click(screen.getByText(/newCampaign/))
    await waitFor(() => {
      expect(screen.getByText('createTitle')).toBeInTheDocument()
      expect(screen.getByText('campaignName')).toBeInTheDocument()
      expect(screen.getByText('messageTemplate')).toBeInTheDocument()
    })
  })

  // 8. Create form — input fields
  it('allows typing campaign name and message template', async () => {
    const user = userEvent.setup()
    mockListCampaigns.mockResolvedValue([])
    mockGetAnalytics.mockResolvedValue(null)
    render(<CampanasPage />)
    await waitFor(() => expect(screen.getByText('noCampaigns')).toBeInTheDocument())

    await user.click(screen.getByText(/newCampaign/))
    await waitFor(() => expect(screen.getByText('createTitle')).toBeInTheDocument())

    const nameInput = screen.getByPlaceholderText('campaignNamePlaceholder')
    const templateArea = screen.getByPlaceholderText('messageTemplatePlaceholder')

    await user.type(nameInput, 'Mi Campana')
    await user.type(templateArea, 'Hola mundo')

    expect(nameInput).toHaveValue('Mi Campana')
    expect(templateArea).toHaveValue('Hola mundo')
  })

  // 9. Variable pills
  it('renders variable pills and inserts them into template', async () => {
    const user = userEvent.setup()
    mockListCampaigns.mockResolvedValue([])
    mockGetAnalytics.mockResolvedValue(null)
    render(<CampanasPage />)
    await waitFor(() => expect(screen.getByText('noCampaigns')).toBeInTheDocument())

    await user.click(screen.getByText(/newCampaign/))
    await waitFor(() => expect(screen.getByText('createTitle')).toBeInTheDocument())

    expect(screen.getByText('{patient_name}')).toBeInTheDocument()
    expect(screen.getByText('{service}')).toBeInTheDocument()
    expect(screen.getByText('{clinica}')).toBeInTheDocument()
    expect(screen.getByText('{doctor}')).toBeInTheDocument()
    expect(screen.getByText('{fecha}')).toBeInTheDocument()

    await user.click(screen.getByText('{patient_name}'))
    const templateArea = screen.getByPlaceholderText('messageTemplatePlaceholder')
    expect(templateArea).toHaveValue('{patient_name}')
  })

  // 10. Create campaign — submit
  it('creates campaign on form submit', async () => {
    const user = userEvent.setup()
    mockListCampaigns.mockResolvedValue([])
    mockGetAnalytics.mockResolvedValue(null)
    mockCreateCampaign.mockResolvedValue({})
    render(<CampanasPage />)
    await waitFor(() => expect(screen.getByText('noCampaigns')).toBeInTheDocument())

    await user.click(screen.getByText(/newCampaign/))
    await waitFor(() => expect(screen.getByText('createTitle')).toBeInTheDocument())

    await user.type(screen.getByPlaceholderText('campaignNamePlaceholder'), 'Test Campaign')
    await user.type(screen.getByPlaceholderText('messageTemplatePlaceholder'), 'Hello')
    await user.click(screen.getByText('createCampaign'))

    await waitFor(() => {
      expect(mockCreateCampaign).toHaveBeenCalledWith('org-1', expect.objectContaining({
        name: 'Test Campaign',
        message_template: 'Hello',
      }))
    })
  })

  // 11. Create campaign — disabled when empty
  it('disables create button when name or template empty', async () => {
    const user = userEvent.setup()
    mockListCampaigns.mockResolvedValue([])
    mockGetAnalytics.mockResolvedValue(null)
    render(<CampanasPage />)
    await waitFor(() => expect(screen.getByText('noCampaigns')).toBeInTheDocument())

    await user.click(screen.getByText(/newCampaign/))
    await waitFor(() => expect(screen.getByText('createTitle')).toBeInTheDocument())

    const createBtn = screen.getByText('createCampaign')
    expect(createBtn).toBeDisabled()
  })

  // 12. Segment criteria section
  it('renders segment criteria fields in create modal', async () => {
    const user = userEvent.setup()
    mockListCampaigns.mockResolvedValue([])
    mockGetAnalytics.mockResolvedValue(null)
    render(<CampanasPage />)
    await waitFor(() => expect(screen.getByText('noCampaigns')).toBeInTheDocument())

    await user.click(screen.getByText(/newCampaign/))
    await waitFor(() => {
      expect(screen.getByText('segmentCriteria')).toBeInTheDocument()
      expect(screen.getByText('ageRange')).toBeInTheDocument()
      expect(screen.getByText('gender')).toBeInTheDocument()
      expect(screen.getByText('lastVisitDays')).toBeInTheDocument()
      expect(screen.getByText('minLeadScore')).toBeInTheDocument()
      expect(screen.getByText('minLTVTier')).toBeInTheDocument()
      expect(screen.getByText('excludeRecent')).toBeInTheDocument()
    })
  })

  // 13. AI suggest segment
  it('calls suggestSegment when AI button clicked with goal', async () => {
    const user = userEvent.setup()
    mockListCampaigns.mockResolvedValue([])
    mockGetAnalytics.mockResolvedValue(null)
    mockSuggestSegment.mockResolvedValue({ criteria: { gender: 'F', min_lead_score: 'HOT' }, explanation: 'Mujeres con score alto' })
    render(<CampanasPage />)
    await waitFor(() => expect(screen.getByText('noCampaigns')).toBeInTheDocument())

    await user.click(screen.getByText(/newCampaign/))
    await waitFor(() => expect(screen.getByText('createTitle')).toBeInTheDocument())

    const aiInput = screen.getByPlaceholderText('aiGoalPlaceholder')
    await user.type(aiInput, 'Quiero llegar a pacientes premium')
    await user.click(screen.getByText('aiSuggest'))

    await waitFor(() => {
      expect(mockSuggestSegment).toHaveBeenCalledWith('org-1', 'Quiero llegar a pacientes premium')
      expect(screen.getByText('Mujeres con score alto')).toBeInTheDocument()
    })
  })

  // 14. Preview campaign modal
  it('opens preview modal and shows matching patients', async () => {
    const user = userEvent.setup()
    mockListCampaigns.mockResolvedValue([makeCampaign()])
    mockGetAnalytics.mockResolvedValue(makeAnalytics())
    mockPreviewCampaign.mockResolvedValue({
      matching_patients: 42,
      sample_messages: [
        { patient_name: 'Ana Garcia', message: 'Hola Ana, tenemos una promo.' },
      ],
    })
    render(<CampanasPage />)
    await waitFor(() => expect(screen.getByText('Promo Botox Marzo')).toBeInTheDocument())

    // Click the eye (preview) button
    const previewButtons = screen.getAllByTitle('preview')
    await user.click(previewButtons[0])

    await waitFor(() => {
      expect(screen.getByText('previewTitle')).toBeInTheDocument()
      expect(screen.getByText('42')).toBeInTheDocument()
      expect(screen.getByText('matchingPatients')).toBeInTheDocument()
      expect(screen.getByText('Ana Garcia')).toBeInTheDocument()
      expect(screen.getByText('Hola Ana, tenemos una promo.')).toBeInTheDocument()
    })
  })

  // 15. Preview — unavailable
  it('shows preview unavailable when preview returns null', async () => {
    const user = userEvent.setup()
    mockListCampaigns.mockResolvedValue([makeCampaign()])
    mockGetAnalytics.mockResolvedValue(makeAnalytics())
    mockPreviewCampaign.mockResolvedValue(null)
    render(<CampanasPage />)
    await waitFor(() => expect(screen.getByText('Promo Botox Marzo')).toBeInTheDocument())

    const previewButtons = screen.getAllByTitle('preview')
    await user.click(previewButtons[0])

    await waitFor(() => {
      expect(screen.getByText('previewUnavailable')).toBeInTheDocument()
    })
  })

  // 16. Schedule button visible for DRAFT
  it('shows schedule button for DRAFT campaigns', async () => {
    mockListCampaigns.mockResolvedValue([makeCampaign({ status: 'DRAFT' })])
    mockGetAnalytics.mockResolvedValue(makeAnalytics())
    render(<CampanasPage />)
    await waitFor(() => {
      expect(screen.getByTitle('schedule')).toBeInTheDocument()
    })
  })

  // 17. Schedule button NOT visible for COMPLETED
  it('does not show schedule button for COMPLETED campaigns', async () => {
    mockListCampaigns.mockResolvedValue([makeCampaign({ status: 'COMPLETED', stats: { sent: 100, delivered: 95, responded: 20, converted: 5, revenue: 500000 } })])
    mockGetAnalytics.mockResolvedValue(makeAnalytics())
    render(<CampanasPage />)
    await waitFor(() => expect(screen.getByText('Promo Botox Marzo')).toBeInTheDocument())
    expect(screen.queryByTitle('schedule')).not.toBeInTheDocument()
  })

  // 18. Cancel button for DRAFT and SCHEDULED
  it('shows cancel button for DRAFT and SCHEDULED campaigns', async () => {
    mockListCampaigns.mockResolvedValue([
      makeCampaign({ id: 'c-1', status: 'DRAFT' }),
      makeCampaign({ id: 'c-2', status: 'SCHEDULED', scheduled_at: '2026-04-01T09:00:00' }),
    ])
    mockGetAnalytics.mockResolvedValue(makeAnalytics())
    render(<CampanasPage />)
    await waitFor(() => {
      const cancelButtons = screen.getAllByTitle('cancel')
      expect(cancelButtons).toHaveLength(2)
    })
  })

  // 19. Cancel campaign
  it('calls cancelCampaign when cancel button clicked', async () => {
    const user = userEvent.setup()
    mockListCampaigns.mockResolvedValue([makeCampaign({ id: 'c-1', status: 'DRAFT' })])
    mockGetAnalytics.mockResolvedValue(makeAnalytics())
    mockCancelCampaign.mockResolvedValue({})
    render(<CampanasPage />)
    await waitFor(() => expect(screen.getByText('Promo Botox Marzo')).toBeInTheDocument())

    await user.click(screen.getByTitle('cancel'))
    await waitFor(() => {
      expect(mockCancelCampaign).toHaveBeenCalledWith('org-1', 'c-1')
    })
  })

  // 20. Results button for COMPLETED
  it('shows results button for COMPLETED campaigns', async () => {
    mockListCampaigns.mockResolvedValue([makeCampaign({
      status: 'COMPLETED',
      stats: { sent: 100, delivered: 95, responded: 20, converted: 5, revenue: 500000 },
    })])
    mockGetAnalytics.mockResolvedValue(makeAnalytics())
    render(<CampanasPage />)
    await waitFor(() => {
      expect(screen.getByTitle('viewResults')).toBeInTheDocument()
    })
  })

  // 21. Campaign stats preview for completed
  it('displays stats for completed campaigns', async () => {
    mockListCampaigns.mockResolvedValue([makeCampaign({
      status: 'COMPLETED',
      stats: { sent: 100, delivered: 95, responded: 20, converted: 7, revenue: 500000 },
    })])
    mockGetAnalytics.mockResolvedValue(makeAnalytics())
    render(<CampanasPage />)
    await waitFor(() => {
      expect(screen.getByText('100')).toBeInTheDocument()
      expect(screen.getByText('95')).toBeInTheDocument()
      expect(screen.getByText('20')).toBeInTheDocument()
      expect(screen.getByText('7')).toBeInTheDocument()
      expect(screen.getByText('$500,000')).toBeInTheDocument()
    })
  })

  // 22. Scheduled campaign shows date
  it('displays scheduled date for SCHEDULED campaigns', async () => {
    mockListCampaigns.mockResolvedValue([makeCampaign({
      status: 'SCHEDULED',
      scheduled_at: '2026-04-01T09:00:00',
    })])
    mockGetAnalytics.mockResolvedValue(makeAnalytics())
    render(<CampanasPage />)
    await waitFor(() => expect(screen.getByText('Promo Botox Marzo')).toBeInTheDocument())
    // The scheduled date text should be rendered (locale formatted)
    const dateElements = document.querySelectorAll('[class*="text-status-info"]')
    expect(dateElements.length).toBeGreaterThan(0)
  })

  // 23. Segment summary in campaign card
  it('displays segment summary on campaign card', async () => {
    mockListCampaigns.mockResolvedValue([makeCampaign({
      segment_criteria: { gender: 'F', age_range: [25, 55] },
    })])
    mockGetAnalytics.mockResolvedValue(makeAnalytics())
    render(<CampanasPage />)
    await waitFor(() => {
      expect(screen.getByText(/25-55 anos/)).toBeInTheDocument()
      expect(screen.getByText(/Mujeres/)).toBeInTheDocument()
    })
  })

  // 24. Error state — Sentry capture
  it('handles API error and captures with Sentry', async () => {
    const Sentry = require('@sentry/nextjs')
    mockListCampaigns.mockRejectedValue(new Error('API down'))
    mockGetAnalytics.mockRejectedValue(new Error('API down'))
    render(<CampanasPage />)
    await waitFor(() => {
      expect(Sentry.captureException).toHaveBeenCalled()
    })
  })

  // 25. Create modal — close button
  it('closes create modal when X button clicked', async () => {
    const user = userEvent.setup()
    mockListCampaigns.mockResolvedValue([])
    mockGetAnalytics.mockResolvedValue(null)
    render(<CampanasPage />)
    await waitFor(() => expect(screen.getByText('noCampaigns')).toBeInTheDocument())

    await user.click(screen.getByText(/newCampaign/))
    await waitFor(() => expect(screen.getByText('createTitle')).toBeInTheDocument())

    // Click the X button (close)
    const closeButtons = document.querySelectorAll('[class*="bg-surface-3"]')
    // Find the X close button inside the modal
    const closeBtn = Array.from(closeButtons).find(el => el.tagName === 'BUTTON' && el.closest('.fixed'))
    if (closeBtn) await user.click(closeBtn as HTMLElement)

    await waitFor(() => {
      expect(screen.queryByText('createTitle')).not.toBeInTheDocument()
    })
  })

  // 26. Schedule modal opens with send now toggle
  it('opens schedule modal with send now / schedule for options', async () => {
    const user = userEvent.setup()
    mockListCampaigns.mockResolvedValue([makeCampaign({ status: 'DRAFT' })])
    mockGetAnalytics.mockResolvedValue(makeAnalytics())
    render(<CampanasPage />)
    await waitFor(() => expect(screen.getByText('Promo Botox Marzo')).toBeInTheDocument())

    await user.click(screen.getByTitle('schedule'))
    await waitFor(() => {
      expect(screen.getByText('scheduleTitle')).toBeInTheDocument()
      expect(screen.getByText('scheduleFor')).toBeInTheDocument()
      expect(screen.getByText('sendNow')).toBeInTheDocument()
    })
  })

  // 27. Header title and subtitle
  it('renders page header with title and subtitle', async () => {
    mockListCampaigns.mockResolvedValue([])
    mockGetAnalytics.mockResolvedValue(null)
    render(<CampanasPage />)
    await waitFor(() => {
      expect(screen.getByText('title')).toBeInTheDocument()
      expect(screen.getByText('subtitle')).toBeInTheDocument()
    })
  })

  // 28. Analytics hidden when null
  it('does not render analytics cards when analytics is null', async () => {
    mockListCampaigns.mockResolvedValue([])
    mockGetAnalytics.mockResolvedValue(null)
    render(<CampanasPage />)
    await waitFor(() => expect(screen.getByText('noCampaigns')).toBeInTheDocument())
    expect(screen.queryByText('totalCampaigns')).not.toBeInTheDocument()
  })
})
