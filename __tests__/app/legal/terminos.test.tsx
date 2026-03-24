// __tests__/app/legal/terminos.test.tsx
// Tests for the Terms of Service page (app/legal/terminos/page.tsx)

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

import TerminosPage from '@/app/legal/terminos/page'

describe('TerminosPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the main heading "Terminos de Servicio"', () => {
    render(<TerminosPage />)
    expect(screen.getByText('Terminos de Servicio')).toBeInTheDocument()
  })

  it('renders legal badge', () => {
    render(<TerminosPage />)
    expect(screen.getByText('Legal')).toBeInTheDocument()
  })

  it('renders last update date', () => {
    render(<TerminosPage />)
    expect(screen.getByText(/Ultima actualizacion.*febrero de 2026/)).toBeInTheDocument()
  })

  it('renders all 8 section headings', () => {
    render(<TerminosPage />)
    const sections = [
      '1. Aceptacion de los Terminos',
      '2. Descripcion del Servicio',
      '3. Uso Aceptable',
      '4. Facturacion y Cancelacion',
      '5. Garantia de Satisfaccion',
      '6. Propiedad Intelectual',
      '7. Limitacion de Responsabilidad',
      '8. Contacto',
    ]
    sections.forEach(section => {
      expect(screen.getByText(section)).toBeInTheDocument()
    })
  })

  it('renders SofIA nav brand link', () => {
    render(<TerminosPage />)
    const navLinks = screen.getAllByText('SofIA')
    expect(navLinks[0].closest('a')).toHaveAttribute('href', '/')
  })

  it('renders "Volver" navigation link', () => {
    render(<TerminosPage />)
    expect(screen.getByText('Volver').closest('a')).toHaveAttribute('href', '/')
  })

  it('renders "Volver al inicio" footer link', () => {
    render(<TerminosPage />)
    expect(screen.getByText('Volver al inicio').closest('a')).toHaveAttribute('href', '/')
  })

  it('renders the ArrowLeft icon', () => {
    render(<TerminosPage />)
    expect(screen.getByTestId('icon-ArrowLeft')).toBeInTheDocument()
  })

  it('renders service description items', () => {
    render(<TerminosPage />)
    expect(screen.getByText(/Asistente virtual por WhatsApp/)).toBeInTheDocument()
    expect(screen.getByText(/Dashboard de gestion clinica/)).toBeInTheDocument()
  })

  it('renders acceptable use audience', () => {
    render(<TerminosPage />)
    expect(screen.getByText(/Clinicas dentales y de medicina estetica/)).toBeInTheDocument()
    expect(screen.getByText(/Profesionales de salud independientes/)).toBeInTheDocument()
  })

  it('renders billing and cancellation info', () => {
    render(<TerminosPage />)
    expect(screen.getByText(/periodo de prueba gratuito de 7 dias/)).toBeInTheDocument()
    expect(screen.getByText(/Puede cancelar en cualquier momento/)).toBeInTheDocument()
  })

  it('renders satisfaction guarantee', () => {
    render(<TerminosPage />)
    expect(screen.getByText(/primeros 30 dias/)).toBeInTheDocument()
    expect(screen.getByText(/agendamiento al menos un 20%/)).toBeInTheDocument()
  })

  it('renders intellectual property section', () => {
    render(<TerminosPage />)
    expect(screen.getByText(/propiedad exclusiva de Ataraxia IA Labs/)).toBeInTheDocument()
  })

  it('renders liability limitation', () => {
    render(<TerminosPage />)
    expect(screen.getByText(/herramienta de apoyo administrativo/)).toBeInTheDocument()
    expect(screen.getByText(/No reemplaza el juicio medico profesional/)).toBeInTheDocument()
  })

  it('renders legal contact email', () => {
    render(<TerminosPage />)
    expect(screen.getByText('legal@ataraxiaialabs.ai')).toBeInTheDocument()
  })

  it('has correct page structure', () => {
    const { container } = render(<TerminosPage />)
    expect(container.firstChild).toHaveClass('min-h-screen')
  })
})
