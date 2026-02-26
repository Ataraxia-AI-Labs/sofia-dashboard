// __tests__/app/login/page.test.tsx
// ---------------------------------------------------------------------------
// Tests for the Login page (app/login/page.tsx)
//
// The login page:
//   - Renders a split layout (branding left, form right)
//   - Has email and password inputs with validation (required)
//   - Toggles password visibility via Eye/EyeOff icon button
//   - Calls supabase.auth.signInWithPassword on form submit
//   - Shows loading spinner during submission
//   - Displays error messages for invalid credentials and network errors
//   - Redirects to /dashboard (or ?redirect param) on success
//   - Prevents open redirects (rejects absolute URLs / // prefixed)
//   - Is wrapped in <Suspense> for useSearchParams compatibility
// ---------------------------------------------------------------------------

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock @/lib/supabase BEFORE importing the component
jest.mock('@/lib/supabase')
import { supabase } from '@/lib/supabase'

// Mock next/navigation
const mockReplace = jest.fn()
const mockSearchParams = new URLSearchParams()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: mockReplace,
    refresh: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/login',
}))

// Type access to the mock
const mockSignIn = supabase.auth.signInWithPassword as jest.Mock

// Import the page component AFTER mocks are set up
import LoginPage from '@/app/login/page'

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Default: successful login
    mockSignIn.mockResolvedValue({
      data: {
        session: { access_token: 'jwt-token' },
        user: { id: 'u-1', email: 'test@clinica.com' },
      },
      error: null,
    })
    // Reset search params
    mockSearchParams.delete('redirect')
  })

  // -----------------------------------------------------------------------
  // Rendering
  // -----------------------------------------------------------------------

  it('should render the login form with email and password inputs', () => {
    render(<LoginPage />)

    expect(screen.getByPlaceholderText('tu@clinica.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/••••/)).toBeInTheDocument()
  })

  it('should render the "Bienvenido" heading', () => {
    render(<LoginPage />)

    expect(screen.getByText('Bienvenido')).toBeInTheDocument()
  })

  it('should render the "Ingresa a tu panel de control" subtitle', () => {
    render(<LoginPage />)

    expect(screen.getByText('Ingresa a tu panel de control')).toBeInTheDocument()
  })

  it('should render the submit button with text "Entrar"', () => {
    render(<LoginPage />)

    const submitButton = screen.getByRole('button', { name: /entrar/i })
    expect(submitButton).toBeInTheDocument()
    expect(submitButton).toHaveAttribute('type', 'submit')
  })

  it('should render the branding section with company name', () => {
    render(<LoginPage />)

    // "Ataraxia" appears in the branding
    expect(screen.getAllByText(/Ataraxia/i).length).toBeGreaterThan(0)
  })

  it('should render the "Powered by SofIA" footer', () => {
    render(<LoginPage />)

    expect(screen.getByText(/Powered by/i)).toBeInTheDocument()
    expect(screen.getByText('SofIA')).toBeInTheDocument()
  })

  it('should render email input with required attribute', () => {
    render(<LoginPage />)

    const emailInput = screen.getByPlaceholderText('tu@clinica.com')
    expect(emailInput).toBeRequired()
    expect(emailInput).toHaveAttribute('type', 'email')
  })

  it('should render password input with required attribute', () => {
    render(<LoginPage />)

    const passwordInput = screen.getByPlaceholderText(/••••/)
    expect(passwordInput).toBeRequired()
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  // -----------------------------------------------------------------------
  // Password visibility toggle
  // -----------------------------------------------------------------------

  it('should toggle password visibility when eye button is clicked', async () => {
    render(<LoginPage />)
    const user = userEvent.setup()

    const passwordInput = screen.getByPlaceholderText(/••••/)
    expect(passwordInput).toHaveAttribute('type', 'password')

    // Find the toggle button (it's the button inside the password field container)
    // There are multiple buttons; the toggle is type="button"
    const toggleButtons = screen.getAllByRole('button').filter(
      (btn) => btn.getAttribute('type') === 'button'
    )
    expect(toggleButtons.length).toBeGreaterThan(0)

    // Click to show password
    await user.click(toggleButtons[0])
    expect(passwordInput).toHaveAttribute('type', 'text')

    // Click again to hide
    await user.click(toggleButtons[0])
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  // -----------------------------------------------------------------------
  // Form interaction
  // -----------------------------------------------------------------------

  it('should allow typing in email and password fields', async () => {
    render(<LoginPage />)
    const user = userEvent.setup()

    const emailInput = screen.getByPlaceholderText('tu@clinica.com')
    const passwordInput = screen.getByPlaceholderText(/••••/)

    await user.type(emailInput, 'doctor@clinica.com')
    await user.type(passwordInput, 'SecurePass123')

    expect(emailInput).toHaveValue('doctor@clinica.com')
    expect(passwordInput).toHaveValue('SecurePass123')
  })

  // -----------------------------------------------------------------------
  // Successful login
  // -----------------------------------------------------------------------

  it('should call signInWithPassword with trimmed email and password on submit', async () => {
    render(<LoginPage />)
    const user = userEvent.setup()

    await user.type(screen.getByPlaceholderText('tu@clinica.com'), '  doctor@clinica.com  ')
    await user.type(screen.getByPlaceholderText(/••••/), 'MyPassword1')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'doctor@clinica.com',
        password: 'MyPassword1',
      })
    })
  })

  it('should redirect to /dashboard on successful login', async () => {
    render(<LoginPage />)
    const user = userEvent.setup()

    await user.type(screen.getByPlaceholderText('tu@clinica.com'), 'doc@clinica.com')
    await user.type(screen.getByPlaceholderText(/••••/), 'pass123')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('should redirect to custom path from ?redirect param', async () => {
    mockSearchParams.set('redirect', '/dashboard/patients')

    render(<LoginPage />)
    const user = userEvent.setup()

    await user.type(screen.getByPlaceholderText('tu@clinica.com'), 'doc@clinica.com')
    await user.type(screen.getByPlaceholderText(/••••/), 'pass123')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard/patients')
    })
  })

  // -----------------------------------------------------------------------
  // Open redirect prevention
  // -----------------------------------------------------------------------

  it('should prevent open redirect by falling back to /dashboard for absolute URLs', async () => {
    mockSearchParams.set('redirect', 'https://evil.com')

    render(<LoginPage />)
    const user = userEvent.setup()

    await user.type(screen.getByPlaceholderText('tu@clinica.com'), 'doc@clinica.com')
    await user.type(screen.getByPlaceholderText(/••••/), 'pass123')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('should prevent open redirect for protocol-relative URLs (//evil.com)', async () => {
    mockSearchParams.set('redirect', '//evil.com')

    render(<LoginPage />)
    const user = userEvent.setup()

    await user.type(screen.getByPlaceholderText('tu@clinica.com'), 'doc@clinica.com')
    await user.type(screen.getByPlaceholderText(/••••/), 'pass123')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard')
    })
  })

  // -----------------------------------------------------------------------
  // Error handling
  // -----------------------------------------------------------------------

  it('should display translated error for invalid credentials', async () => {
    mockSignIn.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid login credentials' },
    })

    render(<LoginPage />)
    const user = userEvent.setup()

    await user.type(screen.getByPlaceholderText('tu@clinica.com'), 'wrong@email.com')
    await user.type(screen.getByPlaceholderText(/••••/), 'wrongpass')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => {
      expect(screen.getByText(/email o contraseña incorrectos/i)).toBeInTheDocument()
    })
  })

  it('should display raw error message for non-credential auth errors', async () => {
    mockSignIn.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Email not confirmed' },
    })

    render(<LoginPage />)
    const user = userEvent.setup()

    await user.type(screen.getByPlaceholderText('tu@clinica.com'), 'unconfirmed@email.com')
    await user.type(screen.getByPlaceholderText(/••••/), 'pass')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => {
      expect(screen.getByText('Email not confirmed')).toBeInTheDocument()
    })
  })

  it('should display network error message when signInWithPassword throws', async () => {
    mockSignIn.mockRejectedValue(new Error('Network error'))

    render(<LoginPage />)
    const user = userEvent.setup()

    await user.type(screen.getByPlaceholderText('tu@clinica.com'), 'doc@clinica.com')
    await user.type(screen.getByPlaceholderText(/••••/), 'pass')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => {
      expect(screen.getByText(/error de conexi[oó]n/i)).toBeInTheDocument()
    })
  })

  it('should NOT redirect when authentication fails', async () => {
    mockSignIn.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid login credentials' },
    })

    render(<LoginPage />)
    const user = userEvent.setup()

    await user.type(screen.getByPlaceholderText('tu@clinica.com'), 'wrong@email.com')
    await user.type(screen.getByPlaceholderText(/••••/), 'wrongpass')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => {
      expect(screen.getByText(/email o contraseña incorrectos/i)).toBeInTheDocument()
    })

    expect(mockReplace).not.toHaveBeenCalled()
  })

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------

  it('should disable the submit button while loading', async () => {
    // Make signIn hang (never resolve) to keep the loading state
    mockSignIn.mockReturnValue(new Promise(() => {}))

    render(<LoginPage />)
    const user = userEvent.setup()

    await user.type(screen.getByPlaceholderText('tu@clinica.com'), 'doc@clinica.com')
    await user.type(screen.getByPlaceholderText(/••••/), 'pass')

    const submitButton = screen.getByRole('button', { name: /entrar/i })
    await user.click(submitButton)

    await waitFor(() => {
      // The button should be disabled during loading
      const buttons = screen.getAllByRole('button')
      const submitBtn = buttons.find((btn) => btn.getAttribute('type') === 'submit')
      expect(submitBtn).toBeDisabled()
    })
  })

  it('should show a spinner while loading', async () => {
    mockSignIn.mockReturnValue(new Promise(() => {}))

    render(<LoginPage />)
    const user = userEvent.setup()

    await user.type(screen.getByPlaceholderText('tu@clinica.com'), 'doc@clinica.com')
    await user.type(screen.getByPlaceholderText(/••••/), 'pass')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => {
      // When loading, "Entrar" text is replaced by a spinner div
      expect(screen.queryByText('Entrar')).not.toBeInTheDocument()
    })
  })

  it('should re-enable the submit button after an error', async () => {
    mockSignIn.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid login credentials' },
    })

    render(<LoginPage />)
    const user = userEvent.setup()

    await user.type(screen.getByPlaceholderText('tu@clinica.com'), 'wrong@email.com')
    await user.type(screen.getByPlaceholderText(/••••/), 'wrongpass')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => {
      expect(screen.getByText(/email o contraseña incorrectos/i)).toBeInTheDocument()
    })

    // Submit button should be re-enabled
    const submitButton = screen.getByRole('button', { name: /entrar/i })
    expect(submitButton).not.toBeDisabled()
  })
})
