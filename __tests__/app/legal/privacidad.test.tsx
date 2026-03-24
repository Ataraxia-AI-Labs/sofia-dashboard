// __tests__/app/legal/privacidad.test.tsx
// Tests for the Privacy Policy page (app/legal/privacidad/page.tsx)

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

import PrivacidadPage from '@/app/legal/privacidad/page'

describe('PrivacidadPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the main heading "Politica de Privacidad"', () => {
    render(<PrivacidadPage />)
    expect(screen.getByText('Politica de Privacidad')).toBeInTheDocument()
  })

  it('renders legal badge', () => {
    render(<PrivacidadPage />)
    expect(screen.getByText('Legal')).toBeInTheDocument()
  })

  it('renders Habeas Data Colombia reference', () => {
    render(<PrivacidadPage />)
    const matches = screen.getAllByText(/Ley 1581 de 2012/)
    expect(matches.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/HABEAS DATA Colombia/)).toBeInTheDocument()
  })

  it('renders last update date', () => {
    render(<PrivacidadPage />)
    expect(screen.getByText(/Ultima actualizacion.*febrero de 2026/)).toBeInTheDocument()
  })

  it('renders all 10 section headings', () => {
    render(<PrivacidadPage />)
    const sections = [
      '1. Responsable del Tratamiento',
      '2. Datos que Recopilamos',
      '3. Finalidad del Tratamiento',
      '4. Base Legal del Tratamiento',
      '5. Seguridad de los Datos',
      '6. Derechos del Titular',
      '7. Retencion de Datos',
      '8. Transferencia Internacional',
      '9. Cambios a esta Politica',
      '10. Contacto',
    ]
    sections.forEach(section => {
      expect(screen.getByText(section)).toBeInTheDocument()
    })
  })

  it('renders SofIA nav brand link', () => {
    render(<PrivacidadPage />)
    const navLinks = screen.getAllByText('SofIA')
    expect(navLinks[0].closest('a')).toHaveAttribute('href', '/')
  })

  it('renders "Volver" navigation link', () => {
    render(<PrivacidadPage />)
    expect(screen.getByText('Volver').closest('a')).toHaveAttribute('href', '/')
  })

  it('renders "Volver al inicio" footer link', () => {
    render(<PrivacidadPage />)
    expect(screen.getByText('Volver al inicio').closest('a')).toHaveAttribute('href', '/')
  })

  it('renders the Shield icon', () => {
    render(<PrivacidadPage />)
    expect(screen.getByTestId('icon-Shield')).toBeInTheDocument()
  })

  it('renders the ArrowLeft icon for back navigation', () => {
    render(<PrivacidadPage />)
    expect(screen.getByTestId('icon-ArrowLeft')).toBeInTheDocument()
  })

  it('renders Ataraxia IA Labs as responsible entity', () => {
    render(<PrivacidadPage />)
    expect(screen.getByText(/Ataraxia IA Labs/)).toBeInTheDocument()
  })

  it('renders privacy contact email', () => {
    render(<PrivacidadPage />)
    const emails = screen.getAllByText('privacidad@ataraxiaialabs.ai')
    expect(emails.length).toBeGreaterThanOrEqual(1)
  })

  it('renders clinic data items in section 2', () => {
    render(<PrivacidadPage />)
    expect(screen.getByText(/Nombre del representante legal/)).toBeInTheDocument()
    expect(screen.getByText(/Credenciales de autenticacion/)).toBeInTheDocument()
  })

  it('renders patient data items in section 2', () => {
    render(<PrivacidadPage />)
    expect(screen.getByText(/Nombre, numero de telefono/)).toBeInTheDocument()
    expect(screen.getByText(/Historial de conversaciones/)).toBeInTheDocument()
  })

  it('renders security measures in section 5', () => {
    render(<PrivacidadPage />)
    expect(screen.getByText(/Cifrado en transito.*TLS 1.3/)).toBeInTheDocument()
    expect(screen.getByText(/Row Level Security/)).toBeInTheDocument()
  })

  it('renders user rights in section 6', () => {
    render(<PrivacidadPage />)
    expect(screen.getByText(/Conocer, actualizar y rectificar/)).toBeInTheDocument()
    expect(screen.getByText(/Revocar la autorizacion/)).toBeInTheDocument()
  })

  it('renders SIC reference in section 10', () => {
    render(<PrivacidadPage />)
    const matches = screen.getAllByText(/Superintendencia de Industria y Comercio/)
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it('has correct page structure with min-h-screen', () => {
    const { container } = render(<PrivacidadPage />)
    expect(container.firstChild).toHaveClass('min-h-screen')
  })
})
