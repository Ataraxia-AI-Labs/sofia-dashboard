import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Badge } from '@/components/ui/badge'

describe('Badge', () => {
  it('renders children text', () => {
    render(<Badge>Active</Badge>)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('applies variant styles', () => {
    const { rerender } = render(<Badge variant="success">OK</Badge>)
    expect(screen.getByText('OK').className).toContain('text-status-success')

    rerender(<Badge variant="danger">Error</Badge>)
    expect(screen.getByText('Error').className).toContain('text-status-danger')

    rerender(<Badge variant="purple">Premium</Badge>)
    expect(screen.getByText('Premium').className).toContain('text-brand-purple')
  })

  it('renders dot indicator', () => {
    render(<Badge variant="success" dot>Online</Badge>)
    const badge = screen.getByText('Online')
    const dot = badge.querySelector('.rounded-full')
    expect(dot).toBeTruthy()
  })

  it('applies custom className', () => {
    render(<Badge className="my-custom-class">Custom</Badge>)
    expect(screen.getByText('Custom').className).toContain('my-custom-class')
  })
})
