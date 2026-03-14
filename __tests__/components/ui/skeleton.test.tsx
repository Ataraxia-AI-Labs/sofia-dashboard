import { render } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Skeleton } from '@/components/ui/skeleton'

describe('Skeleton', () => {
  it('renders a div with animate-pulse class', () => {
    const { container } = render(<Skeleton />)
    const el = container.firstChild as HTMLElement
    expect(el).toBeInTheDocument()
    expect(el.className).toContain('animate-pulse')
  })

  it('applies bg-surface-3 and rounded classes by default', () => {
    const { container } = render(<Skeleton />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('bg-surface-3')
    expect(el.className).toContain('rounded')
  })

  it('applies custom className for sizing', () => {
    const { container } = render(<Skeleton className="h-4 w-40" />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('h-4')
    expect(el.className).toContain('w-40')
  })

  it('applies custom rounded class override', () => {
    const { container } = render(<Skeleton className="h-10 w-10 rounded-full" />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('rounded-full')
  })

  it('has aria-hidden="true" for accessibility', () => {
    const { container } = render(<Skeleton />)
    const el = container.firstChild as HTMLElement
    expect(el).toHaveAttribute('aria-hidden', 'true')
  })

  it('renders a div element', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstChild?.nodeName).toBe('DIV')
  })
})
