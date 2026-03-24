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
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/admin/organizaciones/nueva',
}))

const mockCreateOrganizationFull = jest.fn()
jest.mock('@/lib/admin-api', () => ({
  createOrganizationFull: (...a: any[]) => mockCreateOrganizationFull(...a),
}))

const mockFetchServicesCatalog = jest.fn()
const mockFetchBusinessHours = jest.fn()
const mockCreateService = jest.fn()
const mockUpdateBusinessHour = jest.fn()
jest.mock('@/lib/api', () => ({
  fetchServicesCatalog: (...a: any[]) => mockFetchServicesCatalog(...a),
  fetchBusinessHours: (...a: any[]) => mockFetchBusinessHours(...a),
  createService: (...a: any[]) => mockCreateService(...a),
  updateBusinessHour: (...a: any[]) => mockUpdateBusinessHour(...a),
  formatCOP: (n: number) => `$${n.toLocaleString()}`,
}))

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      update: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    }),
  },
}))

import CreateOrgPage from '@/app/admin/organizaciones/nueva/page'

beforeEach(() => {
  jest.clearAllMocks()
  mockFetchBusinessHours.mockResolvedValue([])
  mockCreateService.mockResolvedValue({})
  mockUpdateBusinessHour.mockResolvedValue({})
})

