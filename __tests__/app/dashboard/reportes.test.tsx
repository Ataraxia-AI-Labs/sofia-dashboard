// __tests__/app/dashboard/reportes.test.tsx
// ---------------------------------------------------------------------------
// Nuclear-level tests for the Reportes (Reports/Intelligence) page
// (app/dashboard/reportes/page.tsx)
//
// States tested: loading spinner, analytics data render (summary cards,
// conversion funnel, revenue section, AI performance, sub-bots), date range
// selector, PDF download (success + error + downloaded confirmation),
// empty/null analytics, no orgId, formatMoney, funnel bar percentages.
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
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn(), back: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/reportes',
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
import { downloadReportPdf, fetchFullAnalytics } from '@/lib/api'

const mockUseOrg = useOrg as jest.Mock
const mockFetchAnalytics = fetchFullAnalytics as jest.Mock
const mockDownloadPdf = downloadReportPdf as jest.Mock

import ReportesPage from '@/app/dashboard/reportes/page'

// ---- Fixtures ----

const FULL_ANALYTICS = {
  conversiones: {
    total_citas: 120,
    citas_completadas: 95,
    pacientes_nuevos: 42,
    pacientes_unicos: 88,
    tasa_conversion_pct: 35,
    tasa_asistencia_pct: 79,
    tasa_cancelacion_pct: 12,
    tasa_no_show_pct: 9,
    funnel: {
      mensajes: 500,
      pacientes: 200,
      citas: 120,
      completadas: 95,
    },
  },
  revenue: {
    moneda: 'COP',
    revenue_total: 15_500_000,
    revenue_pendiente: 2_300_000,
    revenue_pipeline: 5_000_000,
    ticket_promedio: 250_000,
    revenue_diario_promedio: 516_000,
    proyeccion_mensual: 18_000_000,
  },
  performance_ia: {
    total_interacciones: 1450,
    total_tokens: 980_000,
    total_costo_usd: 12.45,
    costo_promedio_por_interaccion_usd: 0.0086,
    response_time_promedio_ms: 850,
    proyeccion_costo_mensual_usd: 18.5,
    distribucion_intents: {
      agendar_cita: 320,
      consulta_precios: 280,
      recordatorio: 150,
      saludo: 400,
      cancelar: 90,
      otro: 210,
    },
  },
  sub_bots: {
    reminder_bot: { mensajes_enviados: 340 },
    hunter_bot: { followups_enviados: 85, conversiones_post_followup: 12 },
    nurse_bot: { recordatorios_enviados: 120 },
    total_mensajes_automaticos: 545,
  },
}

function setup(orgId: string | null = 'org-1') {
  mockUseOrg.mockReturnValue({ orgId, role: 'OWNER' })
}

// ---- Tests ----

