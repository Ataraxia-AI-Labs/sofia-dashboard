import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ThemeToggle } from '@/components/theme-toggle'

// Mock next-themes
const mockSetTheme = jest.fn()
let mockTheme = 'dark'
jest.mock('next-themes', () => ({
  useTheme: () => ({ theme: mockTheme, setTheme: mockSetTheme }),
}))

describe('ThemeToggle', () => {
  beforeEach(() => {
    mockSetTheme.mockClear()
    mockTheme = 'dark'
  })

  it('renders three theme buttons after mount', () => {
    render(<ThemeToggle />)
    expect(screen.getByRole('button', { name: 'Claro' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Oscuro' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sistema' })).toBeInTheDocument()
  })

  it('marks the active theme button as pressed', () => {
    render(<ThemeToggle />)
    expect(screen.getByRole('button', { name: 'Oscuro' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Claro' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Sistema' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls setTheme with "light" when clicking Claro', () => {
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button', { name: 'Claro' }))
    expect(mockSetTheme).toHaveBeenCalledWith('light')
  })

  it('calls setTheme with "dark" when clicking Oscuro', () => {
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button', { name: 'Oscuro' }))
    expect(mockSetTheme).toHaveBeenCalledWith('dark')
  })

  it('calls setTheme with "system" when clicking Sistema', () => {
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button', { name: 'Sistema' }))
    expect(mockSetTheme).toHaveBeenCalledWith('system')
  })

  it('has correct group role and label', () => {
    render(<ThemeToggle />)
    expect(screen.getByRole('group', { name: 'Selector de tema' })).toBeInTheDocument()
  })

  it('applies active styles to the pressed button', () => {
    render(<ThemeToggle />)
    const darkBtn = screen.getByRole('button', { name: 'Oscuro' })
    expect(darkBtn.className).toContain('bg-brand-purple')
  })
})
