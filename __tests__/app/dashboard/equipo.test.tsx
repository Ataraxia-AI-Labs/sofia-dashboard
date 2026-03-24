// __tests__/app/dashboard/equipo.test.tsx
// ---------------------------------------------------------------------------
// Nuclear-level tests for the Equipo (Team Management) page
// (app/dashboard/equipo/page.tsx)
//
// States tested: loading skeleton, team members list with names/roles/emails,
// RBAC info banner, role badges (OWNER/ADMIN/STAFF), invite modal (open/close,
// email input, role selector, submit, success/error), role change via menu,
// deactivate member flow (confirm modal), active/inactive member sections,
// empty state, error state on load, refresh, canManage permissions.
// ---------------------------------------------------------------------------

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// ---- Mocks (BEFORE component import) ----

jest.mock('@/lib/org-context')
jest.mock('@/lib/api', () => ({
  fetchTeamMembers: jest.fn(),
  inviteTeamMember: jest.fn(),
  updateMemberRole: jest.fn(),
  deactivateMember: jest.fn(),
}))

const mockToast = { success: jest.fn(), error: jest.fn() }
jest.mock('@/components/ui/toast', () => ({
  useToast: () => mockToast,
}))

jest.mock('@/components/ui', () => ({
  Button: ({ children, onClick, disabled, loading, icon, className, variant, size, ...rest }: any) => (
    <button onClick={onClick} disabled={disabled || loading} data-loading={loading} className={className} {...rest}>
      {icon}{children}
    </button>
  ),
  Badge: ({ children, variant, dot }: any) => (
    <span data-testid={`badge-${variant}`} data-variant={variant}>{children}</span>
  ),
  Modal: ({ open, onClose, title, description, children, size }: any) => {
    if (!open) return null
    return (
      <div data-testid="modal" role="dialog">
        <div data-testid="modal-title">{title}</div>
        {description && <div data-testid="modal-description">{description}</div>}
        {children}
      </div>
    )
  },
  Input: ({ label, value, onChange, placeholder, type, autoFocus }: any) => (
    <div>
      <label>{label}</label>
      <input value={value} onChange={onChange} placeholder={placeholder} type={type} autoFocus={autoFocus} />
    </div>
  ),
  Select: ({ label, value, onChange, options }: any) => (
    <div>
      <label>{label}</label>
      <select value={value} onChange={onChange}>
        {options?.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  ),
}))

const stableT = ((key: string, params?: Record<string, unknown>) => {
  if (params) return `${key}:${JSON.stringify(params)}`
  return key
}) as any
stableT.has = () => true
jest.mock('next-intl', () => ({
  useTranslations: () => stableT,
}))
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn(), back: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/equipo',
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
import { fetchTeamMembers, inviteTeamMember, updateMemberRole, deactivateMember } from '@/lib/api'

const mockUseOrg = useOrg as jest.Mock
const mockFetchTeam = fetchTeamMembers as jest.Mock
const mockInvite = inviteTeamMember as jest.Mock
const mockUpdateRole = updateMemberRole as jest.Mock
const mockDeactivate = deactivateMember as jest.Mock

import EquipoPage from '@/app/dashboard/equipo/page'

// ---- Factories ----

function makeMember(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: overrides.id ?? 'mem-1',
    user_id: overrides.user_id ?? 'usr-1',
    role: overrides.role ?? 'ADMIN',
    is_active: overrides.is_active ?? true,
    created_at: '2026-01-01T00:00:00Z',
    email: overrides.email ?? 'ana@clinic.com',
    full_name: overrides.full_name ?? 'Ana Garcia',
  }
}

// ---- Setup ----

beforeEach(() => {
  jest.clearAllMocks()
  mockUseOrg.mockReturnValue({ orgId: 'org-1', branchId: null, orgName: 'Test Clinic', plan: 'PRO', role: 'OWNER' })
  mockToast.success.mockClear()
  mockToast.error.mockClear()
})

// ---- Tests ----

