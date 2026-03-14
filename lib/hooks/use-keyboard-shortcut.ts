'use client'

import { useEffect, useRef } from 'react'

interface ShortcutOptions {
  /** Require Ctrl key (ignored when ctrlOrMeta is true) */
  ctrl?: boolean
  /** Require Meta key / Cmd on Mac (ignored when ctrlOrMeta is true) */
  meta?: boolean
  /** Require either Ctrl OR Meta — cross-platform shortcut */
  ctrlOrMeta?: boolean
  /** Require Shift key */
  shift?: boolean
  /** Require Alt key */
  alt?: boolean
  /** Set to false to temporarily disable this shortcut */
  enabled?: boolean
}

/**
 * useKeyboardShortcut — lightweight hook for registering global keyboard shortcuts.
 *
 * Automatically skips shortcuts when focus is on an input/textarea/select element,
 * except for Escape which always fires regardless of focused element.
 *
 * @param key The key value to listen for (e.g. 'k', 'Escape', 'n', '?')
 * @param callback Function to call when the shortcut fires
 * @param options Modifier key requirements and behavior flags
 *
 * @example
 * // Ctrl+K or Cmd+K
 * useKeyboardShortcut('k', () => setOpen(true), { ctrlOrMeta: true })
 *
 * // Ctrl+N
 * useKeyboardShortcut('n', () => router.push('/dashboard/pacientes'), { ctrl: true })
 *
 * // Ctrl+Shift+A
 * useKeyboardShortcut('a', () => router.push('/dashboard/calendario'), { ctrl: true, shift: true })
 *
 * // Escape
 * useKeyboardShortcut('Escape', () => setOpen(false))
 */
export function useKeyboardShortcut(
  key: string,
  callback: (e: KeyboardEvent) => void,
  options: ShortcutOptions = {},
): void {
  const { ctrl = false, meta = false, shift = false, alt = false, ctrlOrMeta = false, enabled = true } = options

  // Keep the callback ref fresh without re-subscribing to the event on every render
  const callbackRef = useRef(callback)
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    if (!enabled) return

    const handler = (e: KeyboardEvent) => {
      // Skip when typing in an input/textarea/select/contenteditable — except Escape
      const target = e.target as HTMLElement
      const inInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      if (inInput && e.key !== 'Escape') return

      // Match the key (case-insensitive for letter keys)
      if (e.key !== key && e.key.toLowerCase() !== key.toLowerCase()) return

      // Modifier checks
      if (ctrlOrMeta && !(e.ctrlKey || e.metaKey)) return
      if (!ctrlOrMeta && ctrl && !e.ctrlKey) return
      if (!ctrlOrMeta && meta && !e.metaKey) return
      if (shift && !e.shiftKey) return
      if (alt && !e.altKey) return

      e.preventDefault()
      callbackRef.current(e)
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [key, ctrl, meta, shift, alt, ctrlOrMeta, enabled])
}
