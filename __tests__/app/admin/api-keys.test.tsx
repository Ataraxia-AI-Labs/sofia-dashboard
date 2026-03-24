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

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn(), back: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/admin/api-keys',
}))

/* ── admin-api ── */
const mockListAPIKeys = jest.fn()
const mockCreateAPIKey = jest.fn()
const mockRevokeAPIKey = jest.fn()
const mockFetchAllOrganizations = jest.fn()

jest.mock('@/lib/admin-api', () => ({
  listAPIKeys: (...a: any[]) => mockListAPIKeys(...a),
  createAPIKey: (...a: any[]) => mockCreateAPIKey(...a),
  revokeAPIKey: (...a: any[]) => mockRevokeAPIKey(...a),
  fetchAllOrganizations: (...a: any[]) => mockFetchAllOrganizations(...a),
}))

jest.mock('@/lib/api', () => ({
  timeAgo: () => 'hace 1h',
}))

jest.mock('@/components/ui/modal', () => ({
  Modal: ({ open, onClose, title, description, children }: any) => {
    if (!open) return null
    return (
      <div data-testid="modal" role="dialog">
        <div data-testid="modal-title">{title}</div>
        {description && <div data-testid="modal-description">{description}</div>}
        {children}
        <button data-testid="modal-close-btn" onClick={onClose}>X</button>
      </div>
    )
  },
}))

import AdminAPIKeysPage from '@/app/admin/api-keys/page'

const KEYS = [
  { id: 'k1', name: 'Backend CI', key_hint: 'abcd', scopes: ['read', 'write'], status: 'active', organization_name: 'Clinica A', created_at: '2026-03-01', last_used_at: '2026-03-20' },
  { id: 'k2', name: 'Old Key', key_hint: 'efgh', scopes: ['read'], status: 'revoked', organization_name: null, created_at: '2026-01-01', last_used_at: null },
]

const ORGS = [
  { id: 'org-1', name: 'Clinica A' },
  { id: 'org-2', name: 'Clinica B' },
]

function setupHappy() {
  mockListAPIKeys.mockResolvedValue(KEYS)
  mockFetchAllOrganizations.mockResolvedValue(ORGS)
}

beforeEach(() => {
  jest.clearAllMocks()
  setupHappy()
})

