// __tests__/lib/role-permissions.test.ts
// ---------------------------------------------------------------------------
// Tests for lib/role-permissions.ts
// ---------------------------------------------------------------------------

import { canAccessRoute, filterNavByRole, ROUTE_PERMISSIONS } from '@/lib/role-permissions'
import type { OrgRole } from '@/lib/org-context'

// ---------------------------------------------------------------------------
// canAccessRoute
// ---------------------------------------------------------------------------

describe('canAccessRoute', () => {
  // -------------------------------------------------------------------------
  // Routes accessible to all roles
  // -------------------------------------------------------------------------

  const publicRoutes = [
    '/dashboard',
    '/dashboard/conversaciones',
    '/dashboard/pacientes',
    '/dashboard/calendario',
  ]

  it.each(publicRoutes)(
    'should allow STAFF to access %s',
    (route) => {
      expect(canAccessRoute('STAFF', route)).toBe(true)
    }
  )

  it.each(publicRoutes)(
    'should allow ADMIN to access %s',
    (route) => {
      expect(canAccessRoute('ADMIN', route)).toBe(true)
    }
  )

  it.each(publicRoutes)(
    'should allow OWNER to access %s',
    (route) => {
      expect(canAccessRoute('OWNER', route)).toBe(true)
    }
  )

  // -------------------------------------------------------------------------
  // Routes restricted to OWNER and ADMIN only
  // -------------------------------------------------------------------------

  const adminRoutes = [
    '/dashboard/pipeline',
    '/dashboard/oportunidades',
    '/dashboard/pagos',
    '/dashboard/equipo',
    '/dashboard/datalake',
    '/dashboard/health',
    '/dashboard/ajustes',
  ]

  it.each(adminRoutes)(
    'should deny STAFF access to %s',
    (route) => {
      expect(canAccessRoute('STAFF', route)).toBe(false)
    }
  )

  it.each(adminRoutes)(
    'should allow ADMIN access to %s',
    (route) => {
      expect(canAccessRoute('ADMIN', route)).toBe(true)
    }
  )

  it.each(adminRoutes)(
    'should allow OWNER access to %s',
    (route) => {
      expect(canAccessRoute('OWNER', route)).toBe(true)
    }
  )

  // -------------------------------------------------------------------------
  // Routes restricted to OWNER only
  // -------------------------------------------------------------------------

  const ownerRoutes = ['/dashboard/planes', '/dashboard/facturacion']

  it.each(ownerRoutes)(
    'should deny STAFF access to %s',
    (route) => {
      expect(canAccessRoute('STAFF', route)).toBe(false)
    }
  )

  it.each(ownerRoutes)(
    'should deny ADMIN access to %s',
    (route) => {
      expect(canAccessRoute('ADMIN', route)).toBe(false)
    }
  )

  it.each(ownerRoutes)(
    'should allow OWNER access to %s',
    (route) => {
      expect(canAccessRoute('OWNER', route)).toBe(true)
    }
  )

  // -------------------------------------------------------------------------
  // Sub-route inheritance
  // -------------------------------------------------------------------------

  it('should deny STAFF access to sub-routes of restricted routes', () => {
    expect(canAccessRoute('STAFF', '/dashboard/equipo/123')).toBe(false)
    expect(canAccessRoute('STAFF', '/dashboard/pagos/facturas')).toBe(false)
  })

  it('should allow OWNER access to sub-routes of restricted routes', () => {
    expect(canAccessRoute('OWNER', '/dashboard/equipo/123')).toBe(true)
    expect(canAccessRoute('OWNER', '/dashboard/planes/checkout')).toBe(true)
  })

  it('should NOT treat /dashboard as prefix for sub-routes', () => {
    // /dashboard exact match should not block /dashboard/pipeline for OWNER
    expect(canAccessRoute('OWNER', '/dashboard/pipeline')).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Unknown / unlisted routes
  // -------------------------------------------------------------------------

  it('should allow access to routes not listed in ROUTE_PERMISSIONS', () => {
    expect(canAccessRoute('STAFF', '/dashboard/unknown-feature')).toBe(true)
    expect(canAccessRoute('STAFF', '/some-other-page')).toBe(true)
  })

  // -------------------------------------------------------------------------
  // All roles exhaustive check
  // -------------------------------------------------------------------------

  const allRoles: OrgRole[] = ['OWNER', 'ADMIN', 'STAFF']

  it('should return a boolean for every combination of role and route', () => {
    const routes = Object.keys(ROUTE_PERMISSIONS)
    for (const role of allRoles) {
      for (const route of routes) {
        expect(typeof canAccessRoute(role, route)).toBe('boolean')
      }
    }
  })
})

// ---------------------------------------------------------------------------
// filterNavByRole
// ---------------------------------------------------------------------------

describe('filterNavByRole', () => {
  const navItems = [
    { href: '/dashboard', label: 'Overview' },
    { href: '/dashboard/pacientes', label: 'Patients' },
    { href: '/dashboard/pipeline', label: 'Pipeline' },
    { href: '/dashboard/pagos', label: 'Payments' },
    { href: '/dashboard/planes', label: 'Plans' },
    { href: '/dashboard/facturacion', label: 'Billing' },
  ]

  it('should return all items for OWNER', () => {
    const filtered = filterNavByRole(navItems, 'OWNER')
    expect(filtered).toHaveLength(navItems.length)
  })

  it('should hide OWNER-only items from ADMIN', () => {
    const filtered = filterNavByRole(navItems, 'ADMIN')
    const hrefs = filtered.map((i) => i.href)
    expect(hrefs).not.toContain('/dashboard/planes')
    expect(hrefs).not.toContain('/dashboard/facturacion')
    expect(hrefs).toContain('/dashboard/pipeline')
    expect(hrefs).toContain('/dashboard/pagos')
  })

  it('should only return public items for STAFF', () => {
    const filtered = filterNavByRole(navItems, 'STAFF')
    const hrefs = filtered.map((i) => i.href)
    expect(hrefs).toContain('/dashboard')
    expect(hrefs).toContain('/dashboard/pacientes')
    expect(hrefs).not.toContain('/dashboard/pipeline')
    expect(hrefs).not.toContain('/dashboard/pagos')
    expect(hrefs).not.toContain('/dashboard/planes')
    expect(hrefs).not.toContain('/dashboard/facturacion')
  })

  it('should preserve item shape (not strip extra properties)', () => {
    const items = [
      { href: '/dashboard', label: 'Overview', icon: 'home', badge: 3 },
    ]
    const filtered = filterNavByRole(items, 'STAFF')
    expect(filtered[0]).toEqual(items[0])
  })

  it('should return an empty array when no items pass the filter', () => {
    const ownerOnlyItems = [
      { href: '/dashboard/planes', label: 'Plans' },
      { href: '/dashboard/facturacion', label: 'Billing' },
    ]
    const filtered = filterNavByRole(ownerOnlyItems, 'STAFF')
    expect(filtered).toHaveLength(0)
  })
})