describe('EquipoPage', () => {
  // 1. Loading skeleton
  it('renders loading skeleton while fetching team members', () => {
    mockFetchTeam.mockReturnValue(new Promise(() => {}))
    render(<EquipoPage />)
    const pulseElements = document.querySelectorAll('.animate-pulse')
    expect(pulseElements.length).toBeGreaterThanOrEqual(3)
  })

  // 2. Team members list renders
  it('renders active team members with names and emails', async () => {
    mockFetchTeam.mockResolvedValue([
      makeMember({ id: 'm-1', full_name: 'Ana Garcia', email: 'ana@clinic.com', role: 'OWNER' }),
      makeMember({ id: 'm-2', full_name: 'Carlos Ruiz', email: 'carlos@clinic.com', role: 'ADMIN' }),
    ])
    render(<EquipoPage />)
    await waitFor(() => {
      expect(screen.getByText('Ana Garcia')).toBeInTheDocument()
      expect(screen.getByText('ana@clinic.com')).toBeInTheDocument()
      expect(screen.getByText('Carlos Ruiz')).toBeInTheDocument()
      expect(screen.getByText('carlos@clinic.com')).toBeInTheDocument()
    })
  })

  // 3. Role badges render
  it('renders role badges for each member', async () => {
    mockFetchTeam.mockResolvedValue([
      makeMember({ id: 'm-1', role: 'OWNER' }),
      makeMember({ id: 'm-2', full_name: 'Carlos', email: 'c@c.com', role: 'ADMIN' }),
      makeMember({ id: 'm-3', full_name: 'Maria', email: 'm@c.com', role: 'STAFF' }),
    ])
    render(<EquipoPage />)
    await waitFor(() => {
      expect(screen.getByTestId('badge-purple')).toBeInTheDocument()
      expect(screen.getByTestId('badge-info')).toBeInTheDocument()
      expect(screen.getByTestId('badge-neutral')).toBeInTheDocument()
    })
  })

  // 4. RBAC info banner
  it('renders RBAC information banner', async () => {
    mockFetchTeam.mockResolvedValue([makeMember()])
    render(<EquipoPage />)
    await waitFor(() => {
      expect(screen.getByText(/roles\.OWNER/)).toBeInTheDocument()
    })
  })

  // 5. Active member count in subtitle
  it('displays active member count in subtitle', async () => {
    mockFetchTeam.mockResolvedValue([
      makeMember({ id: 'm-1' }),
      makeMember({ id: 'm-2', full_name: 'Carlos', email: 'c@c.com' }),
    ])
    render(<EquipoPage />)
    await waitFor(() => {
      expect(screen.getByText(/2/)).toBeInTheDocument()
    })
  })

  // 6. Invite button visible for OWNER
  it('shows invite button when user is OWNER', async () => {
    mockFetchTeam.mockResolvedValue([makeMember()])
    render(<EquipoPage />)
    await waitFor(() => {
      expect(screen.getByText('inviteMember')).toBeInTheDocument()
    })
  })

  // 7. Invite button visible for ADMIN
  it('shows invite button when user is ADMIN', async () => {
    mockUseOrg.mockReturnValue({ orgId: 'org-1', branchId: null, orgName: 'Test', plan: 'PRO', role: 'ADMIN' })
    mockFetchTeam.mockResolvedValue([makeMember()])
    render(<EquipoPage />)
    await waitFor(() => {
      expect(screen.getByText('inviteMember')).toBeInTheDocument()
    })
  })

  // 8. Invite button hidden for STAFF
  it('hides invite button when user is STAFF', async () => {
    mockUseOrg.mockReturnValue({ orgId: 'org-1', branchId: null, orgName: 'Test', plan: 'PRO', role: 'STAFF' })
    mockFetchTeam.mockResolvedValue([makeMember()])
    render(<EquipoPage />)
    await waitFor(() => expect(screen.getByText('Ana Garcia')).toBeInTheDocument())
    expect(screen.queryByText('inviteMember')).not.toBeInTheDocument()
  })

  // 9. Invite modal opens
  it('opens invite modal on invite button click', async () => {
    const user = userEvent.setup()
    mockFetchTeam.mockResolvedValue([makeMember()])
    render(<EquipoPage />)
    await waitFor(() => expect(screen.getByText('inviteMember')).toBeInTheDocument())

    await user.click(screen.getByText('inviteMember'))
    await waitFor(() => {
      expect(screen.getByTestId('modal')).toBeInTheDocument()
      expect(screen.getByTestId('modal-title')).toHaveTextContent('inviteTitle')
    })
  })

  // 10. Invite modal — email input and role select
  it('renders email input and role select in invite modal', async () => {
    const user = userEvent.setup()
    mockFetchTeam.mockResolvedValue([makeMember()])
    render(<EquipoPage />)
    await waitFor(() => expect(screen.getByText('inviteMember')).toBeInTheDocument())

    await user.click(screen.getByText('inviteMember'))
    await waitFor(() => {
      expect(screen.getByPlaceholderText('nombre@clinica.com')).toBeInTheDocument()
      expect(screen.getByText('email')).toBeInTheDocument()
      expect(screen.getByText('role')).toBeInTheDocument()
    })
  })

  // 11. Invite modal — OWNER not in role options
  it('does not show OWNER in invite role options', async () => {
    const user = userEvent.setup()
    mockFetchTeam.mockResolvedValue([makeMember()])
    render(<EquipoPage />)
    await waitFor(() => expect(screen.getByText('inviteMember')).toBeInTheDocument())

    await user.click(screen.getByText('inviteMember'))
    await waitFor(() => expect(screen.getByTestId('modal')).toBeInTheDocument())

    const options = screen.getAllByRole('option')
    const values = options.map(o => (o as HTMLOptionElement).value)
    expect(values).not.toContain('OWNER')
    expect(values).toContain('ADMIN')
    expect(values).toContain('STAFF')
  })

  // 12. Invite — successful submission
  it('sends invitation and shows success toast', async () => {
    const user = userEvent.setup()
    mockFetchTeam.mockResolvedValue([makeMember()])
    mockInvite.mockResolvedValue({ success: true })
    render(<EquipoPage />)
    await waitFor(() => expect(screen.getByText('inviteMember')).toBeInTheDocument())

    await user.click(screen.getByText('inviteMember'))
    await waitFor(() => expect(screen.getByTestId('modal')).toBeInTheDocument())

    await user.type(screen.getByPlaceholderText('nombre@clinica.com'), 'new@clinic.com')
    await user.click(screen.getByText('sendInvitation'))

    await waitFor(() => {
      expect(mockInvite).toHaveBeenCalledWith('org-1', 'new@clinic.com', 'STAFF')
      expect(mockToast.success).toHaveBeenCalledWith('inviteSent')
    })
  })

  // 13. Invite — error
  it('shows error toast when invitation fails', async () => {
    const user = userEvent.setup()
    mockFetchTeam.mockResolvedValue([makeMember()])
    mockInvite.mockResolvedValue({ success: false, message: 'Email already exists' })
    render(<EquipoPage />)
    await waitFor(() => expect(screen.getByText('inviteMember')).toBeInTheDocument())

    await user.click(screen.getByText('inviteMember'))
    await waitFor(() => expect(screen.getByTestId('modal')).toBeInTheDocument())

    await user.type(screen.getByPlaceholderText('nombre@clinica.com'), 'existing@clinic.com')
    await user.click(screen.getByText('sendInvitation'))

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Email already exists')
    })
  })

  // 14. Invite — disabled when email empty
  it('disables send invitation button when email is empty', async () => {
    const user = userEvent.setup()
    mockFetchTeam.mockResolvedValue([makeMember()])
    render(<EquipoPage />)
    await waitFor(() => expect(screen.getByText('inviteMember')).toBeInTheDocument())

    await user.click(screen.getByText('inviteMember'))
    await waitFor(() => {
      const sendBtn = screen.getByText('sendInvitation')
      expect(sendBtn).toBeDisabled()
    })
  })

  // 15. Invite modal — cancel closes
  it('closes invite modal when cancel clicked', async () => {
    const user = userEvent.setup()
    mockFetchTeam.mockResolvedValue([makeMember()])
    render(<EquipoPage />)
    await waitFor(() => expect(screen.getByText('inviteMember')).toBeInTheDocument())

    await user.click(screen.getByText('inviteMember'))
    await waitFor(() => expect(screen.getByTestId('modal')).toBeInTheDocument())

    await user.click(screen.getByText('cancel'))
    await waitFor(() => {
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
    })
  })

  // 16. Context menu visible for non-OWNER members
  it('shows context menu button for non-OWNER members when user is OWNER', async () => {
    mockFetchTeam.mockResolvedValue([
      makeMember({ id: 'm-1', role: 'OWNER', full_name: 'Owner User' }),
      makeMember({ id: 'm-2', role: 'ADMIN', full_name: 'Admin User', email: 'admin@c.com' }),
    ])
    render(<EquipoPage />)
    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument()
    })
    // MoreVertical icon button should be present for ADMIN member
    const moreButtons = screen.getAllByTestId('icon-MoreVertical')
    expect(moreButtons.length).toBe(1) // Only for ADMIN, not OWNER
  })

  // 17. Context menu NOT visible for OWNER member
  it('does not show context menu for OWNER member', async () => {
    mockFetchTeam.mockResolvedValue([
      makeMember({ id: 'm-1', role: 'OWNER', full_name: 'Owner User' }),
    ])
    render(<EquipoPage />)
    await waitFor(() => expect(screen.getByText('Owner User')).toBeInTheDocument())
    expect(screen.queryByTestId('icon-MoreVertical')).not.toBeInTheDocument()
  })

  // 18. Role change via context menu
  it('changes member role via context menu', async () => {
    const user = userEvent.setup()
    mockFetchTeam.mockResolvedValue([
      makeMember({ id: 'm-1', role: 'OWNER', full_name: 'Owner User' }),
      makeMember({ id: 'm-2', role: 'ADMIN', full_name: 'Admin User', email: 'admin@c.com' }),
    ])
    mockUpdateRole.mockResolvedValue({})
    render(<EquipoPage />)
    await waitFor(() => expect(screen.getByText('Admin User')).toBeInTheDocument())

    // Open context menu
    const moreBtn = screen.getByTestId('icon-MoreVertical').closest('button')!
    await user.click(moreBtn)

    // Should see role change option (STAFF, since ADMIN is current and OWNER excluded)
    await waitFor(() => {
      expect(screen.getByText(/changeTo/)).toBeInTheDocument()
    })
    await user.click(screen.getByText(/changeTo/))

    await waitFor(() => {
      expect(mockUpdateRole).toHaveBeenCalledWith('org-1', 'm-2', 'STAFF')
      expect(mockToast.success).toHaveBeenCalledWith('roleUpdated')
    })
  })

  // 19. Deactivate member — opens confirm modal
  it('opens deactivate confirmation modal', async () => {
    const user = userEvent.setup()
    mockFetchTeam.mockResolvedValue([
      makeMember({ id: 'm-1', role: 'OWNER', full_name: 'Owner' }),
      makeMember({ id: 'm-2', role: 'STAFF', full_name: 'Staff User', email: 's@c.com' }),
    ])
    render(<EquipoPage />)
    await waitFor(() => expect(screen.getByText('Staff User')).toBeInTheDocument())

    const moreBtn = screen.getByTestId('icon-MoreVertical').closest('button')!
    await user.click(moreBtn)

    await waitFor(() => {
      expect(screen.getByText('deactivate')).toBeInTheDocument()
    })
    await user.click(screen.getByText('deactivate'))

    await waitFor(() => {
      // The deactivate confirmation modal should show
      const modals = screen.getAllByTestId('modal')
      expect(modals.length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('confirmDeactivate')).toBeInTheDocument()
    })
  })

  // 20. Deactivate member — confirm
  it('deactivates member on confirmation', async () => {
    const user = userEvent.setup()
    mockFetchTeam.mockResolvedValue([
      makeMember({ id: 'm-1', role: 'OWNER', full_name: 'Owner' }),
      makeMember({ id: 'm-2', role: 'STAFF', full_name: 'Staff User', email: 's@c.com' }),
    ])
    mockDeactivate.mockResolvedValue({})
    render(<EquipoPage />)
    await waitFor(() => expect(screen.getByText('Staff User')).toBeInTheDocument())

    const moreBtn = screen.getByTestId('icon-MoreVertical').closest('button')!
    await user.click(moreBtn)
    await waitFor(() => expect(screen.getByText('deactivate')).toBeInTheDocument())
    await user.click(screen.getByText('deactivate'))
    await waitFor(() => expect(screen.getByText('confirmDeactivate')).toBeInTheDocument())

    // Click the deactivate button in the confirmation modal
    // There are multiple "deactivate" texts — find the one in the modal
    const deactivateButtons = screen.getAllByText('deactivate')
    const confirmBtn = deactivateButtons[deactivateButtons.length - 1]
    await user.click(confirmBtn)

    await waitFor(() => {
      expect(mockDeactivate).toHaveBeenCalledWith('org-1', 'm-2')
      expect(mockToast.success).toHaveBeenCalledWith('memberDeactivated')
    })
  })

  // 21. Inactive members section
  it('renders inactive members section separately', async () => {
    mockFetchTeam.mockResolvedValue([
      makeMember({ id: 'm-1', full_name: 'Active User' }),
      makeMember({ id: 'm-2', full_name: 'Inactive User', email: 'i@c.com', is_active: false }),
    ])
    render(<EquipoPage />)
    await waitFor(() => {
      expect(screen.getByText('Active User')).toBeInTheDocument()
      expect(screen.getByText('Inactive User')).toBeInTheDocument()
      expect(screen.getByText('inactiveMembers')).toBeInTheDocument()
    })
  })

  // 22. Empty state — no active members
  it('shows empty state when no active members', async () => {
    mockFetchTeam.mockResolvedValue([])
    render(<EquipoPage />)
    await waitFor(() => {
      expect(screen.getByText('noMembers')).toBeInTheDocument()
    })
  })

  // 23. Error state — load failure
  it('shows error toast when loading fails', async () => {
    mockFetchTeam.mockRejectedValue(new Error('Network error'))
    render(<EquipoPage />)
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('loadError')
    })
  })

  // 24. Refresh button
  it('re-fetches team on refresh click', async () => {
    const user = userEvent.setup()
    mockFetchTeam.mockResolvedValue([makeMember()])
    render(<EquipoPage />)
    await waitFor(() => expect(screen.getByText('Ana Garcia')).toBeInTheDocument())

    await user.click(screen.getByLabelText('refresh'))
    await waitFor(() => {
      expect(mockFetchTeam).toHaveBeenCalledTimes(2)
    })
  })

  // 25. Member avatar initial
  it('shows first letter of name as avatar initial', async () => {
    mockFetchTeam.mockResolvedValue([makeMember({ full_name: 'Ana Garcia' })])
    render(<EquipoPage />)
    await waitFor(() => {
      // The avatar shows the first letter uppercased
      expect(screen.getByText('A')).toBeInTheDocument()
    })
  })

  // 26. Member without name shows email or user_id
  it('shows email when full_name is not available', async () => {
    mockFetchTeam.mockResolvedValue([makeMember({ full_name: undefined, email: 'user@clinic.com', user_id: 'usr-abc12345' })])
    render(<EquipoPage />)
    await waitFor(() => {
      // Should show email as fallback for name
      expect(screen.getByText('user@clinic.com')).toBeInTheDocument()
    })
  })

  // 27. Context menu hidden for STAFF users
  it('hides context menus when user is STAFF role', async () => {
    mockUseOrg.mockReturnValue({ orgId: 'org-1', branchId: null, orgName: 'Test', plan: 'PRO', role: 'STAFF' })
    mockFetchTeam.mockResolvedValue([
      makeMember({ id: 'm-1', role: 'OWNER', full_name: 'Owner' }),
      makeMember({ id: 'm-2', role: 'ADMIN', full_name: 'Admin', email: 'a@c.com' }),
    ])
    render(<EquipoPage />)
    await waitFor(() => expect(screen.getByText('Admin')).toBeInTheDocument())
    expect(screen.queryByTestId('icon-MoreVertical')).not.toBeInTheDocument()
  })

  // 28. Page header title
  it('renders page header with title', async () => {
    mockFetchTeam.mockResolvedValue([])
    render(<EquipoPage />)
    await waitFor(() => {
      expect(screen.getByText('title')).toBeInTheDocument()
    })
  })

  // 29. Deactivate confirmation modal — cancel
  it('closes deactivation modal when cancel clicked', async () => {
    const user = userEvent.setup()
    mockFetchTeam.mockResolvedValue([
      makeMember({ id: 'm-1', role: 'OWNER', full_name: 'Owner' }),
      makeMember({ id: 'm-2', role: 'STAFF', full_name: 'Staff User', email: 's@c.com' }),
    ])
    render(<EquipoPage />)
    await waitFor(() => expect(screen.getByText('Staff User')).toBeInTheDocument())

    const moreBtn = screen.getByTestId('icon-MoreVertical').closest('button')!
    await user.click(moreBtn)
    await waitFor(() => expect(screen.getByText('deactivate')).toBeInTheDocument())
    await user.click(screen.getByText('deactivate'))
    await waitFor(() => expect(screen.getByText('confirmDeactivate')).toBeInTheDocument())

    // Click cancel in deactivation confirmation
    await user.click(screen.getByText('cancel'))
    await waitFor(() => {
      expect(mockDeactivate).not.toHaveBeenCalled()
    })
  })

  // 30. Invite reloads member list on success
  it('reloads member list after successful invite', async () => {
    const user = userEvent.setup()
    mockFetchTeam.mockResolvedValue([makeMember()])
    mockInvite.mockResolvedValue({ success: true })
    render(<EquipoPage />)
    await waitFor(() => expect(screen.getByText('inviteMember')).toBeInTheDocument())

    await user.click(screen.getByText('inviteMember'))
    await waitFor(() => expect(screen.getByTestId('modal')).toBeInTheDocument())

    await user.type(screen.getByPlaceholderText('nombre@clinica.com'), 'new@clinic.com')
    await user.click(screen.getByText('sendInvitation'))

    await waitFor(() => {
      // Initial load + reload after invite
      expect(mockFetchTeam).toHaveBeenCalledTimes(2)
    })
  })
})
