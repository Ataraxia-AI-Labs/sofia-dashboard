import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Input, Textarea, Select } from '@/components/ui/input'

describe('Input', () => {
  it('renders with label', () => {
    render(<Input label="Email" />)
    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('renders with placeholder', () => {
    render(<Input placeholder="Enter email" />)
    expect(screen.getByPlaceholderText('Enter email')).toBeInTheDocument()
  })

  it('renders error message', () => {
    render(<Input error="Field required" />)
    expect(screen.getByText('Field required')).toBeInTheDocument()
  })

  it('renders hint when no error', () => {
    render(<Input hint="Optional field" />)
    expect(screen.getByText('Optional field')).toBeInTheDocument()
  })

  it('hides hint when error is present', () => {
    render(<Input error="Required" hint="Optional field" />)
    expect(screen.queryByText('Optional field')).not.toBeInTheDocument()
    expect(screen.getByText('Required')).toBeInTheDocument()
  })

  it('applies error border style', () => {
    render(<Input error="Bad" data-testid="input" />)
    const input = screen.getByRole('textbox')
    expect(input.className).toContain('border-status-danger')
  })

  it('handles change events', () => {
    const onChange = jest.fn()
    render(<Input onChange={onChange} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello' } })
    expect(onChange).toHaveBeenCalled()
  })
})

describe('Textarea', () => {
  it('renders with label and placeholder', () => {
    render(<Textarea label="Notes" placeholder="Write here" />)
    expect(screen.getByText('Notes')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Write here')).toBeInTheDocument()
  })

  it('renders error', () => {
    render(<Textarea error="Too short" />)
    expect(screen.getByText('Too short')).toBeInTheDocument()
  })
})

describe('Select', () => {
  const options = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
    { value: 'c', label: 'Option C' },
  ]

  it('renders all options', () => {
    render(<Select options={options} />)
    expect(screen.getByText('Option A')).toBeInTheDocument()
    expect(screen.getByText('Option B')).toBeInTheDocument()
    expect(screen.getByText('Option C')).toBeInTheDocument()
  })

  it('renders with label', () => {
    render(<Select label="Category" options={options} />)
    expect(screen.getByText('Category')).toBeInTheDocument()
  })

  it('renders error', () => {
    render(<Select options={options} error="Required" />)
    expect(screen.getByText('Required')).toBeInTheDocument()
  })
})
