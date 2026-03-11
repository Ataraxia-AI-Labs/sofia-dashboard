// __tests__/app/mfa/page.test.tsx
// ---------------------------------------------------------------------------
// Tests for the MFA challenge page (app/mfa/page.tsx)
//
// The MFA page:
//   - Renders a 6-digit numeric code input
//   - Disables Verify button until 6 digits are entered
//   - Calls getMFAStatus to find the enrolled factor
//   - Calls verifyMFA with the factor id and entered code
//   - Redirects to /dashboard on success
//   - Shows error message on incorrect code
//   - Redirects to /dashboard if no MFA factor found (graceful fallback)
// ---------------------------------------------------------------------------

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock mfa-api BEFORE importing the component
jest.mock('@/lib/mfa-api')
import { getMFAStatus, verifyMFA } from '@/lib/mfa-api'

// Mock next/navigation
const mockReplace = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: mockReplace,
    refresh: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/mfa',
}))

// Mock Sentry
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }))

// Mock sofia-logo
jest.mock('@/components/sofia-logo', () => ({
  SofiaLogo: () => <div data-testid="sofia-logo" />,
}))

const mockGetMFAStatus = getMFAStatus as jest.Mock
const mockVerifyMFA = verifyMFA as jest.Mock

import MFAPage from '@/app/mfa/page'

describe('MFAPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetMFAStatus.mockResolvedValue({
      enabled: true,
      factors: [{ id: 'factor-uuid-123', type: 'totp', status: 'verified' }],
    })
    mockVerifyMFA.mockResolvedValue(undefined)
  })

  // ── Rendering ──────────────────────────────────────────────

  it('renders the MFA challenge form', () => {
    render(<MFAPage />)
    expect(screen.getByText(/verificacion de dos pasos/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText('000000')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /verificar/i })).toBeInTheDocument()
  })

  it('shows instructional text', () => {
    render(<MFAPage />)
    expect(screen.getByText(/app autenticadora/i)).toBeInTheDocument()
  })

  // ── Input behaviour ────────────────────────────────────────

  it('disables the verify button when code is less than 6 digits', () => {
    render(<MFAPage />)
    expect(screen.getByRole('button', { name: /verificar/i })).toBeDisabled()
  })

  it('enables the verify button when 6 digits are entered', async () => {
    render(<MFAPage />)
    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText('000000'), '123456')
    expect(screen.getByRole('button', { name: /verificar/i })).not.toBeDisabled()
  })

  it('strips non-numeric characters from code input', async () => {
    render(<MFAPage />)
    const user = userEvent.setup()
    const input = screen.getByPlaceholderText('000000')
    await user.type(input, 'abc123def456')
    expect((input as HTMLInputElement).value).toBe('123456')
  })

  // ── Submission ─────────────────────────────────────────────

  it('calls getMFAStatus and verifyMFA with the correct factor and code on submit', async () => {
    render(<MFAPage />)
    const user = userEvent.setup()

    await user.type(screen.getByPlaceholderText('000000'), '654321')
    await user.click(screen.getByRole('button', { name: /verificar/i }))

    await waitFor(() => {
      expect(mockGetMFAStatus).toHaveBeenCalled()
      expect(mockVerifyMFA).toHaveBeenCalledWith('factor-uuid-123', '654321')
    })
  })

  it('redirects to /dashboard on successful verification', async () => {
    render(<MFAPage />)
    const user = userEvent.setup()

    await user.type(screen.getByPlaceholderText('000000'), '123456')
    await user.click(screen.getByRole('button', { name: /verificar/i }))

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('redirects to /dashboard if no factor is found (graceful fallback)', async () => {
    mockGetMFAStatus.mockResolvedValue({ enabled: false, factors: [] })

    render(<MFAPage />)
    const user = userEvent.setup()

    await user.type(screen.getByPlaceholderText('000000'), '123456')
    await user.click(screen.getByRole('button', { name: /verificar/i }))

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard')
    })
    expect(mockVerifyMFA).not.toHaveBeenCalled()
  })

  // ── Error handling ─────────────────────────────────────────

  it('shows error message on invalid code', async () => {
    mockVerifyMFA.mockRejectedValue(new Error('Invalid TOTP code'))

    render(<MFAPage />)
    const user = userEvent.setup()

    await user.type(screen.getByPlaceholderText('000000'), '000000')
    await user.click(screen.getByRole('button', { name: /verificar/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid totp code/i)).toBeInTheDocument()
    })
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('re-enables the verify button after an error', async () => {
    mockVerifyMFA.mockRejectedValue(new Error('Invalid TOTP code'))

    render(<MFAPage />)
    const user = userEvent.setup()

    await user.type(screen.getByPlaceholderText('000000'), '000000')
    await user.click(screen.getByRole('button', { name: /verificar/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid totp code/i)).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /verificar/i })).not.toBeDisabled()
  })
})