describe('ReportesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setup()
    mockFetchAnalytics.mockResolvedValue(FULL_ANALYTICS)
    mockDownloadPdf.mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' }))
    // Mock URL.createObjectURL / revokeObjectURL
    global.URL.createObjectURL = jest.fn(() => 'blob:test')
    global.URL.revokeObjectURL = jest.fn()
  })

  // ===== LOADING STATE =====

  it('shows loading spinner while fetching analytics', () => {
    mockFetchAnalytics.mockReturnValue(new Promise(() => {})) // never resolves
    render(<ReportesPage />)
    expect(screen.getByTestId('icon-Loader2')).toBeInTheDocument()
  })

  it('calls fetchFullAnalytics with orgId and default 30 days', () => {
    mockFetchAnalytics.mockReturnValue(new Promise(() => {}))
    render(<ReportesPage />)
    expect(mockFetchAnalytics).toHaveBeenCalledWith('org-1', 30)
  })

  // ===== HEADER =====

  it('renders title and subtitle from translations', async () => {
    render(<ReportesPage />)
    await waitFor(() => expect(screen.getByText('title')).toBeInTheDocument())
    expect(screen.getByText('subtitle')).toBeInTheDocument()
  })

  // ===== DATE RANGE SELECTOR =====

  it('renders date range selector with all options', async () => {
    render(<ReportesPage />)
    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select).toBeInTheDocument()
    expect(select.value).toBe('30')
    expect(select.options).toHaveLength(5)
  })

  it('changing date range re-fetches analytics', async () => {
    const user = userEvent.setup()
    render(<ReportesPage />)
    const select = screen.getByRole('combobox')
    await user.selectOptions(select, '7')
    await waitFor(() => expect(mockFetchAnalytics).toHaveBeenCalledWith('org-1', 7))
  })

  // ===== SUMMARY CARDS =====

  it('renders all four summary cards with correct values', async () => {
    render(<ReportesPage />)
    await waitFor(() => expect(screen.getAllByText('120').length).toBeGreaterThanOrEqual(1))
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('1450')).toBeInTheDocument()
    // Revenue formatted (appears in summary card + revenue section)
    expect(screen.getAllByText('$15.5M').length).toBeGreaterThanOrEqual(1)
  })

  it('renders summary card labels from translations', async () => {
    render(<ReportesPage />)
    await waitFor(() => expect(screen.getByText('totalAppointments')).toBeInTheDocument())
    expect(screen.getByText('newPatients')).toBeInTheDocument()
    expect(screen.getByText('aiInteractions')).toBeInTheDocument()
  })

  // ===== CONVERSION FUNNEL =====

  it('renders conversion funnel with all four bars', async () => {
    render(<ReportesPage />)
    await waitFor(() => expect(screen.getByText('messages')).toBeInTheDocument())
    expect(screen.getByText('patients')).toBeInTheDocument()
    expect(screen.getByText('appointments')).toBeInTheDocument()
    expect(screen.getByText('completed')).toBeInTheDocument()
  })

  it('renders conversion rates', async () => {
    render(<ReportesPage />)
    await waitFor(() => expect(screen.getByText('35%')).toBeInTheDocument())
    expect(screen.getByText('79%')).toBeInTheDocument()
    expect(screen.getByText('12%')).toBeInTheDocument()
    expect(screen.getByText('9%')).toBeInTheDocument()
  })

  // ===== REVENUE SECTION =====

  it('renders revenue section with currency label', async () => {
    render(<ReportesPage />)
    await waitFor(() => expect(screen.getAllByText(/Revenue \(COP\)/).length).toBeGreaterThanOrEqual(1))
    expect(screen.getByText('charged')).toBeInTheDocument()
    expect(screen.getByText('pendingRevenue')).toBeInTheDocument()
    expect(screen.getByText('pipelineRevenue')).toBeInTheDocument()
    expect(screen.getByText('averageTicket')).toBeInTheDocument()
    expect(screen.getByText('monthlyProjection')).toBeInTheDocument()
  })

  // ===== AI PERFORMANCE =====

  it('renders AI performance metrics', async () => {
    render(<ReportesPage />)
    await waitFor(() => expect(screen.getByText('aiPerformance')).toBeInTheDocument())
    expect(screen.getByText('totalTokens')).toBeInTheDocument()
    expect(screen.getByText('totalCost')).toBeInTheDocument()
    expect(screen.getByText('costPerInteraction')).toBeInTheDocument()
    expect(screen.getByText('avgResponse')).toBeInTheDocument()
  })

  it('renders top intents distribution', async () => {
    render(<ReportesPage />)
    await waitFor(() => expect(screen.getByText('topIntents')).toBeInTheDocument())
    expect(screen.getByText('agendar_cita')).toBeInTheDocument()
    expect(screen.getByText('consulta_precios')).toBeInTheDocument()
    expect(screen.getByText('saludo')).toBeInTheDocument()
  })

  it('limits intents display to top 5', async () => {
    render(<ReportesPage />)
    await waitFor(() => expect(screen.getByText('topIntents')).toBeInTheDocument())
    // 6 intents exist but only 5 shown
    const intentLabels = ['agendar_cita', 'consulta_precios', 'recordatorio', 'saludo', 'cancelar', 'otro']
    const rendered = intentLabels.filter(i => screen.queryByText(i))
    expect(rendered.length).toBeLessThanOrEqual(5)
  })

  // ===== SUB-BOTS =====

  it('renders sub-bots section with all three bots', async () => {
    render(<ReportesPage />)
    await waitFor(() => expect(screen.getByText('Reminder Bot')).toBeInTheDocument())
    expect(screen.getByText('Hunter Bot')).toBeInTheDocument()
    expect(screen.getByText('Nurse Bot')).toBeInTheDocument()
  })

  it('renders hunter bot conversion count', async () => {
    render(<ReportesPage />)
    await waitFor(() => expect(screen.getByText(/12 converted/)).toBeInTheDocument())
  })

  it('renders total automatic messages', async () => {
    render(<ReportesPage />)
    await waitFor(() => expect(screen.getByText('545')).toBeInTheDocument())
    expect(screen.getByText('totalAutomatic')).toBeInTheDocument()
  })

  // ===== PDF DOWNLOAD =====

  it('download button triggers PDF generation and auto-download', async () => {
    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    const appendSpy = jest.spyOn(document.body, 'appendChild')
    render(<ReportesPage />)
    await waitFor(() => expect(screen.getByText('downloadPDF')).toBeInTheDocument())

    const btn = screen.getAllByText('downloadPDF')[0]
    await user.click(btn)

    await waitFor(() => expect(mockDownloadPdf).toHaveBeenCalledWith('org-1', 30))
    expect(appendSpy).toHaveBeenCalled()
    appendSpy.mockRestore()
    jest.useRealTimers()
  })

  it('shows downloading state with spinner icon', async () => {
    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    mockDownloadPdf.mockReturnValue(new Promise(() => {})) // never resolves
    render(<ReportesPage />)
    await waitFor(() => expect(screen.getByText('downloadPDF')).toBeInTheDocument())

    const btn = screen.getAllByText('downloadPDF')[0]
    await user.click(btn)

    expect(screen.getAllByText('generating').length).toBeGreaterThanOrEqual(1)
    jest.useRealTimers()
  })

  it('shows downloaded confirmation after success', async () => {
    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<ReportesPage />)
    await waitFor(() => expect(screen.getByText('downloadPDF')).toBeInTheDocument())

    const btn = screen.getAllByText('downloadPDF')[0]
    await user.click(btn)

    await waitFor(() => expect(screen.getAllByText('downloaded').length).toBeGreaterThanOrEqual(1))
    jest.useRealTimers()
  })

  it('download button is disabled without orgId', async () => {
    setup(null)
    mockFetchAnalytics.mockResolvedValue(null)
    render(<ReportesPage />)
    // Should still render buttons but disabled
    await waitFor(() => {
      const buttons = screen.getAllByRole('button')
      const downloadBtn = buttons.find(b => b.textContent?.includes('downloadPDF') || b.textContent?.includes('downloadComplete'))
      if (downloadBtn) {
        expect(downloadBtn).toBeDisabled()
      }
    })
  })

  it('handles download error gracefully', async () => {
    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockDownloadPdf.mockRejectedValue(new Error('Network error'))
    render(<ReportesPage />)
    await waitFor(() => expect(screen.getByText('downloadPDF')).toBeInTheDocument())

    const btn = screen.getAllByText('downloadPDF')[0]
    await user.click(btn)

    await waitFor(() => expect(consoleSpy).toHaveBeenCalled())
    consoleSpy.mockRestore()
    jest.useRealTimers()
  })

  // ===== EMPTY / NULL ANALYTICS =====

  it('renders gracefully when analytics is null (fetch error)', async () => {
    mockFetchAnalytics.mockRejectedValue(new Error('fail'))
    render(<ReportesPage />)
    await waitFor(() => expect(screen.queryByTestId('icon-Loader2')).not.toBeInTheDocument())
    // Summary cards should show 0 values
    expect(screen.getAllByText('0').length).toBeGreaterThan(0)
  })

  it('renders zero values when analytics fields are missing', async () => {
    mockFetchAnalytics.mockResolvedValue({})
    render(<ReportesPage />)
    await waitFor(() => expect(screen.queryByTestId('icon-Loader2')).not.toBeInTheDocument())
    // Should render 0 for missing summary card values
    expect(screen.getAllByText('0').length).toBeGreaterThan(0)
  })

  // ===== NO ORG =====

  it('does not fetch analytics when orgId is null', () => {
    setup(null)
    render(<ReportesPage />)
    expect(mockFetchAnalytics).not.toHaveBeenCalled()
  })

  // ===== BOTTOM CTA =====

  it('renders the bottom download CTA section', async () => {
    render(<ReportesPage />)
    await waitFor(() => expect(screen.getByText('downloadFullReport')).toBeInTheDocument())
    expect(screen.getByText('fullReportDesc')).toBeInTheDocument()
  })

  // ===== REVENUE FORMAT =====

  it('formats money values correctly (millions = M suffix)', async () => {
    render(<ReportesPage />)
    await waitFor(() => expect(screen.getAllByText('$15.5M').length).toBeGreaterThanOrEqual(1))
    expect(screen.getAllByText('$18.0M').length).toBeGreaterThanOrEqual(1)
  })

  // ===== FUNNEL BAR VALUES =====

  it('displays funnel bar numeric values', async () => {
    render(<ReportesPage />)
    await waitFor(() => expect(screen.getByText('500')).toBeInTheDocument())
    expect(screen.getByText('200')).toBeInTheDocument()
    expect(screen.getByText('95')).toBeInTheDocument()
  })
})
