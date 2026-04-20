'use client'

import { useRef, useState, useEffect } from 'react'
import { Paperclip, Mic, ArrowUp, Sparkles } from 'lucide-react'

interface ChatInputProps {
  onSubmit: (text: string) => void
  disabled?: boolean
  placeholder?: string
}

const ROTATING_PLACEHOLDERS = [
  'Pregunta a SofIA…',
  '¿Cómo vamos este mes?',
  '¿Qué citas tengo mañana?',
  'Dame el reporte de hoy',
  'Pacientes en riesgo',
  'Oportunidades hot ahora',
]

export function ChatInput({ onSubmit, disabled, placeholder }: ChatInputProps) {
  const [value, setValue] = useState('')
  const [placeholderIdx, setPlaceholderIdx] = useState(0)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (placeholder) return
    const t = setInterval(() => setPlaceholderIdx(i => (i + 1) % ROTATING_PLACEHOLDERS.length), 3500)
    return () => clearInterval(t)
  }, [placeholder])

  const autoresize = () => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }

  const send = () => {
    const v = value.trim()
    if (!v || disabled) return
    onSubmit(v)
    setValue('')
    if (ref.current) ref.current.style.height = 'auto'
  }

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="w-full max-w-[760px] mx-auto px-4">
      <div className="relative">
        {/* Halo morado ambient */}
        <div className="absolute -inset-4 bg-brand-purple/10 blur-3xl rounded-[40px] opacity-60 pointer-events-none" />

        <div
          className="relative bg-surface/70 backdrop-blur-xl rounded-[20px] transition-all"
          style={{
            boxShadow:
              '0 0 0 1px rgba(139,92,246,0.12), 0 10px 40px -10px rgba(139,92,246,0.22), 0 1px 0 0 rgba(255,255,255,0.04) inset',
          }}
          onFocus={e => {
            e.currentTarget.style.boxShadow =
              '0 0 0 1.5px rgba(139,92,246,0.35), 0 12px 48px -8px rgba(139,92,246,0.4), 0 1px 0 0 rgba(255,255,255,0.08) inset'
          }}
          onBlur={e => {
            e.currentTarget.style.boxShadow =
              '0 0 0 1px rgba(139,92,246,0.12), 0 10px 40px -10px rgba(139,92,246,0.22), 0 1px 0 0 rgba(255,255,255,0.04) inset'
          }}
        >
          <textarea
            ref={ref}
            value={value}
            onChange={e => { setValue(e.target.value); autoresize() }}
            onKeyDown={onKey}
            disabled={disabled}
            placeholder={placeholder || ROTATING_PLACEHOLDERS[placeholderIdx]}
            rows={1}
            className="w-full bg-transparent text-text-primary placeholder-text-dim/80 px-4 pt-3.5 pb-1 text-[14px] font-body resize-none outline-none leading-relaxed disabled:opacity-50"
          />

          <div className="flex items-center justify-between px-2.5 pb-2 pt-0.5">
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                className="sentient-btn w-7 h-7 rounded-md flex items-center justify-center text-text-dim hover:text-text-primary"
                title="Adjuntar"
                aria-label="Adjuntar"
              >
                <Paperclip size={15} strokeWidth={1.6} />
              </button>
              <button
                type="button"
                className="sentient-btn w-7 h-7 rounded-md flex items-center justify-center text-text-dim hover:text-text-primary"
                title="Dictar"
                aria-label="Dictar"
              >
                <Mic size={15} strokeWidth={1.6} />
              </button>
              <div className="w-px h-4 bg-brand-purple/15 mx-1" />
              <button
                type="button"
                className="sentient-btn h-7 px-2 rounded-md flex items-center gap-1 text-text-dim hover:text-brand-purple text-[11px] font-body"
                title="Slash commands"
                aria-label="Slash commands"
              >
                <Sparkles size={12} strokeWidth={1.6} />
                <span className="hidden sm:inline">/</span>
              </button>
            </div>
            <button
              type="button"
              onClick={send}
              disabled={disabled || !value.trim()}
              className="sentient-btn w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed bg-gradient-to-b from-brand-purple-light to-brand-purple text-white"
              style={{
                boxShadow:
                  '0 1px 0 0 rgba(255,255,255,0.18) inset, 0 2px 10px -1px rgba(139,92,246,0.38)',
              }}
              aria-label="Enviar"
            >
              <ArrowUp size={15} strokeWidth={2.4} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
