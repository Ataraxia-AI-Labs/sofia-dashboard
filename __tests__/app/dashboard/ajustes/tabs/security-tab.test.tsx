// __tests__/app/dashboard/ajustes/tabs/security-tab.test.tsx
// ---------------------------------------------------------------------------
// Tests for the SecurityTab component (2FA settings UI)
//
// The SecurityTab:
//   - Loads MFA status on mount
//   - Shows "Activar 2FA" button when 2FA is disabled
//   - Starts enrollment flow (shows QR code) when "Activar 2FA" is clicked
//   - Verifies the TOTP code to complete enrollment
//   - Shows success message after successful enrollment
//   - Shows "Desactivar 2FA" button when 2FA is enabled
//   - Opens confirmation modal when "Desactivar 2FA" is clicked
//   - Confirms password and calls unenrollMFA to disable 2FA
// ---------------------------------------------------------------------------

import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock mfa-api BEFORE importing the component
jest.mock('@/lib/mfa-api')
import { enrollMFA, verifyMFA, unenrollMFA, getMFAStatus } from '@/lib/mfa-api'

// Mock lib/supabase for the password re-verify step
jest.mock('@/lib/supabase')
import { supabase } from '@/lib/supabase'

// Mock Sentry
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }))

const mockGetMFAStatus = getMFAStatus as jest.Mock
const mockEnrollMFA = enrollMFA as jest.Mock
const mockVerifyMFA = verifyMFA as jest.Mock
const mockUnenrollMFA = unenrollMFA as jest.Mock
const mockSignIn = supabase.auth.signInWithPassword as jest.Mock
const mockGetUser = supabase.auth.getUser as jest.Mock

import { SecurityTab } from '@/app/dashboard/ajustes/tabs/security-tab'

