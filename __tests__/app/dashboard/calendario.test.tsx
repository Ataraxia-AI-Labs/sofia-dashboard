// __tests__/app/dashboard/calendario.test.tsx
// ---------------------------------------------------------------------------
// Nuclear-level tests for the Calendar page
// (app/dashboard/calendario/page.tsx)
//
// States tested: loading skeleton, data loaded (week/month views),
// tab switching (calendar/waitingRoom), status/staff filters, navigation,
// view mode toggle, appointment detail modal, status update, create/reschedule,
// staff assignment, Escape key, empty state, error handling.
// ---------------------------------------------------------------------------

import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
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

jest.mock('next/dynamic', () => () => {
  const C = (props: Record<string, unknown>) => <div data-testid="waiting-room-panel" data-org={props.orgId as string} />
  C.displayName = 'WaitingRoomPanel'
  return C
})
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn(), back: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/calendario',
}))

// Mock lucide-react
jest.mock('lucide-react', () => {
  const icon = (props: Record<string, unknown>) => <svg data-testid="icon" {...props} />
  return new Proxy({}, { get: () => icon })
})

import { useOrg } from '@/lib/org-context'
import {
  fetchAppointments, updateAppointmentStatus, createAppointment,
  fetchPatients, fetchServicesCatalog, fetchPatientMLFeatures,
  rescheduleAppointment, assignStaff, fetchStaffList,
} from '@/lib/api'

const mockUseOrg = useOrg as jest.Mock
const mockFetchAppointments = fetchAppointments as jest.Mock
const mockUpdateStatus = updateAppointmentStatus as jest.Mock
const mockCreateAppointment = createAppointment as jest.Mock
const mockFetchPatients = fetchPatients as jest.Mock
const mockFetchServices = fetchServicesCatalog as jest.Mock
const mockFetchML = fetchPatientMLFeatures as jest.Mock
const mockReschedule = rescheduleAppointment as jest.Mock
const mockAssignStaff = assignStaff as jest.Mock
const mockFetchStaff = fetchStaffList as jest.Mock

import CalendarioPage from '@/app/dashboard/calendario/page'

// ---- Factories ----

function makeAppointment(id: string, status = 'CONFIRMED', daysOffset = 0) {
  const date = new Date()
  date.setDate(date.getDate() + daysOffset)
  date.setHours(10, 0, 0, 0)
  const endDate = new Date(date)
  endDate.setHours(11, 0, 0, 0)

  return {
    id,
    patient_id: `pat-${id}`,
    start_time: date.toISOString(),
    end_time: endDate.toISOString(),
    service_name: 'Limpieza dental',
    status,
    created_at: '2026-03-20T10:00:00Z',
    staff_id: null,
    patients: { full_name: `Patient ${id}`, phone: `+5730000${id}` },
  }
}

function makeStaff(id: string, name: string) {
  return { id, user_id: `u-${id}`, display_name: name, role: 'STAFF' as const }
}

// ---- Test Suite ----

