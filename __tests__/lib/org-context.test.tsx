// __tests__/lib/org-context.test.tsx

import React from 'react'
import { render, screen } from '@testing-library/react'
import { OrgContext, useOrg, canEditOrg, canCreateRecords, canMakeOutboundCalls } from '@/lib/org-context'
import type { OrgContextValue } from '@/lib/org-context'

const mockValue: OrgContextValue = {
  user: { id: 'u-1', email: 'doc@clinica.com' } as OrgContextValue['user'],
  org: { id: 'org-1', name: 'Clinica Bella' } as OrgContextValue['org'],
  orgId: 'org-1',
  role: 'OWNER',
  branches: [],
  branchId: null,
  setBranchId: jest.fn(),
}

function TestConsumer() {
  const ctx = useOrg()
  return <div data-testid="org-id">{ctx.orgId}</div>
}

describe('OrgContext', () => {
  it('provides org context to children', () => {
    render(
      <OrgContext.Provider value={mockValue}>
        <TestConsumer />
      </OrgContext.Provider>
    )
    expect(screen.getByTestId('org-id').textContent).toBe('org-1')
  })

  it('throws when useOrg is called outside provider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<TestConsumer />)).toThrow('useOrg must be used within OrgContext.Provider')
    spy.mockRestore()
  })

  it('provides role', () => {
    function RoleConsumer() {
      const ctx = useOrg()
      return <div data-testid="role">{ctx.role}</div>
    }
    render(
      <OrgContext.Provider value={mockValue}>
        <RoleConsumer />
      </OrgContext.Provider>
    )
    expect(screen.getByTestId('role').textContent).toBe('OWNER')
  })

  it('provides branches', () => {
    function BranchConsumer() {
      const ctx = useOrg()
      return <div data-testid="branches">{ctx.branches.length}</div>
    }
    render(
      <OrgContext.Provider value={{ ...mockValue, branches: [{ id: 'b1' } as OrgContextValue['branches'][0]] }}>
        <BranchConsumer />
      </OrgContext.Provider>
    )
    expect(screen.getByTestId('branches').textContent).toBe('1')
  })
})

describe('canEditOrg', () => {
  it('returns true for OWNER', () => expect(canEditOrg('OWNER')).toBe(true))
  it('returns true for ADMIN', () => expect(canEditOrg('ADMIN')).toBe(true))
  it('returns false for STAFF', () => expect(canEditOrg('STAFF')).toBe(false))
})

describe('canCreateRecords', () => {
  it('returns true for OWNER', () => expect(canCreateRecords('OWNER')).toBe(true))
  it('returns true for ADMIN', () => expect(canCreateRecords('ADMIN')).toBe(true))
  it('returns true for STAFF', () => expect(canCreateRecords('STAFF')).toBe(true))
})

describe('canMakeOutboundCalls', () => {
  it('returns true for OWNER', () => expect(canMakeOutboundCalls('OWNER')).toBe(true))
  it('returns true for ADMIN', () => expect(canMakeOutboundCalls('ADMIN')).toBe(true))
  it('returns false for STAFF', () => expect(canMakeOutboundCalls('STAFF')).toBe(false))
})
