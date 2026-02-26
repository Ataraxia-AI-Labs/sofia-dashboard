import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Card, StatCard } from '@/components/ui/card'

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Card content</Card>)
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('applies glass-card class by default', () => {
    render(<Card>Test</Card>)
    expect(screen.getByText('Test').closest('div')?.className).toContain('glass-card')
  })

  it('applies elevated style', () => {
    render(<Card elevated>Elevated</Card>)
    expect(screen.getByText('Elevated').closest('div')?.className).toContain('glass-card-elevated')
  })

  it('applies padding variants', () => {
    const { rerender } = render(<Card padding="sm">Small</Card>)
    expect(screen.getByText('Small').closest('div')?.className).toContain('p-4')

    rerender(<Card padding="lg">Large</Card>)
    expect(screen.getByText('Large').closest('div')?.className).toContain('p-6')
  })
})

describe('StatCard', () => {
  it('renders label and value', () => {
    render(<StatCard label="Patients" value={1500} />)
    expect(screen.getByText('Patients')).toBeInTheDocument()
    // toLocaleString output varies by locale (1,500 vs 1.500)
    expect(screen.getByText((1500).toLocaleString())).toBeInTheDocument()
  })

  it('renders string value', () => {
    render(<StatCard label="Status" value="Active" />)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('renders trend', () => {
    render(<StatCard label="Revenue" value="$10K" trend={{ value: 15, label: 'vs last month' }} />)
    expect(screen.getByText(/\+15%/)).toBeInTheDocument()
    expect(screen.getByText('vs last month')).toBeInTheDocument()
  })

  it('renders negative trend', () => {
    render(<StatCard label="Churn" value="5%" trend={{ value: -3 }} />)
    expect(screen.getByText(/-3%/)).toBeInTheDocument()
  })
})
