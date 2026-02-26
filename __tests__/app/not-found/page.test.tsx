import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import NotFound from '@/app/not-found'

describe('NotFound (404 page)', () => {
  it('renders 404 heading', () => {
    render(<NotFound />)
    expect(screen.getByText('404')).toBeInTheDocument()
  })

  it('renders descriptive text', () => {
    render(<NotFound />)
    expect(screen.getByText('Pagina no encontrada')).toBeInTheDocument()
    expect(screen.getByText(/La pagina que buscas no existe/)).toBeInTheDocument()
  })

  it('renders dashboard link', () => {
    render(<NotFound />)
    const dashboardLink = screen.getByText('Ir al Dashboard')
    expect(dashboardLink).toBeInTheDocument()
    expect(dashboardLink.closest('a')).toHaveAttribute('href', '/dashboard')
  })

  it('renders home link', () => {
    render(<NotFound />)
    const homeLink = screen.getByText('Inicio')
    expect(homeLink).toBeInTheDocument()
    expect(homeLink.closest('a')).toHaveAttribute('href', '/')
  })

  it('renders brand footer', () => {
    render(<NotFound />)
    expect(screen.getByText(/SofIA by Ataraxia IA Labs/)).toBeInTheDocument()
  })
})
