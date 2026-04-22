// __tests__/app/dashboard/planes.test.tsx
// ---------------------------------------------------------------------------
// Nuclear-level tests for the Planes (Subscription Plans) page
// (app/dashboard/planes/page.tsx)
//
// States tested: loading skeleton, plan cards (STARTER/PRO/BUSINESS/ENTERPRISE),
// monthly/annual toggle, current plan display, trial badge + days left,
// usage bar (STARTER), CTA labels (activate/changePlan/currentPlan/contactSales),
// checkout modal trigger, Enterprise email link, feature checks/X icons,
// recommended badge on PRO, price formatting, no org, annual save badge.
// ---------------------------------------------------------------------------

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// ---- Mocks (BEFORE component import) ----

jest.mock('@/lib/org-context')
jest.mock('@/lib/api/subscriptions')
jest.mock('@/lib/api', () => ({
  formatCOP: (n: number) => `$${n.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
}))
jest.mock('@/components/checkout-modal', () => ({
  CheckoutModal: (props: any) => (
    <div data-testid="checkout-modal" data-plan={props.plan} data-cycle={props.billingCycle}>
      Checkout: {props.plan}
      <button onClick={props.onClose}>close-modal</button>
      <button onClick={props.onSuccess}>success</button>
    </div>
  ),
}))
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
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn(), back: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/planes',
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
import { fetchSubscription, fetchUsage, fetchWompiConfig } from '@/lib/api/subscriptions'

const mockUseOrg = useOrg as jest.Mock
const mockFetchSub = fetchSubscription as jest.Mock
const mockFetchUsage = fetchUsage as jest.Mock
const mockFetchWompi = fetchWompiConfig as jest.Mock

import PlanesPage from '@/app/dashboard/planes/page'

// ---- Fixtures ----

const TRIAL_ORG = {
  plan: 'TRIAL',
  trial_ends_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
  name: 'Clinica Test',
}

const STARTER_ORG = {
  plan: 'STARTER',
  trial_ends_at: null,
  name: 'Clinica Starter',
}

const MOCK_SUBSCRIPTION_ACTIVE = {
  status: 'ACTIVE',
  plan: 'PRO',
  next_billing_date: '2026-04-20T00:00:00Z',
}

const MOCK_USAGE = {
  message_count: 420,
  message_limit: 500,
  percent: 84,
}

const MOCK_WOMPI = {
  public_key: 'pub_test_key',
  sandbox: true,
  acceptance_token: 'acceptance-xyz',
}

function setup(
  org: Record<string, any> = TRIAL_ORG,
  sub: Record<string, any> | null = null,
  usage: Record<string, any> | null = null,
) {
  mockUseOrg.mockReturnValue({ org, orgId: 'org-1', user: { email: 'test@test.com' }, role: 'OWNER' })
  mockFetchSub.mockResolvedValue(sub)
  mockFetchUsage.mockResolvedValue(usage)
  mockFetchWompi.mockResolvedValue(MOCK_WOMPI)
}

// ---- Tests ----

describe('PlanesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setup()
    // Mock window.open for Enterprise mailto
    jest.spyOn(window, 'open').mockImplementation(() => null)
  })

  // ===== LOADING STATE =====

  it('shows loading skeletons while fetching data', () => {
    mockFetchSub.mockReturnValue(new Promise(() => {}))
    mockFetchUsage.mockReturnValue(new Promise(() => {}))
    mockFetchWompi.mockReturnValue(new Promise(() => {}))
    render(<PlanesPage />)
    const pulseElements = document.querySelectorAll('.animate-pulse')
    expect(pulseElements.length).toBeGreaterThan(0)
  })

  // ===== HEADER =====

  it('renders title and subtitle', async () => {
    render(<PlanesPage />)
    await waitFor(() => expect(screen.getByText('title')).toBeInTheDocument())
    expect(screen.getByText('subtitle')).toBeInTheDocument()
  })

  // ===== CURRENT PLAN CARD =====

  it('shows current plan label as TRIAL', async () => {
    render(<PlanesPage />)
    await waitFor(() => expect(screen.getByText(/currentPlan.*TRIAL/)).toBeInTheDocument())
  })

  it('shows trial days left when on TRIAL plan', async () => {
    render(<PlanesPage />)
    await waitFor(() => expect(screen.getByText(/trialDaysLeft/)).toBeInTheDocument())
  })

  it('shows trial expires today when 0 days left', async () => {
    const expiredOrg = { ...TRIAL_ORG, trial_ends_at: new Date().toISOString() }
    setup(expiredOrg)
    render(<PlanesPage />)
    await waitFor(() => expect(screen.getByText('trialExpiresToday')).toBeInTheDocument())
  })

  it('shows next billing date when subscription is active', async () => {
    setup({ plan: 'PRO', trial_ends_at: null, name: 'Pro Clinic' }, MOCK_SUBSCRIPTION_ACTIVE)
    render(<PlanesPage />)
    await waitFor(() => expect(screen.getByText(/nextBilling/)).toBeInTheDocument())
  })

  // ===== USAGE BAR (STARTER) =====

  it('shows usage bar for STARTER plan', async () => {
    setup(STARTER_ORG, null, MOCK_USAGE)
    render(<PlanesPage />)
    await waitFor(() => expect(screen.getByText('messagesUsed')).toBeInTheDocument())
    expect(screen.getByText('420 / 500')).toBeInTheDocument()
  })

  it('shows near-limit warning when usage >= 80%', async () => {
    setup(STARTER_ORG, null, MOCK_USAGE)
    render(<PlanesPage />)
    await waitFor(() => expect(screen.getByText('nearLimit')).toBeInTheDocument())
  })

  it('does not show usage bar for non-STARTER plans', async () => {
    setup(TRIAL_ORG, null, MOCK_USAGE)
    render(<PlanesPage />)
    await waitFor(() => expect(screen.queryByText('messagesUsed')).not.toBeInTheDocument())
  })

  // ===== BILLING CYCLE TOGGLE =====

  it('renders monthly and annual toggle buttons', async () => {
    render(<PlanesPage />)
    await waitFor(() => expect(screen.getByText('monthly')).toBeInTheDocument())
    expect(screen.getByText('annual')).toBeInTheDocument()
  })

  it('shows save-2-months badge on annual button', async () => {
    render(<PlanesPage />)
    await waitFor(() => expect(screen.getByText('save2months')).toBeInTheDocument())
  })

  it('defaults to MONTHLY billing cycle', async () => {
    render(<PlanesPage />)
    await waitFor(() => {
      const monthlyBtn = screen.getByText('monthly')
      expect(monthlyBtn.className).toContain('bg-brand-purple')
    })
  })

  it('switches to annual pricing when annual toggle clicked', async () => {
    const user = userEvent.setup()
    render(<PlanesPage />)
    await waitFor(() => expect(screen.getByText('annual')).toBeInTheDocument())
    await user.click(screen.getByText('annual'))

    // Annual prices include /year suffix
    await waitFor(() => {
      const priceTexts = screen.getAllByText(/perYear/)
      expect(priceTexts.length).toBeGreaterThan(0)
    })
  })

  // ===== PLAN CARDS =====

  it('renders all 4 plan cards', async () => {
    render(<PlanesPage />)
    await waitFor(() => expect(screen.getByText('Starter')).toBeInTheDocument())
    expect(screen.getByText('Pro')).toBeInTheDocument()
    expect(screen.getByText('Business')).toBeInTheDocument()
    expect(screen.getByText('Enterprise')).toBeInTheDocument()
  })

  it('shows recommended badge on PRO plan', async () => {
    render(<PlanesPage />)
    await waitFor(() => expect(screen.getByText('recommended')).toBeInTheDocument())
  })

  it('Enterprise card shows contact text instead of price', async () => {
    render(<PlanesPage />)
    await waitFor(() => expect(screen.getByText('contact')).toBeInTheDocument())
  })

  it('renders plan descriptions for each plan', async () => {
    render(<PlanesPage />)
    await waitFor(() => {
      expect(screen.getByText('descriptions.STARTER')).toBeInTheDocument()
      expect(screen.getByText('descriptions.PRO')).toBeInTheDocument()
      expect(screen.getByText('descriptions.BUSINESS')).toBeInTheDocument()
      expect(screen.getByText('descriptions.ENTERPRISE')).toBeInTheDocument()
    })
  })

  // ===== FEATURES =====

  it('renders feature lists for plans with check and X icons', async () => {
    render(<PlanesPage />)
    await waitFor(() => {
      const checks = screen.getAllByTestId('icon-Check')
      const xIcons = screen.getAllByTestId('icon-X')
      expect(checks.length).toBeGreaterThan(0)
      expect(xIcons.length).toBeGreaterThan(0)
    })
  })

  it('renders feature names from translations', async () => {
    render(<PlanesPage />)
    await waitFor(() => {
      expect(screen.getByText('features.whatsappAI')).toBeInTheDocument()
      expect(screen.getByText('features.voiceAI')).toBeInTheDocument()
    })
  })

  // ===== CTA BUTTONS =====

  it('shows activate label for plans when no active subscription', async () => {
    render(<PlanesPage />)
    await waitFor(() => {
      const activateBtns = screen.getAllByText('activate')
      expect(activateBtns.length).toBeGreaterThanOrEqual(3) // STARTER, PRO, BUSINESS
    })
  })

  it('shows contactSales label for Enterprise', async () => {
    render(<PlanesPage />)
    await waitFor(() => expect(screen.getByText('contactSales')).toBeInTheDocument())
  })

  it('shows currentPlanLabel and disables button for active subscription plan', async () => {
    setup({ plan: 'PRO', trial_ends_at: null, name: 'Test' }, MOCK_SUBSCRIPTION_ACTIVE)
    render(<PlanesPage />)
    await waitFor(() => {
      const currentBtn = screen.getByText('currentPlanLabel')
      expect(currentBtn.closest('button')).toBeDisabled()
    })
  })

  it('shows changePlan label for other plans when subscription is active', async () => {
    setup({ plan: 'PRO', trial_ends_at: null, name: 'Test' }, MOCK_SUBSCRIPTION_ACTIVE)
    render(<PlanesPage />)
    await waitFor(() => {
      const changeBtns = screen.getAllByText('changePlan')
      expect(changeBtns.length).toBeGreaterThan(0)
    })
  })

  // ===== CHECKOUT MODAL =====

  it('clicking activate on a paid plan opens checkout modal', async () => {
    const user = userEvent.setup()
    render(<PlanesPage />)
    await waitFor(() => expect(screen.getAllByText('activate').length).toBeGreaterThan(0))

    const activateBtns = screen.getAllByText('activate')
    await user.click(activateBtns[0]) // First plan = STARTER

    expect(screen.getByTestId('checkout-modal')).toBeInTheDocument()
    expect(screen.getByTestId('checkout-modal').dataset.plan).toBe('STARTER')
  })

  it('checkout modal receives MONTHLY billing cycle by default', async () => {
    const user = userEvent.setup()
    render(<PlanesPage />)
    await waitFor(() => expect(screen.getAllByText('activate').length).toBeGreaterThan(0))

    await user.click(screen.getAllByText('activate')[0])
    expect(screen.getByTestId('checkout-modal').dataset.cycle).toBe('MONTHLY')
  })

  it('checkout modal receives ANNUAL when annual is selected', async () => {
    const user = userEvent.setup()
    render(<PlanesPage />)
    await waitFor(() => expect(screen.getByText('annual')).toBeInTheDocument())
    await user.click(screen.getByText('annual'))
    await user.click(screen.getAllByText('activate')[0])

    expect(screen.getByTestId('checkout-modal').dataset.cycle).toBe('ANNUAL')
  })

  it('closing checkout modal hides it', async () => {
    const user = userEvent.setup()
    render(<PlanesPage />)
    await waitFor(() => expect(screen.getAllByText('activate').length).toBeGreaterThan(0))
    await user.click(screen.getAllByText('activate')[0])
    expect(screen.getByTestId('checkout-modal')).toBeInTheDocument()

    await user.click(screen.getByText('close-modal'))
    expect(screen.queryByTestId('checkout-modal')).not.toBeInTheDocument()
  })

  // ===== ENTERPRISE MAILTO =====

  it('Enterprise CTA opens mailto link instead of checkout', async () => {
    const openSpy = jest.spyOn(window, 'open')
    const user = userEvent.setup()
    render(<PlanesPage />)
    await waitFor(() => expect(screen.getByText('contactSales')).toBeInTheDocument())
    await user.click(screen.getByText('contactSales'))

    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('mail.google.com/mail/?view=cm'),
      '_blank',
      'noopener,noreferrer',
    )
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('ataraxia.centrodecontrol@gmail.com'),
      '_blank',
      'noopener,noreferrer',
    )
  })

  // ===== CONTACT CTA =====

  it('renders bottom contact CTA section', async () => {
    render(<PlanesPage />)
    await waitFor(() => expect(screen.getByText('customPlanQuestion')).toBeInTheDocument())
    expect(screen.getByText(/customPlanHelp/)).toBeInTheDocument()
  })

  // ===== NO WOMPI CONFIG =====

  it('does not open checkout modal if wompi config is null', async () => {
    mockFetchWompi.mockResolvedValue(null)
    const user = userEvent.setup()
    render(<PlanesPage />)
    await waitFor(() => expect(screen.getAllByText('activate').length).toBeGreaterThan(0))
    await user.click(screen.getAllByText('activate')[0])

    // Checkout should not appear because wompi is null
    expect(screen.queryByTestId('checkout-modal')).not.toBeInTheDocument()
  })
})
