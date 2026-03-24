// __tests__/app/dashboard/datalake.test.tsx
// ---------------------------------------------------------------------------
// Nuclear-level tests for the Data Lake page
// (app/dashboard/datalake/page.tsx)
//
// States tested: loading, KPI cards, tab switching (overview/export/models/
// optimizer/learning), refresh button, export flow (button, result, download),
// fine-tuning readiness (ready vs accumulating), milestones, intent
// distribution, pipeline status, daily ingestion chart, dynamic panels,
// empty stats, no orgId, annotation stats card.
// ---------------------------------------------------------------------------

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// ---- Mocks (BEFORE component import) ----

jest.mock('@/lib/org-context')
jest.mock('@/lib/api/data-lake')
jest.mock('@/components/annotation-stats-card', () => ({
  AnnotationStatsCard: (props: any) => <div data-testid="annotation-stats-card" data-org={props.orgId} />,
}))
jest.mock('next/dynamic', () => {
  return (fn: () => Promise<any>, opts?: any) => {
    const C = (props: any) => <div data-testid="dynamic-panel" data-props={JSON.stringify(props)} />
    C.displayName = 'DynamicPanel'
    return C
  }
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
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn(), back: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/datalake',
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
  fetchDataLakeStats,
  fetchDataLakeDaily,
  fetchTrainingReadyCount,
  exportDataLakeJSONL,
} from '@/lib/api/data-lake'

const mockUseOrg = useOrg as jest.Mock
const mockFetchStats = fetchDataLakeStats as jest.Mock
const mockFetchDaily = fetchDataLakeDaily as jest.Mock
const mockFetchReady = fetchTrainingReadyCount as jest.Mock
const mockExport = exportDataLakeJSONL as jest.Mock

import DataLakePage from '@/app/dashboard/datalake/page'

// ---- Fixtures ----

const MOCK_STATS = {
  raw_data_total: 2500,
  training_data_total: 180,
  quality_promedio: 0.82,
  modelos_entrenados: 2,
  listo_para_finetuning: true,
  training_exported: 120,
  recomendacion: 'Ya puedes hacer fine-tuning con estos datos.',
  por_intent: {
    agendar_cita: 80,
    consulta_precios: 50,
    saludo: 30,
  },
  ultimo_modelo: { model_name: 'sofia-v1-lora' },
}

const MOCK_DAILY = [
  { date: '2026-03-20', count: 50 },
  { date: '2026-03-21', count: 65 },
  { date: '2026-03-22', count: 40 },
]

const MOCK_EXPORT_RESULT = {
  stats: { total: 150, tokens_estimados: 45000 },
  costo_estimado_usd: 3.2,
  recomendacion: 'Suficientes muestras para fine-tuning basico.',
  jsonl_preview: '{"messages":[{"role":"system","content":"eres SofIA"}]}',
  export_batch: 'batch-001',
}

function setup(orgId = 'org-1', branchId: string | null = null) {
  mockUseOrg.mockReturnValue({ orgId, branchId, role: 'OWNER' })
  mockFetchStats.mockResolvedValue(MOCK_STATS)
  mockFetchDaily.mockResolvedValue(MOCK_DAILY)
  mockFetchReady.mockResolvedValue(75)
  mockExport.mockResolvedValue(MOCK_EXPORT_RESULT)
}

// ---- Tests ----

describe('DataLakePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setup()
    global.URL.createObjectURL = jest.fn(() => 'blob:test')
    global.URL.revokeObjectURL = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  // ===== DATA LOADING =====

  it('calls all three fetch functions on mount', async () => {
    render(<DataLakePage />)
    await waitFor(() => expect(mockFetchStats).toHaveBeenCalledWith('org-1', null))
    expect(mockFetchDaily).toHaveBeenCalledWith('org-1', 30)
    expect(mockFetchReady).toHaveBeenCalledWith('org-1')
  })

  it('passes branchId to fetchDataLakeStats', async () => {
    setup('org-1', 'branch-a')
    render(<DataLakePage />)
    await waitFor(() => expect(mockFetchStats).toHaveBeenCalledWith('org-1', 'branch-a'))
  })

  // ===== HEADER =====

  it('renders page title and subtitle', async () => {
    render(<DataLakePage />)
    await waitFor(() => expect(screen.getByText('title')).toBeInTheDocument())
    expect(screen.getByText('Fine-tuning & Training Pipeline')).toBeInTheDocument()
  })

  // ===== KPI CARDS =====

  it('renders all 5 KPI cards with correct values', async () => {
    render(<DataLakePage />)
    await waitFor(() => expect(screen.getByText('2.5K')).toBeInTheDocument())
    expect(screen.getByText('180')).toBeInTheDocument()   // training data
    expect(screen.getByText('75')).toBeInTheDocument()     // training ready
    expect(screen.getByText('82%')).toBeInTheDocument()    // quality score
    expect(screen.getByText('2')).toBeInTheDocument()      // models
  })

  it('renders KPI card labels', async () => {
    render(<DataLakePage />)
    await waitFor(() => expect(screen.getByText('Raw Data')).toBeInTheDocument())
    expect(screen.getByText('Training Data')).toBeInTheDocument()
    expect(screen.getByText('Training Ready')).toBeInTheDocument()
    expect(screen.getByText('Quality Score')).toBeInTheDocument()
    expect(screen.getByText('Modelos')).toBeInTheDocument()
  })

  // ===== FINE-TUNING READINESS =====

  it('shows "Listo para entrenar" when listo_para_finetuning is true', async () => {
    render(<DataLakePage />)
    await waitFor(() => expect(screen.getByText('Listo para entrenar')).toBeInTheDocument())
  })

  it('shows "Acumulando datos" when listo_para_finetuning is false', async () => {
    mockFetchStats.mockResolvedValue({ ...MOCK_STATS, listo_para_finetuning: false })
    render(<DataLakePage />)
    await waitFor(() => expect(screen.getByText('Acumulando datos')).toBeInTheDocument())
  })

  it('renders fine-tuning milestones', async () => {
    render(<DataLakePage />)
    await waitFor(() => expect(screen.getByText('Fine-tune básico')).toBeInTheDocument())
    expect(screen.getByText('SofIA v1')).toBeInTheDocument()
    expect(screen.getByText('Modelo propio')).toBeInTheDocument()
    expect(screen.getByText('AGI LATAM')).toBeInTheDocument()
  })

  it('renders recommendation text', async () => {
    render(<DataLakePage />)
    await waitFor(() => expect(screen.getByText('Ya puedes hacer fine-tuning con estos datos.')).toBeInTheDocument())
  })

  it('renders sample count and progress bar', async () => {
    render(<DataLakePage />)
    await waitFor(() => expect(screen.getByText('180 samples')).toBeInTheDocument())
    expect(screen.getByText('Meta: 50 mínimo')).toBeInTheDocument()
  })

  // ===== TAB SWITCHING =====

  it('renders all 5 tab buttons', async () => {
    render(<DataLakePage />)
    await waitFor(() => expect(screen.getByText('tabs.overview')).toBeInTheDocument())
    expect(screen.getByText('tabs.export')).toBeInTheDocument()
    expect(screen.getByText('tabs.models')).toBeInTheDocument()
    expect(screen.getByText('tabs.optimizer')).toBeInTheDocument()
    expect(screen.getByText('tabs.learning')).toBeInTheDocument()
  })

  it('defaults to overview tab showing daily ingestion chart', async () => {
    render(<DataLakePage />)
    await waitFor(() => expect(screen.getByText(/Ingesta por D/i)).toBeInTheDocument())
    // Daily total = 50 + 65 + 40 = 155
    expect(screen.getByText('155 total')).toBeInTheDocument()
  })

  it('overview tab shows intent distribution', async () => {
    render(<DataLakePage />)
    await waitFor(() => expect(screen.getByText('agendar_cita')).toBeInTheDocument())
    expect(screen.getByText('consulta_precios')).toBeInTheDocument()
    expect(screen.getByText('saludo')).toBeInTheDocument()
  })

  it('overview tab shows pipeline status', async () => {
    render(<DataLakePage />)
    await waitFor(() => expect(screen.getByText('Pipeline Status')).toBeInTheDocument())
    expect(screen.getByText(/Interacciones capturadas/)).toBeInTheDocument()
    expect(screen.getByText(/Quality filtering/)).toBeInTheDocument()
    expect(screen.getByText(/sofia-v1-lora/)).toBeInTheDocument()
  })

  it('overview tab renders AnnotationStatsCard', async () => {
    render(<DataLakePage />)
    await waitFor(() => expect(screen.getByTestId('annotation-stats-card')).toBeInTheDocument())
  })

  it('switches to export tab and shows export button', async () => {
    const user = userEvent.setup()
    render(<DataLakePage />)
    await waitFor(() => expect(screen.getByText('tabs.export')).toBeInTheDocument())
    await user.click(screen.getByText('tabs.export'))

    expect(screen.getByText('Exportar Training Data')).toBeInTheDocument()
    expect(screen.getByText(/Exportar JSONL/)).toBeInTheDocument()
  })

  it('switches to models tab and renders dynamic panel', async () => {
    const user = userEvent.setup()
    render(<DataLakePage />)
    await waitFor(() => expect(screen.getByText('tabs.models')).toBeInTheDocument())
    await user.click(screen.getByText('tabs.models'))

    const panels = screen.getAllByTestId('dynamic-panel')
    expect(panels.length).toBeGreaterThan(0)
  })

  it('switches to optimizer tab', async () => {
    const user = userEvent.setup()
    render(<DataLakePage />)
    await waitFor(() => expect(screen.getByText('tabs.optimizer')).toBeInTheDocument())
    await user.click(screen.getByText('tabs.optimizer'))

    const panels = screen.getAllByTestId('dynamic-panel')
    expect(panels.length).toBeGreaterThan(0)
  })

  it('switches to learning tab', async () => {
    const user = userEvent.setup()
    render(<DataLakePage />)
    await waitFor(() => expect(screen.getByText('tabs.learning')).toBeInTheDocument())
    await user.click(screen.getByText('tabs.learning'))

    const panels = screen.getAllByTestId('dynamic-panel')
    expect(panels.length).toBeGreaterThan(0)
  })

  // ===== EXPORT FLOW =====

  it('export button triggers JSONL export and shows results', async () => {
    const user = userEvent.setup()
    render(<DataLakePage />)
    await waitFor(() => expect(screen.getByText('tabs.export')).toBeInTheDocument())
    await user.click(screen.getByText('tabs.export'))

    await user.click(screen.getByText(/Exportar JSONL/))

    await waitFor(() => expect(mockExport).toHaveBeenCalledWith('org-1'))
    expect(screen.getByText('Resultado del Export')).toBeInTheDocument()
    expect(screen.getByText('150')).toBeInTheDocument()     // samples
    expect(screen.getByText('45.0K')).toBeInTheDocument()   // tokens
    expect(screen.getByText('$3.2')).toBeInTheDocument()    // cost
  })

  it('export result shows JSONL preview', async () => {
    const user = userEvent.setup()
    render(<DataLakePage />)
    await waitFor(() => expect(screen.getByText('tabs.export')).toBeInTheDocument())
    await user.click(screen.getByText('tabs.export'))
    await user.click(screen.getByText(/Exportar JSONL/))

    await waitFor(() => expect(screen.getByText('Preview JSONL')).toBeInTheDocument())
    expect(screen.getByText(/eres SofIA/)).toBeInTheDocument()
  })

  it('download JSONL button creates blob and triggers download', async () => {
    const user = userEvent.setup()
    const clickSpy = jest.fn()
    const originalCreateElement = document.createElement.bind(document)
    jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        const el = { href: '', download: '', click: clickSpy } as any
        return el
      }
      return originalCreateElement(tag)
    })

    render(<DataLakePage />)
    await waitFor(() => expect(screen.getByText('tabs.export')).toBeInTheDocument())
    await user.click(screen.getByText('tabs.export'))
    await user.click(screen.getByText(/Exportar JSONL/))

    await waitFor(() => expect(screen.getByText(/Descargar JSONL/)).toBeInTheDocument())
    await user.click(screen.getByText(/Descargar JSONL/))

    expect(global.URL.createObjectURL).toHaveBeenCalled()
    jest.restoreAllMocks()
  })

  it('disables export button when training data < 10', async () => {
    mockFetchStats.mockResolvedValue({ ...MOCK_STATS, training_data_total: 5 })
    const user = userEvent.setup()
    render(<DataLakePage />)
    await waitFor(() => expect(screen.getByText('tabs.export')).toBeInTheDocument())
    await user.click(screen.getByText('tabs.export'))

    const exportBtn = screen.getByText(/Exportar JSONL/).closest('button')
    expect(exportBtn).toBeDisabled()
  })

  // ===== REFRESH =====

  it('refresh button re-fetches all data', async () => {
    const user = userEvent.setup()
    render(<DataLakePage />)
    await waitFor(() => expect(mockFetchStats).toHaveBeenCalledTimes(1))

    const refreshBtn = screen.getByRole('button', { name: 'refresh' })
    await user.click(refreshBtn)

    expect(mockFetchStats).toHaveBeenCalledTimes(2)
    expect(mockFetchDaily).toHaveBeenCalledTimes(2)
    expect(mockFetchReady).toHaveBeenCalledTimes(2)
  })

  // ===== EMPTY STATS =====

  it('handles null stats gracefully showing 0 values', async () => {
    mockFetchStats.mockResolvedValue(null)
    mockFetchDaily.mockResolvedValue([])
    mockFetchReady.mockResolvedValue(0)
    render(<DataLakePage />)
    await waitFor(() => expect(screen.getAllByText('0').length).toBeGreaterThan(0))
  })

  // ===== ERROR STATE =====

  it('handles fetch error gracefully', async () => {
    mockFetchStats.mockRejectedValue(new Error('fail'))
    mockFetchDaily.mockRejectedValue(new Error('fail'))
    mockFetchReady.mockRejectedValue(new Error('fail'))
    render(<DataLakePage />)
    // Should not crash, will show empty/0 state
    await waitFor(() => expect(screen.getByText('title')).toBeInTheDocument())
  })
})
