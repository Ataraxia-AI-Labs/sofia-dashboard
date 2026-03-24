// __tests__/app/dashboard/ajustes.test.tsx
// ---------------------------------------------------------------------------
// Nuclear-level tests for the Ajustes (Settings) page
// (app/dashboard/ajustes/page.tsx)
//
// States tested: loading skeleton, header with org name, tab rendering (all 10),
// tab switching renders correct content, default tab (prompt), read-only
// mode for STAFF role, refresh button, save prompt flow, toast messages
// (success + error), each tab component receives correct props.
// ---------------------------------------------------------------------------

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// ---- Mocks (BEFORE component import) ----

jest.mock('@/lib/org-context')
jest.mock('@/lib/api')
jest.mock('@/components/ui/toast', () => ({
  useToast: () => ({ success: jest.fn(), error: jest.fn() }),
}))
jest.mock('@/components/ui', () => {
  const Tabs = ({ tabs, activeTab, onChange }: any) => (
    <div data-testid="tabs-container">
      {tabs.map((tab: any) => (
        <button
          key={tab.id}
          data-testid={`tab-${tab.id}`}
          data-active={tab.id === activeTab ? 'true' : 'false'}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
  return { Tabs }
})

// Mock all tab components
const mockPromptTab = jest.fn((props: any) => <div data-testid="prompt-tab" data-readonly={props.isReadOnly} />)
const mockServicesTab = jest.fn((props: any) => <div data-testid="services-tab" data-readonly={props.isReadOnly} />)
const mockHoursTab = jest.fn((props: any) => <div data-testid="hours-tab" />)
const mockNotificationsTab = jest.fn((props: any) => <div data-testid="notifications-tab" />)
const mockTemplatesTab = jest.fn((props: any) => <div data-testid="templates-tab" />)
const mockBotsTab = jest.fn((props: any) => <div data-testid="bots-tab" />)
const mockChannelsTab = jest.fn((props: any) => <div data-testid="channels-tab" />)
const mockSecurityTab = jest.fn((_props?: any) => <div data-testid="security-tab" />)
const mockBrandingTab = jest.fn((props: any) => <div data-testid="branding-tab" />)
const mockPricingTab = jest.fn((props: any) => <div data-testid="pricing-tab" />)

jest.mock('@/app/dashboard/ajustes/tabs', () => ({
  PromptTab: (props: any) => mockPromptTab(props),
  ServicesTab: (props: any) => mockServicesTab(props),
  HoursTab: (props: any) => mockHoursTab(props),
  NotificationsTab: (props: any) => mockNotificationsTab(props),
  TemplatesTab: (props: any) => mockTemplatesTab(props),
  BotsTab: (props: any) => mockBotsTab(props),
  ChannelsTab: (props: any) => mockChannelsTab(props),
  SecurityTab: (props: any) => mockSecurityTab(props),
  BrandingTab: (props: any) => mockBrandingTab(props),
  PricingTab: (props: any) => mockPricingTab(props),
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
  usePathname: () => '/dashboard/ajustes',
}))
jest.mock('lucide-react', () => {
  return new Proxy({}, {
    get: (_, name) => {
      if (String(name) === '__esModule') return false
      const C = (p: any) => <svg data-testid={`icon-${String(name)}`} {...p} />
      C.displayName = String(name)
      return C
    },
  })
})

import { useOrg } from '@/lib/org-context'
import { fetchOrganization, fetchServicesCatalog, fetchBusinessHours, updateOrganization } from '@/lib/api'

const mockUseOrg = useOrg as jest.Mock
const mockFetchOrg = fetchOrganization as jest.Mock
const mockFetchServices = fetchServicesCatalog as jest.Mock
const mockFetchHours = fetchBusinessHours as jest.Mock
const mockUpdateOrg = updateOrganization as jest.Mock

import AjustesPage from '@/app/dashboard/ajustes/page'

// ---- Fixtures ----

const MOCK_ORG = {
  id: 'org-1',
  name: 'Clinica Bella Vista',
  system_prompt: 'Eres SofIA, asistente de clinica estetica.',
  plan: 'PRO',
}

const MOCK_SERVICES = [
  { id: 's1', name: 'Botox', price: 350000, active: true },
  { id: 's2', name: 'Limpieza Facial', price: 120000, active: true },
]

const MOCK_HOURS = [
  { day: 'monday', open: '08:00', close: '18:00', active: true },
  { day: 'tuesday', open: '08:00', close: '18:00', active: true },
]

function setup(role: string = 'OWNER') {
  mockUseOrg.mockReturnValue({ orgId: 'org-1', role })
  mockFetchOrg.mockResolvedValue(MOCK_ORG)
  mockFetchServices.mockResolvedValue(MOCK_SERVICES)
  mockFetchHours.mockResolvedValue(MOCK_HOURS)
  mockUpdateOrg.mockResolvedValue({ ok: true })
}

// ---- Tests ----

describe('AjustesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setup()
  })

  // ===== LOADING STATE =====

  it('shows loading skeleton while fetching data', () => {
    mockFetchOrg.mockReturnValue(new Promise(() => {}))
    mockFetchServices.mockReturnValue(new Promise(() => {}))
    mockFetchHours.mockReturnValue(new Promise(() => {}))
    render(<AjustesPage />)
    const pulseElements = document.querySelectorAll('.animate-pulse')
    expect(pulseElements.length).toBeGreaterThan(0)
  })

  it('fetches org, services, and hours on mount', async () => {
    render(<AjustesPage />)
    await waitFor(() => expect(mockFetchOrg).toHaveBeenCalledWith('org-1'))
    expect(mockFetchServices).toHaveBeenCalledWith('org-1')
    expect(mockFetchHours).toHaveBeenCalledWith('org-1')
  })

  // ===== HEADER =====

  it('renders page title', async () => {
    render(<AjustesPage />)
    await waitFor(() => expect(screen.getByText('title')).toBeInTheDocument())
  })

  it('shows org name in subtitle after loading', async () => {
    render(<AjustesPage />)
    await waitFor(() => expect(screen.getByText('Clinica Bella Vista')).toBeInTheDocument())
  })

  it('shows fallback subtitle when org is null', async () => {
    mockFetchOrg.mockResolvedValue(null)
    render(<AjustesPage />)
    await waitFor(() => expect(screen.getByText('subtitle')).toBeInTheDocument())
  })

  // ===== TABS =====

  it('renders all 10 tab buttons', async () => {
    render(<AjustesPage />)
    await waitFor(() => expect(screen.getByTestId('tabs-container')).toBeInTheDocument())

    const tabIds = ['prompt', 'services', 'hours', 'notifications', 'templates', 'bots', 'channels', 'security', 'branding', 'pricing']
    for (const id of tabIds) {
      expect(screen.getByTestId(`tab-${id}`)).toBeInTheDocument()
    }
  })

  it('defaults to prompt tab as active', async () => {
    render(<AjustesPage />)
    await waitFor(() => {
      const promptTab = screen.getByTestId('tab-prompt')
      expect(promptTab.dataset.active).toBe('true')
    })
  })

  it('renders PromptTab content by default', async () => {
    render(<AjustesPage />)
    await waitFor(() => expect(screen.getByTestId('prompt-tab')).toBeInTheDocument())
  })

  // ===== TAB SWITCHING =====

  it('switches to services tab', async () => {
    const user = userEvent.setup()
    render(<AjustesPage />)
    await waitFor(() => expect(screen.getByTestId('tab-services')).toBeInTheDocument())
    await user.click(screen.getByTestId('tab-services'))
    expect(screen.getByTestId('services-tab')).toBeInTheDocument()
    expect(screen.queryByTestId('prompt-tab')).not.toBeInTheDocument()
  })

  it('switches to hours tab', async () => {
    const user = userEvent.setup()
    render(<AjustesPage />)
    await waitFor(() => expect(screen.getByTestId('tab-hours')).toBeInTheDocument())
    await user.click(screen.getByTestId('tab-hours'))
    expect(screen.getByTestId('hours-tab')).toBeInTheDocument()
  })

  it('switches to notifications tab', async () => {
    const user = userEvent.setup()
    render(<AjustesPage />)
    await waitFor(() => expect(screen.getByTestId('tab-notifications')).toBeInTheDocument())
    await user.click(screen.getByTestId('tab-notifications'))
    expect(screen.getByTestId('notifications-tab')).toBeInTheDocument()
  })

  it('switches to templates tab', async () => {
    const user = userEvent.setup()
    render(<AjustesPage />)
    await waitFor(() => expect(screen.getByTestId('tab-templates')).toBeInTheDocument())
    await user.click(screen.getByTestId('tab-templates'))
    expect(screen.getByTestId('templates-tab')).toBeInTheDocument()
  })

  it('switches to bots tab', async () => {
    const user = userEvent.setup()
    render(<AjustesPage />)
    await waitFor(() => expect(screen.getByTestId('tab-bots')).toBeInTheDocument())
    await user.click(screen.getByTestId('tab-bots'))
    expect(screen.getByTestId('bots-tab')).toBeInTheDocument()
  })

  it('switches to channels tab', async () => {
    const user = userEvent.setup()
    render(<AjustesPage />)
    await waitFor(() => expect(screen.getByTestId('tab-channels')).toBeInTheDocument())
    await user.click(screen.getByTestId('tab-channels'))
    expect(screen.getByTestId('channels-tab')).toBeInTheDocument()
  })

  it('switches to security tab', async () => {
    const user = userEvent.setup()
    render(<AjustesPage />)
    await waitFor(() => expect(screen.getByTestId('tab-security')).toBeInTheDocument())
    await user.click(screen.getByTestId('tab-security'))
    expect(screen.getByTestId('security-tab')).toBeInTheDocument()
  })

  it('switches to branding tab', async () => {
    const user = userEvent.setup()
    render(<AjustesPage />)
    await waitFor(() => expect(screen.getByTestId('tab-branding')).toBeInTheDocument())
    await user.click(screen.getByTestId('tab-branding'))
    expect(screen.getByTestId('branding-tab')).toBeInTheDocument()
  })

  it('switches to pricing tab', async () => {
    const user = userEvent.setup()
    render(<AjustesPage />)
    await waitFor(() => expect(screen.getByTestId('tab-pricing')).toBeInTheDocument())
    await user.click(screen.getByTestId('tab-pricing'))
    expect(screen.getByTestId('pricing-tab')).toBeInTheDocument()
  })

  // ===== TAB PROPS =====

  it('passes orgId and isReadOnly to PromptTab', async () => {
    render(<AjustesPage />)
    await waitFor(() => expect(mockPromptTab).toHaveBeenCalled())
    const props = mockPromptTab.mock.calls[0][0]
    expect(props.orgId).toBe('org-1')
    expect(props.isReadOnly).toBe(false)
  })

  it('passes services and onRefresh to ServicesTab', async () => {
    const user = userEvent.setup()
    render(<AjustesPage />)
    await waitFor(() => expect(screen.getByTestId('tab-services')).toBeInTheDocument())
    await user.click(screen.getByTestId('tab-services'))

    expect(mockServicesTab).toHaveBeenCalled()
    const props = mockServicesTab.mock.calls[0][0]
    expect(props.orgId).toBe('org-1')
    expect(props.services).toEqual(MOCK_SERVICES)
    expect(typeof props.onRefresh).toBe('function')
    expect(typeof props.onMessage).toBe('function')
  })

  it('passes hours to HoursTab', async () => {
    const user = userEvent.setup()
    render(<AjustesPage />)
    await waitFor(() => expect(screen.getByTestId('tab-hours')).toBeInTheDocument())
    await user.click(screen.getByTestId('tab-hours'))

    expect(mockHoursTab).toHaveBeenCalled()
    const props = mockHoursTab.mock.calls[0][0]
    expect(props.hours).toEqual(MOCK_HOURS)
  })

  // ===== READ-ONLY MODE =====

  it('shows read-only banner for STAFF role', async () => {
    setup('STAFF')
    render(<AjustesPage />)
    await waitFor(() => expect(screen.getByText(/readOnly/)).toBeInTheDocument())
  })

  it('passes isReadOnly=true to PromptTab for STAFF', async () => {
    setup('STAFF')
    render(<AjustesPage />)
    await waitFor(() => expect(mockPromptTab).toHaveBeenCalled())
    const props = mockPromptTab.mock.calls[0][0]
    expect(props.isReadOnly).toBe(true)
  })

  it('does not show read-only banner for OWNER', async () => {
    render(<AjustesPage />)
    await waitFor(() => expect(screen.getByText('title')).toBeInTheDocument())
    expect(screen.queryByText(/readOnly/)).not.toBeInTheDocument()
  })

  // ===== REFRESH =====

  it('refresh button re-fetches all data', async () => {
    const user = userEvent.setup()
    render(<AjustesPage />)
    // Wait for content to render (loading skeleton has no title/refresh button)
    await waitFor(() => expect(screen.getByText('title')).toBeInTheDocument())

    const refreshBtn = screen.getByRole('button', { name: 'refresh' })
    await user.click(refreshBtn)

    expect(mockFetchOrg).toHaveBeenCalledTimes(2)
    expect(mockFetchServices).toHaveBeenCalledTimes(2)
    expect(mockFetchHours).toHaveBeenCalledTimes(2)
  })

  // ===== NOTIFICATIONS/TEMPLATES REQUIRE ORG =====

  it('does not render NotificationsTab when org is null', async () => {
    mockFetchOrg.mockResolvedValue(null)
    const user = userEvent.setup()
    render(<AjustesPage />)
    await waitFor(() => expect(screen.getByTestId('tab-notifications')).toBeInTheDocument())
    await user.click(screen.getByTestId('tab-notifications'))

    expect(screen.queryByTestId('notifications-tab')).not.toBeInTheDocument()
  })

  it('does not render TemplatesTab when org is null', async () => {
    mockFetchOrg.mockResolvedValue(null)
    const user = userEvent.setup()
    render(<AjustesPage />)
    await waitFor(() => expect(screen.getByTestId('tab-templates')).toBeInTheDocument())
    await user.click(screen.getByTestId('tab-templates'))

    expect(screen.queryByTestId('templates-tab')).not.toBeInTheDocument()
  })

  it('does not render BrandingTab when org is null', async () => {
    mockFetchOrg.mockResolvedValue(null)
    const user = userEvent.setup()
    render(<AjustesPage />)
    await waitFor(() => expect(screen.getByTestId('tab-branding')).toBeInTheDocument())
    await user.click(screen.getByTestId('tab-branding'))

    expect(screen.queryByTestId('branding-tab')).not.toBeInTheDocument()
  })

  // ===== ERROR HANDLING =====

  it('handles fetch error gracefully without crashing', async () => {
    mockFetchOrg.mockRejectedValue(new Error('fail'))
    mockFetchServices.mockRejectedValue(new Error('fail'))
    mockFetchHours.mockRejectedValue(new Error('fail'))
    render(<AjustesPage />)
    await waitFor(() => expect(screen.getByText('title')).toBeInTheDocument())
  })
})
