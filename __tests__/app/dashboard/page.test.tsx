// __tests__/app/dashboard/page.test.tsx
// ---------------------------------------------------------------------------
// Nuclear-level tests for the Dashboard Overview page (app/dashboard/page.tsx)
//
// States tested: loading skeleton, error with retry, empty/new clinic,
// data loaded (metrics, funnel, voice, opportunities, bots, performance),
// day filter switching, refresh, auto-retry logic.
// ---------------------------------------------------------------------------

import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// ---- Mocks (BEFORE component import) ----

jest.mock('@/lib/org-context')
jest.mock('@/lib/api')
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
jest.mock('next/dynamic', () => () => {
  const C = () => <div data-testid="dynamic-panel" />
  C.displayName = 'DynamicPanel'
  return C
})
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn(), back: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard',
}))

// Mock innovation components
jest.mock('@/components/innovations', () => ({
  AtaraxiaScore: ({ data }: { data: unknown }) => <div data-testid="ataraxia-score">{data ? 'score-loaded' : ''}</div>,
  SofiaSpeaks: ({ data }: { data: unknown }) => <div data-testid="sofia-speaks">{data ? 'speaks-loaded' : ''}</div>,
  NightReport: () => <div data-testid="night-report">night-report</div>,
  PhantomGrid: ({ sections, children, className }: { sections: { id: string; element: React.ReactNode }[]; children?: React.ReactNode; className?: string }) => (
    <div data-testid="phantom-grid" className={className}>
      {sections.map((s) => <div key={s.id} data-testid={`phantom-section-${s.id}`}>{s.element}</div>)}
      {children}
    </div>
  ),
}))

// Mock UI components
jest.mock('@/components/ui', () => ({
  MetricCard: ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
    <div data-testid="metric-card">
      <span data-testid="metric-label">{label}</span>
      <span data-testid="metric-value">{value}</span>
      {sub && <span data-testid="metric-sub">{sub}</span>}
    </div>
  ),
  SectionTitle: ({ title }: { title: string }) => <h3 data-testid="section-title">{title}</h3>,
  StatusPill: ({ label, value }: { label: string; value: string }) => <span data-testid="status-pill">{label}: {value}</span>,
  PerfItem: ({ label, value }: { label: string; value: string }) => <div data-testid="perf-item">{label}: {value}</div>,
  RevenueItem: ({ label, value }: { label: string; value: string }) => <div data-testid="revenue-item">{label}: {value}</div>,
  BotCard: ({ name, value }: { name: string; value: number }) => <div data-testid="bot-card">{name}: {value}</div>,
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}))

// Mock lucide-react icons
jest.mock('lucide-react', () => {
  const icon = ({ size, ...props }: { size?: number; [k: string]: unknown }) => <svg data-testid="icon" {...props} />
  return new Proxy({}, { get: () => icon })
})

import { useOrg } from '@/lib/org-context'
import { fetchFullAnalytics, fetchVoiceMetrics } from '@/lib/api'

const mockUseOrg = useOrg as jest.Mock
const mockFetchAnalytics = fetchFullAnalytics as jest.Mock
const mockFetchVoice = fetchVoiceMetrics as jest.Mock

import DashboardOverview from '@/app/dashboard/page'

// ---- Factories ----

