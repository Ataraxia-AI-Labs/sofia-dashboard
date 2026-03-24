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

const mockPush = jest.fn()
const mockBack = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), refresh: jest.fn(), back: mockBack }),
  useParams: () => ({ id: 'org-1' }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/admin/organizaciones/org-1',
}))

/* ── admin-api ── */
const mockFetchOrgFull = jest.fn()
const mockFetchOrgStats = jest.fn()
const mockFetchOrgUsers = jest.fn()
const mockFetchOrgActivityLog = jest.fn()
const mockUpdateOrgStatus = jest.fn()
const mockPopulateKnowledgeBase = jest.fn()
const mockTestWhatsApp = jest.fn()
const mockEnsureSuperAdminMembership = jest.fn()

jest.mock('@/lib/admin-api', () => ({
  fetchOrgFull: (...a: any[]) => mockFetchOrgFull(...a),
  fetchOrgStats: (...a: any[]) => mockFetchOrgStats(...a),
  fetchOrgUsers: (...a: any[]) => mockFetchOrgUsers(...a),
  fetchOrgActivityLog: (...a: any[]) => mockFetchOrgActivityLog(...a),
  updateOrgStatus: (...a: any[]) => mockUpdateOrgStatus(...a),
  populateKnowledgeBase: (...a: any[]) => mockPopulateKnowledgeBase(...a),
  testWhatsApp: (...a: any[]) => mockTestWhatsApp(...a),
  ensureSuperAdminMembership: (...a: any[]) => mockEnsureSuperAdminMembership(...a),
}))

const mockStartImpersonation = jest.fn()
jest.mock('@/lib/impersonation', () => ({
  startImpersonation: (...a: any[]) => mockStartImpersonation(...a),
}))

const mockFetchServicesCatalog = jest.fn()
const mockFetchBusinessHours = jest.fn()
const mockUpdateOrganization = jest.fn()
const mockCreateService = jest.fn()
const mockDeleteService = jest.fn()
const mockUpdateBusinessHour = jest.fn()
jest.mock('@/lib/api', () => ({
  fetchServicesCatalog: (...a: any[]) => mockFetchServicesCatalog(...a),
  fetchBusinessHours: (...a: any[]) => mockFetchBusinessHours(...a),
  updateOrganization: (...a: any[]) => mockUpdateOrganization(...a),
  createService: (...a: any[]) => mockCreateService(...a),
  deleteService: (...a: any[]) => mockDeleteService(...a),
  updateBusinessHour: (...a: any[]) => mockUpdateBusinessHour(...a),
  formatCOP: (n: number) => `$${n.toLocaleString()}`,
  timeAgo: () => 'hace 5min',
}))

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}))

import OrgDetailPage from '@/app/admin/organizaciones/[id]/page'

const ORG_DATA = {
  name: 'Clinica Alpha',
  status: 'ACTIVE',
  system_prompt: 'Eres SofIA',
  whatsapp_phone_id: '123456',
  config_settings: { plan: 'PRO' },
}

const STATS = { patients: 50, appointments: 25, interactions: 100, revenue: 2500000 }
const USERS = [
  { id: 'u1', user_id: 'user-abc', role: 'OWNER', created_at: '2026-01-01T00:00:00Z' },
  { id: 'u2', user_id: 'user-def', role: 'STAFF', created_at: '2026-02-01T00:00:00Z' },
]
const SERVICES = [
  { id: 's1', name: 'Botox', category: 'ESTETICA', price: 800000, duration_minutes: 30 },
]
const HOURS = [
  { id: 'h1', day_of_week: 1, is_open: true, open_time: '08:00', close_time: '18:00' },
  { id: 'h2', day_of_week: 0, is_open: false, open_time: '00:00', close_time: '00:00' },
]
const ACTIVITY = [
  { id: 'a1', created_at: '2026-03-20T10:00:00Z', channel: 'WHATSAPP', intent: 'AGENDAR', patient_phone: '573001234567' },
]

