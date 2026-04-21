'use client'

import { useState, useRef, useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { useOrg } from '@/lib/org-context'
import { WelcomeState } from '@/components/sofia-console/welcome-state'
import { ChatInput } from '@/components/sofia-console/chat-input'
import { SuggestedPrompts } from '@/components/sofia-console/suggested-prompts'
import { MessageBubble, type Message } from '@/components/sofia-console/message-bubble'
import { askConsole, type ConsoleHistoryItem } from '@/lib/api/console'

/**
 * Infer thinking-step narration from user question keywords.
 * Makes SofIA feel alive — she narrates what she's doing while tools run.
 */
function inferThinkingSteps(q: string): string[] {
  const s = q.toLowerCase()
  if (s.includes('agenda') || s.includes('cita')) {
    return ['mirando tu agenda', 'contando citas confirmadas', 'verificando disponibilidad', 'preparando respuesta']
  }
  if (s.includes('revenue') || s.includes('ingres') || s.includes('cobr') || s.includes('pago')) {
    return ['consultando pagos', 'sumando revenue', 'calculando proyección', 'armando el reporte']
  }
  if (s.includes('paciente') || s.includes('lead') || s.includes('riesgo')) {
    return ['leyendo tu CRM', 'revisando interacciones recientes', 'evaluando lead scores', 'priorizando']
  }
  if (s.includes('funnel') || s.includes('conversion') || s.includes('report')) {
    return ['cruzando métricas', 'construyendo el funnel', 'comparando con periodos anteriores']
  }
  if (s.includes('oportunidad') || s.includes('hot')) {
    return ['detectando oportunidades', 'clasificando por urgencia', 'preparando accionables']
  }
  return ['SofIA está pensando', 'consultando tus datos', 'organizando la respuesta']
}

/**
 * SofIA Console — nueva home del dashboard.
 * Conversational-first. Reemplaza el viejo Pulso con widgets.
 *
 * Sprint 1: shell estatico con welcome + suggested prompts + input + message list.
 * Sprint 3: conectar a backend /console/ask con OpenAI function-calling + tools.
 */
export default function SofiaConsolePage() {
  const { user, org, branchId } = useOrg()
  const [messages, setMessages] = useState<Message[]>([])
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (text: string) => {
    if (!org?.id) return
    const now = new Date().toISOString()
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      text,
      createdAt: now,
    }
    const pendingId = crypto.randomUUID()
    const pending: Message = {
      id: pendingId,
      role: 'assistant',
      text: '',
      pending: true,
      thinkingSteps: inferThinkingSteps(text),
    }
    setMessages(m => [...m, userMsg, pending])
    setSending(true)

    // Build history from last 6 messages (excluding current pending)
    const history: ConsoleHistoryItem[] = messages
      .filter(m => !m.pending && m.text)
      .slice(-6)
      .map(m => ({ role: m.role, content: m.text }))

    try {
      const response = await askConsole({
        org_id: org.id,
        branch_id: branchId,
        message: text,
        history,
      })
      setMessages(m =>
        m.map(msg =>
          msg.id === pendingId
            ? {
                ...msg,
                pending: false,
                createdAt: new Date().toISOString(),
                text: response.narrative || 'Listo.',
                artifacts: response.artifacts,
              }
            : msg,
        ),
      )
    } catch (err) {
      Sentry.captureException(err, { tags: { context: 'sofia_console_ask' } })
      setMessages(m =>
        m.map(msg =>
          msg.id === pendingId
            ? {
                ...msg,
                pending: false,
                createdAt: new Date().toISOString(),
                text:
                  'Tuve un tropiezo consultando. Dame un momento y te respondo — si insiste, avísame y lo revisamos juntos.',
              }
            : msg,
        ),
      )
    } finally {
      setSending(false)
    }
  }

  const isEmpty = messages.length === 0
  const userName = (user?.user_metadata?.full_name as string) || user?.email?.split('@')[0]

  return (
    <div className="relative min-h-[calc(100vh-60px)] flex flex-col">
      {isEmpty ? (
        <div className="flex-1 flex flex-col items-center justify-center py-6 gap-5">
          <WelcomeState userName={userName} orgName={org?.name} />
          <ChatInput onSubmit={handleSubmit} disabled={sending} />
          <SuggestedPrompts onSelect={handleSubmit} />
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin py-5 pb-32">
            <div className="max-w-[760px] mx-auto px-4 space-y-5">
              {messages.map(m => (
                <MessageBubble key={m.id} message={m} />
              ))}
            </div>
          </div>
          {/* Input docked to the bottom of the viewport, clear of the sidebar.
              Theme-aware fade (using CSS var --bg) blends the input into the
              current theme instead of stamping a hard dark strip over light
              themes like SofIA Lavanda. */}
          <div className="fixed bottom-4 left-[88px] right-4 lg:right-6 z-30 pointer-events-none">
            <div
              aria-hidden
              className="absolute -top-6 inset-x-0 h-6"
              style={{ background: 'linear-gradient(to top, var(--color-void, transparent), transparent)' }}
            />
            <div className="relative mx-auto max-w-[760px] pointer-events-auto">
              <ChatInput onSubmit={handleSubmit} disabled={sending} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
