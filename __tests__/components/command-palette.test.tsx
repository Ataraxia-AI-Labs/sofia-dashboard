import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CommandPalette } from '@/components/command-palette'

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
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
    expect(screen.getByPlaceholderText('Buscar páginas...')).toBeInTheDocument()
  })

  it('displays all navigation items by default', () => {
    render(<CommandPalette open={true} onClose={() => {}} />)
    expect(screen.getByText('Pacientes')).toBeInTheDocument()
    expect(screen.getByText('Calendario')).toBeInTheDocument()
    expect(screen.getByText('Overview')).toBeInTheDocument()
  })

  it('filters items based on search query', () => {
    render(<CommandPalette open={true} onClose={() => {}} />)
    const input = screen.getByPlaceholderText('Buscar páginas...')
    fireEvent.change(input, { target: { value: 'paci' } })
    expect(screen.getByText('Pacientes')).toBeInTheDocument()
    expect(screen.queryByText('Calendario')).not.toBeInTheDocument()
  })

  it('shows empty state when no results match', () => {
    render(<CommandPalette open={true} onClose={() => {}} />)
    const input = screen.getByPlaceholderText('Buscar páginas...')
    fireEvent.change(input, { target: { value: 'zzz_nonexistent' } })
    expect(screen.getByText(/Sin resultados/)).toBeInTheDocument()
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
    fireEvent.click(screen.getByText('Pacientes'))
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
    const input = screen.getByPlaceholderText('Buscar páginas...')
    fireEvent.change(input, { target: { value: 'test' } })
    expect(screen.getByLabelText('Limpiar búsqueda')).toBeInTheDocument()
  })

  it('clears query when clear button is clicked', () => {
    render(<CommandPalette open={true} onClose={() => {}} />)
    const input = screen.getByPlaceholderText('Buscar páginas...')
    fireEvent.change(input, { target: { value: 'test' } })
    fireEvent.click(screen.getByLabelText('Limpiar búsqueda'))
    expect(input).toHaveValue('')
  })
})
