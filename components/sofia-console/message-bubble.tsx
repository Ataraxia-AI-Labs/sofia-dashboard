'use client'

import { useEffect, useState } from 'react'
import { AtaraxiaLogo } from '@/components/ataraxia-logo'
import { ArtifactRenderer } from './artifact-renderer'
import type { ConsoleArtifact } from '@/lib/api/console'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
  artifacts?: ConsoleArtifact[]
  pending?: boolean
  createdAt?: string
  thinkingSteps?: string[]
}

interface Props {
  message: Message
}

/**
 * Render `**text**` / `*text*` / `` `code` `` as semantic HTML instead of
 * letting the raw asterisks bleed into the bubble. Keeps the renderer
 * lightweight — no external markdown dep — while still giving the CEO
 * the cinematic "emphasized" feel he asked for.
 */
function formatInline(text: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = []
  // Order matters: bold first, then italics, then inline code, else plain.
  const re = /(\*\*[^*\n]+\*\*)|(\*[^*\n]+\*)|(`[^`\n]+`)/g
  let last = 0
  let key = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) tokens.push(text.slice(last, m.index))
    const raw = m[0]
    if (raw.startsWith('**')) {
      tokens.push(
        <strong
          key={`b-${key++}`}
          className="font-semibold text-brand-purple"
          style={{ textShadow: '0 0 12px rgba(139,92,246,0.25)' }}
        >
          {raw.slice(2, -2)}
        </strong>,
      )
    } else if (raw.startsWith('`')) {
      tokens.push(
        <code key={`c-${key++}`} className="font-mono text-[12.5px] px-1.5 py-0.5 rounded bg-brand-purple/12 text-brand-purple">
          {raw.slice(1, -1)}
        </code>,
      )
    } else {
      tokens.push(<em key={`i-${key++}`} className="text-text-primary opacity-95">{raw.slice(1, -1)}</em>)
    }
    last = m.index + raw.length
  }
  if (last < text.length) tokens.push(text.slice(last))
  return tokens
}

function FormattedText({ text }: { text: string }) {
  // Preserve newlines as separate <p> nodes so markdown feels structured
  // (not a giant wall of pre-wrap) while inline bold/italic/code still works.
  const blocks = text.split(/\n{2,}/)
  return (
    <div className="space-y-2.5">
      {blocks.map((block, bi) => {
        // Detect a list block (lines starting with '-', '*', or '1.')
        const lines = block.split('\n')
        const looksList = lines.every(l => /^\s*(?:[-*]|\d+\.)\s+/.test(l))
        if (looksList && lines.length > 1) {
          return (
            <ul key={bi} className="space-y-1 pl-0.5">
              {lines.map((l, li) => (
                <li key={li} className="flex gap-2 text-left">
                  <span className="text-brand-purple/70 select-none mt-[0.45em] leading-none">·</span>
                  <span className="flex-1">{formatInline(l.replace(/^\s*(?:[-*]|\d+\.)\s+/, ''))}</span>
                </li>
              ))}
            </ul>
          )
        }
        return (
          <p key={bi} className="whitespace-pre-wrap text-left">
            {formatInline(block)}
          </p>
        )
      })}
    </div>
  )
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end gap-2">
        <div className="max-w-[68%]">
          <div
            className="rounded-[20px] pl-3 pr-4 py-2.5 text-[14px] font-body bg-brand-purple/14 text-text-primary"
            style={{
              lineHeight: 1.65,
              letterSpacing: '-0.005em',
              boxShadow:
                '0 0 0 1px rgba(139,92,246,0.18), 0 4px 22px -6px rgba(139,92,246,0.25), 0 1px 0 0 rgba(255,255,255,0.03) inset',
            }}
          >
            <p className="whitespace-pre-wrap text-left">{message.text}</p>
          </div>
          {message.createdAt && (
            <div className="text-[10px] font-body text-text-dim text-right mt-1 mr-1.5">
              {formatTime(message.createdAt)}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      <div
        className="flex-shrink-0 mt-1 relative"
        aria-hidden
        style={{ width: 32, height: 32 }}
      >
        {/* Subtle breathing halo behind the eye so it never reads 'tiny' */}
        <span
          className="absolute inset-0 rounded-full blur-[6px] opacity-70"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.28), transparent 70%)' }}
        />
        <AtaraxiaLogo size={32} ambient={false} />
      </div>
      <div className="max-w-[75%] space-y-2 min-w-0">
        <div
          className="rounded-[20px] pl-3.5 pr-4 pt-3 pb-2.5 text-[14px] font-body bg-surface/60 backdrop-blur-sm text-text-primary"
          style={{
            lineHeight: 1.7,
            letterSpacing: '-0.005em',
            boxShadow:
              '0 0 0 1px rgba(139,92,246,0.1), 0 4px 22px -6px rgba(139,92,246,0.18), 0 1px 0 0 rgba(255,255,255,0.03) inset',
          }}
        >
          {message.pending ? (
            <TypingState steps={message.thinkingSteps} />
          ) : (
            <FormattedText text={message.text} />
          )}
        </div>

        {message.artifacts && message.artifacts.length > 0 && (
          <div className="space-y-2">
            {message.artifacts.map((a, i) => (
              <ArtifactRenderer key={i} artifact={a} />
            ))}
          </div>
        )}

        {message.createdAt && !message.pending && (
          <div className="text-[10px] font-body text-text-dim ml-1">
            {formatTime(message.createdAt)}
          </div>
        )}
      </div>
    </div>
  )
}

function TypingState({ steps }: { steps?: string[] }) {
  const defaultSteps = [
    'SofIA está pensando',
    'revisando la agenda',
    'consultando datos',
    'organizando la respuesta',
  ]
  const messages = steps && steps.length > 0 ? steps : defaultSteps
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % messages.length), 1800)
    return () => clearInterval(t)
  }, [messages.length])

  return (
    <span className="inline-flex items-center gap-2 text-text-muted">
      <span className="inline-flex gap-1 items-center">
        <span className="w-1.5 h-1.5 rounded-full bg-brand-purple/60 animate-loader-dot" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-brand-purple/60 animate-loader-dot" style={{ animationDelay: '200ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-brand-purple/60 animate-loader-dot" style={{ animationDelay: '400ms' }} />
      </span>
      <span className="text-[13px] font-body italic opacity-80">{messages[idx]}…</span>
    </span>
  )
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  const now = Date.now()
  const diff = (now - date.getTime()) / 1000
  if (diff < 60) return 'ahora'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}