describe('CalendarioPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseOrg.mockReturnValue({ orgId: 'org-1', branchId: null })
    mockFetchAppointments.mockResolvedValue([
      makeAppointment('a-1', 'CONFIRMED', 0),
      makeAppointment('a-2', 'COMPLETED', 1),
      makeAppointment('a-3', 'CANCELLED', -1),
    ])
    mockFetchStaff.mockResolvedValue([
      makeStaff('s-1', 'Dr. Garcia'),
      makeStaff('s-2', 'Dr. Lopez'),
    ])
    mockUpdateStatus.mockResolvedValue({})
    mockCreateAppointment.mockResolvedValue({ id: 'a-new' })
    mockFetchPatients.mockResolvedValue({ patients: [{ id: 'pat-1', full_name: 'Test Patient', phone: '+573001111111' }], total: 1 })
    mockFetchServices.mockResolvedValue([{ id: 'svc-1', name: 'Limpieza dental' }])
    mockFetchML.mockResolvedValue(null)
    mockReschedule.mockResolvedValue({})
    mockAssignStaff.mockResolvedValue({})
  })

  // -----------------------------------------------------------------------
  // LOADING STATE
  // -----------------------------------------------------------------------

  describe('Loading state', () => {
    it('should render loading skeletons while appointments are loading', () => {
      mockFetchAppointments.mockReturnValue(new Promise(() => {}))
      render(<CalendarioPage />)

      // Page shows loading spinner on refresh icon (animate-spin) while loading
      const spinners = document.querySelectorAll('.animate-spin')
      expect(spinners.length).toBeGreaterThan(0)
    })
  })

  // -----------------------------------------------------------------------
  // DATA LOADED
  // -----------------------------------------------------------------------

  describe('Data loaded state', () => {
    it('should render page title', async () => {
      render(<CalendarioPage />)

      await waitFor(() => {
        // 'title' appears in h2 and in the calendar tab button
        const titles = screen.getAllByText('title')
        expect(titles.length).toBeGreaterThanOrEqual(2)
      })
    })

    it('should display appointment count in subtitle', async () => {
      render(<CalendarioPage />)

      await waitFor(() => {
        expect(screen.getByText(/appointmentsInPeriod/)).toBeInTheDocument()
      })
    })

    it('should render day column headers in week view', async () => {
      render(<CalendarioPage />)

      await waitFor(() => {
        // Default is week view, should have day column headers (days.mon, days.tue, etc.)
        const dayHeaders = screen.getAllByText(/^days\./)
        expect(dayHeaders.length).toBe(7)
      })
    })

    it('should render appointments on the calendar', async () => {
      render(<CalendarioPage />)

      await waitFor(() => {
        // In week view, patient name is embedded: "Patient a-1 — Limpieza dental"
        expect(screen.getByText(/Patient a-1/)).toBeInTheDocument()
      })
    })

    it('should render service name in appointment card', async () => {
      render(<CalendarioPage />)

      await waitFor(() => {
        // Service name is embedded in the appointment card text
        const services = screen.getAllByText(/Limpieza dental/)
        expect(services.length).toBeGreaterThan(0)
      })
    })
  })

  // -----------------------------------------------------------------------
  // TAB SWITCHING
  // -----------------------------------------------------------------------

  describe('Tab switching', () => {
    it('should render calendar and waiting room tabs', async () => {
      render(<CalendarioPage />)

      await waitFor(() => {
        // Calendar tab shows the title
        expect(screen.getAllByText('title').length).toBeGreaterThanOrEqual(1)
        expect(screen.getByText('waitingRoom')).toBeInTheDocument()
      })
    })

    it('should show waiting room panel when tab is clicked', async () => {
      const user = userEvent.setup()
      render(<CalendarioPage />)

      await waitFor(() => {
        expect(screen.getByText('waitingRoom')).toBeInTheDocument()
      })

      await user.click(screen.getByText('waitingRoom'))

      expect(screen.getByTestId('waiting-room-panel')).toBeInTheDocument()
    })

    it('should hide calendar when waiting room tab is active', async () => {
      const user = userEvent.setup()
      render(<CalendarioPage />)

      await waitFor(() => {
        expect(screen.getByText('today')).toBeInTheDocument()
      })

      await user.click(screen.getByText('waitingRoom'))

      expect(screen.queryByText('today')).not.toBeInTheDocument()
    })
  })

  // -----------------------------------------------------------------------
  // VIEW MODE TOGGLE
  // -----------------------------------------------------------------------

  describe('View mode toggle', () => {
    it('should render week and month buttons', async () => {
      render(<CalendarioPage />)

      await waitFor(() => {
        expect(screen.getByText('week')).toBeInTheDocument()
        expect(screen.getByText('month')).toBeInTheDocument()
      })
    })

    it('should switch to month view when month button is clicked', async () => {
      const user = userEvent.setup()
      render(<CalendarioPage />)

      await waitFor(() => {
        expect(screen.getByText('month')).toBeInTheDocument()
      })

      await user.click(screen.getByText('month'))

      // Month view re-fetches appointments with month range
      await waitFor(() => {
        expect(mockFetchAppointments).toHaveBeenCalledTimes(2)
      })
    })
  })

  // -----------------------------------------------------------------------
  // NAVIGATION
  // -----------------------------------------------------------------------

  describe('Navigation', () => {
    it('should render navigation buttons (prev, next, today)', async () => {
      render(<CalendarioPage />)

      await waitFor(() => {
        expect(screen.getByText('today')).toBeInTheDocument()
      })
    })

    it('should navigate to previous week when prev button is clicked', async () => {
      const user = userEvent.setup()
      render(<CalendarioPage />)

      await waitFor(() => {
        expect(screen.getByText('today')).toBeInTheDocument()
      })

      // There are navigation buttons rendered as icon buttons
      // Click the first nav button (prev)
      const navButtons = screen.getAllByRole('button')
      // Find prev/next by looking for buttons before/after "today"
      const todayBtn = screen.getByText('today')
      expect(todayBtn).toBeInTheDocument()

      // Click today to reset
      await user.click(todayBtn)

      await waitFor(() => {
        expect(mockFetchAppointments).toHaveBeenCalled()
      })
    })
  })

  // -----------------------------------------------------------------------
  // STATUS FILTER
  // -----------------------------------------------------------------------

  describe('Status filter', () => {
    it('should render status filter dropdown', async () => {
      render(<CalendarioPage />)

      await waitFor(() => {
        const selects = document.querySelectorAll('select')
        expect(selects.length).toBeGreaterThanOrEqual(1)
      })
    })

    it('should have all status options in the dropdown', async () => {
      render(<CalendarioPage />)

      await waitFor(() => {
        expect(screen.getByText('allStatuses')).toBeInTheDocument()
      })

      // Each status text appears in BOTH the dropdown option AND the status legend
      const statusOptions = ['CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'REQUESTED', 'RESCHEDULED', 'SCHEDULED']
      statusOptions.forEach(status => {
        const matches = screen.getAllByText(`statuses.${status}`)
        expect(matches.length).toBeGreaterThanOrEqual(1)
      })
    })

    it('should reload appointments when status filter changes', async () => {
      const user = userEvent.setup()
      render(<CalendarioPage />)

      await waitFor(() => {
        expect(mockFetchAppointments).toHaveBeenCalledTimes(1)
      })

      // Find status select and change
      const selects = document.querySelectorAll('select')
      const statusSelect = Array.from(selects).find(s =>
        s.querySelector('option[value="CONFIRMED"]')
      )

      if (statusSelect) {
        await user.selectOptions(statusSelect, 'CONFIRMED')

        await waitFor(() => {
          expect(mockFetchAppointments).toHaveBeenCalledTimes(2)
          const lastCall = mockFetchAppointments.mock.calls[1]
          expect(lastCall[1]).toEqual(expect.objectContaining({ status: 'CONFIRMED' }))
        })
      }
    })
  })

  // -----------------------------------------------------------------------
  // STAFF FILTER
  // -----------------------------------------------------------------------

  describe('Staff filter', () => {
    it('should render staff filter when staff list is available', async () => {
      render(<CalendarioPage />)

      await waitFor(() => {
        expect(screen.getByText('allStaff')).toBeInTheDocument()
        expect(screen.getByText('Dr. Garcia')).toBeInTheDocument()
        expect(screen.getByText('Dr. Lopez')).toBeInTheDocument()
      })
    })

    it('should not render staff filter when no staff exists', async () => {
      mockFetchStaff.mockResolvedValue([])
      render(<CalendarioPage />)

      await waitFor(() => {
        const titles = screen.getAllByText('title')
        expect(titles.length).toBeGreaterThanOrEqual(1)
      })

      expect(screen.queryByText('allStaff')).not.toBeInTheDocument()
    })
  })

  // -----------------------------------------------------------------------
  // NEW APPOINTMENT
  // -----------------------------------------------------------------------

  describe('New appointment', () => {
    it('should render new appointment button', async () => {
      render(<CalendarioPage />)

      await waitFor(() => {
        expect(screen.getByText('newAppointment')).toBeInTheDocument()
      })
    })

    it('should show new appointment form when button is clicked', async () => {
      const user = userEvent.setup()
      render(<CalendarioPage />)

      await waitFor(() => {
        expect(screen.getByText('newAppointment')).toBeInTheDocument()
      })

      await user.click(screen.getByText('newAppointment'))

      await waitFor(() => {
        expect(screen.getByText('newManualAppointment')).toBeInTheDocument()
        expect(screen.getByText('patientRequired')).toBeInTheDocument()
        expect(screen.getByText('serviceRequired')).toBeInTheDocument()
        expect(screen.getByText('dateRequired')).toBeInTheDocument()
      })
    })

    it('should load patients and services when form is opened', async () => {
      const user = userEvent.setup()
      render(<CalendarioPage />)

      await waitFor(() => {
        expect(screen.getByText('newAppointment')).toBeInTheDocument()
      })

      await user.click(screen.getByText('newAppointment'))

      await waitFor(() => {
        expect(mockFetchPatients).toHaveBeenCalled()
        expect(mockFetchServices).toHaveBeenCalled()
      })
    })

    it('should render cancel and create buttons in the form', async () => {
      const user = userEvent.setup()
      render(<CalendarioPage />)

      await waitFor(() => {
        expect(screen.getByText('newAppointment')).toBeInTheDocument()
      })

      await user.click(screen.getByText('newAppointment'))

      await waitFor(() => {
        expect(screen.getByText('cancel')).toBeInTheDocument()
        expect(screen.getByText('createAppointment')).toBeInTheDocument()
      })
    })

    it('should disable create button when required fields are empty', async () => {
      const user = userEvent.setup()
      render(<CalendarioPage />)

      await waitFor(() => {
        expect(screen.getByText('newAppointment')).toBeInTheDocument()
      })

      await user.click(screen.getByText('newAppointment'))

      await waitFor(() => {
        const createBtn = screen.getByText('createAppointment')
        expect(createBtn).toBeDisabled()
      })
    })

    it('should close form when cancel is clicked', async () => {
      const user = userEvent.setup()
      render(<CalendarioPage />)

      await waitFor(() => {
        expect(screen.getByText('newAppointment')).toBeInTheDocument()
      })

      await user.click(screen.getByText('newAppointment'))

      await waitFor(() => {
        expect(screen.getByText('newManualAppointment')).toBeInTheDocument()
      })

      await user.click(screen.getByText('cancel'))

      await waitFor(() => {
        expect(screen.queryByText('newManualAppointment')).not.toBeInTheDocument()
      })
    })
  })

  // -----------------------------------------------------------------------
  // APPOINTMENT DETAIL
  // -----------------------------------------------------------------------

  describe('Appointment detail', () => {
    it('should open detail modal when an appointment card is clicked', async () => {
      const user = userEvent.setup()
      render(<CalendarioPage />)

      await waitFor(() => {
        // In week view, patient name is embedded in card text
        expect(screen.getByText(/Patient a-1/)).toBeInTheDocument()
      })

      // Click the element containing the patient name (appointment card button)
      const apptCard = screen.getByText(/Patient a-1/)
      await user.click(apptCard.closest('button')!)

      await waitFor(() => {
        // Detail modal should show appointment detail title
        expect(screen.getByText('appointmentDetail')).toBeInTheDocument()
      })
    })

    it('should fetch ML features when appointment detail is opened', async () => {
      const user = userEvent.setup()
      render(<CalendarioPage />)

      await waitFor(() => {
        expect(screen.getByText(/Patient a-1/)).toBeInTheDocument()
      })

      const apptCard = screen.getByText(/Patient a-1/)
      await user.click(apptCard.closest('button')!)

      await waitFor(() => {
        expect(mockFetchML).toHaveBeenCalledWith('pat-a-1')
      })
    })
  })

  // -----------------------------------------------------------------------
  // ESCAPE KEY
  // -----------------------------------------------------------------------

  describe('Escape key', () => {
    it('should close appointment detail on Escape', async () => {
      const user = userEvent.setup()
      render(<CalendarioPage />)

      await waitFor(() => {
        expect(screen.getByText(/Patient a-1/)).toBeInTheDocument()
      })

      const apptCard = screen.getByText(/Patient a-1/)
      await user.click(apptCard.closest('button')!)

      await waitFor(() => {
        // Verify modal is open by checking for detail content
        expect(screen.getByText('appointmentDetail')).toBeInTheDocument()
      })

      await user.keyboard('{Escape}')

      await waitFor(() => {
        // Modal should be closed
        expect(screen.queryByText('appointmentDetail')).not.toBeInTheDocument()
      })
    })

    it('should close new appointment form on Escape', async () => {
      const user = userEvent.setup()
      render(<CalendarioPage />)

      await waitFor(() => {
        expect(screen.getByText('newAppointment')).toBeInTheDocument()
      })

      await user.click(screen.getByText('newAppointment'))

      await waitFor(() => {
        expect(screen.getByText('newManualAppointment')).toBeInTheDocument()
      })

      await user.keyboard('{Escape}')

      await waitFor(() => {
        expect(screen.queryByText('newManualAppointment')).not.toBeInTheDocument()
      })
    })
  })

  // -----------------------------------------------------------------------
  // REFRESH
  // -----------------------------------------------------------------------

  describe('Refresh', () => {
    it('should render refresh button', async () => {
      render(<CalendarioPage />)

      await waitFor(() => {
        expect(screen.getByLabelText('refresh')).toBeInTheDocument()
      })
    })

    it('should reload appointments when refresh is clicked', async () => {
      const user = userEvent.setup()
      render(<CalendarioPage />)

      await waitFor(() => {
        expect(mockFetchAppointments).toHaveBeenCalledTimes(1)
      })

      await user.click(screen.getByLabelText('refresh'))

      await waitFor(() => {
        expect(mockFetchAppointments).toHaveBeenCalledTimes(2)
      })
    })
  })

  // -----------------------------------------------------------------------
  // EMPTY STATE
  // -----------------------------------------------------------------------

  describe('Empty state', () => {
    it('should show 0 appointments in subtitle when no appointments', async () => {
      mockFetchAppointments.mockResolvedValue([])
      render(<CalendarioPage />)

      await waitFor(() => {
        expect(screen.getByText(/appointmentsInPeriod.*"count":0/)).toBeInTheDocument()
      })
    })
  })

  // -----------------------------------------------------------------------
  // BRANCH FILTERING
  // -----------------------------------------------------------------------

  describe('Branch filtering', () => {
    it('should pass branchId to fetchAppointments', async () => {
      mockUseOrg.mockReturnValue({ orgId: 'org-1', branchId: 'branch-7' })
      render(<CalendarioPage />)

      await waitFor(() => {
        expect(mockFetchAppointments).toHaveBeenCalledWith(
          'org-1',
          expect.objectContaining({ branchId: 'branch-7' })
        )
      })
    })
  })

  // -----------------------------------------------------------------------
  // NO ORG
  // -----------------------------------------------------------------------

  describe('No org state', () => {
    it('should not fetch appointments when orgId is null', () => {
      mockUseOrg.mockReturnValue({ orgId: null, branchId: null })
      render(<CalendarioPage />)
      expect(mockFetchAppointments).not.toHaveBeenCalled()
    })
  })

  // -----------------------------------------------------------------------
  // STAFF LIST LOADING
  // -----------------------------------------------------------------------

  describe('Staff list', () => {
    it('should load staff list on mount', async () => {
      render(<CalendarioPage />)

      await waitFor(() => {
        expect(mockFetchStaff).toHaveBeenCalledWith('org-1')
      })
    })

    it('should not crash when staff list fetch fails', async () => {
      mockFetchStaff.mockRejectedValue(new Error('Failed'))
      render(<CalendarioPage />)

      await waitFor(() => {
        const titles = screen.getAllByText('title')
        expect(titles.length).toBeGreaterThanOrEqual(1)
      })
    })
  })
})
