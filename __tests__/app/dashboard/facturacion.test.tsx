// __tests__/app/dashboard/facturacion.test.tsx
// ---------------------------------------------------------------------------
// Nuclear-level tests for the Facturacion (Billing) page
// (app/dashboard/facturacion/page.tsx)
//
// States tested: loading skeleton, no subscription CTA, subscription details
// (plan, price, billing cycle, payment method, status badges), invoice list,
// invoice statuses, empty invoices, usage section (STARTER only), usage warning,
// cancel subscription modal flow, update card modal, action errors, cancel_at_period_end warning.
// ---------------------------------------------------------------------------

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// ---- Mocks (BEFORE component import) ----

jest.mock('@/lib/org-context')
jest.mock('@/lib/api/subscriptions')
jest.mock('@/lib/api', () => ({
  formatCOP: (n: number) => `$${n.toLocaleString()}`,
}))
jest.mock('@/components/card-tokenization-form', () => {
  const C = (p: any) => (
    <div data-testid="card-tokenization-form">
      <button onClick={() => p.onTokenized('tok_123')}>Tokenize</button>
      <button onClick={() => p.onError('Token error')}>TokenError</button>
    </div>
  )
  C.displayName = 'CardTokenizationForm'
  return { __esModule: true, default: C }
})
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
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }))

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), refresh: jest.fn(), back: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/facturacion',
}))
jest.mock('lucide-react', () => {
  return new Proxy({}, {
    get: (_, name) => {
      const C = (p: any) => <svg data-testid={`icon-${String(name)}`} {...p} />
      C.displayName = String(name)
      return C
    },
  })
})

import { useOrg } from '@/lib/org-context'
import {
  fetchSubscription,
  fetchInvoices,
  fetchUsage,
  updatePaymentMethod,
  cancelSubscription,
  fetchWompiConfig,
} from '@/lib/api/subscriptions'

const mockUseOrg = useOrg as jest.Mock
const mockFetchSub = fetchSubscription as jest.Mock
const mockFetchInvoices = fetchInvoices as jest.Mock
const mockFetchUsage = fetchUsage as jest.Mock
const mockUpdatePayment = updatePaymentMethod as jest.Mock
const mockCancelSub = cancelSubscription as jest.Mock
const mockFetchWompi = fetchWompiConfig as jest.Mock

import FacturacionPage from '@/app/dashboard/facturacion/page'

// ---- Factories ----

function makeSub(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'sub-1',
    organization_id: 'org-1',
    plan: overrides.plan ?? 'PRO',
    billing_cycle: overrides.billing_cycle ?? 'MONTHLY',
    status: overrides.status ?? 'ACTIVE',
    amount_cop: overrides.amount_cop ?? 319000,
    current_period_start: '2026-03-01T00:00:00Z',
    current_period_end: '2026-04-01T00:00:00Z',
    next_billing_date: '2026-04-01T00:00:00Z',
    cancel_at_period_end: overrides.cancel_at_period_end ?? false,
    payment_method_brand: overrides.payment_method_brand ?? 'VISA',
    payment_method_last_four: overrides.payment_method_last_four ?? '4242',
    retry_count: 0,
    customer_email: 'test@clinic.com',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
    ...overrides,
  }
}

function makeInvoice(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: overrides.id ?? 'inv-1',
    organization_id: 'org-1',
    amount_cop: overrides.amount_cop ?? 319000,
    currency: 'COP',
    plan: 'PRO',
    billing_cycle: 'MONTHLY',
    period_start: overrides.period_start ?? '2026-03-01T00:00:00Z',
    period_end: overrides.period_end ?? '2026-04-01T00:00:00Z',
    status: overrides.status ?? 'PAID',
    created_at: overrides.created_at ?? '2026-03-01T00:00:00Z',
  }
}

function makeUsage(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    message_count: overrides.message_count ?? 320,
    message_limit: overrides.message_limit ?? 500,
    percent: overrides.percent ?? 64,
    period_start: '2026-03-01T00:00:00Z',
    period_end: '2026-04-01T00:00:00Z',
  }
}

const wompiCfg = { public_key: 'pub_test_123', sandbox: true, acceptance_token: 'acc_tok_123' }

// ---- Setup ----

beforeEach(() => {
  jest.clearAllMocks()
  mockUseOrg.mockReturnValue({ orgId: 'org-1', branchId: null, orgName: 'Test Clinic', plan: 'PRO', role: 'OWNER' })
  mockPush.mockClear()
})

// ---- Tests ----

