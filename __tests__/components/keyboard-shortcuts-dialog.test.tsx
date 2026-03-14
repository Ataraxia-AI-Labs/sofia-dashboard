import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { KeyboardShortcutsDialog } from '@/components/keyboard-shortcuts-dialog'

describe('KeyboardShortcutsDialog', () => {
  it('renders nothing when closed', () => {
    render(<KeyboardShortcutsDialog open={false} onClose={() => {}} />)
    expect(screen.queryByText('Atajos de teclado')).not.toBeInTheDocument()
  })

  it('renders the dialog title when open', () => {
    render(<KeyboardShortcutsDialog open={true} onClose={() => {}} />)
    expect(screen.getByText('Atajos de teclado')).toBeInTheDocument()
  })

  it('shows navigation shortcut group', () => {
    render(<KeyboardShortcutsDialog open={true} onClose={() => {}} />)
    expect(screen.getByText('Navegación')).toBeInTheDocument()
  })

  it('shows general shortcut group', () => {
    render(<KeyboardShortcutsDialog open={true} onClose={() => {}} />)
    expect(screen.getByText('General')).toBeInTheDocument()
  })

  it('shows expected shortcut descriptions', () => {
    render(<KeyboardShortcutsDialog open={true} onClose={() => {}} />)
    expect(screen.getByText('Abrir buscador / paleta de comandos')).toBeInTheDocument()
    expect(screen.getByText('Cerrar modal o panel activo')).toBeInTheDocument()
    expect(screen.getByText('Ir a Pacientes')).toBeInTheDocument()
    expect(screen.getByText('Ir a Calendario')).toBeInTheDocument()
  })

  it('shows keyboard key labels', () => {
    render(<KeyboardShortcutsDialog open={true} onClose={() => {}} />)
    // Should display key labels like Ctrl, K, Esc, etc.
    const kbdElements = document.querySelectorAll('kbd')
    const keyTexts = Array.from(kbdElements).map(el => el.textContent)
    expect(keyTexts).toContain('Ctrl')
    expect(keyTexts).toContain('Esc')
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn()
    render(<KeyboardShortcutsDialog open={true} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Cerrar'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose on Escape key', () => {
    const onClose = jest.fn()
    render(<KeyboardShortcutsDialog open={true} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
