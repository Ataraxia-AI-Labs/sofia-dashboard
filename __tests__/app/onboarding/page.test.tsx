// __tests__/app/onboarding/page.test.tsx
// Tests for the Onboarding page (app/onboarding/page.tsx)

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// lucide-react — Proxy mock
jest.mock('lucide-react', () => {
  return new Proxy({}, {
    get: (_, name) => {
      const C = (p: any) => <svg data-testid={`icon-${String(name)}`} {...p} />
      C.displayName = String(name)
      return C
    },
  })
})

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), refresh: jest.fn(), back: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/onboarding',
}))

// Mock next/script
jest.mock('next/script', () => {
  return ({ children, ...rest }: any) => null
})

// Mock @/lib/supabase
jest.mock('@/lib/supabase', () => ({
  API_URL: 'https://api.test.com',
  supabase: { auth: { getSession: jest.fn().mockResolvedValue({ data: { session: null } }) } },
}))

// Mock global fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

import OnboardingPage from '@/app/onboarding/page'

// Helper: fill step 1 and navigate to step 2
function fillStep1() {
  const clinicInput = screen.getByLabelText(/Nombre de la clinica/)
  fireEvent.change(clinicInput, { target: { value: 'Mi Clinica Test' } })
  // Click specialty button — they contain accented text like "Odontología"
  const specialtyBtns = screen.getAllByRole('button').filter(btn =>
    btn.textContent?.includes('Odontolog')
  )
  if (specialtyBtns.length > 0) fireEvent.click(specialtyBtns[0])
}

function navigateToStep2() {
  fillStep1()
  fireEvent.click(screen.getByText(/Siguiente/))
}

function fillStep2() {
  fireEvent.change(screen.getByLabelText(/Nombre completo/), { target: { value: 'Dr Test' } })
  fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'dr@test.com' } })
  fireEvent.change(screen.getByLabelText(/Contrasena del Dashboard/), { target: { value: '12345678' } })
  fireEvent.change(screen.getByLabelText(/Confirmar contrasena/), { target: { value: '12345678' } })
  fireEvent.change(screen.getByLabelText(/WhatsApp del doctor/), { target: { value: '+573001234567' } })
}

function navigateToStep3() {
  navigateToStep2()
  fillStep2()
  fireEvent.click(screen.getByText(/Siguiente/))
}

function navigateToStep4() {
  navigateToStep3()
  // Step 3 — just click next (WhatsApp is optional)
  fireEvent.click(screen.getByText(/Siguiente/))
}

