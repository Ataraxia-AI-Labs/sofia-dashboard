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

  it('renders five theme buttons after mount', () => {
    render(<ThemeToggle />)
    expect(screen.getByRole('button', { name: 'Claro' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'SofIA' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Oscuro' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ataraxia Cyan' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ataraxia Purple' })).toBeInTheDocument()
  })

  it('marks the active theme button as pressed', () => {
    render(<ThemeToggle />)
    expect(screen.getByRole('button', { name: 'Oscuro' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Claro' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'SofIA' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Ataraxia Cyan' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Ataraxia Purple' })).toHaveAttribute('aria-pressed', 'false')
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

  it('calls setTheme with "brand" when clicking SofIA', () => {
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button', { name: 'SofIA' }))
    expect(mockSetTheme).toHaveBeenCalledWith('brand')
  })

  it('calls setTheme with "ataraxia-cyan" when clicking Ataraxia Cyan', () => {
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button', { name: 'Ataraxia Cyan' }))
    expect(mockSetTheme).toHaveBeenCalledWith('ataraxia-cyan')
  })

  it('calls setTheme with "ataraxia-purple" when clicking Ataraxia Purple', () => {
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button', { name: 'Ataraxia Purple' }))
    expect(mockSetTheme).toHaveBeenCalledWith('ataraxia-purple')
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
