// __tests__/app/reset-password/page.test.tsx
// Tests for the Reset Password page (app/reset-password/page.tsx)

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

// Mock supabase BEFORE importing the component
jest.mock('@/lib/supabase')
import { supabase } from '@/lib/supabase'

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

// next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), refresh: jest.fn(), back: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/reset-password',
}))

const mockOnAuthStateChange = supabase.auth.onAuthStateChange as jest.Mock
const mockGetSession = supabase.auth.getSession as jest.Mock

// Ensure updateUser exists on the mock
if (!(supabase.auth as any).updateUser) {
  (supabase.auth as any).updateUser = jest.fn()
}
const mockUpdateUser = (supabase.auth as any).updateUser as jest.Mock

import ResetPasswordPage from '@/app/reset-password/page'

// Helper: render with session ready (form visible)
async function renderWithSession() {
  mockGetSession.mockResolvedValue({
    data: { session: { access_token: 'tok', user: { id: 'u1' } } },
    error: null,
  })
  render(<ResetPasswordPage />)
  // Wait for the h2 heading of the form
  await waitFor(() => {
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Nueva contrasena')
  })
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Default: no session, no PASSWORD_RECOVERY event
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    })
    mockUpdateUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
  })

  it('renders the verifying link state initially (no session)', async () => {
    render(<ResetPasswordPage />)
    await waitFor(() => {
      expect(screen.getByText(/Verificando enlace/)).toBeInTheDocument()
    })
  })

  it('shows waiting message when no session is ready', async () => {
    render(<ResetPasswordPage />)
    await waitFor(() => {
      expect(screen.getByText(/Si fuiste redirigido desde tu email/)).toBeInTheDocument()
    })
  })

  it('shows link to request new reset when link expired', async () => {
    render(<ResetPasswordPage />)
    await waitFor(() => {
      expect(screen.getByText(/solicita uno nuevo/)).toBeInTheDocument()
    })
  })

  it('navigates to forgot-password when clicking "solicita uno nuevo"', async () => {
    render(<ResetPasswordPage />)
    await waitFor(() => {
      const btn = screen.getByText(/solicita uno nuevo/)
      fireEvent.click(btn)
    })
    expect(mockPush).toHaveBeenCalledWith('/forgot-password')
  })

  it('shows password form when session is ready (getSession returns session)', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'tok', user: { id: 'u1' } } },
      error: null,
    })
    render(<ResetPasswordPage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Nueva contrasena')
    })
  })

  it('shows password form when PASSWORD_RECOVERY event fires', async () => {
    let authCallback: (event: string) => void = () => {}
    mockOnAuthStateChange.mockImplementation((cb: any) => {
      authCallback = cb
      return { data: { subscription: { unsubscribe: jest.fn() } } }
    })
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })

    render(<ResetPasswordPage />)

    act(() => {
      authCallback('PASSWORD_RECOVERY')
    })

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Nueva contrasena')
    })
  })

  it('renders password and confirm password inputs when session ready', async () => {
    await renderWithSession()
    expect(screen.getByPlaceholderText('Minimo 8 caracteres')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Repite la contrasena')).toBeInTheDocument()
  })

  it('renders the submit button disabled when password is too short', async () => {
    await renderWithSession()
    const btn = screen.getByRole('button', { name: /Restablecer contrasena/ })
    expect(btn).toBeDisabled()
  })

  it('renders password strength indicators', async () => {
    await renderWithSession()
    const { container } = render(<ResetPasswordPage />)
    // 4 strength bars rendered via h-1 class
    const bars = document.querySelectorAll('.h-1.flex-1.rounded-full')
    expect(bars.length).toBeGreaterThanOrEqual(4)
  })

  it('shows error when password < 8 characters on submit', async () => {
    await renderWithSession()

    const pwInput = screen.getByPlaceholderText('Minimo 8 caracteres')
    const confirmInput = screen.getByPlaceholderText('Repite la contrasena')

    fireEvent.change(pwInput, { target: { value: '1234567' } })
    fireEvent.change(confirmInput, { target: { value: '1234567' } })

    const form = pwInput.closest('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText(/La contrasena debe tener al menos 8 caracteres/)).toBeInTheDocument()
    })
  })

  it('shows error when passwords do not match', async () => {
    await renderWithSession()

    const pwInput = screen.getByPlaceholderText('Minimo 8 caracteres')
    const confirmInput = screen.getByPlaceholderText('Repite la contrasena')

    fireEvent.change(pwInput, { target: { value: '12345678' } })
    fireEvent.change(confirmInput, { target: { value: '12345679' } })

    const form = pwInput.closest('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText(/Las contrasenas no coinciden/)).toBeInTheDocument()
    })
  })

  it('calls supabase updateUser and shows success on valid submit', async () => {
    await renderWithSession()

    fireEvent.change(screen.getByPlaceholderText('Minimo 8 caracteres'), { target: { value: 'newpassword123' } })
    fireEvent.change(screen.getByPlaceholderText('Repite la contrasena'), { target: { value: 'newpassword123' } })

    fireEvent.submit(screen.getByPlaceholderText('Minimo 8 caracteres').closest('form')!)

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newpassword123' })
    })

    await waitFor(() => {
      expect(screen.getByText('Contrasena actualizada')).toBeInTheDocument()
    })
  })

  it('shows success message with redirect info after update', async () => {
    await renderWithSession()

    fireEvent.change(screen.getByPlaceholderText('Minimo 8 caracteres'), { target: { value: 'newpass123' } })
    fireEvent.change(screen.getByPlaceholderText('Repite la contrasena'), { target: { value: 'newpass123' } })
    fireEvent.submit(screen.getByPlaceholderText('Minimo 8 caracteres').closest('form')!)

    await waitFor(() => {
      expect(screen.getByText(/Redirigiendo al dashboard/)).toBeInTheDocument()
    })
  })

  it('shows error from supabase updateUser failure', async () => {
    mockUpdateUser.mockResolvedValue({ data: null, error: { message: 'Token expired' } })
    await renderWithSession()

    fireEvent.change(screen.getByPlaceholderText('Minimo 8 caracteres'), { target: { value: 'newpass123' } })
    fireEvent.change(screen.getByPlaceholderText('Repite la contrasena'), { target: { value: 'newpass123' } })
    fireEvent.submit(screen.getByPlaceholderText('Minimo 8 caracteres').closest('form')!)

    await waitFor(() => {
      expect(screen.getByText('Token expired')).toBeInTheDocument()
    })
  })

  it('toggles password visibility', async () => {
    await renderWithSession()

    const pwInput = screen.getByPlaceholderText('Minimo 8 caracteres')
    expect(pwInput).toHaveAttribute('type', 'password')

    // The Eye icon toggle button
    const eyeIcon = screen.getByTestId('icon-Eye')
    fireEvent.click(eyeIcon.closest('button')!)

    expect(pwInput).toHaveAttribute('type', 'text')
  })

  it('unsubscribes from auth state change on unmount', async () => {
    const mockUnsubscribe = jest.fn()
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    })

    const { unmount } = render(<ResetPasswordPage />)
    unmount()
    expect(mockUnsubscribe).toHaveBeenCalled()
  })

  it('renders Sentient Eye SVG logo', () => {
    render(<ResetPasswordPage />)
    const svgs = document.querySelectorAll('svg[viewBox="0 0 48 48"]')
    expect(svgs.length).toBeGreaterThanOrEqual(1)
  })

  it('has min-h-screen layout', () => {
    const { container } = render(<ResetPasswordPage />)
    expect(container.firstChild).toHaveClass('min-h-screen')
  })
})
