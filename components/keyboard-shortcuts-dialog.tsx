'use client'

import { Modal } from '@/components/ui/modal'

interface ShortcutRow {
  keys: string[]
  description: string
}

interface ShortcutGroup {
  title: string
  shortcuts: ShortcutRow[]
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Navegación',
    shortcuts: [
      { keys: ['Ctrl', 'K'], description: 'Abrir buscador / paleta de comandos' },
      { keys: ['Ctrl', 'N'], description: 'Ir a Pacientes' },
      { keys: ['Ctrl', 'Shift', 'A'], description: 'Ir a Calendario' },
      { keys: ['Ctrl', '?'], description: 'Mostrar esta ayuda' },
    ],
  },
  {
    title: 'General',
    shortcuts: [
      { keys: ['Esc'], description: 'Cerrar modal o panel activo' },
    ],
  },
]

interface KeyboardShortcutsDialogProps {
  open: boolean
  onClose: () => void
}

export function KeyboardShortcutsDialog({ open, onClose }: KeyboardShortcutsDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title="Atajos de teclado" size="sm">
      <div className="space-y-5">
        {SHORTCUT_GROUPS.map(group => (
          <div key={group.title}>
            <h4 className="text-[9px] font-mono font-semibold uppercase tracking-[0.15em] text-text-dim mb-1.5">
              {group.title}
            </h4>
            <div className="space-y-0.5">
              {group.shortcuts.map(s => (
                <div
                  key={s.description}
                  className="flex items-center justify-between py-1 px-2 rounded-md hover:bg-surface-2 transition-colors"
                >
                  <span className="text-[10px] font-mono text-text-muted">{s.description}</span>
                  <div className="flex items-center gap-0.5">
                    {s.keys.map((k, i) => (
                      <span key={i} className="flex items-center gap-0.5">
                        {i > 0 && <span className="text-text-dim text-[10px] px-0.5">+</span>}
                        <kbd className="px-1.5 py-0.5 rounded bg-surface-2 border border-border text-text-dim text-[10px] font-mono">
                          {k}
                        </kbd>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        <p className="text-[10px] text-text-dim border-t border-border pt-3">
          Los atajos no se activan cuando el cursor está en un campo de texto.
        </p>
      </div>
    </Modal>
  )
}
