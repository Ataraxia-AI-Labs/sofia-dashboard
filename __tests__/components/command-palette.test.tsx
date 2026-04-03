import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CommandPalette } from '@/components/command-palette'

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, params?: Record<string, unknown>) => {
      if (params) return `${key}:${JSON.stringify(params)}`
      return key
    }
    t.has = () => true
    return t
  },
}))

describe('CommandPalette', () => {
  beforeEach(() => {
    mockPush.mockClear()
  })

  it('renders nothing when closed', () => {
    render(<CommandPalette open={false} onClose={() => {}} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders the search input when open', () => {
    render(<CommandPalette open={true} onClose={() => {}} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('searchPages')).toBeInTheDocument()
  })

  it('displays all navigation items by default', () => {
    render(<CommandPalette open={true} onClose={() => {}} />)
    // Labels come from nav keys via useTranslations mock — may appear as both label and description
    expect(screen.getAllByText('patients').length).toBeGreaterThan(0)
    expect(screen.getAllByText('calendar').length).toBeGreaterThan(0)
    expect(screen.getAllByText('overview').length).toBeGreaterThan(0)
  })

  it('filters items based on search query', () => {
    render(<CommandPalette open={true} onClose={() => {}} />)
    const input = screen.getByPlaceholderText('searchPages')
    fireEvent.change(input, { target: { value: 'pati' } })
    expect(screen.getAllByText('patients').length).toBeGreaterThan(0)
    expect(screen.queryByText('calendar')).not.toBeInTheDocument()
  })

  it('shows empty state when no results match', () => {
    render(<CommandPalette open={true} onClose={() => {}} />)
    const input = screen.getByPlaceholderText('searchPages')
    fireEvent.change(input, { target: { value: 'zzz_nonexistent' } })
    expect(screen.getByText(/noResults/)).toBeInTheDocument()
  })

  it('calls onClose when backdrop is clicked', () => {
    const onClose = jest.fn()
    render(<CommandPalette open={true} onClose={onClose} />)
    const backdrop = document.querySelector('.backdrop-blur-sm')
    if (backdrop) fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose on Escape key', () => {
    const onClose = jest.fn()
    render(<CommandPalette open={true} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('navigates on Enter key for highlighted item', () => {
    const onClose = jest.fn()
    render(<CommandPalette open={true} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Enter' })
    // First item is Overview → /dashboard
    expect(mockPush).toHaveBeenCalledWith('/dashboard')
    expect(onClose).toHaveBeenCalled()
  })

  it('navigates when clicking an item', () => {
    const onClose = jest.fn()
    render(<CommandPalette open={true} onClose={onClose} />)
    fireEvent.click(screen.getAllByText('patients')[0])
    expect(mockPush).toHaveBeenCalledWith('/dashboard/pacientes')
    expect(onClose).toHaveBeenCalled()
  })

  it('moves highlight down with ArrowDown', () => {
    render(<CommandPalette open={true} onClose={() => {}} />)
    // First item is highlighted by default (index 0 = Overview)
    fireEvent.keyDown(document, { key: 'ArrowDown' })
    // After one ArrowDown, second item (index 1 = Pacientes) should be highlighted
    const options = screen.getAllByRole('option')
    expect(options[1]).toHaveAttribute('aria-selected', 'true')
  })

  it('shows clear button when query is non-empty', () => {
    render(<CommandPalette open={true} onClose={() => {}} />)
    const input = screen.getByPlaceholderText('searchPages')
    fireEvent.change(input, { target: { value: 'test' } })
    expect(screen.getByLabelText('close')).toBeInTheDocument()
  })

  it('clears query when clear button is clicked', () => {
    render(<CommandPalette open={true} onClose={() => {}} />)
    const input = screen.getByPlaceholderText('searchPages')
    fireEvent.change(input, { target: { value: 'test' } })
    fireEvent.click(screen.getByLabelText('close'))
    expect(input).toHaveValue('')
  })
})
