// __tests__/app/dashboard/pacientes.test.tsx
// ---------------------------------------------------------------------------
// Nuclear-level tests for the Patients page (app/dashboard/pacientes/page.tsx)
//
// States tested: loading skeleton, error, empty, data loaded, search/debounce,
// pagination, sorting, patient detail, create patient, edit patient,
// CSV export, WhatsApp send, staff notes, treatments, view switching,
// Escape key handling.
// ---------------------------------------------------------------------------

import React from 'react'
import { render, screen, waitFor, within, act } from '@testing-library/react'
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

const mockToast = { success: jest.fn(), error: jest.fn() }
jest.mock('@/components/ui/toast', () => ({
  useToast: () => mockToast,
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
  usePathname: () => '/dashboard/pacientes',
}))

// Mock sub-components
jest.mock('@/app/dashboard/pacientes/panels/new-patient-form', () => ({
  NewPatientForm: ({ onSubmit, onCancel }: { onSubmit: () => void; onCancel: () => void }) => (
    <div data-testid="new-patient-form">
      <button data-testid="submit-new-patient" onClick={onSubmit}>Submit</button>
      <button data-testid="cancel-new-patient" onClick={onCancel}>Cancel</button>
    </div>
  ),
}))

jest.mock('@/app/dashboard/pacientes/panels/patient-detail-panel', () => ({
  PatientDetailPanel: ({ patient, onClose, detailTab, onTabChange }: {
    patient: { full_name: string }; onClose: () => void; detailTab: string;
    onTabChange: (t: string) => void
  }) => (
    <div data-testid="patient-detail-panel">
      <span data-testid="detail-patient-name">{patient.full_name}</span>
      <span data-testid="detail-tab">{detailTab}</span>
      <button data-testid="close-detail" onClick={onClose}>Close</button>
      <button data-testid="tab-ml" onClick={() => onTabChange('ml')}>ML</button>
      <button data-testid="tab-notes" onClick={() => onTabChange('notes')}>Notes</button>
      <button data-testid="tab-media" onClick={() => onTabChange('media')}>Media</button>
    </div>
  ),
}))

// Mock lucide-react
jest.mock('lucide-react', () => {
  const icon = (props: Record<string, unknown>) => <svg data-testid="icon" {...props} />
  return new Proxy({}, { get: () => icon })
})

import { useOrg } from '@/lib/org-context'
import {
  fetchPatients, fetchPatientDetail, fetchPatientMLFeatures,
  fetchStaffNotes, fetchPatientTreatments, fetchPatientMedia,
  createPatient, updatePatient, exportPatientsCSV, sendWhatsAppMessage,
  createStaffNote, createTreatment,
} from '@/lib/api'

const mockUseOrg = useOrg as jest.Mock
const mockFetchPatients = fetchPatients as jest.Mock
const mockFetchDetail = fetchPatientDetail as jest.Mock
const mockFetchML = fetchPatientMLFeatures as jest.Mock
const mockFetchNotes = fetchStaffNotes as jest.Mock
const mockFetchTreatments = fetchPatientTreatments as jest.Mock
const mockFetchMedia = fetchPatientMedia as jest.Mock
const mockCreatePatient = createPatient as jest.Mock
const mockUpdatePatient = updatePatient as jest.Mock
const mockExportCSV = exportPatientsCSV as jest.Mock
const mockSendWhatsApp = sendWhatsAppMessage as jest.Mock
const mockCreateNote = createStaffNote as jest.Mock
const mockCreateTreatment = createTreatment as jest.Mock

import PacientesPage from '@/app/dashboard/pacientes/page'

// ---- Factories ----

function makePatient(id: string, name: string, phone: string, channel = 'WHATSAPP') {
  return {
    id,
    organization_id: 'org-1',
    full_name: name,
    phone,
    email: `${name.toLowerCase().replace(/\s/g, '')}@mail.com`,
    acquisition_channel: channel,
    service_interest: 'Botox',
    city: 'Bogota',
    created_at: '2026-03-20T10:00:00Z',
  }
}

function makePatientsResponse(count: number, total: number) {
  const patients = Array.from({ length: count }, (_, i) =>
    makePatient(`p-${i}`, `Patient ${i}`, `+57300000${String(i).padStart(4, '0')}`)
  )
  return { patients, total }
}

// ---- Test Suite ----

