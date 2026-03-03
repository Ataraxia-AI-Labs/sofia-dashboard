import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MetricCard } from '@/components/ui/metric-card'

describe('MetricCard', () => {
  const defaultProps = {
    icon: <span data-testid="icon">📊</span>,
    iconColor: 'from-brand-purple to-brand-purple-light',
    value: '1,234',
    label: 'Total Messages',
  }

  it('renders value and label', () => {
    render(<MetricCard {...defaultProps} />)
    expect(screen.getByText('1,234')).toBeInTheDocument()
    expect(screen.getByText('Total Messages')).toBeInTheDocument()
  })

  it('renders the icon', () => {
    render(<MetricCard {...defaultProps} />)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('renders sub text when provided', () => {
    render(<MetricCard {...defaultProps} sub="12 new" subColor="text-status-success" />)
    expect(screen.getByText('12 new')).toBeInTheDocument()
  })

  it('does not render sub text when not provided', () => {
    const { container } = render(<MetricCard {...defaultProps} />)
    const subElements = container.querySelectorAll('.text-\\[11px\\]')
    expect(subElements.length).toBe(0)
  })

  it('applies animation delay based on delay prop', () => {
    const { container } = render(<MetricCard {...defaultProps} delay={3} />)
    const card = container.firstChild as HTMLElement
    expect(card.style.animationDelay).toBe('240ms')
  })

  it('defaults delay to 0', () => {
    const { container } = render(<MetricCard {...defaultProps} />)
    const card = container.firstChild as HTMLElement
    expect(card.style.animationDelay).toBe('0ms')
  })
})
