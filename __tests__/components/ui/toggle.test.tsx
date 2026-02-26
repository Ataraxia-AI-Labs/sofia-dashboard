import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Toggle } from '@/components/ui/toggle'

describe('Toggle', () => {
  it('renders with unchecked state', () => {
    render(<Toggle checked={false} onChange={() => {}} />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
  })

  it('renders with checked state', () => {
    render(<Toggle checked={true} onChange={() => {}} />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  it('calls onChange when clicked', () => {
    const onChange = jest.fn()
    render(<Toggle checked={false} onChange={onChange} />)
    fireEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('does not call onChange when disabled', () => {
    const onChange = jest.fn()
    render(<Toggle checked={false} onChange={onChange} disabled />)
    fireEvent.click(screen.getByRole('switch'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('renders label text', () => {
    render(<Toggle checked={false} onChange={() => {}} label="Enable feature" />)
    expect(screen.getByText('Enable feature')).toBeInTheDocument()
  })

  it('applies color class when checked', () => {
    const { rerender } = render(<Toggle checked={true} onChange={() => {}} color="success" />)
    expect(screen.getByRole('switch').className).toContain('bg-status-success')

    rerender(<Toggle checked={true} onChange={() => {}} color="warning" />)
    expect(screen.getByRole('switch').className).toContain('bg-status-warning')
  })
})
