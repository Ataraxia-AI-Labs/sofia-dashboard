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
