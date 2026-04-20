'use client'

import { useState, useRef, useEffect } from 'react'
import { useOrg } from '@/lib/org-context'
import { WelcomeState } from '@/components/sofia-console/welcome-state'
import { ChatInput } from '@/components/sofia-console/chat-input'
import { SuggestedPrompts } from '@/components/sofia-console/suggested-prompts'
import { MessageBubble, type Message } from '@/components/sofia-console/message-bubble'

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
  const { user, org } = useOrg()
  const [messages, setMessages] = useState<Message[]>([])
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (text: string) => {
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

    // Sprint 1: mock response. Sprint 3 wires to backend /console/ask with tool-calling.
    setTimeout(() => {
      setMessages(m =>
        m.map(msg =>
          msg.id === pendingId
            ? {
                ...msg,
                pending: false,
                createdAt: new Date().toISOString(),
                text:
                  'Voy a ser honesta contigo: ahorita estoy en construcción. Mi cerebro (backend con tools) llega en la próxima sesión. Pero ya te registré la pregunta para priorizar las herramientas que más te sirvan primero.',
                artifacts: [
                  { type: 'note', title: 'Tu pregunta quedó guardada', data: text },
                ],
              }
            : msg,
        ),
      )
      setSending(false)
    }, 1600)
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
          <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin py-5 pb-28">
            <div className="max-w-[760px] mx-auto px-4 space-y-4">
              {messages.map(m => (
                <MessageBubble key={m.id} message={m} />
              ))}
            </div>
          </div>
          <div className="sticky bottom-3 w-full z-10">
            <ChatInput onSubmit={handleSubmit} disabled={sending} />
          </div>
        </>
      )}
    </div>
  )
}
