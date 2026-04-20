'use client'

import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'

interface ChatInputProps {
  onSend: (text: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({ onSend, disabled = false, placeholder = 'Escribe un mensaje...' }: ChatInputProps) {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!disabled) inputRef.current?.focus()
  }, [disabled])

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 px-3 py-2 bg-surface-3 border border-border rounded-lg text-xs font-body text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand-purple/40 transition-colors disabled:opacity-50"
      />
      <button
        onClick={handleSubmit}
        disabled={disabled || !text.trim()}
        className="w-9 h-9 rounded-lg bg-brand-purple text-white flex items-center justify-center hover:bg-brand-purple-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        aria-label="Enviar mensaje"
      >
        <Send size={14} />
      </button>
    </div>
  )
}
