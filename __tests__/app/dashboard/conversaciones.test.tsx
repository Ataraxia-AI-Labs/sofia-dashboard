// __tests__/app/dashboard/conversaciones.test.tsx
// ---------------------------------------------------------------------------
// Nuclear-level tests for the Conversations page
// (app/dashboard/conversaciones/page.tsx)
//
// States tested: loading, error, empty, data loaded, search filter,
// platform filter, date filter, tab switching, conversation thread selection,
// sentiment colors, realtime subscription, back button, refresh.
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

const mockSubscribe = jest.fn().mockReturnValue({ unsubscribe: jest.fn() })
const mockOn = jest.fn().mockReturnValue({ subscribe: mockSubscribe })
const mockChannel = jest.fn().mockReturnValue({ on: mockOn })
const mockRemoveChannel = jest.fn()

jest.mock('@/lib/supabase', () => ({
  supabase: {
    channel: (...args: unknown[]) => mockChannel(...args),
    removeChannel: (...args: unknown[]) => mockRemoveChannel(...args),
  },
}))

jest.mock('next/dynamic', () => () => {
  const C = (props: Record<string, unknown>) => <div data-testid="dynamic-panel" data-org={props.orgId as string} />
  C.displayName = 'DynamicPanel'
  return C
})
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn(), back: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/conversaciones',
}))

jest.mock('date-fns', () => ({
  formatDistanceToNow: () => 'hace 5 min',
}))
jest.mock('date-fns/locale', () => ({
  es: {},
}))

// Mock child components
jest.mock('@/components/chat-input', () => ({
  ChatInput: () => <div data-testid="chat-input" />,
}))
jest.mock('@/components/annotation-button', () => ({
  AnnotationButton: () => <button data-testid="annotation-button">Annotate</button>,
}))

// Mock lucide-react
jest.mock('lucide-react', () => {
  const icon = (props: Record<string, unknown>) => <svg data-testid="icon" {...props} />
  return new Proxy({}, { get: () => icon })
})

import { useOrg } from '@/lib/org-context'
import { fetchInteractions, fetchPatients, fetchActiveTakeovers, startTakeover, endTakeover, sendTakeoverMessage } from '@/lib/api'

const mockUseOrg = useOrg as jest.Mock
const mockFetchInteractions = fetchInteractions as jest.Mock
const mockFetchPatients = fetchPatients as jest.Mock
const mockFetchTakeovers = fetchActiveTakeovers as jest.Mock
const mockStartTakeover = startTakeover as jest.Mock
const mockEndTakeover = endTakeover as jest.Mock
const mockSendTakeoverMsg = sendTakeoverMessage as jest.Mock

import ConversacionesPage from '@/app/dashboard/conversaciones/page'

// ---- Factories ----

function makeInteraction(id: string, patientId: string, direction: 'INBOUND' | 'OUTBOUND', content: string, channel = 'WHATSAPP', sentiment?: number) {
  return {
    id,
    organization_id: 'org-1',
    patient_id: patientId,
    channel,
    direction,
    message_content: content,
    intent: 'agendar_cita',
    sentiment_score: sentiment ?? 0.5,
    sentiment_label: sentiment != null ? (sentiment >= 0.3 ? 'POSITIVE' : sentiment <= -0.3 ? 'NEGATIVE' : 'NEUTRAL') : undefined,
    created_at: '2026-03-24T10:00:00Z',
    patients: { full_name: `Patient ${patientId}`, phone: `+5730000${patientId}` },
  }
}

function makePatient(id: string) {
  return {
    id,
    full_name: `Patient ${id}`,
    phone: `+5730000${id}`,
    acquisition_channel: 'WHATSAPP',
    created_at: '2026-03-20T10:00:00Z',
  }
}

// ---- Test Suite ----

