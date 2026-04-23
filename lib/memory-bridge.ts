'use client'

/**
 * Tiny pub/sub bridge between MemoryDropdown (in topbar) and the Nucleus home
 * chat. Avoids lifting state into a global context just for two events.
 */
type Listener = (sessionId: string | null) => void

const listeners = new Set<Listener>()
let reloadTick = 0

export const memoryBridge = {
  onSelect(fn: Listener): () => void {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
  select(sessionId: string | null) {
    listeners.forEach(l => l(sessionId))
  },
  bumpReload() {
    reloadTick += 1
    return reloadTick
  },
  getReload() {
    return reloadTick
  },
}

/* =============================================================
 * Tool bridge — empuja prompts pre-formados al chat input de Pulso.
 * Usado por el ToolMarketplace (command palette) para inyectar la
 * capacidad seleccionada al textarea SIN ejecutarla automáticamente:
 * el usuario completa con el contexto (ej. nombre del paciente).
 * =============================================================*/
type PromptListener = (prompt: string) => void
const promptListeners = new Set<PromptListener>()

export const toolBridge = {
  onPrompt(fn: PromptListener): () => void {
    promptListeners.add(fn)
    return () => promptListeners.delete(fn)
  },
  injectPrompt(text: string) {
    promptListeners.forEach(fn => fn(text))
  },
}