describe('AdminAPIKeysPage', () => {
  it('renders header', async () => {
    render(<AdminAPIKeysPage />)
    await waitFor(() => expect(screen.getByText('API Keys')).toBeInTheDocument())
    expect(screen.getByText(/Gestion de claves/)).toBeInTheDocument()
  })

  it('shows loading state then keys', async () => {
    render(<AdminAPIKeysPage />)
    await waitFor(() => expect(screen.getByText('Backend CI')).toBeInTheDocument())
    expect(screen.getByText('Old Key')).toBeInTheDocument()
  })

  it('shows empty state when no keys', async () => {
    mockListAPIKeys.mockResolvedValue([])
    render(<AdminAPIKeysPage />)
    await waitFor(() => expect(screen.getByText(/No hay claves API/)).toBeInTheDocument())
  })

  it('displays key scopes', async () => {
    render(<AdminAPIKeysPage />)
    await waitFor(() => expect(screen.getAllByText('read').length).toBeGreaterThanOrEqual(1))
    expect(screen.getByText('write')).toBeInTheDocument()
  })

  it('shows active/revoked status', async () => {
    render(<AdminAPIKeysPage />)
    await waitFor(() => expect(screen.getByText('Activa')).toBeInTheDocument())
    expect(screen.getByText('Revocada')).toBeInTheDocument()
  })

  it('shows revoke button only for active keys', async () => {
    render(<AdminAPIKeysPage />)
    await waitFor(() => expect(screen.getByText('Backend CI')).toBeInTheDocument())
    const revokeButtons = screen.getAllByText('Revocar')
    expect(revokeButtons).toHaveLength(1) // only for active key
  })

  it('opens create modal on button click', async () => {
    render(<AdminAPIKeysPage />)
    await waitFor(() => expect(screen.getByText('Crear Clave')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Crear Clave'))
    await waitFor(() => expect(screen.getByText('Crear API Key')).toBeInTheDocument())
  })

  it('validates name is required in create modal', async () => {
    render(<AdminAPIKeysPage />)
    await waitFor(() => screen.getByText('Crear Clave'))
    fireEvent.click(screen.getByText('Crear Clave'))
    await waitFor(() => screen.getByText('Crear API Key'))
    // Click create without name
    const createBtns = screen.getAllByText('Crear Clave')
    fireEvent.click(createBtns[createBtns.length - 1])
    await waitFor(() => expect(screen.getByText('El nombre es requerido')).toBeInTheDocument())
  })

  it('creates a key successfully', async () => {
    mockCreateAPIKey.mockResolvedValue({ key: 'sk-live-xyz123' })
    render(<AdminAPIKeysPage />)
    await waitFor(() => screen.getByText('Crear Clave'))
    fireEvent.click(screen.getByText('Crear Clave'))
    await waitFor(() => screen.getByText('Crear API Key'))
    fireEvent.change(screen.getByPlaceholderText('ej. Backend CI, Integracion Zapier'), { target: { value: 'Test Key' } })
    const createBtns = screen.getAllByText('Crear Clave')
    fireEvent.click(createBtns[createBtns.length - 1])
    await waitFor(() => expect(screen.getByText('Clave creada!')).toBeInTheDocument())
    expect(screen.getByText('sk-live-xyz123')).toBeInTheDocument()
  })

  it('opens revoke confirmation modal', async () => {
    render(<AdminAPIKeysPage />)
    await waitFor(() => screen.getByText('Backend CI'))
    fireEvent.click(screen.getByText('Revocar'))
    await waitFor(() => expect(screen.getByText('Revocar clave API')).toBeInTheDocument())
    expect(screen.getAllByText(/Backend CI/).length).toBeGreaterThanOrEqual(1)
  })

  it('revokes a key on confirmation', async () => {
    mockRevokeAPIKey.mockResolvedValue(undefined)
    render(<AdminAPIKeysPage />)
    await waitFor(() => screen.getByText('Backend CI'))
    fireEvent.click(screen.getByText('Revocar'))
    await waitFor(() => screen.getByText('Revocar clave API'))
    fireEvent.click(screen.getByText('Revocar clave'))
    await waitFor(() => expect(mockRevokeAPIKey).toHaveBeenCalledWith('k1'))
  })

  it('cancels revoke modal', async () => {
    render(<AdminAPIKeysPage />)
    await waitFor(() => screen.getByText('Backend CI'))
    fireEvent.click(screen.getByText('Revocar'))
    await waitFor(() => screen.getByText('Revocar clave API'))
    const cancelBtns = screen.getAllByText('Cancelar')
    fireEvent.click(cancelBtns[cancelBtns.length - 1])
    await waitFor(() => expect(screen.queryByText('Revocar clave API')).not.toBeInTheDocument())
  })

  it('filters by organization', async () => {
    render(<AdminAPIKeysPage />)
    await waitFor(() => screen.getByText('Backend CI'))
    // Find the org filter select (first select on the page)
    const selects = document.querySelectorAll('select')
    const orgSelect = selects[0] // first select is the org filter
    fireEvent.change(orgSelect, { target: { value: 'org-1' } })
    await waitFor(() => expect(mockListAPIKeys).toHaveBeenCalledWith('org-1'))
  })

  it('shows clear filter button when org selected', async () => {
    render(<AdminAPIKeysPage />)
    await waitFor(() => screen.getByText('Backend CI'))
    const selects = document.querySelectorAll('select')
    fireEvent.change(selects[0], { target: { value: 'org-1' } })
    await waitFor(() => expect(screen.getByText('Limpiar filtro')).toBeInTheDocument())
  })

  it('shows key count in header', async () => {
    render(<AdminAPIKeysPage />)
    await waitFor(() => expect(screen.getByText('2 claves')).toBeInTheDocument())
  })

  it('handles API error on load', async () => {
    const { captureException } = require('@sentry/nextjs')
    mockListAPIKeys.mockRejectedValue(new Error('Network'))
    render(<AdminAPIKeysPage />)
    await waitFor(() => expect(captureException).toHaveBeenCalled())
  })

  it('shows scope checkboxes in create modal', async () => {
    render(<AdminAPIKeysPage />)
    await waitFor(() => screen.getByText('Crear Clave'))
    fireEvent.click(screen.getByText('Crear Clave'))
    await waitFor(() => expect(screen.getByText('Read')).toBeInTheDocument())
    expect(screen.getByText('Write')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })
})
