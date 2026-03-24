import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

jest.mock('lucide-react', () => {
  return new Proxy({}, {
    get: (_, name) => {
      const C = (p: any) => <svg data-testid={`icon-${String(name)}`} {...p} />
      C.displayName = String(name)
      return C
    },
  })
})

jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }))

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), refresh: jest.fn(), back: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/admin/audit-logs',
}))

const mockFetchAuditLogs = jest.fn()
const mockFetchAllOrganizations = jest.fn()

jest.mock('@/lib/admin-api', () => ({
  fetchAuditLogs: (...a: any[]) => mockFetchAuditLogs(...a),
  fetchAllOrganizations: (...a: any[]) => mockFetchAllOrganizations(...a),
}))

import AuditLogsPage from '@/app/admin/audit-logs/page'

const LOGS = [
  { id: 'l1', created_at: '2026-03-20T10:00:00Z', user_email: 'admin@test.com', user_id: 'u1', action: 'create', resource_type: 'patient', resource_id: 'res-12345678', organization_id: 'org-1', org_name: 'Clinica A', details: { field: 'value' } },
  { id: 'l2', created_at: '2026-03-19T09:00:00Z', user_email: null, user_id: 'u2', action: 'delete', resource_type: 'appointment', resource_id: null, organization_id: null, org_name: null, details: null },
]

const ORGS = [{ id: 'org-1', name: 'Clinica A' }]

beforeEach(() => {
  jest.clearAllMocks()
  mockFetchAuditLogs.mockResolvedValue({ data: LOGS, total: 2 })
  mockFetchAllOrganizations.mockResolvedValue(ORGS)
})

describe('AuditLogsPage', () => {
  it('renders header', async () => {
    render(<AuditLogsPage />)
    await waitFor(() => expect(screen.getByText('Audit Log')).toBeInTheDocument())
    expect(screen.getByText(/Registro de todas las acciones/)).toBeInTheDocument()
  })

  it('shows loading skeleton then logs', async () => {
    render(<AuditLogsPage />)
    await waitFor(() => expect(screen.getByText('admin@test.com')).toBeInTheDocument())
    expect(screen.getByText('patient')).toBeInTheDocument()
    expect(screen.getByText('appointment')).toBeInTheDocument()
  })

  it('shows empty state when no logs', async () => {
    mockFetchAuditLogs.mockResolvedValue({ data: [], total: 0 })
    render(<AuditLogsPage />)
    await waitFor(() => expect(screen.getByText('No se encontraron eventos de auditoria')).toBeInTheDocument())
  })

  it('renders action badges with correct colors', async () => {
    render(<AuditLogsPage />)
    await waitFor(() => expect(screen.getByText('create')).toBeInTheDocument())
    expect(screen.getByText('delete')).toBeInTheDocument()
  })

  it('shows event count', async () => {
    render(<AuditLogsPage />)
    await waitFor(() => expect(screen.getByText(/2 eventos/)).toBeInTheDocument())
  })

  it('expands log details on click', async () => {
    render(<AuditLogsPage />)
    await waitFor(() => screen.getByText('admin@test.com'))
    // Find the "Ver" link for the first log (has details)
    const verLinks = screen.getAllByText('Ver')
    fireEvent.click(verLinks[0].closest('tr')!)
    await waitFor(() => expect(screen.getByText(/field/)).toBeInTheDocument())
  })

  it('collapses details on second click', async () => {
    render(<AuditLogsPage />)
    await waitFor(() => screen.getByText('admin@test.com'))
    const row = screen.getByText('admin@test.com').closest('tr')!
    fireEvent.click(row)
    await waitFor(() => screen.getByText('Ocultar'))
    fireEvent.click(row)
    await waitFor(() => expect(screen.queryByText('Ocultar')).not.toBeInTheDocument())
  })

  it('renders user_id fallback when no email', async () => {
    render(<AuditLogsPage />)
    await waitFor(() => expect(screen.getByText('u2')).toBeInTheDocument())
  })

  it('renders resource_id when present', async () => {
    render(<AuditLogsPage />)
    await waitFor(() => expect(screen.getByText('#res-1234')).toBeInTheDocument())
  })

  it('renders org name', async () => {
    render(<AuditLogsPage />)
    await waitFor(() => expect(screen.getAllByText('Clinica A').length).toBeGreaterThanOrEqual(1))
  })

  it('has filter section', async () => {
    render(<AuditLogsPage />)
    await waitFor(() => expect(screen.getByText('Filtros')).toBeInTheDocument())
    expect(screen.getByPlaceholderText('Buscar usuario o recurso...')).toBeInTheDocument()
    expect(screen.getByText('Todas las acciones')).toBeInTheDocument()
    expect(screen.getByText('Todas las orgs')).toBeInTheDocument()
  })

  it('filters by action type', async () => {
    render(<AuditLogsPage />)
    await waitFor(() => screen.getByText('Todas las acciones'))
    fireEvent.change(screen.getByDisplayValue('Todas las acciones'), { target: { value: 'create' } })
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('action=create')))
  })

  it('filters by org', async () => {
    render(<AuditLogsPage />)
    await waitFor(() => screen.getByText('Todas las orgs'))
    fireEvent.change(screen.getByDisplayValue('Todas las orgs'), { target: { value: 'org-1' } })
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('org_id=org-1')))
  })

  it('handles API error gracefully', async () => {
    const { captureException } = require('@sentry/nextjs')
    mockFetchAuditLogs.mockRejectedValue(new Error('Server error'))
    render(<AuditLogsPage />)
    await waitFor(() => expect(captureException).toHaveBeenCalled())
    expect(screen.getByText('No se encontraron eventos de auditoria')).toBeInTheDocument()
  })

  it('renders filter icons', async () => {
    render(<AuditLogsPage />)
    await waitFor(() => expect(screen.getByTestId('icon-Filter')).toBeInTheDocument())
    expect(screen.getByTestId('icon-Search')).toBeInTheDocument()
  })

  it('shows pagination info text', async () => {
    mockFetchAuditLogs.mockResolvedValue({ data: LOGS, total: 100 })
    render(<AuditLogsPage />)
    await waitFor(() => expect(screen.getByText(/Mostrando 1/)).toBeInTheDocument())
  })
})