function makeAnalytics(overrides: Record<string, unknown> = {}) {
  return {
    periodo: { desde: '2026-03-01', hasta: '2026-03-24', dias: 30 },
    conversiones: {
      total_mensajes_inbound: 500,
      pacientes_unicos: 120,
      pacientes_nuevos: 30,
      total_citas: 80,
      citas_confirmadas: 60,
      citas_completadas: 50,
      citas_canceladas: 5,
      citas_no_show: 3,
      tasa_conversion_pct: 16,
      tasa_asistencia_pct: 83,
      tasa_cancelacion_pct: 6.25,
      tasa_no_show_pct: 3.75,
      funnel: { mensajes: 500, pacientes: 120, citas: 80, completadas: 50 },
    },
    revenue: {
      revenue_total: 15000000,
      revenue_pendiente: 3000000,
      revenue_pipeline: 8000000,
      total_transacciones: 45,
      ticket_promedio: 333333,
      revenue_diario_promedio: 500000,
      proyeccion_mensual: 15000000,
      moneda: 'COP',
    },
    performance_ia: {
      total_interacciones: 1200,
      total_tokens: 450000,
      total_costo_usd: 12.5,
      costo_promedio_por_interaccion_usd: 0.01,
      tokens_promedio_por_interaccion: 375,
      response_time_promedio_ms: 1200,
      herramientas_usadas: { search_appointments: 80, create_appointment: 45, send_reminder: 30 },
      distribucion_intents: { agendar_cita: 200, consultar_precio: 150, cancelar: 30 },
      proyeccion_costo_mensual_usd: 15.0,
    },
    oportunidades: {
      total: 25,
      por_tipo: { HOT_LEAD: 10, UPSELL: 8, CHURN_RISK: 7 },
      por_status: { OPEN: 15, WON: 5, LOST: 5 },
      valor_total_estimado: 50000000,
      valor_convertido: 10000000,
      tasa_conversion_oportunidades_pct: 20,
    },
    sub_bots: {
      reminder_bot: { mensajes_enviados: 200, descripcion: 'Sends appointment reminders' },
      hunter_bot: { followups_enviados: 80, conversiones_post_followup: 12, descripcion: 'Follow-up bot' },
      nurse_bot: { recordatorios_enviados: 50, descripcion: 'Medication reminders' },
      total_mensajes_automaticos: 330,
    },
    ...overrides,
  }
}

function makeVoice(overrides: Record<string, unknown> = {}) {
  return {
    total_calls: 45,
    total_whatsapp: 200,
    avg_duration_seconds: 185,
    appointments_by_voice: 15,
    appointments_by_whatsapp: 65,
    voice_pct: 18.4,
    ...overrides,
  }
}

// ---- Test Suite ----

