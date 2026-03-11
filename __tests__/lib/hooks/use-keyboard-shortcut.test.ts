import { renderHook } from '@testing-library/react'
import '@testing-library/jest-dom'
import { fireEvent } from '@testing-library/react'
import { useKeyboardShortcut } from '@/lib/hooks/use-keyboard-shortcut'

describe('useKeyboardShortcut', () => {
  it('calls callback when matching key is pressed', () => {
    const callback = jest.fn()
    renderHook(() => useKeyboardShortcut('k', callback))
    fireEvent.keyDown(document, { key: 'k' })
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('calls callback case-insensitively', () => {
    const callback = jest.fn()
    renderHook(() => useKeyboardShortcut('k', callback))
    fireEvent.keyDown(document, { key: 'K' })
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('does not call callback for a different key', () => {
    const callback = jest.fn()
    renderHook(() => useKeyboardShortcut('k', callback))
    fireEvent.keyDown(document, { key: 'n' })
    expect(callback).not.toHaveBeenCalled()
  })

  it('requires ctrlOrMeta when specified', () => {
    const callback = jest.fn()
    renderHook(() => useKeyboardShortcut('k', callback, { ctrlOrMeta: true }))
    // Without modifier — should not fire
    fireEvent.keyDown(document, { key: 'k' })
    expect(callback).not.toHaveBeenCalled()
    // With Ctrl — should fire
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
    expect(callback).toHaveBeenCalledTimes(1)
    // With Meta — should fire
    fireEvent.keyDown(document, { key: 'k', metaKey: true })
    expect(callback).toHaveBeenCalledTimes(2)
  })

  it('requires ctrl modifier when specified', () => {
    const callback = jest.fn()
    renderHook(() => useKeyboardShortcut('n', callback, { ctrl: true }))
    fireEvent.keyDown(document, { key: 'n' })
    expect(callback).not.toHaveBeenCalled()
    fireEvent.keyDown(document, { key: 'n', ctrlKey: true })
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('requires shift modifier when specified', () => {
    const callback = jest.fn()
    renderHook(() => useKeyboardShortcut('a', callback, { ctrl: true, shift: true }))
    // Ctrl only — should not fire
    fireEvent.keyDown(document, { key: 'a', ctrlKey: true })
    expect(callback).not.toHaveBeenCalled()
    // Ctrl+Shift — should fire
    fireEvent.keyDown(document, { key: 'a', ctrlKey: true, shiftKey: true })
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('calls callback for Escape without modifier', () => {
    const callback = jest.fn()
    renderHook(() => useKeyboardShortcut('Escape', callback))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('skips callback when typing in an input element', () => {
    const callback = jest.fn()
    renderHook(() => useKeyboardShortcut('k', callback))
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    fireEvent.keyDown(input, { key: 'k' })
    expect(callback).not.toHaveBeenCalled()
    document.body.removeChild(input)
  })

  it('still fires Escape when typing in an input element', () => {
    const callback = jest.fn()
    renderHook(() => useKeyboardShortcut('Escape', callback))
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(callback).toHaveBeenCalledTimes(1)
    document.body.removeChild(input)
  })

  it('does not fire when enabled is false', () => {
    const callback = jest.fn()
    renderHook(() => useKeyboardShortcut('k', callback, { enabled: false }))
    fireEvent.keyDown(document, { key: 'k' })
    expect(callback).not.toHaveBeenCalled()
  })

  it('removes event listener on unmount', () => {
    const callback = jest.fn()
    const { unmount } = renderHook(() => useKeyboardShortcut('k', callback))
    unmount()
    fireEvent.keyDown(document, { key: 'k' })
    expect(callback).not.toHaveBeenCalled()
  })

  it('always uses the latest callback without re-registering', () => {
    const first = jest.fn()
    const second = jest.fn()
    const { rerender } = renderHook(
      ({ cb }) => useKeyboardShortcut('k', cb),
      { initialProps: { cb: first } },
    )
    rerender({ cb: second })
    fireEvent.keyDown(document, { key: 'k' })
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })
})
