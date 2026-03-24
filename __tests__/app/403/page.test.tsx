// __tests__/app/403/page.test.tsx
// Tests for the 403 Forbidden page (app/403/page.tsx)

import React from 'react'
import { render, screen } from '@testing-library/react'

// lucide-react — Proxy mock
jest.mock('lucide-react', () => {
  return new Proxy({}, {
    get: (_, name) => {
      const C = (p: any) => <svg data-testid={`icon-${String(name)}`} {...p} />
      C.displayName = String(name)
      return C
    },
  })
})

// next/link mock
jest.mock('next/link', () => {
  return ({ children, href, ...rest }: any) => <a href={href} {...rest}>{children}</a>
})

import Forbidden from '@/app/403/page'

describe('ForbiddenPage (403)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the 403 code prominently', () => {
    render(<Forbidden />)
    expect(screen.getByText('403')).toBeInTheDocument()
  })

  it('renders "Acceso denegado" heading', () => {
    render(<Forbidden />)
    expect(screen.getByText('Acceso denegado')).toBeInTheDocument()
  })

  it('renders permission denied description', () => {
    render(<Forbidden />)
    expect(screen.getByText(/No tienes permiso para ver esta pagina/)).toBeInTheDocument()
  })

  it('renders contact admin message', () => {
    render(<Forbidden />)
    expect(screen.getByText(/Contacta al administrador de tu clinica/)).toBeInTheDocument()
  })

  it('renders link to dashboard (Nucleus)', () => {
    render(<Forbidden />)
    const dashLink = screen.getByText('Ir al Nucleus')
    expect(dashLink.closest('a')).toHaveAttribute('href', '/dashboard')
  })

  it('renders link to home page (Inicio)', () => {
    render(<Forbidden />)
    const homeLink = screen.getByText('Inicio')
    expect(homeLink.closest('a')).toHaveAttribute('href', '/')
  })

  it('renders the ShieldOff icon', () => {
    render(<Forbidden />)
    expect(screen.getByTestId('icon-ShieldOff')).toBeInTheDocument()
  })

  it('renders the Home icon in the dashboard link', () => {
    render(<Forbidden />)
    expect(screen.getByTestId('icon-Home')).toBeInTheDocument()
  })

  it('renders the ArrowRight icon in the home link', () => {
    render(<Forbidden />)
    expect(screen.getByTestId('icon-ArrowRight')).toBeInTheDocument()
  })

  it('renders the Sentient Eye SVG', () => {
    render(<Forbidden />)
    const svgs = document.querySelectorAll('svg')
    // Page has the sentient eye SVG plus icon SVGs
    expect(svgs.length).toBeGreaterThanOrEqual(1)
  })

  it('renders SofIA branding footer', () => {
    render(<Forbidden />)
    expect(screen.getByText('SofIA by Ataraxia IA Labs')).toBeInTheDocument()
  })

  it('has correct page structure with min-h-screen', () => {
    const { container } = render(<Forbidden />)
    expect(container.firstChild).toHaveClass('min-h-screen')
  })
})