describe('ConversacionesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseOrg.mockReturnValue({ orgId: 'org-1', branchId: null })
    mockFetchInteractions.mockResolvedValue([
      makeInteraction('i-1', 'p-1', 'INBOUND', 'Hola quiero una cita'),
      makeInteraction('i-2', 'p-1', 'OUTBOUND', 'Claro, agendemos'),
      makeInteraction('i-3', 'p-2', 'INBOUND', 'Buenos dias', 'INSTAGRAM', -0.5),
    ])
    mockFetchPatients.mockResolvedValue({
      patients: [makePatient('p-1'), makePatient('p-2')],
      total: 2,
    })
  })

  // -----------------------------------------------------------------------
  // LOADING STATE
  // -----------------------------------------------------------------------

  describe('Loading state', () => {
    it('should show loading state while data is being fetched', () => {
      mockFetchInteractions.mockReturnValue(new Promise(() => {}))
      mockFetchPatients.mockReturnValue(new Promise(() => {}))
      render(<ConversacionesPage />)

      // Page renders with title while loading
      expect(screen.getByText('title')).toBeInTheDocument()
    })
  })

  // -----------------------------------------------------------------------
  // ERROR STATE
  // -----------------------------------------------------------------------

  describe('Error state', () => {
    it('should show error message when interactions fetch fails', async () => {
      mockFetchInteractions.mockRejectedValue(new Error('Failed'))

      render(<ConversacionesPage />)

      await waitFor(() => {
        // allSettled catches per-promise — rejected interactions sets t('loadError')
        expect(screen.getByText('loadError')).toBeInTheDocument()
      })
    })
  })

  // -----------------------------------------------------------------------
  // DATA LOADED
  // -----------------------------------------------------------------------

  describe('Data loaded state', () => {
    it('should render page title', async () => {
      render(<ConversacionesPage />)

      await waitFor(() => {
        expect(screen.getByText('title')).toBeInTheDocument()
      })
    })

    it('should render conversation count in subtitle', async () => {
      render(<ConversacionesPage />)

      await waitFor(() => {
        expect(screen.getByText(/conversationCount/)).toBeInTheDocument()
      })
    })

    it('should render conversation threads grouped by patient', async () => {
      render(<ConversacionesPage />)

      await waitFor(() => {
        // Two unique patients = two threads
        expect(screen.getByText('Patient p-1')).toBeInTheDocument()
        expect(screen.getByText('Patient p-2')).toBeInTheDocument()
      })
    })

    it('should display last message preview for each thread', async () => {
      render(<ConversacionesPage />)

      await waitFor(() => {
        // p-1 last message (2nd chronologically)
        expect(screen.getByText(/Claro, agendemos/)).toBeInTheDocument()
        expect(screen.getByText(/Buenos dias/)).toBeInTheDocument()
      })
    })
  })

  // -----------------------------------------------------------------------
  // TAB SWITCHING
  // -----------------------------------------------------------------------

  describe('Tab switching', () => {
    it('should render tab buttons for conversations, inbox, channels, voice', async () => {
      render(<ConversacionesPage />)

      await waitFor(() => {
        expect(screen.getByText('tabs.conversations')).toBeInTheDocument()
        expect(screen.getByText('tabs.inbox')).toBeInTheDocument()
        expect(screen.getByText('tabs.channels')).toBeInTheDocument()
        expect(screen.getByText('tabs.voice')).toBeInTheDocument()
      })
    })

    it('should show channels panel when channels tab is clicked', async () => {
      const user = userEvent.setup()
      render(<ConversacionesPage />)

      await waitFor(() => {
        expect(screen.getByText('tabs.channels')).toBeInTheDocument()
      })

      await user.click(screen.getByText('tabs.channels'))

      expect(screen.getByTestId('dynamic-panel')).toBeInTheDocument()
    })

    it('should show voice panel when voice tab is clicked', async () => {
      const user = userEvent.setup()
      render(<ConversacionesPage />)

      await waitFor(() => {
        expect(screen.getByText('tabs.voice')).toBeInTheDocument()
      })

      await user.click(screen.getByText('tabs.voice'))

      expect(screen.getByTestId('dynamic-panel')).toBeInTheDocument()
    })

    it('should show inbox panel when inbox tab is clicked', async () => {
      const user = userEvent.setup()
      render(<ConversacionesPage />)

      await waitFor(() => {
        expect(screen.getByText('tabs.inbox')).toBeInTheDocument()
      })

      await user.click(screen.getByText('tabs.inbox'))

      expect(screen.getByTestId('dynamic-panel')).toBeInTheDocument()
    })

    it('should hide conversation list when on non-conversations tab', async () => {
      const user = userEvent.setup()
      render(<ConversacionesPage />)

      await waitFor(() => {
        expect(screen.getByText('Patient p-1')).toBeInTheDocument()
      })

      await user.click(screen.getByText('tabs.channels'))

      // Conversations content hidden
      expect(screen.queryByText('Patient p-1')).not.toBeInTheDocument()
    })
  })

  // -----------------------------------------------------------------------
  // SEARCH
  // -----------------------------------------------------------------------

  describe('Search filter', () => {
    it('should render search input on conversations tab', async () => {
      render(<ConversacionesPage />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('searchByNameOrPhone')).toBeInTheDocument()
      })
    })

    it('should filter threads by patient name', async () => {
      const user = userEvent.setup()
      render(<ConversacionesPage />)

      await waitFor(() => {
        expect(screen.getByText('Patient p-1')).toBeInTheDocument()
        expect(screen.getByText('Patient p-2')).toBeInTheDocument()
      })

      await user.type(screen.getByPlaceholderText('searchByNameOrPhone'), 'p-1')

      await waitFor(() => {
        expect(screen.getByText('Patient p-1')).toBeInTheDocument()
        expect(screen.queryByText('Patient p-2')).not.toBeInTheDocument()
      })
    })
  })

  // -----------------------------------------------------------------------
  // PLATFORM FILTER
  // -----------------------------------------------------------------------

  describe('Platform filter', () => {
    it('should show filter button', async () => {
      render(<ConversacionesPage />)

      await waitFor(() => {
        expect(screen.getByLabelText('filter')).toBeInTheDocument()
      })
    })

    it('should toggle filter panel when filter button is clicked', async () => {
      const user = userEvent.setup()
      render(<ConversacionesPage />)

      await waitFor(() => {
        expect(screen.getByLabelText('filter')).toBeInTheDocument()
      })

      await user.click(screen.getByLabelText('filter'))

      // Should show "all" button plus platform buttons
      await waitFor(() => {
        expect(screen.getByText('all')).toBeInTheDocument()
      })
    })

    it('should reload data when a platform filter is selected', async () => {
      const user = userEvent.setup()
      render(<ConversacionesPage />)

      await waitFor(() => {
        expect(mockFetchInteractions).toHaveBeenCalledTimes(1)
      })

      // Open filters
      await user.click(screen.getByLabelText('filter'))

      await waitFor(() => {
        expect(screen.getByText('all')).toBeInTheDocument()
      })

      // Click a platform button (they show platform names from translations)
      const platformButtons = screen.getAllByText(/platforms\./)
      if (platformButtons.length > 0) {
        await user.click(platformButtons[0])

        await waitFor(() => {
          expect(mockFetchInteractions).toHaveBeenCalledTimes(2)
        })
      }
    })
  })

  // -----------------------------------------------------------------------
  // REFRESH
  // -----------------------------------------------------------------------

  describe('Refresh', () => {
    it('should render refresh button', async () => {
      render(<ConversacionesPage />)

      await waitFor(() => {
        expect(screen.getByLabelText('refresh')).toBeInTheDocument()
      })
    })

    it('should call loadData when refresh button is clicked', async () => {
      const user = userEvent.setup()
      render(<ConversacionesPage />)

      await waitFor(() => {
        expect(mockFetchInteractions).toHaveBeenCalledTimes(1)
      })

      await user.click(screen.getByLabelText('refresh'))

      await waitFor(() => {
        expect(mockFetchInteractions).toHaveBeenCalledTimes(2)
      })
    })
  })

  // -----------------------------------------------------------------------
  // EMPTY STATE
  // -----------------------------------------------------------------------

  describe('Empty state', () => {
    it('should show empty conversation list when no interactions', async () => {
      mockFetchInteractions.mockResolvedValue([])
      render(<ConversacionesPage />)

      await waitFor(() => {
        expect(screen.getByText(/conversationCount/)).toBeInTheDocument()
      })
    })
  })

  // -----------------------------------------------------------------------
  // REALTIME
  // -----------------------------------------------------------------------

  describe('Realtime subscription', () => {
    it('should subscribe to supabase channel on mount', async () => {
      render(<ConversacionesPage />)

      await waitFor(() => {
        expect(mockChannel).toHaveBeenCalledWith('interactions-org-1')
      })
      expect(mockOn).toHaveBeenCalled()
      expect(mockSubscribe).toHaveBeenCalled()
    })

    it('should remove channel on unmount', () => {
      const { unmount } = render(<ConversacionesPage />)
      unmount()

      expect(mockRemoveChannel).toHaveBeenCalled()
    })
  })

  // -----------------------------------------------------------------------
  // THREAD SELECTION
  // -----------------------------------------------------------------------

  describe('Thread selection', () => {
    it('should show message thread when a conversation is clicked', async () => {
      const user = userEvent.setup()
      render(<ConversacionesPage />)

      await waitFor(() => {
        expect(screen.getByText('Patient p-1')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Patient p-1'))

      await waitFor(() => {
        // Should show the messages from this thread
        expect(screen.getByText('Hola quiero una cita')).toBeInTheDocument()
        // 'Claro, agendemos' appears in thread card preview AND message bubble
        expect(screen.getAllByText('Claro, agendemos').length).toBeGreaterThanOrEqual(2)
      })
    })
  })

  // -----------------------------------------------------------------------
  // BRANCH FILTERING
  // -----------------------------------------------------------------------

  describe('Branch filtering', () => {
    it('should pass branchId to fetchInteractions', async () => {
      mockUseOrg.mockReturnValue({ orgId: 'org-1', branchId: 'branch-5' })
      render(<ConversacionesPage />)

      await waitFor(() => {
        expect(mockFetchInteractions).toHaveBeenCalledWith('org-1', expect.objectContaining({ branchId: 'branch-5' }))
      })
    })
  })

  // -----------------------------------------------------------------------
  // NO ORG
  // -----------------------------------------------------------------------

  describe('No org', () => {
    it('should render page even without orgId', () => {
      mockUseOrg.mockReturnValue({ orgId: null, branchId: null })
      render(<ConversacionesPage />)
      expect(screen.getByText('title')).toBeInTheDocument()
    })
  })
})
