import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}))

// Mock supabase — use wrapper function to avoid TDZ with jest.mock hoisting
const mockResetPasswordForEmail = jest.fn()
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: (...args: unknown[]) => mockResetPasswordForEmail(...args),
    },
  },
}))

import ForgotPasswordPage from '@/app/forgot-password/page'

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockResetPasswordForEmail.mockResolvedValue({ error: null })
  })

  it('renders the page with email input and submit button', () => {
    render(<ForgotPasswordPage />)
    expect(screen.getByText('Recuperar contrasena')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('tu@clinica.com')).toBeInTheDocument()
    expect(screen.getByText('Enviar enlace')).toBeInTheDocument()
  })

  it('shows back to login link', () => {
    render(<ForgotPasswordPage />)
    expect(screen.getByText('Volver al login')).toBeInTheDocument()
  })

  it('navigates back to login when button clicked', () => {
    render(<ForgotPasswordPage />)
    fireEvent.click(screen.getByText('Volver al login'))
    expect(mockPush).toHaveBeenCalledWith('/login')
  })

  it('submits email and shows success state', async () => {
    render(<ForgotPasswordPage />)

    fireEvent.change(screen.getByPlaceholderText('tu@clinica.com'), {
      target: { value: 'test@clinica.com' },
    })
    fireEvent.click(screen.getByText('Enviar enlace'))

    await waitFor(() => {
      expect(screen.getByText('Revisa tu correo')).toBeInTheDocument()
    })
    expect(screen.getByText(/test@clinica.com/)).toBeInTheDocument()
  })

  it('shows error when reset fails', async () => {
    mockResetPasswordForEmail.mockResolvedValue({
      error: { message: 'User not found' },
    })

    render(<ForgotPasswordPage />)

    fireEvent.change(screen.getByPlaceholderText('tu@clinica.com'), {
      target: { value: 'bad@clinica.com' },
    })
    fireEvent.click(screen.getByText('Enviar enlace'))

    await waitFor(() => {
      expect(screen.getByText('User not found')).toBeInTheDocument()
    })
  })

  it('disables button when email is empty', () => {
    render(<ForgotPasswordPage />)
    const button = screen.getByText('Enviar enlace').closest('button')
    expect(button).toBeDisabled()
  })
})
