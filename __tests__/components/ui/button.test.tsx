import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('renders children text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick handler', () => {
    const onClick = jest.fn()
    render(<Button onClick={onClick}>Submit</Button>)
    fireEvent.click(screen.getByText('Submit'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('disables when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByText('Disabled').closest('button')).toBeDisabled()
  })

  it('disables when loading is true', () => {
    render(<Button loading>Loading</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('shows spinner when loading', () => {
    render(<Button loading>Submit</Button>)
    const button = screen.getByRole('button')
    // The spinner div should be present
    expect(button.querySelector('.animate-spin')).toBeTruthy()
  })

  it('applies variant styles', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>)
    let btn = screen.getByRole('button')
    expect(btn.className).toContain('bg-brand-purple')

    rerender(<Button variant="danger">Danger</Button>)
    btn = screen.getByRole('button')
    expect(btn.className).toContain('status-danger')
  })

  it('applies size styles', () => {
    const { rerender } = render(<Button size="sm">Small</Button>)
    let btn = screen.getByRole('button')
    expect(btn.className).toContain('text-xs')

    rerender(<Button size="lg">Large</Button>)
    btn = screen.getByRole('button')
    expect(btn.className).toContain('py-3.5')
  })

  it('renders icon and iconRight', () => {
    render(
      <Button
        icon={<span data-testid="left-icon">L</span>}
        iconRight={<span data-testid="right-icon">R</span>}
      >
        Text
      </Button>
    )
    expect(screen.getByTestId('left-icon')).toBeInTheDocument()
    expect(screen.getByTestId('right-icon')).toBeInTheDocument()
  })

  it('does not show iconRight when loading', () => {
    render(
      <Button loading iconRight={<span data-testid="right-icon">R</span>}>
        Text
      </Button>
    )
    expect(screen.queryByTestId('right-icon')).not.toBeInTheDocument()
  })
})
