// __tests__/app/home/page.test.tsx
// Tests for the Landing/Home page (app/page.tsx)

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock supabase BEFORE importing the component
jest.mock('@/lib/supabase')
import { supabase } from '@/lib/supabase'

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

// next/navigation
const mockReplace = jest.fn()
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, refresh: jest.fn(), back: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

// next/link mock
jest.mock('next/link', () => {
  return ({ children, href, ...rest }: any) => <a href={href} {...rest}>{children}</a>
})

const mockGetSession = supabase.auth.getSession as jest.Mock

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn()
mockIntersectionObserver.mockReturnValue({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
})
window.IntersectionObserver = mockIntersectionObserver

import LandingPage from '@/app/page'

describe('LandingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Default: no session (show landing)
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
    // Mock scroll
    window.scrollY = 0
  })

  it('shows loading state while checking auth', () => {
    mockGetSession.mockReturnValue(new Promise(() => {}))
    render(<LandingPage />)
    // Loading eye should be visible (via SVG)
    const svgs = document.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThanOrEqual(1)
  })

  it('redirects to dashboard when session exists', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'tok', user: { id: 'u1' } } },
      error: null,
    })
    render(<LandingPage />)
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('renders landing content when no session', async () => {
    render(<LandingPage />)
    await waitFor(() => {
      expect(screen.getByText(/Tu clinica llena/)).toBeInTheDocument()
    })
  })

  it('renders the main headline', async () => {
    render(<LandingPage />)
    await waitFor(() => {
      expect(screen.getByText(/Sin levantar el telefono/)).toBeInTheDocument()
    })
  })

  it('renders the subheadline about SofIA', async () => {
    render(<LandingPage />)
    await waitFor(() => {
      expect(screen.getByText(/SofIA atiende pacientes por WhatsApp/)).toBeInTheDocument()
    })
  })

  it('renders primary CTA "Prueba Gratis 7 Dias"', async () => {
    render(<LandingPage />)
    await waitFor(() => {
      expect(screen.getByText(/Prueba Gratis 7 Dias/)).toBeInTheDocument()
    })
  })

  it('CTA links to onboarding', async () => {
    render(<LandingPage />)
    await waitFor(() => {
      const cta = screen.getByText(/Prueba Gratis 7 Dias/)
      expect(cta.closest('a')).toHaveAttribute('href', '/onboarding')
    })
  })

  it('renders "Ver demo en vivo" secondary CTA', async () => {
    render(<LandingPage />)
    await waitFor(() => {
      expect(screen.getByText('Ver demo en vivo')).toBeInTheDocument()
    })
  })

  it('renders trust signals', async () => {
    render(<LandingPage />)
    await waitFor(() => {
      expect(screen.getByText('Sin tarjeta de credito')).toBeInTheDocument()
      expect(screen.getByText('Setup en 5 minutos')).toBeInTheDocument()
      expect(screen.getByText('7 dias completamente gratis')).toBeInTheDocument()
    })
  })

  it('renders SofIA brand in navigation', async () => {
    render(<LandingPage />)
    await waitFor(() => {
      const brandElements = screen.getAllByText('SofIA')
      expect(brandElements.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('renders nav links for Funciones, Demo, Testimonios, Precios', async () => {
    render(<LandingPage />)
    await waitFor(() => {
      expect(screen.getAllByText('Funciones').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Demo').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Testimonios').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Precios').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('renders "Iniciar sesion" link', async () => {
    render(<LandingPage />)
    await waitFor(() => {
      const loginLinks = screen.getAllByText('Iniciar sesion')
      expect(loginLinks.length).toBeGreaterThanOrEqual(1)
      expect(loginLinks[0].closest('a')).toHaveAttribute('href', '/login')
    })
  })

  it('renders "Prueba Gratis" nav button', async () => {
    render(<LandingPage />)
    await waitFor(() => {
      const navCta = screen.getByText('Prueba Gratis')
      expect(navCta.closest('a')).toHaveAttribute('href', '/onboarding')
    })
  })

  it('renders urgency badge about waiting list', async () => {
    render(<LandingPage />)
    await waitFor(() => {
      expect(screen.getByText(/40 clinicas en lista de espera/)).toBeInTheDocument()
    })
  })

  it('renders social proof clinic names', async () => {
    render(<LandingPage />)
    await waitFor(() => {
      expect(screen.getByText('Sonrisa Perfect')).toBeInTheDocument()
      expect(screen.getByText('OdontoVida Medellin')).toBeInTheDocument()
    })
  })

  it('renders PAS hook about lost patients', async () => {
    render(<LandingPage />)
    await waitFor(() => {
      expect(screen.getByText(/pierde pacientes que escriben despues de las 6PM/)).toBeInTheDocument()
    })
  })

  it('renders the SofIA response time claim', async () => {
    render(<LandingPage />)
    await waitFor(() => {
      const matches = screen.getAllByText(/SofIA responde en menos de 3 segundos/)
      expect(matches.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('renders mobile menu toggle button', async () => {
    render(<LandingPage />)
    await waitFor(() => {
      const menuBtn = screen.getByLabelText('Menu')
      expect(menuBtn).toBeInTheDocument()
    })
  })

  it('opens mobile menu when toggle is clicked', async () => {
    render(<LandingPage />)
    await waitFor(() => screen.getByLabelText('Menu'))
    fireEvent.click(screen.getByLabelText('Menu'))
    await waitFor(() => {
      // Mobile menu adds extra nav items — check that "Demo en vivo" appears (only in mobile)
      expect(screen.getByText('Demo en vivo')).toBeInTheDocument()
    })
  })

  it('renders animated stats section', async () => {
    render(<LandingPage />)
    await waitFor(() => {
      expect(screen.getByText(/Reduccion en citas perdidas/)).toBeInTheDocument()
      expect(screen.getByText(/Tiempo de respuesta promedio/)).toBeInTheDocument()
    })
  })

  it('renders social proof trust line', async () => {
    render(<LandingPage />)
    await waitFor(() => {
      expect(screen.getByText(/Con la confianza de clinicas lideres/)).toBeInTheDocument()
    })
  })

  it('does not render landing content during auth check', () => {
    mockGetSession.mockReturnValue(new Promise(() => {}))
    render(<LandingPage />)
    expect(screen.queryByText(/Tu clinica llena/)).not.toBeInTheDocument()
  })
})