describe('OnboardingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ org_id: 'org-1', setup: { services: 5, whatsapp: false } }),
    })
    // Mock canvas
    HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({
      clearRect: jest.fn(),
      beginPath: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      scale: jest.fn(),
      set fillStyle(_v: any) {},
      set strokeStyle(_v: any) {},
      set lineWidth(_v: any) {},
    })
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1)
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  // ---- Step 1: Clinic Info ----

  it('renders step 1 initial view with clinic name input', () => {
    render(<OnboardingPage />)
    expect(screen.getByLabelText(/Nombre de la clinica/)).toBeInTheDocument()
  })

  it('renders specialty selection buttons', () => {
    render(<OnboardingPage />)
    // Specialties use accented characters: Odontología, Estética, etc.
    const btns = screen.getAllByRole('button').filter(btn =>
      btn.textContent?.includes('Odontolog') || btn.textContent?.includes('General')
    )
    expect(btns.length).toBeGreaterThanOrEqual(2)
  })

  it('renders city dropdown', () => {
    render(<OnboardingPage />)
    const citySelect = screen.getByLabelText(/Ciudad/)
    expect(citySelect).toBeInTheDocument()
  })

  it('renders step narrative title for step 1', () => {
    render(<OnboardingPage />)
    // Appears in both desktop and mobile panels
    const titles = screen.getAllByText('Nombra tu universo')
    expect(titles.length).toBeGreaterThanOrEqual(1)
  })

  it('renders progress pipeline bars', () => {
    const { container } = render(<OnboardingPage />)
    const bars = container.querySelectorAll('.flex-1.rounded-full')
    expect(bars.length).toBeGreaterThanOrEqual(4)
  })

  it('has step counter showing Paso 1/4', () => {
    render(<OnboardingPage />)
    const counters = screen.getAllByText(/Paso 1/)
    expect(counters.length).toBeGreaterThanOrEqual(1)
  })

  it('next button is disabled when clinic name and specialty are empty', () => {
    render(<OnboardingPage />)
    const nextBtn = screen.getByText(/Siguiente/)
    expect(nextBtn.closest('button')).toBeDisabled()
  })

  it('next button becomes enabled when clinic name and specialty are filled', () => {
    render(<OnboardingPage />)
    fillStep1()
    const nextBtn = screen.getByText(/Siguiente/)
    expect(nextBtn.closest('button')).not.toBeDisabled()
  })

  // ---- Step 2: Owner Info ----

  it('moves to step 2 after filling step 1 and clicking next', () => {
    render(<OnboardingPage />)
    navigateToStep2()
    expect(screen.getByLabelText(/Nombre completo/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument()
  })

  it('step 2 renders password fields', () => {
    render(<OnboardingPage />)
    navigateToStep2()
    expect(screen.getByLabelText(/Contrasena del Dashboard/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Confirmar contrasena/)).toBeInTheDocument()
  })

  it('step 2 shows password mismatch error', () => {
    render(<OnboardingPage />)
    navigateToStep2()
    fireEvent.change(screen.getByLabelText(/Contrasena del Dashboard/), { target: { value: '12345678' } })
    fireEvent.change(screen.getByLabelText(/Confirmar contrasena/), { target: { value: '12345679' } })
    expect(screen.getByText(/Las contrasenas no coinciden/)).toBeInTheDocument()
  })

  it('step 2 shows password match success', () => {
    render(<OnboardingPage />)
    navigateToStep2()
    fireEvent.change(screen.getByLabelText(/Contrasena del Dashboard/), { target: { value: '12345678' } })
    fireEvent.change(screen.getByLabelText(/Confirmar contrasena/), { target: { value: '12345678' } })
    expect(screen.getByText(/Contrasenas coinciden/)).toBeInTheDocument()
  })

  it('step 2 validates minimum password length', () => {
    render(<OnboardingPage />)
    navigateToStep2()
    fireEvent.change(screen.getByLabelText(/Contrasena del Dashboard/), { target: { value: '1234' } })
    expect(screen.getByText(/Minimo 8 caracteres/)).toBeInTheDocument()
  })

  it('step 2 renders phone input', () => {
    render(<OnboardingPage />)
    navigateToStep2()
    expect(screen.getByLabelText(/WhatsApp del doctor/)).toBeInTheDocument()
  })

  it('toggles password visibility', () => {
    render(<OnboardingPage />)
    navigateToStep2()
    const pwInput = screen.getByLabelText(/Contrasena del Dashboard/)
    expect(pwInput).toHaveAttribute('type', 'password')
    const toggleBtn = screen.getByLabelText(/Mostrar contrasena/)
    fireEvent.click(toggleBtn)
    expect(pwInput).toHaveAttribute('type', 'text')
  })

  it('can go back to step 1 from step 2', () => {
    render(<OnboardingPage />)
    navigateToStep2()
    expect(screen.getByLabelText(/Nombre completo/)).toBeInTheDocument()
    fireEvent.click(screen.getByText(/Atras/))
    expect(screen.getByLabelText(/Nombre de la clinica/)).toBeInTheDocument()
  })

  // ---- Step 3: WhatsApp ----

  it('step 3 renders WhatsApp Phone ID field', () => {
    render(<OnboardingPage />)
    navigateToStep3()
    expect(screen.getByLabelText(/Phone Number ID/)).toBeInTheDocument()
  })

  it('step 3 shows that WhatsApp config is optional', () => {
    render(<OnboardingPage />)
    navigateToStep3()
    expect(screen.getByText(/Puedes configurar WhatsApp en cualquier momento/)).toBeInTheDocument()
  })

  // ---- Step 4: Confirm ----

  it('step 4 shows summary with filled values', () => {
    render(<OnboardingPage />)
    navigateToStep4()
    const matches = screen.getAllByText('Mi Clinica Test')
    expect(matches.length).toBeGreaterThanOrEqual(1)
    const emailMatches = screen.getAllByText('dr@test.com')
    expect(emailMatches.length).toBeGreaterThanOrEqual(1)
  })

  it('step 4 has terms checkbox', () => {
    render(<OnboardingPage />)
    navigateToStep4()
    expect(screen.getByText(/Acepto los terminos de servicio/)).toBeInTheDocument()
  })

  it('step 4 activar button is disabled without terms', () => {
    render(<OnboardingPage />)
    navigateToStep4()
    const activateBtn = screen.getByText(/Activar Portal/)
    expect(activateBtn.closest('button')).toBeDisabled()
  })

  it('step 4 activar button becomes enabled after accepting terms', () => {
    render(<OnboardingPage />)
    navigateToStep4()
    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)
    const activateBtn = screen.getByText(/Activar Portal/)
    expect(activateBtn.closest('button')).not.toBeDisabled()
  })

  it('submits form and shows success screen', async () => {
    render(<OnboardingPage />)
    navigateToStep4()
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByText(/Activar Portal/))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/onboarding/register'),
        expect.objectContaining({ method: 'POST' })
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Portal activado')).toBeInTheDocument()
    })
  })

  it('shows email verification info on success', async () => {
    render(<OnboardingPage />)
    navigateToStep4()
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByText(/Activar Portal/))

    await waitFor(() => {
      expect(screen.getByText(/Enviamos un link de verificacion/)).toBeInTheDocument()
      expect(screen.getByText('dr@test.com')).toBeInTheDocument()
    })
  })

  it('shows error when submission fails with duplicate email', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ detail: 'Email already exists' }),
    })

    render(<OnboardingPage />)
    navigateToStep4()
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByText(/Activar Portal/))

    await waitFor(() => {
      expect(screen.getByText(/Ya existe una cuenta con este email/)).toBeInTheDocument()
    })
  })

  it('shows server error for 502 status', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: () => { throw new Error('not json') },
    })

    render(<OnboardingPage />)
    navigateToStep4()
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByText(/Activar Portal/))

    await waitFor(() => {
      expect(screen.getByText(/El servidor esta iniciando/)).toBeInTheDocument()
    })
  })

  it('shows resend email button on success screen', async () => {
    render(<OnboardingPage />)
    navigateToStep4()
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByText(/Activar Portal/))

    await waitFor(() => {
      // On success, resendCooldown is 60, so text is "Reenviar email (60s)"
      expect(screen.getByText(/Reenviar email/)).toBeInTheDocument()
    })
  })

  it('shows "Ya verifique mi email" button on success', async () => {
    render(<OnboardingPage />)
    navigateToStep4()
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByText(/Activar Portal/))

    await waitFor(() => {
      expect(screen.getByText(/Ya verifique mi email/)).toBeInTheDocument()
    })
  })

  it('navigates to login when clicking "Ya verifique mi email"', async () => {
    render(<OnboardingPage />)
    navigateToStep4()
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByText(/Activar Portal/))

    await waitFor(() => screen.getByText(/Ya verifique mi email/))
    fireEvent.click(screen.getByText(/Ya verifique mi email/))
    expect(mockPush).toHaveBeenCalledWith('/login')
  })

  it('shows setup status items on success', async () => {
    render(<OnboardingPage />)
    navigateToStep4()
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByText(/Activar Portal/))

    await waitFor(() => {
      expect(screen.getByText(/Organizacion creada/)).toBeInTheDocument()
      expect(screen.getByText(/Horarios configurados/)).toBeInTheDocument()
    })
  })

  it('shows rate limit error for 429 status', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: () => { throw new Error('not json') },
    })

    render(<OnboardingPage />)
    navigateToStep4()
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByText(/Activar Portal/))

    await waitFor(() => {
      expect(screen.getByText(/Demasiados intentos/)).toBeInTheDocument()
    })
  })
})