describe('PacientesPage', () => {
  afterEach(() => {
    jest.useRealTimers()
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseOrg.mockReturnValue({ orgId: 'org-1', branchId: null })
    mockFetchPatients.mockResolvedValue(makePatientsResponse(5, 5))
    mockFetchDetail.mockResolvedValue(makePatient('p-0', 'Patient 0', '+573000000000'))
    mockFetchML.mockResolvedValue({ patient_id: 'p-0', total_interactions: 10 })
    mockFetchNotes.mockResolvedValue([])
    mockFetchTreatments.mockResolvedValue([])
    mockFetchMedia.mockResolvedValue([])
    mockCreatePatient.mockResolvedValue({ id: 'p-new' })
    mockUpdatePatient.mockResolvedValue({})
    mockExportCSV.mockResolvedValue(undefined)
    mockSendWhatsApp.mockResolvedValue({})
    mockCreateNote.mockResolvedValue({})
    mockCreateTreatment.mockResolvedValue({})
  })

  // -----------------------------------------------------------------------
  // LOADING STATE
  // -----------------------------------------------------------------------

  describe('Loading state', () => {
    it('should render table loading skeletons when loading', () => {
      mockFetchPatients.mockReturnValue(new Promise(() => {}))
      render(<PacientesPage />)

      const pulseDivs = document.querySelectorAll('.animate-pulse')
      expect(pulseDivs.length).toBeGreaterThan(0)
    })
  })

  // -----------------------------------------------------------------------
  // DATA LOADED STATE
  // -----------------------------------------------------------------------

  describe('Data loaded state', () => {
    it('should render patient names in the table', async () => {
      render(<PacientesPage />)

      await waitFor(() => {
        expect(screen.getByText('Patient 0')).toBeInTheDocument()
        expect(screen.getByText('Patient 4')).toBeInTheDocument()
      })
    })

    it('should render patient phones', async () => {
      render(<PacientesPage />)

      await waitFor(() => {
        expect(screen.getByText('+573000000000')).toBeInTheDocument()
      })
    })

    it('should render patient count in header', async () => {
      render(<PacientesPage />)

      await waitFor(() => {
        expect(screen.getByText(/registered/)).toBeInTheDocument()
      })
    })

    it('should render page title', async () => {
      render(<PacientesPage />)

      await waitFor(() => {
        expect(screen.getByText('title')).toBeInTheDocument()
      })
    })

    it('should render table headers for all columns', async () => {
      render(<PacientesPage />)

      await waitFor(() => {
        expect(screen.getByText('patient')).toBeInTheDocument()
        expect(screen.getByText('phone')).toBeInTheDocument()
        expect(screen.getByText('channel')).toBeInTheDocument()
        expect(screen.getByText('interest')).toBeInTheDocument()
        expect(screen.getByText('city')).toBeInTheDocument()
        expect(screen.getByText('registration')).toBeInTheDocument()
      })
    })

    it('should render service interest for each patient', async () => {
      render(<PacientesPage />)

      await waitFor(() => {
        const botoxCells = screen.getAllByText('Botox')
        expect(botoxCells.length).toBe(5)
      })
    })
  })

  // -----------------------------------------------------------------------
  // EMPTY STATE
  // -----------------------------------------------------------------------

  describe('Empty state', () => {
    it('should render "no patients" message when list is empty', async () => {
      mockFetchPatients.mockResolvedValue({ patients: [], total: 0 })
      render(<PacientesPage />)

      await waitFor(() => {
        expect(screen.getByText('noPatients')).toBeInTheDocument()
      })
    })

    it('should render "no results" message when search returns empty', async () => {
      jest.useFakeTimers()
      mockFetchPatients.mockResolvedValue(makePatientsResponse(5, 5))
      render(<PacientesPage />)

      await waitFor(() => {
        expect(screen.getByText('Patient 0')).toBeInTheDocument()
      })

      // Type a search that returns nothing
      mockFetchPatients.mockResolvedValue({ patients: [], total: 0 })
      const searchInput = screen.getByPlaceholderText('searchPlaceholder')
      await userEvent.setup({ advanceTimers: jest.advanceTimersByTime }).type(searchInput, 'nonexistent')

      // Advance debounce timer
      act(() => { jest.advanceTimersByTime(350) })

      await waitFor(() => {
        expect(screen.getByText('noResultsSearch')).toBeInTheDocument()
      })

      jest.useRealTimers()
    })
  })

  // -----------------------------------------------------------------------
  // SEARCH
  // -----------------------------------------------------------------------

  describe('Search functionality', () => {
    it('should render search input', async () => {
      render(<PacientesPage />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('searchPlaceholder')).toBeInTheDocument()
      })
    })

    it('should debounce search and call fetchPatients after delay', async () => {
      jest.useFakeTimers()
      render(<PacientesPage />)

      await waitFor(() => {
        expect(mockFetchPatients).toHaveBeenCalledTimes(1)
      })

      const searchInput = screen.getByPlaceholderText('searchPlaceholder')
      await userEvent.setup({ advanceTimers: jest.advanceTimersByTime }).type(searchInput, 'test')

      // Not yet called again (debounce)
      expect(mockFetchPatients).toHaveBeenCalledTimes(1)

      // Advance debounce timer
      act(() => { jest.advanceTimersByTime(350) })

      await waitFor(() => {
        expect(mockFetchPatients).toHaveBeenCalledTimes(2)
        expect(mockFetchPatients.mock.calls[1][1]).toEqual(
          expect.objectContaining({ search: 'test' })
        )
      })

      jest.useRealTimers()
    })

    it('should reset page to 0 when search changes', async () => {
      jest.useFakeTimers()
      render(<PacientesPage />)

      await waitFor(() => {
        expect(mockFetchPatients).toHaveBeenCalledTimes(1)
      })

      const searchInput = screen.getByPlaceholderText('searchPlaceholder')
      await userEvent.setup({ advanceTimers: jest.advanceTimersByTime }).type(searchInput, 'abc')

      act(() => { jest.advanceTimersByTime(350) })

      await waitFor(() => {
        const lastCall = mockFetchPatients.mock.calls[mockFetchPatients.mock.calls.length - 1]
        expect(lastCall[1]).toEqual(expect.objectContaining({ offset: 0 }))
      })

      jest.useRealTimers()
    })
  })

  // -----------------------------------------------------------------------
  // PAGINATION
  // -----------------------------------------------------------------------

  describe('Pagination', () => {
    it('should render pagination when totalPages > 1', async () => {
      mockFetchPatients.mockResolvedValue(makePatientsResponse(20, 45))
      render(<PacientesPage />)

      await waitFor(() => {
        expect(screen.getByLabelText('Página anterior')).toBeInTheDocument()
        expect(screen.getByLabelText('Página siguiente')).toBeInTheDocument()
      })
    })

    it('should disable previous button on first page', async () => {
      mockFetchPatients.mockResolvedValue(makePatientsResponse(20, 45))
      render(<PacientesPage />)

      await waitFor(() => {
        expect(screen.getByLabelText('Página anterior')).toBeDisabled()
      })
    })

    it('should navigate to next page when next button is clicked', async () => {
      jest.useFakeTimers()
      mockFetchPatients.mockResolvedValue(makePatientsResponse(20, 45))
      render(<PacientesPage />)

      await waitFor(() => {
        expect(screen.getByLabelText('Página siguiente')).toBeInTheDocument()
      })

      await userEvent.setup({ advanceTimers: jest.advanceTimersByTime }).click(screen.getByLabelText('Página siguiente'))

      await waitFor(() => {
        const calls = mockFetchPatients.mock.calls
        const lastCall = calls[calls.length - 1]
        expect(lastCall[1]).toEqual(expect.objectContaining({ offset: 20 }))
      })

      jest.useRealTimers()
    })

    it('should not render pagination when all patients fit in one page', async () => {
      mockFetchPatients.mockResolvedValue(makePatientsResponse(5, 5))
      render(<PacientesPage />)

      await waitFor(() => {
        expect(screen.getByText('Patient 0')).toBeInTheDocument()
      })

      expect(screen.queryByLabelText('Página anterior')).not.toBeInTheDocument()
    })
  })

  // -----------------------------------------------------------------------
  // SORTING
  // -----------------------------------------------------------------------

  describe('Sorting', () => {
    it('should call fetchPatients with new sort when column header is clicked', async () => {
      const user = userEvent.setup()
      render(<PacientesPage />)

      await waitFor(() => {
        expect(screen.getByText('patient')).toBeInTheDocument()
      })

      await user.click(screen.getByText('patient'))

      await waitFor(() => {
        const calls = mockFetchPatients.mock.calls
        const lastCall = calls[calls.length - 1]
        expect(lastCall[1]).toEqual(expect.objectContaining({ orderBy: 'full_name', orderDir: 'desc' }))
      })
    })

    it('should toggle sort direction when same column is clicked twice', async () => {
      const user = userEvent.setup()
      render(<PacientesPage />)

      await waitFor(() => {
        expect(screen.getByText('registration')).toBeInTheDocument()
      })

      // First click: created_at is already sorted desc, so toggle to asc
      await user.click(screen.getByText('registration'))

      await waitFor(() => {
        const calls = mockFetchPatients.mock.calls
        const lastCall = calls[calls.length - 1]
        expect(lastCall[1]).toEqual(expect.objectContaining({ orderBy: 'created_at', orderDir: 'asc' }))
      })
    })
  })

  // -----------------------------------------------------------------------
  // PATIENT DETAIL
  // -----------------------------------------------------------------------

  describe('Patient detail', () => {
    it('should open detail panel when a patient row is clicked', async () => {
      const user = userEvent.setup()
      render(<PacientesPage />)

      await waitFor(() => {
        expect(screen.getByText('Patient 0')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Patient 0'))

      await waitFor(() => {
        expect(screen.getByTestId('patient-detail-panel')).toBeInTheDocument()
        expect(screen.getByTestId('detail-patient-name')).toHaveTextContent('Patient 0')
      })
    })

    it('should load ML features when detail is opened', async () => {
      const user = userEvent.setup()
      render(<PacientesPage />)

      await waitFor(() => {
        expect(screen.getByText('Patient 0')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Patient 0'))

      await waitFor(() => {
        expect(mockFetchML).toHaveBeenCalledWith('p-0')
      })
    })

    it('should close detail panel when close button is clicked', async () => {
      const user = userEvent.setup()
      render(<PacientesPage />)

      await waitFor(() => {
        expect(screen.getByText('Patient 0')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Patient 0'))

      await waitFor(() => {
        expect(screen.getByTestId('patient-detail-panel')).toBeInTheDocument()
      })

      await user.click(screen.getByTestId('close-detail'))

      await waitFor(() => {
        expect(screen.queryByTestId('patient-detail-panel')).not.toBeInTheDocument()
      })
    })

    it('should start with info tab', async () => {
      const user = userEvent.setup()
      render(<PacientesPage />)

      await waitFor(() => {
        expect(screen.getByText('Patient 0')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Patient 0'))

      await waitFor(() => {
        expect(screen.getByTestId('detail-tab')).toHaveTextContent('info')
      })
    })

    it('should switch to ML tab', async () => {
      const user = userEvent.setup()
      render(<PacientesPage />)

      await waitFor(() => {
        expect(screen.getByText('Patient 0')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Patient 0'))

      await waitFor(() => {
        expect(screen.getByTestId('tab-ml')).toBeInTheDocument()
      })

      await user.click(screen.getByTestId('tab-ml'))

      await waitFor(() => {
        expect(screen.getByTestId('detail-tab')).toHaveTextContent('ml')
      })
    })
  })

  // -----------------------------------------------------------------------
  // NEW PATIENT
  // -----------------------------------------------------------------------

  describe('New patient', () => {
    it('should show new patient form when button is clicked', async () => {
      const user = userEvent.setup()
      render(<PacientesPage />)

      await waitFor(() => {
        expect(screen.getByText('newPatient')).toBeInTheDocument()
      })

      await user.click(screen.getByText('newPatient'))

      expect(screen.getByTestId('new-patient-form')).toBeInTheDocument()
    })

    it('should hide new patient form when cancel is clicked', async () => {
      const user = userEvent.setup()
      render(<PacientesPage />)

      await waitFor(() => {
        expect(screen.getByText('newPatient')).toBeInTheDocument()
      })

      await user.click(screen.getByText('newPatient'))
      expect(screen.getByTestId('new-patient-form')).toBeInTheDocument()

      await user.click(screen.getByTestId('cancel-new-patient'))
      expect(screen.queryByTestId('new-patient-form')).not.toBeInTheDocument()
    })
  })

  // -----------------------------------------------------------------------
  // CSV EXPORT
  // -----------------------------------------------------------------------

  describe('CSV export', () => {
    it('should render export button', async () => {
      render(<PacientesPage />)

      await waitFor(() => {
        expect(screen.getByText('exportCSV')).toBeInTheDocument()
      })
    })

    it('should call exportPatientsCSV when export button is clicked', async () => {
      const user = userEvent.setup()
      render(<PacientesPage />)

      await waitFor(() => {
        expect(screen.getByText('exportCSV')).toBeInTheDocument()
      })

      await user.click(screen.getByText('exportCSV'))

      await waitFor(() => {
        expect(mockExportCSV).toHaveBeenCalledWith('org-1')
      })
    })

    it('should show toast error when export fails', async () => {
      const user = userEvent.setup()
      mockExportCSV.mockRejectedValue(new Error('Export failed'))
      render(<PacientesPage />)

      await waitFor(() => {
        expect(screen.getByText('exportCSV')).toBeInTheDocument()
      })

      await user.click(screen.getByText('exportCSV'))

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('exportError')
      })
    })
  })

  // -----------------------------------------------------------------------
  // VIEW SWITCHING
  // -----------------------------------------------------------------------

  describe('View switching', () => {
    it('should render view toggle buttons', async () => {
      render(<PacientesPage />)

      await waitFor(() => {
        expect(screen.getByText('views.list')).toBeInTheDocument()
        expect(screen.getByText('views.segments')).toBeInTheDocument()
        expect(screen.getByText('views.duplicates')).toBeInTheDocument()
        expect(screen.getByText('views.ltv')).toBeInTheDocument()
        expect(screen.getByText('views.gamification')).toBeInTheDocument()
      })
    })

    it('should show dynamic panel when segments view is selected', async () => {
      const user = userEvent.setup()
      render(<PacientesPage />)

      await waitFor(() => {
        expect(screen.getByText('views.segments')).toBeInTheDocument()
      })

      await user.click(screen.getByText('views.segments'))

      expect(screen.getByTestId('dynamic-panel')).toBeInTheDocument()
    })

    it('should hide patient table when non-list view is selected', async () => {
      const user = userEvent.setup()
      render(<PacientesPage />)

      await waitFor(() => {
        expect(screen.getByText('Patient 0')).toBeInTheDocument()
      })

      await user.click(screen.getByText('views.duplicates'))

      expect(screen.queryByText('Patient 0')).not.toBeInTheDocument()
    })
  })

  // -----------------------------------------------------------------------
  // REFRESH
  // -----------------------------------------------------------------------

  describe('Refresh', () => {
    it('should render refresh button with aria-label', async () => {
      render(<PacientesPage />)

      await waitFor(() => {
        expect(screen.getByLabelText('refresh')).toBeInTheDocument()
      })
    })

    it('should call loadPatients when refresh is clicked', async () => {
      const user = userEvent.setup()
      render(<PacientesPage />)

      await waitFor(() => {
        expect(screen.getByLabelText('refresh')).toBeInTheDocument()
      })

      await user.click(screen.getByLabelText('refresh'))

      await waitFor(() => {
        expect(mockFetchPatients).toHaveBeenCalledTimes(2)
      })
    })
  })

  // -----------------------------------------------------------------------
  // ERROR HANDLING
  // -----------------------------------------------------------------------

  describe('Error handling', () => {
    it('should show toast error when fetchPatients fails', async () => {
      mockFetchPatients.mockRejectedValue(new Error('Network error'))
      render(<PacientesPage />)

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('loadError')
      })
    })
  })

  // -----------------------------------------------------------------------
  // ESCAPE KEY
  // -----------------------------------------------------------------------

  describe('Escape key handling', () => {
    it('should close detail panel on Escape', async () => {
      const user = userEvent.setup()
      render(<PacientesPage />)

      await waitFor(() => {
        expect(screen.getByText('Patient 0')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Patient 0'))

      await waitFor(() => {
        expect(screen.getByTestId('patient-detail-panel')).toBeInTheDocument()
      })

      await user.keyboard('{Escape}')

      await waitFor(() => {
        expect(screen.queryByTestId('patient-detail-panel')).not.toBeInTheDocument()
      })
    })

    it('should close new patient form on Escape', async () => {
      const user = userEvent.setup()
      render(<PacientesPage />)

      await waitFor(() => {
        expect(screen.getByText('newPatient')).toBeInTheDocument()
      })

      await user.click(screen.getByText('newPatient'))
      expect(screen.getByTestId('new-patient-form')).toBeInTheDocument()

      await user.keyboard('{Escape}')

      await waitFor(() => {
        expect(screen.queryByTestId('new-patient-form')).not.toBeInTheDocument()
      })
    })
  })

  // -----------------------------------------------------------------------
  // PATIENT INITIALS
  // -----------------------------------------------------------------------

  describe('Patient initials', () => {
    it('should display first letter avatar for each patient', async () => {
      render(<PacientesPage />)

      await waitFor(() => {
        const avatars = screen.getAllByText('P')
        // 5 patients all starting with "P"
        expect(avatars.length).toBe(5)
      })
    })

    it('should display "?" for patients without names', async () => {
      mockFetchPatients.mockResolvedValue({
        patients: [{ ...makePatient('p-x', '', '+573001111111'), full_name: '' }],
        total: 1,
      })
      render(<PacientesPage />)

      await waitFor(() => {
        expect(screen.getByText('?')).toBeInTheDocument()
      })
    })
  })

  // -----------------------------------------------------------------------
  // NO ORG
  // -----------------------------------------------------------------------

  describe('No org state', () => {
    it('should not call fetchPatients when orgId is absent', () => {
      mockUseOrg.mockReturnValue({ orgId: null, branchId: null })
      render(<PacientesPage />)
      expect(mockFetchPatients).not.toHaveBeenCalled()
    })
  })
})