describe('CreateOrgPage', () => {
  it('renders the wizard header', () => {
    render(<CreateOrgPage />)
    expect(screen.getByText('Crear Nueva Organizacion')).toBeInTheDocument()
    expect(screen.getByText(/Wizard de 7 pasos/)).toBeInTheDocument()
  })

  it('shows step 0 (Organization) by default', () => {
    render(<CreateOrgPage />)
    expect(screen.getByPlaceholderText('Clinica Estetica Bella Vida')).toBeInTheDocument()
    expect(screen.getByText('Trial')).toBeInTheDocument()
    expect(screen.getByText('Starter')).toBeInTheDocument()
    expect(screen.getByText('Pro')).toBeInTheDocument()
  })

  it('disables Next when org name is too short', () => {
    render(<CreateOrgPage />)
    const nextBtn = screen.getByText('Siguiente')
    expect(nextBtn).toBeDisabled()
  })

  it('enables Next when org name is filled', () => {
    render(<CreateOrgPage />)
    fireEvent.change(screen.getByPlaceholderText('Clinica Estetica Bella Vida'), { target: { value: 'Mi Clinica Test' } })
    const nextBtn = screen.getByText('Siguiente')
    expect(nextBtn).not.toBeDisabled()
  })

  it('navigates to step 1 (Owner) on Next click', () => {
    render(<CreateOrgPage />)
    fireEvent.change(screen.getByPlaceholderText('Clinica Estetica Bella Vida'), { target: { value: 'Mi Clinica Test' } })
    fireEvent.click(screen.getByText('Siguiente'))
    expect(screen.getByPlaceholderText('doctor@clinica.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Minimo 6 caracteres')).toBeInTheDocument()
  })

  it('disables Next on step 1 without valid email', () => {
    render(<CreateOrgPage />)
    fireEvent.change(screen.getByPlaceholderText('Clinica Estetica Bella Vida'), { target: { value: 'Mi Clinica Test' } })
    fireEvent.click(screen.getByText('Siguiente'))
    expect(screen.getByText('Siguiente')).toBeDisabled()
  })

  it('enables Next on step 1 with valid email and password', () => {
    render(<CreateOrgPage />)
    fireEvent.change(screen.getByPlaceholderText('Clinica Estetica Bella Vida'), { target: { value: 'Mi Clinica Test' } })
    fireEvent.click(screen.getByText('Siguiente'))
    fireEvent.change(screen.getByPlaceholderText('doctor@clinica.com'), { target: { value: 'test@test.com' } })
    fireEvent.change(screen.getByPlaceholderText('Minimo 6 caracteres'), { target: { value: 'Pass123' } })
    expect(screen.getByText('Siguiente')).not.toBeDisabled()
  })

  it('toggles password visibility', () => {
    render(<CreateOrgPage />)
    fireEvent.change(screen.getByPlaceholderText('Clinica Estetica Bella Vida'), { target: { value: 'Mi Clinica Test' } })
    fireEvent.click(screen.getByText('Siguiente'))
    const pwInput = screen.getByPlaceholderText('Minimo 6 caracteres')
    expect(pwInput).toHaveAttribute('type', 'password')
    // Find the eye toggle button (parent of the Eye icon)
    const eyeIcon = screen.getByTestId('icon-Eye')
    fireEvent.click(eyeIcon.closest('button')!)
    expect(pwInput).toHaveAttribute('type', 'text')
  })

  it('navigates to step 2 (Specialty)', () => {
    render(<CreateOrgPage />)
    // Step 0: fill name
    fireEvent.change(screen.getByPlaceholderText('Clinica Estetica Bella Vida'), { target: { value: 'Mi Clinica Test' } })
    fireEvent.click(screen.getByText('Siguiente'))
    // Step 1: fill owner
    fireEvent.change(screen.getByPlaceholderText('doctor@clinica.com'), { target: { value: 'test@test.com' } })
    fireEvent.change(screen.getByPlaceholderText('Minimo 6 caracteres'), { target: { value: 'Pass123' } })
    fireEvent.click(screen.getByText('Siguiente'))
    // Step 2: specialty choices
    expect(screen.getByText('Estetica')).toBeInTheDocument()
    expect(screen.getByText('Odontologia')).toBeInTheDocument()
  })

  it('goes back with Anterior button', () => {
    render(<CreateOrgPage />)
    fireEvent.change(screen.getByPlaceholderText('Clinica Estetica Bella Vida'), { target: { value: 'Mi Clinica Test' } })
    fireEvent.click(screen.getByText('Siguiente'))
    expect(screen.getByText('Anterior')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Anterior'))
    expect(screen.getByPlaceholderText('Clinica Estetica Bella Vida')).toBeInTheDocument()
  })

  it('calls router.back on Cancelar at step 0', () => {
    render(<CreateOrgPage />)
    fireEvent.click(screen.getByText('Cancelar'))
    expect(mockBack).toHaveBeenCalled()
  })

  it('shows plan selection buttons', () => {
    render(<CreateOrgPage />)
    expect(screen.getByText('Enterprise')).toBeInTheDocument()
    expect(screen.getByText('Business')).toBeInTheDocument()
  })

  it('allows selecting a plan', () => {
    render(<CreateOrgPage />)
    fireEvent.click(screen.getByText('Business'))
    // The Business button should now have a ring class (selected state)
    const btn = screen.getByText('Business').closest('button')
    expect(btn?.className).toContain('ring')
  })

  it('full wizard navigation to step 6 (Confirm)', () => {
    render(<CreateOrgPage />)
    // Step 0
    fireEvent.change(screen.getByPlaceholderText('Clinica Estetica Bella Vida'), { target: { value: 'Mi Clinica Test' } })
    fireEvent.click(screen.getByText('Siguiente'))
    // Step 1
    fireEvent.change(screen.getByPlaceholderText('doctor@clinica.com'), { target: { value: 'test@test.com' } })
    fireEvent.change(screen.getByPlaceholderText('Minimo 6 caracteres'), { target: { value: 'Pass123' } })
    fireEvent.click(screen.getByText('Siguiente'))
    // Step 2 — specialty already selected (estetica)
    fireEvent.click(screen.getByText('Siguiente'))
    // Step 3 — services (templates auto-loaded)
    fireEvent.click(screen.getByText('Siguiente'))
    // Step 4 — hours
    fireEvent.click(screen.getByText('Siguiente'))
    // Step 5 — prompt
    fireEvent.click(screen.getByText('Siguiente'))
    // Step 6 — confirm
    expect(screen.getByText('Resumen de la Organizacion')).toBeInTheDocument()
    expect(screen.getByText('Mi Clinica Test')).toBeInTheDocument()
    expect(screen.getByText('Crear Organizacion')).toBeInTheDocument()
  })

  it('creates organization successfully', async () => {
    mockCreateOrganizationFull.mockResolvedValue({ orgId: 'new-org-123', userId: 'u1' })
    render(<CreateOrgPage />)
    // Navigate to confirm step
    fireEvent.change(screen.getByPlaceholderText('Clinica Estetica Bella Vida'), { target: { value: 'Mi Clinica Test' } })
    fireEvent.click(screen.getByText('Siguiente'))
    fireEvent.change(screen.getByPlaceholderText('doctor@clinica.com'), { target: { value: 'test@test.com' } })
    fireEvent.change(screen.getByPlaceholderText('Minimo 6 caracteres'), { target: { value: 'Pass123' } })
    fireEvent.click(screen.getByText('Siguiente'))
    fireEvent.click(screen.getByText('Siguiente'))
    fireEvent.click(screen.getByText('Siguiente'))
    fireEvent.click(screen.getByText('Siguiente'))
    fireEvent.click(screen.getByText('Siguiente'))
    // Click create
    fireEvent.click(screen.getByText('Crear Organizacion'))
    await waitFor(() => expect(mockCreateOrganizationFull).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByText('Organizacion Creada')).toBeInTheDocument())
    expect(screen.getByText('new-org-123')).toBeInTheDocument()
  })

  it('shows error on creation failure', async () => {
    mockCreateOrganizationFull.mockRejectedValue(new Error('Duplicate org'))
    render(<CreateOrgPage />)
    // Navigate to confirm
    fireEvent.change(screen.getByPlaceholderText('Clinica Estetica Bella Vida'), { target: { value: 'Mi Clinica Test' } })
    fireEvent.click(screen.getByText('Siguiente'))
    fireEvent.change(screen.getByPlaceholderText('doctor@clinica.com'), { target: { value: 'test@test.com' } })
    fireEvent.change(screen.getByPlaceholderText('Minimo 6 caracteres'), { target: { value: 'Pass123' } })
    fireEvent.click(screen.getByText('Siguiente'))
    fireEvent.click(screen.getByText('Siguiente'))
    fireEvent.click(screen.getByText('Siguiente'))
    fireEvent.click(screen.getByText('Siguiente'))
    fireEvent.click(screen.getByText('Siguiente'))
    fireEvent.click(screen.getByText('Crear Organizacion'))
    await waitFor(() => expect(screen.getByText('Duplicate org')).toBeInTheDocument())
  })

  it('navigates to org detail from success screen', async () => {
    mockCreateOrganizationFull.mockResolvedValue({ orgId: 'new-org-123', userId: 'u1' })
    render(<CreateOrgPage />)
    fireEvent.change(screen.getByPlaceholderText('Clinica Estetica Bella Vida'), { target: { value: 'Mi Clinica Test' } })
    fireEvent.click(screen.getByText('Siguiente'))
    fireEvent.change(screen.getByPlaceholderText('doctor@clinica.com'), { target: { value: 'test@test.com' } })
    fireEvent.change(screen.getByPlaceholderText('Minimo 6 caracteres'), { target: { value: 'Pass123' } })
    fireEvent.click(screen.getByText('Siguiente'))
    fireEvent.click(screen.getByText('Siguiente'))
    fireEvent.click(screen.getByText('Siguiente'))
    fireEvent.click(screen.getByText('Siguiente'))
    fireEvent.click(screen.getByText('Siguiente'))
    fireEvent.click(screen.getByText('Crear Organizacion'))
    await waitFor(() => screen.getByText('Ver Organizacion'))
    fireEvent.click(screen.getByText('Ver Organizacion'))
    expect(mockPush).toHaveBeenCalledWith('/admin/organizaciones/new-org-123')
  })

  it('navigates to admin from success screen', async () => {
    mockCreateOrganizationFull.mockResolvedValue({ orgId: 'new-org-123', userId: 'u1' })
    render(<CreateOrgPage />)
    fireEvent.change(screen.getByPlaceholderText('Clinica Estetica Bella Vida'), { target: { value: 'Mi Clinica Test' } })
    fireEvent.click(screen.getByText('Siguiente'))
    fireEvent.change(screen.getByPlaceholderText('doctor@clinica.com'), { target: { value: 'test@test.com' } })
    fireEvent.change(screen.getByPlaceholderText('Minimo 6 caracteres'), { target: { value: 'Pass123' } })
    fireEvent.click(screen.getByText('Siguiente'))
    fireEvent.click(screen.getByText('Siguiente'))
    fireEvent.click(screen.getByText('Siguiente'))
    fireEvent.click(screen.getByText('Siguiente'))
    fireEvent.click(screen.getByText('Siguiente'))
    fireEvent.click(screen.getByText('Crear Organizacion'))
    await waitFor(() => screen.getByText('Volver al Admin'))
    fireEvent.click(screen.getByText('Volver al Admin'))
    expect(mockPush).toHaveBeenCalledWith('/admin')
  })
})