describe('SecurityTab', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Default: 2FA disabled
    mockGetMFAStatus.mockResolvedValue({ enabled: false, factors: [] })
    mockEnrollMFA.mockResolvedValue({
      factorId: 'factor-uuid-123',
      qrCode: 'data:image/svg+xml;base64,mock-qr-code',
      secret: 'MOCK_SECRET_KEY',
      uri: 'otpauth://totp/SofIA?secret=MOCK_SECRET_KEY',
    })
    mockVerifyMFA.mockResolvedValue(undefined)
    mockUnenrollMFA.mockResolvedValue(undefined)
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u-1', email: 'test@clinica.com' } },
      error: null,
    })
    mockSignIn.mockResolvedValue({ data: {}, error: null })
  })

  // ── Loading & initial state ────────────────────────────────

  it('shows loading state initially', () => {
    mockGetMFAStatus.mockReturnValue(new Promise(() => {})) // never resolves
    render(<SecurityTab />)
    expect(screen.getByText(/cargando estado de seguridad/i)).toBeInTheDocument()
  })

  it('shows "Inactivo" badge and "Activar 2FA" button when 2FA is disabled', async () => {
    render(<SecurityTab />)
    await waitFor(() => {
      expect(screen.getByText('Inactivo')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /activar 2fa/i })).toBeInTheDocument()
  })

  it('shows "Activo" badge and "Desactivar 2FA" button when 2FA is enabled', async () => {
    mockGetMFAStatus.mockResolvedValue({
      enabled: true,
      factors: [{ id: 'factor-uuid-123', type: 'totp', status: 'verified' }],
    })
    render(<SecurityTab />)
    await waitFor(() => {
      expect(screen.getByText('Activo')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /desactivar 2fa/i })).toBeInTheDocument()
  })

  // ── Enable flow ────────────────────────────────────────────

  it('calls enrollMFA and shows QR code when "Activar 2FA" is clicked', async () => {
    render(<SecurityTab />)
    const user = userEvent.setup()
    await waitFor(() => screen.getByRole('button', { name: /activar 2fa/i }))

    await user.click(screen.getByRole('button', { name: /activar 2fa/i }))

    await waitFor(() => {
      expect(mockEnrollMFA).toHaveBeenCalled()
      expect(screen.getByAltText(/qr code/i)).toBeInTheDocument()
    })
  })

  it('shows the secret key and a copy button during enrollment', async () => {
    render(<SecurityTab />)
    const user = userEvent.setup()
    await waitFor(() => screen.getByRole('button', { name: /activar 2fa/i }))
    await user.click(screen.getByRole('button', { name: /activar 2fa/i }))

    await waitFor(() => {
      expect(screen.getByText('MOCK_SECRET_KEY')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /copiar/i })).toBeInTheDocument()
  })

  it('disables the Verificar button until 6 digits are entered', async () => {
    render(<SecurityTab />)
    const user = userEvent.setup()
    await waitFor(() => screen.getByRole('button', { name: /activar 2fa/i }))
    await user.click(screen.getByRole('button', { name: /activar 2fa/i }))

    await waitFor(() => screen.getByRole('button', { name: /verificar/i }))
    const verifyBtn = screen.getByRole('button', { name: /verificar/i })
    expect(verifyBtn).toBeDisabled()
  })

  it('calls verifyMFA and shows success message on correct code', async () => {
    render(<SecurityTab />)
    const user = userEvent.setup()
    await waitFor(() => screen.getByRole('button', { name: /activar 2fa/i }))
    await user.click(screen.getByRole('button', { name: /activar 2fa/i }))

    await waitFor(() => screen.getByPlaceholderText('000000'))
    await user.type(screen.getByPlaceholderText('000000'), '123456')
    await user.click(screen.getByRole('button', { name: /verificar/i }))

    await waitFor(() => {
      expect(mockVerifyMFA).toHaveBeenCalledWith('factor-uuid-123', '123456')
      expect(screen.getByText(/2fa activado correctamente/i)).toBeInTheDocument()
    })
  })

  it('shows error on wrong verification code', async () => {
    mockVerifyMFA.mockRejectedValue(new Error('Codigo incorrecto'))
    render(<SecurityTab />)
    const user = userEvent.setup()
    await waitFor(() => screen.getByRole('button', { name: /activar 2fa/i }))
    await user.click(screen.getByRole('button', { name: /activar 2fa/i }))

    await waitFor(() => screen.getByPlaceholderText('000000'))
    await user.type(screen.getByPlaceholderText('000000'), '000000')
    await user.click(screen.getByRole('button', { name: /verificar/i }))

    await waitFor(() => {
      expect(screen.getByText(/codigo incorrecto/i)).toBeInTheDocument()
    })
  })

  it('cancels enrollment and hides QR code', async () => {
    render(<SecurityTab />)
    const user = userEvent.setup()
    await waitFor(() => screen.getByRole('button', { name: /activar 2fa/i }))
    await user.click(screen.getByRole('button', { name: /activar 2fa/i }))

    await waitFor(() => screen.getByRole('button', { name: /cancelar/i }))
    await user.click(screen.getByRole('button', { name: /cancelar/i }))

    await waitFor(() => {
      expect(screen.queryByAltText(/qr code/i)).not.toBeInTheDocument()
    })
  })

  // ── Disable flow ───────────────────────────────────────────

  it('opens disable confirmation modal when "Desactivar 2FA" is clicked', async () => {
    mockGetMFAStatus.mockResolvedValue({
      enabled: true,
      factors: [{ id: 'factor-uuid-123', type: 'totp', status: 'verified' }],
    })
    render(<SecurityTab />)
    const user = userEvent.setup()
    await waitFor(() => screen.getByRole('button', { name: /desactivar 2fa/i }))
    await user.click(screen.getByRole('button', { name: /desactivar 2fa/i }))

    await waitFor(() => {
      expect(screen.getByText(/confirma tu contrasena/i)).toBeInTheDocument()
    })
  })

  it('calls unenrollMFA after password confirmation', async () => {
    mockGetMFAStatus.mockResolvedValue({
      enabled: true,
      factors: [{ id: 'factor-uuid-123', type: 'totp', status: 'verified' }],
    })
    render(<SecurityTab />)
    const user = userEvent.setup()
    await waitFor(() => screen.getByRole('button', { name: /desactivar 2fa/i }))
    await user.click(screen.getByRole('button', { name: /desactivar 2fa/i }))

    await waitFor(() => screen.getByPlaceholderText(/••••/))
    // Use fireEvent.change to reliably set controlled input value
    fireEvent.change(screen.getByPlaceholderText(/••••/), { target: { value: 'mypassword' } })
    await user.click(screen.getByRole('button', { name: /^desactivar$/i }))

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'test@clinica.com',
        password: 'mypassword',
      })
      expect(mockUnenrollMFA).toHaveBeenCalledWith('factor-uuid-123')
    })
  })

  it('shows error if disable password is incorrect', async () => {
    mockGetMFAStatus.mockResolvedValue({
      enabled: true,
      factors: [{ id: 'factor-uuid-123', type: 'totp', status: 'verified' }],
    })
    mockSignIn.mockResolvedValue({
      data: { session: null },
      error: { message: 'Invalid login credentials' },
    })
    render(<SecurityTab />)
    const user = userEvent.setup()
    await waitFor(() => screen.getByRole('button', { name: /desactivar 2fa/i }))
    await user.click(screen.getByRole('button', { name: /desactivar 2fa/i }))

    await waitFor(() => screen.getByPlaceholderText(/••••/))
    fireEvent.change(screen.getByPlaceholderText(/••••/), { target: { value: 'wrongpassword' } })
    await user.click(screen.getByRole('button', { name: /^desactivar$/i }))

    await waitFor(() => {
      expect(screen.getByText(/contrasena incorrecta/i)).toBeInTheDocument()
    })
    expect(mockUnenrollMFA).not.toHaveBeenCalled()
  })
})