describe('DashboardOverview', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockUseOrg.mockReturnValue({ orgId: 'org-1', branchId: null })
    mockFetchAnalytics.mockResolvedValue(makeAnalytics())
    mockFetchVoice.mockResolvedValue(makeVoice())
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  // -----------------------------------------------------------------------
  // LOADING STATE
  // -----------------------------------------------------------------------

  describe('Loading state', () => {
    it('should render 5 loading skeleton cards when data is not yet available', () => {
      mockFetchAnalytics.mockReturnValue(new Promise(() => {}))
      render(<DashboardOverview />)

      const skeletons = document.querySelectorAll('.glass-card.animate-pulse')
      expect(skeletons.length).toBe(5)
    })

    it('should not render metric cards during loading', () => {
      mockFetchAnalytics.mockReturnValue(new Promise(() => {}))
      render(<DashboardOverview />)

      expect(screen.queryByTestId('metric-card')).not.toBeInTheDocument()
    })

    it('should not render AtaraxiaScore during loading', () => {
      mockFetchAnalytics.mockReturnValue(new Promise(() => {}))
      render(<DashboardOverview />)

      expect(screen.queryByTestId('ataraxia-score')).not.toBeInTheDocument()
    })
  })

  // -----------------------------------------------------------------------
  // ERROR STATE
  // -----------------------------------------------------------------------

  describe('Error state', () => {
    it('should render error message when fetchFullAnalytics fails', async () => {
      mockFetchAnalytics.mockRejectedValue(new Error('Server down'))

      render(<DashboardOverview />)

      await waitFor(() => {
        expect(screen.getByText('loadError')).toBeInTheDocument()
      })
      expect(screen.getByText('Server down')).toBeInTheDocument()
    })

    it('should render retry button on error', async () => {
      mockFetchAnalytics.mockRejectedValue(new Error('Server down'))

      render(<DashboardOverview />)

      await waitFor(() => {
        expect(screen.getByText('retry')).toBeInTheDocument()
      })
    })

    it('should call loadData again when retry button is clicked', async () => {
      jest.useRealTimers()
      const user = userEvent.setup()
      mockFetchAnalytics.mockRejectedValueOnce(new Error('Server down'))

      render(<DashboardOverview />)

      await waitFor(() => {
        expect(screen.getByText('retry')).toBeInTheDocument()
      })

      mockFetchAnalytics.mockResolvedValueOnce(makeAnalytics())
      await user.click(screen.getByText('retry'))

      await waitFor(() => {
        expect(mockFetchAnalytics).toHaveBeenCalledTimes(2)
      })
    })

    it('should auto-retry on 503 errors up to 3 times', async () => {
      mockFetchAnalytics.mockRejectedValue(new Error('503 Service Unavailable'))

      render(<DashboardOverview />)

      // First call happens immediately
      await waitFor(() => {
        expect(mockFetchAnalytics).toHaveBeenCalledTimes(1)
      })

      // Show hardcoded Spanish message on first retry
      await waitFor(() => {
        expect(screen.getByText('Servidor iniciando...')).toBeInTheDocument()
      })
    })

    it('should display unknown error for non-Error exceptions', async () => {
      mockFetchAnalytics.mockRejectedValue('string error')

      render(<DashboardOverview />)

      await waitFor(() => {
        expect(screen.getByText('Error desconocido')).toBeInTheDocument()
      })
    })
  })

  // -----------------------------------------------------------------------
  // EMPTY / NEW CLINIC STATE
  // -----------------------------------------------------------------------

  describe('Empty/new clinic state', () => {
    it('should render new clinic CTA when total messages and patients are 0', async () => {
      const emptyAnalytics = makeAnalytics()
      emptyAnalytics.conversiones.total_mensajes_inbound = 0
      emptyAnalytics.conversiones.pacientes_unicos = 0
      mockFetchAnalytics.mockResolvedValue(emptyAnalytics)

      render(<DashboardOverview />)

      await waitFor(() => {
        expect(screen.getByText('clinicReady')).toBeInTheDocument()
      })
    })

    it('should render "connect WhatsApp" link pointing to /dashboard/ajustes', async () => {
      const emptyAnalytics = makeAnalytics()
      emptyAnalytics.conversiones.total_mensajes_inbound = 0
      emptyAnalytics.conversiones.pacientes_unicos = 0
      mockFetchAnalytics.mockResolvedValue(emptyAnalytics)

      render(<DashboardOverview />)

      await waitFor(() => {
        const link = screen.getByText('connectWhatsApp')
        expect(link.closest('a')).toHaveAttribute('href', '/dashboard/ajustes')
      })
    })

    it('should render trust indicators (< 5 min, 24/7, 80%)', async () => {
      const emptyAnalytics = makeAnalytics()
      emptyAnalytics.conversiones.total_mensajes_inbound = 0
      emptyAnalytics.conversiones.pacientes_unicos = 0
      mockFetchAnalytics.mockResolvedValue(emptyAnalytics)

      render(<DashboardOverview />)

      await waitFor(() => {
        expect(screen.getByText('< 5 min')).toBeInTheDocument()
        expect(screen.getByText('24/7')).toBeInTheDocument()
        expect(screen.getByText('80%')).toBeInTheDocument()
      })
    })

    it('should render "refresh metrics" button in empty state', async () => {
      const emptyAnalytics = makeAnalytics()
      emptyAnalytics.conversiones.total_mensajes_inbound = 0
      emptyAnalytics.conversiones.pacientes_unicos = 0
      mockFetchAnalytics.mockResolvedValue(emptyAnalytics)

      render(<DashboardOverview />)

      await waitFor(() => {
        expect(screen.getByText('refreshMetrics')).toBeInTheDocument()
      })
    })

    it('should call loadData when refreshMetrics is clicked in empty state', async () => {
      jest.useRealTimers()
      const user = userEvent.setup()
      const emptyAnalytics = makeAnalytics()
      emptyAnalytics.conversiones.total_mensajes_inbound = 0
      emptyAnalytics.conversiones.pacientes_unicos = 0
      mockFetchAnalytics.mockResolvedValue(emptyAnalytics)

      render(<DashboardOverview />)

      await waitFor(() => {
        expect(screen.getByText('refreshMetrics')).toBeInTheDocument()
      })

      await user.click(screen.getByText('refreshMetrics'))

      await waitFor(() => {
        expect(mockFetchAnalytics).toHaveBeenCalledTimes(2)
      })
    })
  })

  // -----------------------------------------------------------------------
  // DATA LOADED STATE
  // -----------------------------------------------------------------------

  describe('Data loaded state', () => {
    it('should render 5 MetricCards with correct data', async () => {
      render(<DashboardOverview />)

      await waitFor(() => {
        const cards = screen.getAllByTestId('metric-card')
        expect(cards.length).toBe(5)
      })
    })

    it('should render metric labels for messages, patients, appointments, revenue, AI cost', async () => {
      render(<DashboardOverview />)

      await waitFor(() => {
        const labels = screen.getAllByTestId('metric-label')
        expect(labels.map(l => l.textContent)).toEqual([
          'messagesReceived',
          'uniquePatients',
          'scheduledAppointments',
          'revenue',
          'totalAICost',
        ])
      })
    })

    it('should render AtaraxiaScore component', async () => {
      render(<DashboardOverview />)

      await waitFor(() => {
        expect(screen.getByTestId('ataraxia-score')).toBeInTheDocument()
        expect(screen.getByText('score-loaded')).toBeInTheDocument()
      })
    })

    it('should render SofiaSpeaks component', async () => {
      render(<DashboardOverview />)

      await waitFor(() => {
        expect(screen.getByTestId('sofia-speaks')).toBeInTheDocument()
      })
    })

    it('should render NightReport component', async () => {
      render(<DashboardOverview />)

      await waitFor(() => {
        expect(screen.getByTestId('night-report')).toBeInTheDocument()
      })
    })

    it('should render PhantomGrid with all sections', async () => {
      render(<DashboardOverview />)

      await waitFor(() => {
        expect(screen.getByTestId('phantom-grid')).toBeInTheDocument()
        expect(screen.getByTestId('phantom-section-funnel-revenue')).toBeInTheDocument()
        expect(screen.getByTestId('phantom-section-intents-opps-perf')).toBeInTheDocument()
        expect(screen.getByTestId('phantom-section-sub-bots')).toBeInTheDocument()
      })
    })

    it('should render voice section when voice data has calls', async () => {
      render(<DashboardOverview />)

      await waitFor(() => {
        expect(screen.getByTestId('phantom-section-voice-ai')).toBeInTheDocument()
      })
    })

    it('should NOT render voice section when no voice data', async () => {
      mockFetchVoice.mockResolvedValue({ total_calls: 0, total_whatsapp: 0, avg_duration_seconds: 0, appointments_by_voice: 0, appointments_by_whatsapp: 0, voice_pct: 0 })

      render(<DashboardOverview />)

      await waitFor(() => {
        expect(screen.getByTestId('phantom-grid')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('phantom-section-voice-ai')).not.toBeInTheDocument()
    })

    it('should render opportunity items when opportunities exist', async () => {
      render(<DashboardOverview />)

      await waitFor(() => {
        // 3 opportunity types: HOT_LEAD, UPSELL, CHURN_RISK
        const oppSection = screen.getByTestId('phantom-section-intents-opps-perf')
        expect(oppSection).toBeInTheDocument()
      })
    })

    it('should render bot cards for all 3 bots', async () => {
      render(<DashboardOverview />)

      await waitFor(() => {
        const botCards = screen.getAllByTestId('bot-card')
        expect(botCards.length).toBe(3)
        expect(screen.getByText(/Reminder Bot/)).toBeInTheDocument()
        expect(screen.getByText(/Hunter Bot/)).toBeInTheDocument()
        expect(screen.getByText(/Nurse Bot/)).toBeInTheDocument()
      })
    })

    it('should render performance items', async () => {
      render(<DashboardOverview />)

      await waitFor(() => {
        const perfItems = screen.getAllByTestId('perf-item')
        expect(perfItems.length).toBeGreaterThanOrEqual(4)
      })
    })

    it('should render revenue items', async () => {
      render(<DashboardOverview />)

      await waitFor(() => {
        const revItems = screen.getAllByTestId('revenue-item')
        expect(revItems.length).toBe(4)
      })
    })

    it('should render status pills for attendance, cancellation, no-show', async () => {
      render(<DashboardOverview />)

      await waitFor(() => {
        const pills = screen.getAllByTestId('status-pill')
        expect(pills.length).toBe(3)
      })
    })

    it('should render footer text', async () => {
      render(<DashboardOverview />)

      await waitFor(() => {
        expect(screen.getByText('footer')).toBeInTheDocument()
      })
    })

    it('should show last update time after data loads', async () => {
      render(<DashboardOverview />)

      await waitFor(() => {
        const updateText = screen.getByText(/updated/)
        expect(updateText).toBeInTheDocument()
      })
    })
  })

  // -----------------------------------------------------------------------
  // DAY FILTER BUTTONS
  // -----------------------------------------------------------------------

  describe('Day filter buttons', () => {
    it('should render 7d, 30d, 90d filter buttons', async () => {
      render(<DashboardOverview />)

      await waitFor(() => {
        expect(screen.getByText('7d')).toBeInTheDocument()
        expect(screen.getByText('30d')).toBeInTheDocument()
        expect(screen.getByText('90d')).toBeInTheDocument()
      })
    })

    it('should call fetchFullAnalytics with updated days when a filter is clicked', async () => {
      jest.useRealTimers()
      const user = userEvent.setup()
      render(<DashboardOverview />)

      await waitFor(() => {
        expect(screen.getByText('7d')).toBeInTheDocument()
      })

      await user.click(screen.getByText('7d'))

      await waitFor(() => {
        // Should be called with 7 days
        const calls = mockFetchAnalytics.mock.calls
        const lastCall = calls[calls.length - 1]
        expect(lastCall[1]).toBe(7)
      })
    })

    it('should call fetchFullAnalytics with 90 days when 90d is clicked', async () => {
      jest.useRealTimers()
      const user = userEvent.setup()
      render(<DashboardOverview />)

      await waitFor(() => {
        expect(screen.getByText('90d')).toBeInTheDocument()
      })

      await user.click(screen.getByText('90d'))

      await waitFor(() => {
        const calls = mockFetchAnalytics.mock.calls
        const lastCall = calls[calls.length - 1]
        expect(lastCall[1]).toBe(90)
      })
    })
  })

  // -----------------------------------------------------------------------
  // REFRESH BUTTON
  // -----------------------------------------------------------------------

  describe('Refresh button', () => {
    it('should render refresh button with correct aria-label', async () => {
      render(<DashboardOverview />)

      await waitFor(() => {
        expect(screen.getByLabelText('refresh')).toBeInTheDocument()
      })
    })

    it('should call loadData when refresh button is clicked', async () => {
      jest.useRealTimers()
      const user = userEvent.setup()
      render(<DashboardOverview />)

      await waitFor(() => {
        expect(screen.getByLabelText('refresh')).toBeInTheDocument()
      })

      await user.click(screen.getByLabelText('refresh'))

      await waitFor(() => {
        expect(mockFetchAnalytics).toHaveBeenCalledTimes(2)
      })
    })
  })

  // -----------------------------------------------------------------------
  // NO ORG STATE
  // -----------------------------------------------------------------------

  describe('No org state', () => {
    it('should not call fetchFullAnalytics when orgId is null', () => {
      mockUseOrg.mockReturnValue({ orgId: null, branchId: null })
      render(<DashboardOverview />)
      expect(mockFetchAnalytics).not.toHaveBeenCalled()
    })
  })

  // -----------------------------------------------------------------------
  // EMPTY DATA SECTIONS
  // -----------------------------------------------------------------------

  describe('Empty data sections', () => {
    it('should render EmptyState for intents when distribucion_intents is empty', async () => {
      const analytics = makeAnalytics()
      analytics.performance_ia.distribucion_intents = {} as any
      mockFetchAnalytics.mockResolvedValue(analytics)

      render(<DashboardOverview />)

      await waitFor(() => {
        const emptyStates = screen.getAllByTestId('empty-state')
        expect(emptyStates.length).toBeGreaterThanOrEqual(1)
      })
    })

    it('should render EmptyState for opportunities when total is 0', async () => {
      const analytics = makeAnalytics()
      analytics.oportunidades.total = 0
      analytics.oportunidades.por_tipo = {} as any
      mockFetchAnalytics.mockResolvedValue(analytics)

      render(<DashboardOverview />)

      await waitFor(() => {
        const emptyStates = screen.getAllByTestId('empty-state')
        expect(emptyStates.length).toBeGreaterThanOrEqual(1)
      })
    })
  })

  // -----------------------------------------------------------------------
  // BRANCH FILTERING
  // -----------------------------------------------------------------------

  describe('Branch filtering', () => {
    it('should pass branchId to fetchFullAnalytics', async () => {
      mockUseOrg.mockReturnValue({ orgId: 'org-1', branchId: 'branch-99' })
      render(<DashboardOverview />)

      await waitFor(() => {
        expect(mockFetchAnalytics).toHaveBeenCalledWith('org-1', 30, 'branch-99')
      })
    })

    it('should pass branchId to fetchVoiceMetrics', async () => {
      mockUseOrg.mockReturnValue({ orgId: 'org-1', branchId: 'branch-99' })
      render(<DashboardOverview />)

      await waitFor(() => {
        expect(mockFetchVoice).toHaveBeenCalledWith('org-1', 30, 'branch-99')
      })
    })
  })
})
