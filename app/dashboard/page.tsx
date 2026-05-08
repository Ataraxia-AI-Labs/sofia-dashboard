'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import * as Sentry from '@sentry/nextjs'
import { useOrg } from '@/lib/org-context'
import { WelcomeState } from '@/components/sofia-console/welcome-state'
import { ChatInput } from '@/components/sofia-console/chat-input'
import { SuggestedPrompts } from '@/components/sofia-console/suggested-prompts'
import { MessageBubble, type Message } from '@/components/sofia-console/message-bubble'
import { memoryBridge, toolBridge } from '@/lib/memory-bridge'
import { askConsole, getConsoleMessages, type ConsoleHistoryItem } from '@/lib/api/console'

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

export default function SofiaConsolePage() {
  const { user, org, branchId } = useOrg()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [sending, setSending] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  // S153: when other pages link here with `?ask=<text>` (e.g. the patient
  // panel "Anotar nota / Crear tratamiento" buttons), inject the prompt
  // into the chat input and strip the query so a refresh doesn't re-fire it.
  useEffect(() => {
    const ask = searchParams?.get('ask')
    if (!ask) return
    const text = decodeURIComponent(ask)
    // Defer until ChatInput has subscribed to the bridge.
    const t = setTimeout(() => toolBridge.injectPrompt(text), 200)
    router.replace('/dashboard')
    return () => clearTimeout(t)
  }, [searchParams, router])

  const loadSession = useCallback(async (sid: string) => {
    setSessionId(sid)
    setMessages([])
    try {
      const res = await getConsoleMessages(sid)
      const mapped: Message[] = res.messages.map(m => ({
        id: m.id,
        role: m.role,
        text: m.content,
        createdAt: m.created_at,
        artifacts: m.artifacts,
      }))
      setMessages(mapped)
    } catch (err) {
      Sentry.captureException(err, { tags: { context: 'sofia_console_load_session' } })
    }
  }, [])

  const startFresh = useCallback(() => {
    setSessionId(null)
    setMessages([])
  }, [])

  useEffect(() => {
    return memoryBridge.onSelect(sid => {
      if (sid) loadSession(sid)
      else startFresh()
    })
  }, [loadSession, startFresh])

  const handleSubmit = async (text: string) => {
    if (!org?.id) return
    const now = new Date().toISOString()
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text, createdAt: now }
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
        session_id: sessionId,
        persist: true,
      })
      if (response.session_id && response.session_id !== sessionId) {
        setSessionId(response.session_id)
      }
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
      memoryBridge.bumpReload()
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
    <div className="relative flex flex-col h-[calc(100vh-60px)]">
      {isEmpty ? (
        <div className="flex-1 flex flex-col items-center justify-center py-6 gap-4">
          <WelcomeState userName={userName} orgName={org?.name} />
          <div className="w-full max-w-[760px] px-4 space-y-3">
            <ChatInput onSubmit={handleSubmit} disabled={sending} />
            <SuggestedPrompts onSelect={handleSubmit} />
          </div>
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-hide py-5 pb-64">
            <div className="max-w-[760px] mx-auto px-4 space-y-5">
              {messages.map(m => (
                <MessageBubble key={m.id} message={m} />
              ))}
            </div>
          </div>
          {/* Dock — floating input + prompts.
              Taller gradient fade so long answers never slip UNDER the
              prompts row (CEO: "los botones tapan el mensaje"). The fade
              starts fully opaque at the bottom and softens up 96px so
              any scrolling text dies cleanly behind it. */}
          <div className="fixed bottom-4 left-[88px] right-4 lg:right-6 z-30 pointer-events-none">
            <div
              aria-hidden
              className="absolute -top-24 inset-x-0 h-24"
              style={{
                background:
                  'linear-gradient(to top, var(--color-void, transparent) 0%, var(--color-void, transparent) 40%, transparent 100%)',
              }}
            />
            <div className="relative mx-auto max-w-[760px] pointer-events-auto space-y-2.5">
              <ChatInput onSubmit={handleSubmit} disabled={sending} />
              <SuggestedPrompts onSelect={handleSubmit} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
