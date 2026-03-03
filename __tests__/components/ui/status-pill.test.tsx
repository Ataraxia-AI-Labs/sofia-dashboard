import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { StatusPill } from '@/components/ui/status-pill'

describe('StatusPill', () => {
  it('renders label and value', () => {
    render(<StatusPill label="Conversion" value="42%" color="success" />)
    expect(screen.getByText('Conversion')).toBeInTheDocument()
    expect(screen.getByText('42%')).toBeInTheDocument()
  })

  it('applies success color classes', () => {
    const { container } = render(<StatusPill label="OK" value="95%" color="success" />)
    const pill = container.firstChild as HTMLElement
    expect(pill.className).toContain('bg-status-success')
  })

  it('applies danger color classes', () => {
    const { container } = render(<StatusPill label="Cancel" value="8%" color="danger" />)
    const pill = container.firstChild as HTMLElement
    expect(pill.className).toContain('bg-status-danger')
  })

  it('applies warning color classes', () => {
    const { container } = render(<StatusPill label="No-Show" value="5%" color="warning" />)
    const pill = container.firstChild as HTMLElement
    expect(pill.className).toContain('bg-status-warning')
  })

  it('renders the color dot indicator', () => {
    const { container } = render(<StatusPill label="Test" value="1%" color="success" />)
    const dot = container.querySelector('.rounded-full')
    expect(dot).toBeTruthy()
  })
})