function setupHappy() {
  mockFetchOrgFull.mockResolvedValue(ORG_DATA)
  mockFetchOrgStats.mockResolvedValue(STATS)
  mockFetchOrgUsers.mockResolvedValue(USERS)
  mockFetchServicesCatalog.mockResolvedValue(SERVICES)
  mockFetchBusinessHours.mockResolvedValue(HOURS)
  mockFetchOrgActivityLog.mockResolvedValue(ACTIVITY)
}

beforeEach(() => {
  jest.clearAllMocks()
  setupHappy()
})

describe('OrgDetailPage', () => {
  it('shows loading skeletons initially', () => {
    mockFetchOrgFull.mockReturnValue(new Promise(() => {}))
    render(<OrgDetailPage />)
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('renders org header after loading', async () => {
    render(<OrgDetailPage />)
    await waitFor(() => expect(screen.getByText('Clinica Alpha')).toBeInTheDocument())
    expect(screen.getByText('org-1')).toBeInTheDocument()
  })

  it('renders stats cards', async () => {
    render(<OrgDetailPage />)
    await waitFor(() => expect(screen.getByText('50')).toBeInTheDocument())
    expect(screen.getByText('25')).toBeInTheDocument()
    expect(screen.getByText('Pacientes')).toBeInTheDocument()
  })

  it('renders all tab buttons', async () => {
    render(<OrgDetailPage />)
    await waitFor(() => expect(screen.getByText('General')).toBeInTheDocument())
    expect(screen.getByText('Servicios')).toBeInTheDocument()
    expect(screen.getByText('Horarios')).toBeInTheDocument()
    expect(screen.getByText('Usuarios')).toBeInTheDocument()
    expect(screen.getByText('System Prompt')).toBeInTheDocument()
    expect(screen.getByText('Actividad')).toBeInTheDocument()
  })

  it('shows general tab with editable fields', async () => {
    render(<OrgDetailPage />)
    await waitFor(() => expect(screen.getByText('Guardar Cambios')).toBeInTheDocument())
    expect(screen.getByDisplayValue('Clinica Alpha')).toBeInTheDocument()
  })

  it('saves general info on button click', async () => {
    mockUpdateOrganization.mockResolvedValue({})
    render(<OrgDetailPage />)
    await waitFor(() => expect(screen.getByText('Guardar Cambios')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Guardar Cambios'))
    await waitFor(() => expect(mockUpdateOrganization).toHaveBeenCalledWith('org-1', expect.objectContaining({ name: 'Clinica Alpha' })))
    await waitFor(() => expect(screen.getByText('Organizacion actualizada')).toBeInTheDocument())
  })

  it('shows error on save failure', async () => {
    mockUpdateOrganization.mockRejectedValue(new Error('Save failed'))
    render(<OrgDetailPage />)
    await waitFor(() => expect(screen.getByText('Guardar Cambios')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Guardar Cambios'))
    await waitFor(() => expect(screen.getByText(/Error: Save failed/)).toBeInTheDocument())
  })

  it('switches to services tab', async () => {
    render(<OrgDetailPage />)
    await waitFor(() => expect(screen.getByText('Servicios')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Servicios'))
    await waitFor(() => expect(screen.getByText('Botox')).toBeInTheDocument())
    expect(screen.getByText('ESTETICA')).toBeInTheDocument()
  })

  it('shows empty services state', async () => {
    mockFetchServicesCatalog.mockResolvedValue([])
    render(<OrgDetailPage />)
    await waitFor(() => expect(screen.getByText('Servicios')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Servicios'))
    await waitFor(() => expect(screen.getByText('Sin servicios configurados')).toBeInTheDocument())
  })

  it('switches to hours tab showing day toggles', async () => {
    render(<OrgDetailPage />)
    await waitFor(() => expect(screen.getByText('Horarios')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Horarios'))
    await waitFor(() => expect(screen.getByText('Lunes')).toBeInTheDocument())
    expect(screen.getByText('Domingo')).toBeInTheDocument()
    expect(screen.getByText('Cerrado')).toBeInTheDocument()
  })

  it('switches to users tab', async () => {
    render(<OrgDetailPage />)
    await waitFor(() => expect(screen.getByText('Usuarios')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Usuarios'))
    await waitFor(() => expect(screen.getByText('user-abc')).toBeInTheDocument())
    expect(screen.getByText('OWNER')).toBeInTheDocument()
    expect(screen.getByText('STAFF')).toBeInTheDocument()
  })

  it('switches to system prompt tab', async () => {
    render(<OrgDetailPage />)
    await waitFor(() => expect(screen.getByText('System Prompt')).toBeInTheDocument())
    fireEvent.click(screen.getByText('System Prompt'))
    await waitFor(() => expect(screen.getByDisplayValue('Eres SofIA')).toBeInTheDocument())
    expect(screen.getByText('Guardar Prompt')).toBeInTheDocument()
  })

  it('saves system prompt', async () => {
    mockUpdateOrganization.mockResolvedValue({})
    render(<OrgDetailPage />)
    await waitFor(() => screen.getByText('System Prompt'))
    fireEvent.click(screen.getByText('System Prompt'))
    await waitFor(() => screen.getByText('Guardar Prompt'))
    fireEvent.click(screen.getByText('Guardar Prompt'))
    await waitFor(() => expect(mockUpdateOrganization).toHaveBeenCalledWith('org-1', { system_prompt: 'Eres SofIA' }))
  })

  it('switches to activity tab', async () => {
    render(<OrgDetailPage />)
    await waitFor(() => expect(screen.getByText('Actividad')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Actividad'))
    await waitFor(() => expect(screen.getByText('WHATSAPP')).toBeInTheDocument())
    expect(screen.getByText('AGENDAR')).toBeInTheDocument()
    expect(screen.getByText('573001234567')).toBeInTheDocument()
  })

  it('shows empty activity state', async () => {
    mockFetchOrgActivityLog.mockResolvedValue([])
    render(<OrgDetailPage />)
    await waitFor(() => screen.getByText('Actividad'))
    fireEvent.click(screen.getByText('Actividad'))
    await waitFor(() => expect(screen.getByText('Sin actividad registrada')).toBeInTheDocument())
  })

  it('navigates back on chevron click', async () => {
    render(<OrgDetailPage />)
    await waitFor(() => expect(screen.getByText('Clinica Alpha')).toBeInTheDocument())
    const backBtns = screen.getAllByTestId('icon-ChevronLeft')
    fireEvent.click(backBtns[0].closest('button')!)
    expect(mockPush).toHaveBeenCalledWith('/admin')
  })

  it('enters God Mode', async () => {
    mockEnsureSuperAdminMembership.mockResolvedValue(undefined)
    render(<OrgDetailPage />)
    await waitFor(() => expect(screen.getByText('God Mode')).toBeInTheDocument())
    fireEvent.click(screen.getByText('God Mode'))
    await waitFor(() => expect(mockEnsureSuperAdminMembership).toHaveBeenCalledWith('org-1'))
    expect(mockStartImpersonation).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith('/dashboard')
  })

  it('handles load error', async () => {
    mockFetchOrgFull.mockRejectedValue(new Error('Load fail'))
    render(<OrgDetailPage />)
    await waitFor(() => expect(screen.getByText('Error cargando datos de la organizacion')).toBeInTheDocument())
  })

  it('populates knowledge base', async () => {
    mockPopulateKnowledgeBase.mockResolvedValue({})
    render(<OrgDetailPage />)
    await waitFor(() => expect(screen.getByText('Poblar KB')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Poblar KB'))
    await waitFor(() => expect(mockPopulateKnowledgeBase).toHaveBeenCalledWith('org-1'))
    await waitFor(() => expect(screen.getByText('Knowledge base poblada exitosamente')).toBeInTheDocument())
  })
})