describe('FacturacionPage', () => {
  // 1. Loading skeleton
  it('renders loading skeleton while data is being fetched', () => {
    mockFetchSub.mockReturnValue(new Promise(() => {}))
    mockFetchInvoices.mockReturnValue(new Promise(() => {}))
    mockFetchUsage.mockReturnValue(new Promise(() => {}))
    mockFetchWompi.mockReturnValue(new Promise(() => {}))
    render(<FacturacionPage />)
    const pulseElements = document.querySelectorAll('.animate-pulse')
    expect(pulseElements.length).toBeGreaterThanOrEqual(3)
  })

  // 2. No subscription CTA
  it('shows no-subscription CTA with link to plans when sub is null', async () => {
    const user = userEvent.setup()
    mockFetchSub.mockResolvedValue(null)
    mockFetchInvoices.mockResolvedValue([])
    mockFetchUsage.mockResolvedValue(null)
    mockFetchWompi.mockResolvedValue(null)
    render(<FacturacionPage />)
    await waitFor(() => {
      expect(screen.getByText('noSubscription')).toBeInTheDocument()
      expect(screen.getByText('noSubscriptionDesc')).toBeInTheDocument()
    })
    await user.click(screen.getByText(/viewPlans/))
    expect(mockPush).toHaveBeenCalledWith('/dashboard/planes')
  })

  // 3. Subscription plan details render
  it('renders subscription plan, price, billing cycle', async () => {
    mockFetchSub.mockResolvedValue(makeSub())
    mockFetchInvoices.mockResolvedValue([])
    mockFetchUsage.mockResolvedValue(null)
    mockFetchWompi.mockResolvedValue(wompiCfg)
    render(<FacturacionPage />)
    await waitFor(() => {
      expect(screen.getByText('currentPlan')).toBeInTheDocument()
      expect(screen.getByText('PRO')).toBeInTheDocument()
      expect(screen.getByText('$319,000')).toBeInTheDocument()
    })
  })

  // 4. Payment method display
  it('displays payment method brand and last four', async () => {
    mockFetchSub.mockResolvedValue(makeSub())
    mockFetchInvoices.mockResolvedValue([])
    mockFetchUsage.mockResolvedValue(null)
    mockFetchWompi.mockResolvedValue(wompiCfg)
    render(<FacturacionPage />)
    await waitFor(() => {
      expect(screen.getByText('VISA ****4242')).toBeInTheDocument()
    })
  })

  // 5. Payment method — not registered
  it('shows notRegistered when no payment method', async () => {
    mockFetchSub.mockResolvedValue(makeSub({ payment_method_brand: null, payment_method_last_four: null }))
    mockFetchInvoices.mockResolvedValue([])
    mockFetchUsage.mockResolvedValue(null)
    mockFetchWompi.mockResolvedValue(wompiCfg)
    render(<FacturacionPage />)
    await waitFor(() => {
      expect(screen.getByText('notRegistered')).toBeInTheDocument()
    })
  })

  // 6. Status badge — ACTIVE
  it('renders active subscription status badge', async () => {
    mockFetchSub.mockResolvedValue(makeSub({ status: 'ACTIVE' }))
    mockFetchInvoices.mockResolvedValue([])
    mockFetchUsage.mockResolvedValue(null)
    mockFetchWompi.mockResolvedValue(wompiCfg)
    render(<FacturacionPage />)
    await waitFor(() => {
      expect(screen.getByText('subStatuses.ACTIVE')).toBeInTheDocument()
    })
  })

  // 7. Status badge — PAST_DUE
  it('renders PAST_DUE subscription status badge', async () => {
    mockFetchSub.mockResolvedValue(makeSub({ status: 'PAST_DUE' }))
    mockFetchInvoices.mockResolvedValue([])
    mockFetchUsage.mockResolvedValue(null)
    mockFetchWompi.mockResolvedValue(wompiCfg)
    render(<FacturacionPage />)
    await waitFor(() => {
      expect(screen.getByText('subStatuses.PAST_DUE')).toBeInTheDocument()
    })
  })

  // 8. Invoice list renders
  it('renders invoice list with amounts and statuses', async () => {
    mockFetchSub.mockResolvedValue(makeSub())
    mockFetchInvoices.mockResolvedValue([
      makeInvoice({ id: 'inv-1', status: 'PAID', amount_cop: 319000 }),
      makeInvoice({ id: 'inv-2', status: 'PENDING', amount_cop: 319000 }),
    ])
    mockFetchUsage.mockResolvedValue(null)
    mockFetchWompi.mockResolvedValue(wompiCfg)
    render(<FacturacionPage />)
    await waitFor(() => {
      expect(screen.getByText('invoiceHistory')).toBeInTheDocument()
      expect(screen.getByText('invoiceStatuses.PAID')).toBeInTheDocument()
      expect(screen.getByText('invoiceStatuses.PENDING')).toBeInTheDocument()
    })
  })

  // 9. Invoice status badges — all types
  it('renders all invoice status types correctly', async () => {
    mockFetchSub.mockResolvedValue(makeSub())
    mockFetchInvoices.mockResolvedValue([
      makeInvoice({ id: 'inv-1', status: 'PAID' }),
      makeInvoice({ id: 'inv-2', status: 'FAILED' }),
      makeInvoice({ id: 'inv-3', status: 'REFUNDED' }),
      makeInvoice({ id: 'inv-4', status: 'VOID' }),
    ])
    mockFetchUsage.mockResolvedValue(null)
    mockFetchWompi.mockResolvedValue(wompiCfg)
    render(<FacturacionPage />)
    await waitFor(() => {
      expect(screen.getByText('invoiceStatuses.PAID')).toBeInTheDocument()
      expect(screen.getByText('invoiceStatuses.FAILED')).toBeInTheDocument()
      expect(screen.getByText('invoiceStatuses.REFUNDED')).toBeInTheDocument()
      expect(screen.getByText('invoiceStatuses.VOID')).toBeInTheDocument()
    })
  })

  // 10. Empty invoices
  it('shows empty state for invoices when none exist', async () => {
    mockFetchSub.mockResolvedValue(makeSub())
    mockFetchInvoices.mockResolvedValue([])
    mockFetchUsage.mockResolvedValue(null)
    mockFetchWompi.mockResolvedValue(wompiCfg)
    render(<FacturacionPage />)
    await waitFor(() => {
      expect(screen.getByText('noInvoices')).toBeInTheDocument()
    })
  })

  // 11. Invoice period display
  it('renders invoice period dates', async () => {
    mockFetchSub.mockResolvedValue(makeSub())
    mockFetchInvoices.mockResolvedValue([
      makeInvoice({ period_start: '2026-03-01T00:00:00Z', period_end: '2026-04-01T00:00:00Z' }),
    ])
    mockFetchUsage.mockResolvedValue(null)
    mockFetchWompi.mockResolvedValue(wompiCfg)
    render(<FacturacionPage />)
    await waitFor(() => {
      expect(screen.getByText('invoicePeriod')).toBeInTheDocument()
    })
  })

  // 12. Usage section visible for STARTER only
  it('shows usage section for STARTER plan', async () => {
    mockFetchSub.mockResolvedValue(makeSub({ plan: 'STARTER' }))
    mockFetchInvoices.mockResolvedValue([])
    mockFetchUsage.mockResolvedValue(makeUsage())
    mockFetchWompi.mockResolvedValue(wompiCfg)
    render(<FacturacionPage />)
    await waitFor(() => {
      expect(screen.getByText('monthUsage')).toBeInTheDocument()
    })
  })

  // 13. Usage section hidden for PRO
  it('does NOT show usage section for PRO plan', async () => {
    mockFetchSub.mockResolvedValue(makeSub({ plan: 'PRO' }))
    mockFetchInvoices.mockResolvedValue([])
    mockFetchUsage.mockResolvedValue(makeUsage())
    mockFetchWompi.mockResolvedValue(wompiCfg)
    render(<FacturacionPage />)
    await waitFor(() => {
      expect(screen.getByText('currentPlan')).toBeInTheDocument()
    })
    expect(screen.queryByText('monthUsage')).not.toBeInTheDocument()
  })

  // 14. Usage warning when over 80%
  it('shows usage warning when percent exceeds 80%', async () => {
    mockFetchSub.mockResolvedValue(makeSub({ plan: 'STARTER' }))
    mockFetchInvoices.mockResolvedValue([])
    mockFetchUsage.mockResolvedValue(makeUsage({ percent: 92, message_count: 460, message_limit: 500 }))
    mockFetchWompi.mockResolvedValue(wompiCfg)
    render(<FacturacionPage />)
    await waitFor(() => {
      expect(screen.getByText('nearLimit')).toBeInTheDocument()
      expect(screen.getByText('92%')).toBeInTheDocument()
    })
  })

  // 15. Cancel subscription button visible when active
  it('shows cancel button for active subscription', async () => {
    mockFetchSub.mockResolvedValue(makeSub({ status: 'ACTIVE' }))
    mockFetchInvoices.mockResolvedValue([])
    mockFetchUsage.mockResolvedValue(null)
    mockFetchWompi.mockResolvedValue(wompiCfg)
    render(<FacturacionPage />)
    await waitFor(() => {
      expect(screen.getByText('cancelSubscription')).toBeInTheDocument()
    })
  })

  // 16. Cancel button hidden when already cancelled
  it('hides cancel button for cancelled subscription', async () => {
    mockFetchSub.mockResolvedValue(makeSub({ status: 'CANCELLED' }))
    mockFetchInvoices.mockResolvedValue([])
    mockFetchUsage.mockResolvedValue(null)
    mockFetchWompi.mockResolvedValue(wompiCfg)
    render(<FacturacionPage />)
    await waitFor(() => {
      expect(screen.getByText('currentPlan')).toBeInTheDocument()
    })
    expect(screen.queryByText('cancelSubscription')).not.toBeInTheDocument()
  })

  // 17. Cancel button hidden when cancel_at_period_end
  it('hides cancel button when cancel_at_period_end is true', async () => {
    mockFetchSub.mockResolvedValue(makeSub({ cancel_at_period_end: true }))
    mockFetchInvoices.mockResolvedValue([])
    mockFetchUsage.mockResolvedValue(null)
    mockFetchWompi.mockResolvedValue(wompiCfg)
    render(<FacturacionPage />)
    await waitFor(() => {
      expect(screen.getByText('currentPlan')).toBeInTheDocument()
    })
    expect(screen.queryByText('cancelSubscription')).not.toBeInTheDocument()
  })

  // 18. Cancel at period end warning
  it('shows cancellation warning when cancel_at_period_end is true', async () => {
    mockFetchSub.mockResolvedValue(makeSub({ cancel_at_period_end: true }))
    mockFetchInvoices.mockResolvedValue([])
    mockFetchUsage.mockResolvedValue(null)
    mockFetchWompi.mockResolvedValue(wompiCfg)
    render(<FacturacionPage />)
    await waitFor(() => {
      expect(screen.getByText(/cancelAt/)).toBeInTheDocument()
    })
  })

  // 19. Cancel modal flow — open and confirm
  it('opens cancel modal and confirms cancellation', async () => {
    const user = userEvent.setup()
    mockFetchSub.mockResolvedValue(makeSub())
    mockFetchInvoices.mockResolvedValue([])
    mockFetchUsage.mockResolvedValue(null)
    mockFetchWompi.mockResolvedValue(wompiCfg)
    mockCancelSub.mockResolvedValue({ exito: true })
    render(<FacturacionPage />)
    await waitFor(() => expect(screen.getByText('cancelSubscription')).toBeInTheDocument())

    await user.click(screen.getByText('cancelSubscription'))
    await waitFor(() => {
      expect(screen.getByText('areYouSure')).toBeInTheDocument()
      expect(screen.getByText(/cancelDesc/)).toBeInTheDocument()
    })

    await user.click(screen.getByText('confirmCancel'))
    await waitFor(() => {
      expect(mockCancelSub).toHaveBeenCalledWith('org-1')
    })
  })

  // 20. Cancel modal — close with back button
  it('closes cancel modal when back button is clicked', async () => {
    const user = userEvent.setup()
    mockFetchSub.mockResolvedValue(makeSub())
    mockFetchInvoices.mockResolvedValue([])
    mockFetchUsage.mockResolvedValue(null)
    mockFetchWompi.mockResolvedValue(wompiCfg)
    render(<FacturacionPage />)
    await waitFor(() => expect(screen.getByText('cancelSubscription')).toBeInTheDocument())

    await user.click(screen.getByText('cancelSubscription'))
    await waitFor(() => expect(screen.getByText('areYouSure')).toBeInTheDocument())

    await user.click(screen.getByText('back'))
    await waitFor(() => {
      expect(screen.queryByText('areYouSure')).not.toBeInTheDocument()
    })
  })

  // 21. Cancel modal — error handling
  it('shows action error when cancellation fails', async () => {
    const user = userEvent.setup()
    mockFetchSub.mockResolvedValue(makeSub())
    mockFetchInvoices.mockResolvedValue([])
    mockFetchUsage.mockResolvedValue(null)
    mockFetchWompi.mockResolvedValue(wompiCfg)
    mockCancelSub.mockResolvedValue({ exito: false, error: 'Server error' })
    render(<FacturacionPage />)
    await waitFor(() => expect(screen.getByText('cancelSubscription')).toBeInTheDocument())

    await user.click(screen.getByText('cancelSubscription'))
    await waitFor(() => expect(screen.getByText('areYouSure')).toBeInTheDocument())

    await user.click(screen.getByText('confirmCancel'))
    await waitFor(() => {
      const errorElements = screen.getAllByText('Server error')
      expect(errorElements.length).toBeGreaterThanOrEqual(1)
    })
  })

  // 22. Update card modal — open
  it('opens update card modal', async () => {
    const user = userEvent.setup()
    mockFetchSub.mockResolvedValue(makeSub())
    mockFetchInvoices.mockResolvedValue([])
    mockFetchUsage.mockResolvedValue(null)
    mockFetchWompi.mockResolvedValue(wompiCfg)
    render(<FacturacionPage />)
    await waitFor(() => expect(screen.getByText('updateCard')).toBeInTheDocument())

    // There are two "updateCard" texts — one button in actions, one title in modal
    const buttons = screen.getAllByText('updateCard')
    await user.click(buttons[0])

    await waitFor(() => {
      expect(screen.getByTestId('card-tokenization-form')).toBeInTheDocument()
    })
  })

  // 23. Update card — successful tokenization
  it('updates payment method on successful tokenization', async () => {
    const user = userEvent.setup()
    mockFetchSub.mockResolvedValue(makeSub())
    mockFetchInvoices.mockResolvedValue([])
    mockFetchUsage.mockResolvedValue(null)
    mockFetchWompi.mockResolvedValue(wompiCfg)
    mockUpdatePayment.mockResolvedValue({ exito: true })
    render(<FacturacionPage />)
    await waitFor(() => expect(screen.getByText('updateCard')).toBeInTheDocument())

    const buttons = screen.getAllByText('updateCard')
    await user.click(buttons[0])
    await waitFor(() => expect(screen.getByTestId('card-tokenization-form')).toBeInTheDocument())

    await user.click(screen.getByText('Tokenize'))
    await waitFor(() => {
      expect(mockUpdatePayment).toHaveBeenCalledWith('org-1', 'tok_123', 'acc_tok_123')
    })
  })

  // 24. Change plan button
  it('navigates to plans page when change plan clicked', async () => {
    const user = userEvent.setup()
    mockFetchSub.mockResolvedValue(makeSub())
    mockFetchInvoices.mockResolvedValue([])
    mockFetchUsage.mockResolvedValue(null)
    mockFetchWompi.mockResolvedValue(wompiCfg)
    render(<FacturacionPage />)
    await waitFor(() => expect(screen.getByText('changePlan')).toBeInTheDocument())

    await user.click(screen.getByText('changePlan'))
    expect(mockPush).toHaveBeenCalledWith('/dashboard/planes')
  })

  // 25. Annual billing label
  it('shows annual label for annual billing cycle', async () => {
    mockFetchSub.mockResolvedValue(makeSub({ billing_cycle: 'ANNUAL' }))
    mockFetchInvoices.mockResolvedValue([])
    mockFetchUsage.mockResolvedValue(null)
    mockFetchWompi.mockResolvedValue(wompiCfg)
    render(<FacturacionPage />)
    await waitFor(() => {
      expect(screen.getByText(/annual/)).toBeInTheDocument()
    })
  })

  // 26. Error state — API failure shows empty gracefully
  it('handles API failure gracefully', async () => {
    mockFetchSub.mockRejectedValue(new Error('Network'))
    mockFetchInvoices.mockRejectedValue(new Error('Network'))
    mockFetchUsage.mockRejectedValue(new Error('Network'))
    mockFetchWompi.mockRejectedValue(new Error('Network'))
    render(<FacturacionPage />)
    await waitFor(() => {
      // No subscription means no-sub CTA
      expect(screen.getByText('noSubscription')).toBeInTheDocument()
    })
  })

  // 27. Actions section title
  it('renders actions section', async () => {
    mockFetchSub.mockResolvedValue(makeSub())
    mockFetchInvoices.mockResolvedValue([])
    mockFetchUsage.mockResolvedValue(null)
    mockFetchWompi.mockResolvedValue(wompiCfg)
    render(<FacturacionPage />)
    await waitFor(() => {
      expect(screen.getByText('actions')).toBeInTheDocument()
    })
  })

  // 28. Invoice date column header
  it('renders invoice column headers', async () => {
    mockFetchSub.mockResolvedValue(makeSub())
    mockFetchInvoices.mockResolvedValue([makeInvoice()])
    mockFetchUsage.mockResolvedValue(null)
    mockFetchWompi.mockResolvedValue(wompiCfg)
    render(<FacturacionPage />)
    await waitFor(() => {
      expect(screen.getByText('invoiceDate')).toBeInTheDocument()
      expect(screen.getByText('invoiceAmount')).toBeInTheDocument()
      expect(screen.getByText('invoiceStatus')).toBeInTheDocument()
      expect(screen.getByText('invoicePeriod')).toBeInTheDocument()
    })
  })
})
